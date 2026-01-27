"""
Guarded LLM Gateway - SINGLE ENTRYPOINT
========================================
ALL LLM calls MUST pass through this gateway.
NO BYPASS ALLOWED.

This is the ONLY authorized module to call the LLM provider.
"""

import os
import sys
import time
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path

# Add packages to path
packages_path = str(Path(__file__).parent.parent)
if packages_path not in sys.path:
    sys.path.insert(0, packages_path)

logger = logging.getLogger(__name__)


class LLMStatus(str, Enum):
    """Status of LLM call."""
    OK = "ok"
    BLOCKED = "blocked"
    DEGRADED = "degraded"
    ERROR = "error"


class LLMMode(str, Enum):
    """Mode of LLM call."""
    DRAFT = "draft"
    FINAL = "final"
    PDF = "pdf"


@dataclass
class GuardedLLMContext:
    """
    Context for guarded LLM call.
    All fields required for guardrail decisions.
    """
    # Request identification
    request_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    user_id: Optional[str] = None
    
    # Tier and mode
    tier: str = "free"  # free, premium, elite, elite_plus
    endpoint_name: str = "unknown"
    mode: str = "draft"  # draft, final, pdf
    
    # Safety signals
    hitl_level: int = 1  # 1-3
    abuse_flags: List[str] = field(default_factory=list)
    
    # Prompt content
    prompt: str = ""
    system_instructions: str = ""
    
    # Metadata (no PII)
    input_payload_metadata: Dict[str, Any] = field(default_factory=dict)
    desired_output_schema: Optional[Dict] = None
    
    # Language
    language: str = "id"


