"""
Guarded LLM Service
===================
All LLM calls MUST go through this service.
Enforces: Abuse detection, Cost controls, HITL integration.

NO BYPASS ALLOWED.
"""

import os
import sys
import time
import logging
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from pathlib import Path

# Add packages to path
packages_path = str(Path(__file__).parent.parent.parent.parent / "packages")
sys.path.insert(0, packages_path)

from security.abuse_guard import get_abuse_guard, AbuseDetection
from security.cost_guardrail import (
    get_guardrail_gateway,
    GuardrailDecision,
    ProductTier,
)

logger = logging.getLogger(__name__)


@dataclass
class LLMResponse:
    """Response from guarded LLM call."""
    success: bool
    content: str
    model_used: str
    tokens_in: int
    tokens_out: int
    cost_usd: float
    latency_ms: float
    degraded: bool = False
    concise_mode: bool = False
    abuse_detected: bool = False
    hitl_risk_modifier: int = 0
    block_reason: Optional[str] = None
    warning: Optional[str] = None


class GuardedLLMService:
    """
    Central guarded LLM service.
    All AI generation MUST go through this class.
    
    Flow:
    1. Abuse Guard Pre-Check
    2. Cost Guardrail Check
    3. LLM Call (with enforced limits)
    4. Usage Tracking
    5. Return with metadata
    """
    
    def __init__(self, db=None, llm_provider=None):
        self.db = db
        self.llm_provider = llm_provider
        self.abuse_guard = get_abuse_guard()
        self.guardrail = get_guardrail_gateway(db)
    
    def set_db(self, db):
        """Set database connection."""
        self.db = db
        self.guardrail.db = db
    
    def set_llm_provider(self, provider):
        """Set LLM provider."""
        self.llm_provider = provider
    
    async def generate(
        self,
        user: Dict[str, Any],
        system_prompt: str,
        user_prompt: str,
        product_type: str = "complete_report",
        hitl_level: int = 1,
        is_report_generation: bool = False,
        temperature: float = 0.3,
        language: str = "id",
    ) -> LLMResponse:
        """
        Generate text with full guardrails.
        
        Args:
            user: User dict with user_id, tier, etc.
            system_prompt: System message
            user_prompt: User message/query
            product_type: Product tier type
            hitl_level: HITL risk level (1-3)
            is_report_generation: Whether this is a full report
            temperature: LLM temperature
            language: Response language
            
        Returns:
            LLMResponse with content or block reason
        """
        start_time = time.time()
        user_id = user.get("user_id", "unknown")
        
        # Combine prompts for abuse check
        full_input = f"{system_prompt}\n\n{user_prompt}"
        
        # ========================================
        # STEP 1: Abuse Guard Pre-Check
        # ========================================
        abuse_result = self.abuse_guard.analyze(user_prompt)
        
        if abuse_result.should_block:
            logger.warning(
                f"Abuse blocked: user={user_id}, type={abuse_result.abuse_type}, "
                f"severity={abuse_result.severity}"
            )
            return LLMResponse(
                success=False,
                content=self.abuse_guard.get_safe_response(abuse_result.abuse_type, language),
                model_used="none",
                tokens_in=0,
                tokens_out=0,
                cost_usd=0.0,
                latency_ms=(time.time() - start_time) * 1000,
                abuse_detected=True,
                hitl_risk_modifier=abuse_result.risk_score_modifier,
                block_reason=f"ABUSE_BLOCKED:{abuse_result.abuse_type}",
            )
        
        # ========================================
        # STEP 2: Cost Guardrail Check
        # ========================================
        decision = await self.guardrail.check_request(
            user=user,
            product_type=product_type,
            input_text=full_input,
            hitl_level=hitl_level,
            is_report_generation=is_report_generation,
        )
        
        if not decision.allowed:
            logger.warning(
                f"Request blocked: user={user_id}, reason={decision.block_reason}"
            )
            
            # Return appropriate error response
            error_messages = {
                "HITL_LEVEL_3_BLOCK": {
                    "id": "Permintaan ini memerlukan tinjauan manual. Tim kami akan menghubungi Anda.",
                    "en": "This request requires manual review. Our team will contact you.",
                },
                "DAILY_GLOBAL_BUDGET_EXCEEDED": {
                    "id": "Layanan AI sedang dalam pemeliharaan. Silakan coba lagi nanti.",
                    "en": "AI service is under maintenance. Please try again later.",
                },
                "DAILY_REQUEST_LIMIT_REACHED": {
                    "id": "Batas permintaan harian tercapai. Silakan coba lagi besok.",
                    "en": "Daily request limit reached. Please try again tomorrow.",
                },
                "MONTHLY_REPORT_LIMIT_REACHED": {
                    "id": "Batas laporan bulanan tercapai. Upgrade untuk akses lebih banyak.",
                    "en": "Monthly report limit reached. Upgrade for more access.",
                },
            }
            
            reason_key = decision.block_reason.split(":")[0] if decision.block_reason else "DEFAULT"
            error_msg = error_messages.get(reason_key, {}).get(language, "Request blocked.")
            
            return LLMResponse(
                success=False,
                content=error_msg,
                model_used="none",
                tokens_in=0,
                tokens_out=0,
                cost_usd=0.0,
                latency_ms=(time.time() - start_time) * 1000,
                block_reason=decision.block_reason,
                warning=decision.warning,
            )
        
        # ========================================
        # STEP 3: LLM Call with Enforced Limits
        # ========================================
        if self.llm_provider is None:
            raise RuntimeError("LLM provider not configured")
        
        # Modify system prompt if in concise mode
        if decision.concise_mode:
            system_prompt = self._make_concise_prompt(system_prompt, language)
        
        # Truncate input if needed
        if len(full_input) > decision.max_input_chars:
            # Truncate user_prompt, keep system_prompt intact
            max_user_chars = decision.max_input_chars - len(system_prompt) - 100
            user_prompt = user_prompt[:max_user_chars] + "..."
        
        try:
            llm_start = time.time()
            
            content = await self.llm_provider.generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=decision.model,
                temperature=temperature,
                max_tokens=decision.max_output_tokens,
            )
            
            llm_latency = (time.time() - llm_start) * 1000
            
            # Estimate tokens (rough: 4 chars per token)
            tokens_in = len(full_input) // 4
            tokens_out = len(content) // 4
            
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            return LLMResponse(
                success=False,
                content="Terjadi kesalahan dalam menghasilkan respons. Silakan coba lagi.",
                model_used=decision.model,
                tokens_in=0,
                tokens_out=0,
                cost_usd=0.0,
                latency_ms=(time.time() - start_time) * 1000,
                block_reason=f"LLM_ERROR:{str(e)[:100]}",
            )
        
        # ========================================
        # STEP 4: Usage Tracking
        # ========================================
        cost_usd = self.guardrail.estimate_cost(tokens_in, tokens_out, decision.model)
        
        await self.guardrail.update_usage(
            user_id=user_id,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            model=decision.model,
            is_report=is_report_generation,
        )
        
        total_latency = (time.time() - start_time) * 1000
        
        logger.info(
            f"LLM call success: user={user_id}, model={decision.model}, "
            f"tokens_in={tokens_in}, tokens_out={tokens_out}, "
            f"cost=${cost_usd:.4f}, latency={total_latency:.0f}ms, "
            f"degraded={decision.degraded}"
        )
        
        # ========================================
        # STEP 5: Return with Metadata
        # ========================================
        return LLMResponse(
            success=True,
            content=content,
            model_used=decision.model,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_usd=cost_usd,
            latency_ms=total_latency,
            degraded=decision.degraded,
            concise_mode=decision.concise_mode,
            abuse_detected=abuse_result.detected,
            hitl_risk_modifier=abuse_result.risk_score_modifier if abuse_result.detected else 0,
            warning=decision.warning,
        )
    
    def _make_concise_prompt(self, system_prompt: str, language: str) -> str:
        """Modify prompt for concise output mode."""
        concise_instruction = {
            "id": "\n\nPENTING: Berikan respons yang RINGKAS dan PADAT. Maksimal 2-3 paragraf. Fokus pada poin utama saja.",
            "en": "\n\nIMPORTANT: Provide a CONCISE and COMPACT response. Maximum 2-3 paragraphs. Focus on main points only.",
        }
        return system_prompt + concise_instruction.get(language, concise_instruction["en"])


# Singleton instance
_guarded_llm: Optional[GuardedLLMService] = None


def get_guarded_llm(db=None, llm_provider=None) -> GuardedLLMService:
    """Get or create singleton guarded LLM service."""
    global _guarded_llm
    if _guarded_llm is None:
        _guarded_llm = GuardedLLMService(db, llm_provider)
    else:
        if db is not None:
            _guarded_llm.set_db(db)
        if llm_provider is not None:
            _guarded_llm.set_llm_provider(llm_provider)
    return _guarded_llm