@dataclass
class GuardedLLMResult:
    """
    Result from guarded LLM call.
    Contains all metadata for audit trail.
    """
    # Status
    status: LLMStatus = LLMStatus.OK
    
    # Model info
    model_used: str = ""
    model_requested: str = ""
    
    # Token usage
    tokens_in: int = 0
    tokens_out: int = 0
    max_tokens_allowed: int = 0
    
    # Cost
    cost_estimate_usd: float = 0.0
    
    # Output
    output_text: str = ""
    
    # Block/degrade reasons
    blocked_reason: Optional[str] = None
    degrade_reason: Optional[str] = None
    
    # Metadata
    request_id: str = ""
    latency_ms: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class GuardedLLMGateway:
    """
    SINGLE ENTRYPOINT for all LLM calls.
    
    Flow:
    1. Abuse guard precheck
    2. HITL policy check (level 3 => block)
    3. Daily budget check (block if exceeded)
    4. User soft cap check (degrade if exceeded)
    5. Routing: select model + token limits
    6. Provider call via llm_provider
    7. Persist llm_usage_events record
    8. Structured logging
    """
    
    def __init__(self, db=None):
        self.db = db
        self._llm_provider = None
        self._abuse_guard = None
        self._budget_guard = None
        self._routing_policy = None
        self._cost_table = self._load_cost_table()
        
    def _load_cost_table(self) -> Dict[str, Dict[str, float]]:
        """Load LLM cost table from env or defaults."""
        cost_json = os.environ.get("LLM_COST_TABLE_JSON", "")
        
        if cost_json:
            try:
                return json.loads(cost_json)
            except json.JSONDecodeError:
                logger.warning("Invalid LLM_COST_TABLE_JSON, using defaults")
        
        # Default pricing (USD per 1K tokens)
        return {
            "gpt-4o": {"input": 0.005, "output": 0.015},
            "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
            "gpt-4": {"input": 0.03, "output": 0.06},
            "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
        }
    
    def set_dependencies(self, db=None, llm_provider=None, abuse_guard=None, 
                         budget_guard=None, routing_policy=None):
        """Inject dependencies."""
        if db:
            self.db = db
        if llm_provider:
            self._llm_provider = llm_provider
        if abuse_guard:
            self._abuse_guard = abuse_guard
        if budget_guard:
            self._budget_guard = budget_guard
        if routing_policy:
            self._routing_policy = routing_policy
    
    def _get_abuse_guard(self):
        """Lazy load abuse guard."""
        if self._abuse_guard is None:
            from security.abuse_guard import get_abuse_guard
            self._abuse_guard = get_abuse_guard()
        return self._abuse_guard
    
    def _get_budget_guard(self):
        """Lazy load budget guard."""
        if self._budget_guard is None:
            from ai_gateway.budget_guard import get_budget_guard
            self._budget_guard = get_budget_guard(self.db)
        return self._budget_guard
    
    def _get_routing_policy(self):
        """Lazy load routing policy."""
        if self._routing_policy is None:
            from ai_gateway.routing import get_routing_policy
            self._routing_policy = get_routing_policy()
        return self._routing_policy
    
    def _get_llm_provider(self):
        """Lazy load LLM provider."""
        if self._llm_provider is None:
            # Import the ONLY authorized LLM provider
            from ai_gateway.llm_provider_adapter import get_llm_adapter
            self._llm_provider = get_llm_adapter()
        return self._llm_provider
    
    def _estimate_cost(self, model: str, tokens_in: int, tokens_out: int) -> float:
        """Estimate cost using cost table."""
        pricing = self._cost_table.get(model, {"input": 0.0, "output": 0.0})
        cost = (tokens_in / 1000 * pricing["input"]) + (tokens_out / 1000 * pricing["output"])
        return round(cost, 6)
    
    async def _persist_event(self, context: GuardedLLMContext, result: GuardedLLMResult):
        """Persist LLM usage event to database."""
        if self.db is None:
            return
        
        event = {
            "event_id": f"llm_{uuid.uuid4().hex[:12]}",
            "request_id": context.request_id,
            "user_id": context.user_id,
            "endpoint_name": context.endpoint_name,
            "tier": context.tier,
            "mode": context.mode,
            "hitl_level": context.hitl_level,
            "abuse_flags": context.abuse_flags,
            "model_requested": result.model_requested,
            "model_used": result.model_used,
            "tokens_in": result.tokens_in,
            "tokens_out": result.tokens_out,
            "max_tokens_allowed": result.max_tokens_allowed,
            "cost_estimate_usd": result.cost_estimate_usd,
            "status": result.status.value,
            "blocked_reason": result.blocked_reason,
            "degrade_reason": result.degrade_reason,
            "latency_ms": result.latency_ms,
            "ts_utc": datetime.now(timezone.utc),
            "language": context.language,
        }
        
        try:
            await self.db.llm_usage_events.insert_one(event)
        except Exception as e:
            logger.error(f"Failed to persist LLM event: {e}")
    
    def _log_event(self, context: GuardedLLMContext, result: GuardedLLMResult):
        """Structured JSON logging."""
        log_data = {
            "event": "llm_call",
            "request_id": context.request_id,
            "user_id": context.user_id,
            "endpoint_name": context.endpoint_name,
            "tier": context.tier,
            "mode": context.mode,
            "hitl_level": context.hitl_level,
            "abuse_flags": context.abuse_flags,
            "model_used": result.model_used,
            "tokens_in": result.tokens_in,
            "tokens_out": result.tokens_out,
            "cost_estimate_usd": result.cost_estimate_usd,
            "status": result.status.value,
            "blocked_reason": result.blocked_reason,
            "degrade_reason": result.degrade_reason,
            "latency_ms": round(result.latency_ms, 2),
        }
        
        if result.status == LLMStatus.OK:
            logger.info(json.dumps(log_data))
        elif result.status == LLMStatus.DEGRADED:
            logger.warning(json.dumps(log_data))
        else:
            logger.error(json.dumps(log_data))
    
    async def call_llm_guarded(self, context: GuardedLLMContext) -> GuardedLLMResult:
        """
        SINGLE ENTRYPOINT for all LLM calls.
        
        Args:
            context: GuardedLLMContext with all required info
            
        Returns:
            GuardedLLMResult with output or block/degrade info
        """
        start_time = time.time()
        result = GuardedLLMResult(request_id=context.request_id)
        
        try:
            # ========================================
            # A) ABUSE GUARD PRECHECK
            # ========================================
            abuse_guard = self._get_abuse_guard()
            abuse_result = abuse_guard.analyze(context.prompt)
            
            if abuse_result.detected:
                context.abuse_flags = abuse_result.matched_patterns[:5]
            
            if abuse_result.should_block:
                result.status = LLMStatus.BLOCKED
                result.blocked_reason = f"ABUSE:{abuse_result.abuse_type}"
                result.output_text = abuse_guard.get_safe_response(
                    abuse_result.abuse_type, context.language
                )
                result.latency_ms = (time.time() - start_time) * 1000
                
                self._log_event(context, result)
                await self._persist_event(context, result)
                return result
            
            # ========================================
            # B) HITL POLICY CHECK (Level 3 => Block)
            # ========================================
            if context.hitl_level >= 3:
                result.status = LLMStatus.BLOCKED
                result.blocked_reason = "HITL_LEVEL_3"
                result.output_text = self._get_hitl_block_message(context.language)
                result.latency_ms = (time.time() - start_time) * 1000
                
                self._log_event(context, result)
                await self._persist_event(context, result)
                return result
            
            # ========================================
            # C) DAILY BUDGET CHECK (Block if exceeded)
            # ========================================
            budget_guard = self._get_budget_guard()
            budget_status = await budget_guard.check_daily_budget()
            
            if budget_status["blocked"]:
                result.status = LLMStatus.BLOCKED
                result.blocked_reason = "DAILY_BUDGET_EXCEEDED"
                result.output_text = self._get_budget_block_message(
                    context.language, budget_status["retry_after_seconds"]
                )
                result.latency_ms = (time.time() - start_time) * 1000
                
                self._log_event(context, result)
                await self._persist_event(context, result)
                return result
            
            # ========================================
            # D) USER SOFT CAP CHECK (Degrade if exceeded)
            # ========================================
            user_cap_status = await budget_guard.check_user_soft_cap(
                context.user_id, context.tier
            )
            
            degrade_mode = user_cap_status["exceeded"]
            if degrade_mode:
                result.degrade_reason = "USER_SOFT_CAP_EXCEEDED"
            
            # ========================================
            # E) ROUTING: Select model + token limits
            # ========================================
            routing = self._get_routing_policy()
            route = routing.get_route(
                tier=context.tier,
                mode=context.mode,
                degraded=degrade_mode
            )
            
            result.model_requested = route["model_preferred"]
            result.model_used = route["model_preferred"]
            result.max_tokens_allowed = route["max_tokens"]
            
            if degrade_mode:
                result.status = LLMStatus.DEGRADED
                result.model_used = route["model_degraded"]
                result.max_tokens_allowed = int(route["max_tokens"] * 0.6)
            
            # ========================================
            # F) PROVIDER CALL via adapter
            # ========================================
            provider = self._get_llm_provider()
            
            # Modify system prompt if degraded
            system_prompt = context.system_instructions
            if degrade_mode:
                system_prompt = self._add_concise_instruction(system_prompt, context.language)
            
            try:
                output = await provider.generate(
                    system_prompt=system_prompt,
                    user_prompt=context.prompt,
                    model=result.model_used,
                    max_tokens=result.max_tokens_allowed,
                    temperature=0.3
                )
                
                # Estimate tokens
                result.tokens_in = len(f"{system_prompt}\n{context.prompt}") // 4
                result.tokens_out = len(output) // 4
                result.output_text = output
                
                if result.status != LLMStatus.DEGRADED:
                    result.status = LLMStatus.OK
                    
            except Exception as e:
                logger.error(f"LLM provider error: {e}")
                result.status = LLMStatus.ERROR
                result.blocked_reason = f"PROVIDER_ERROR:{str(e)[:100]}"
                result.output_text = self._get_error_message(context.language)
            
            # ========================================
            # G) COST ESTIMATION
            # ========================================
            result.cost_estimate_usd = self._estimate_cost(
                result.model_used, result.tokens_in, result.tokens_out
            )
            
            result.latency_ms = (time.time() - start_time) * 1000
            
            # ========================================
            # H) PERSIST + LOG
            # ========================================
            self._log_event(context, result)
            await self._persist_event(context, result)
            
            # Update budget tracking if successful
            if result.status in [LLMStatus.OK, LLMStatus.DEGRADED]:
                await budget_guard.record_usage(
                    user_id=context.user_id,
                    cost_usd=result.cost_estimate_usd,
                    tokens_in=result.tokens_in,
                    tokens_out=result.tokens_out
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Gateway error: {e}")
            result.status = LLMStatus.ERROR
            result.blocked_reason = f"GATEWAY_ERROR:{str(e)[:100]}"
            result.output_text = self._get_error_message(context.language)
            result.latency_ms = (time.time() - start_time) * 1000
            
            self._log_event(context, result)
            await self._persist_event(context, result)
            
            return result
    
    def _get_hitl_block_message(self, language: str) -> str:
        """Get HITL block message."""
        messages = {
            "id": "Permintaan ini memerlukan tinjauan manual oleh tim kami. Anda akan dihubungi dalam 1-2 hari kerja.",
            "en": "This request requires manual review by our team. You will be contacted within 1-2 business days."
        }
        return messages.get(language, messages["en"])
    
    def _get_budget_block_message(self, language: str, retry_after: int) -> str:
        """Get budget exceeded message."""
        hours = retry_after // 3600
        messages = {
            "id": f"Kapasitas AI harian telah tercapai. Silakan coba lagi dalam {hours} jam.",
            "en": f"Daily AI capacity has been reached. Please try again in {hours} hours."
        }
        return messages.get(language, messages["en"])
    
    def _get_error_message(self, language: str) -> str:
        """Get generic error message."""
        messages = {
            "id": "Terjadi kesalahan. Silakan coba lagi.",
            "en": "An error occurred. Please try again."
        }
        return messages.get(language, messages["en"])
    
    def _add_concise_instruction(self, system_prompt: str, language: str) -> str:
        """Add concise mode instruction to system prompt."""
        instruction = {
            "id": "\n\n[MODE HEMAT] Berikan respons yang RINGKAS, maksimal 2-3 paragraf. Fokus pada poin utama saja.",
            "en": "\n\n[CONCISE MODE] Provide a BRIEF response, maximum 2-3 paragraphs. Focus on main points only."
        }
        return system_prompt + instruction.get(language, instruction["en"])


# Singleton instance
_gateway: Optional[GuardedLLMGateway] = None


def get_llm_gateway(db=None) -> GuardedLLMGateway:
    """Get or create singleton LLM gateway."""
    global _gateway
    if _gateway is None:
        _gateway = GuardedLLMGateway(db)
    elif db is not None:
        _gateway.db = db
    return _gateway


async def call_llm_guarded(context: GuardedLLMContext) -> GuardedLLMResult:
    """
    SINGLE ENTRYPOINT for all LLM calls.
    
    Usage:
        from ai_gateway import call_llm_guarded, GuardedLLMContext
        
        context = GuardedLLMContext(
            user_id="user123",
            tier="premium",
            endpoint_name="/api/report/generate",
            mode="final",
            hitl_level=1,
            prompt="Generate a report...",
            system_instructions="You are..."
        )
        
        result = await call_llm_guarded(context)
        
        if result.status == LLMStatus.OK:
            print(result.output_text)
        else:
            print(f"Blocked: {result.blocked_reason}")
    """
    gateway = get_llm_gateway()
    return await gateway.call_llm_guarded(context)
