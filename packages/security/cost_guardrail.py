"""
AI Cost & Usage Guardrail Gateway
==================================
Enforces tier-based token limits, usage caps, and cost controls.

Business Rules:
- AI cost per user must never exceed ~15% of product price
- "Unlimited" plans are usage-limited by token, report count, and soft monthly cap
- PDF generation must reuse stored AI output
- All LLM calls go through guarded gateway (no bypass)
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class ProductTier(str, Enum):
    """Product tiers with pricing (IDR)"""
    FREE = "free"
    COMPLETE_REPORT = "complete_report"      # Rp 99,000
    COUPLE = "couple"                         # Rp 149,000
    FAMILY = "family"                         # Rp 349,000
    TEAM = "team"                             # Rp 499,000
    ELITE_REPORT = "elite_report"            # Rp 299,000 (one-off)
    ELITE_MONTHLY = "elite_monthly"          # Rp 499,000/month
    ELITE_PLUS = "elite_plus"                # Rp 999,000/month


@dataclass
class TierLimits:
    """Token and usage limits per tier"""
    max_output_tokens: int
    max_input_chars: int
    daily_requests: int
    user_soft_cap_usd: float
    monthly_reports: Optional[int] = None
    members_limit: int = 1
    priority_hitl: bool = False
    draft_only: bool = False
    
    # Degraded mode settings (when soft cap reached)
    degraded_output_tokens: int = field(default=0)
    degraded_model: str = "gpt-4o-mini"
    
    def __post_init__(self):
        # Degraded mode = 60% of normal tokens
        if self.degraded_output_tokens == 0:
            self.degraded_output_tokens = int(self.max_output_tokens * 0.6)


# Tier configuration - EXACT limits from requirements
TIER_LIMITS: Dict[ProductTier, TierLimits] = {
    ProductTier.FREE: TierLimits(
        max_output_tokens=400,
        max_input_chars=8000,
        daily_requests=2,
        user_soft_cap_usd=0.10,
        draft_only=True,
    ),
    ProductTier.COMPLETE_REPORT: TierLimits(
        max_output_tokens=1800,
        max_input_chars=20000,
        daily_requests=5,
        user_soft_cap_usd=1.20,
    ),
    ProductTier.COUPLE: TierLimits(
        max_output_tokens=4400,  # Total for dual profiles
        max_input_chars=30000,
        daily_requests=8,
        user_soft_cap_usd=1.80,
        members_limit=2,
    ),
    ProductTier.FAMILY: TierLimits(
        max_output_tokens=7600,  # Total for up to 4 members
        max_input_chars=50000,
        daily_requests=15,
        user_soft_cap_usd=3.50,
        members_limit=4,
    ),
    ProductTier.TEAM: TierLimits(
        max_output_tokens=9200,  # Total for up to 6 members
        max_input_chars=70000,
        daily_requests=20,
        user_soft_cap_usd=4.50,
        members_limit=6,
    ),
    ProductTier.ELITE_REPORT: TierLimits(
        max_output_tokens=4200,
        max_input_chars=40000,
        daily_requests=12,
        user_soft_cap_usd=3.00,
    ),
    ProductTier.ELITE_MONTHLY: TierLimits(
        max_output_tokens=3200,  # Per report
        max_input_chars=40000,
        daily_requests=30,
        user_soft_cap_usd=6.00,
        monthly_reports=4,
    ),
    ProductTier.ELITE_PLUS: TierLimits(
        max_output_tokens=3500,  # Per report
        max_input_chars=40000,
        daily_requests=40,
        user_soft_cap_usd=12.00,
        monthly_reports=6,
        priority_hitl=True,
    ),
}


# Model pricing (USD per 1K tokens) - GPT-4o and GPT-4o-mini
MODEL_PRICING = {
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "gpt-4": {"input": 0.03, "output": 0.06},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
}


@dataclass
class UsageStats:
    """User usage statistics"""
    user_id: str
    tier: ProductTier
    daily_requests: int = 0
    daily_tokens_in: int = 0
    daily_tokens_out: int = 0
    daily_cost_usd: float = 0.0
    monthly_reports: int = 0
    monthly_cost_usd: float = 0.0
    last_request_date: Optional[str] = None
    last_report_date: Optional[str] = None
    is_degraded: bool = False
    

@dataclass
class GuardrailDecision:
    """Decision from the guardrail gateway"""
    allowed: bool
    tier: ProductTier
    limits: TierLimits
    max_output_tokens: int
    max_input_chars: int
    model: str
    concise_mode: bool = False
    degraded: bool = False
    block_reason: Optional[str] = None
    retry_after: Optional[int] = None  # Seconds until retry allowed
    warning: Optional[str] = None


class AIGuardrailGateway:
    """
    Central gateway for all AI/LLM requests.
    Enforces tier-based limits and cost controls.
    """
    
    def __init__(self, db=None):
        self.db = db
        self.daily_budget_usd = float(os.environ.get("LLM_DAILY_BUDGET_USD", "50"))
        self.daily_spend_usd = 0.0
        self.daily_spend_reset = datetime.now(timezone.utc).date()
        self._usage_cache: Dict[str, UsageStats] = {}
    
    def get_tier_from_user(self, user: Dict[str, Any]) -> ProductTier:
        """Determine user's product tier from their account."""
        user_tier = user.get("tier", "free").lower()
        
        # Map user tier string to ProductTier
        tier_mapping = {
            "free": ProductTier.FREE,
            "premium": ProductTier.COMPLETE_REPORT,
            "elite": ProductTier.ELITE_REPORT,
            "elite_monthly": ProductTier.ELITE_MONTHLY,
            "elite_plus": ProductTier.ELITE_PLUS,
        }
        
        return tier_mapping.get(user_tier, ProductTier.FREE)
    
    def get_tier_from_product(self, product_type: str) -> ProductTier:
        """Determine tier from product/report type."""
        product_mapping = {
            "free_report": ProductTier.FREE,
            "complete_report": ProductTier.COMPLETE_REPORT,
            "premium_report": ProductTier.COMPLETE_REPORT,
            "couple_report": ProductTier.COUPLE,
            "couples_report": ProductTier.COUPLE,
            "family_report": ProductTier.FAMILY,
            "team_report": ProductTier.TEAM,
            "team_dynamics": ProductTier.TEAM,
            "elite_report": ProductTier.ELITE_REPORT,
            "deep_dive": ProductTier.ELITE_REPORT,
        }
        
        return product_mapping.get(product_type.lower(), ProductTier.FREE)
    
    async def get_usage_stats(self, user_id: str) -> UsageStats:
        """Get current usage stats for user."""
        today = datetime.now(timezone.utc).date().isoformat()
        month_start = datetime.now(timezone.utc).replace(day=1).date().isoformat()
        
        # Check cache first
        cache_key = f"{user_id}_{today}"
        if cache_key in self._usage_cache:
            return self._usage_cache[cache_key]
        
        if self.db is None:
            # Return default stats if no DB
            return UsageStats(user_id=user_id, tier=ProductTier.FREE)
        
        # Get from database
        usage_doc = await self.db.ai_usage.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if not usage_doc:
            stats = UsageStats(user_id=user_id, tier=ProductTier.FREE)
        else:
            # Reset daily stats if new day
            last_date = usage_doc.get("last_request_date", "")
            if last_date != today:
                daily_requests = 0
                daily_tokens_in = 0
                daily_tokens_out = 0
                daily_cost_usd = 0.0
            else:
                daily_requests = usage_doc.get("daily_requests", 0)
                daily_tokens_in = usage_doc.get("daily_tokens_in", 0)
                daily_tokens_out = usage_doc.get("daily_tokens_out", 0)
                daily_cost_usd = usage_doc.get("daily_cost_usd", 0.0)
            
            # Reset monthly stats if new month
            last_report_month = usage_doc.get("last_report_month", "")
            current_month = month_start[:7]  # YYYY-MM
            if last_report_month != current_month:
                monthly_reports = 0
                monthly_cost_usd = 0.0
            else:
                monthly_reports = usage_doc.get("monthly_reports", 0)
                monthly_cost_usd = usage_doc.get("monthly_cost_usd", 0.0)
            
            stats = UsageStats(
                user_id=user_id,
                tier=ProductTier(usage_doc.get("tier", "free")),
                daily_requests=daily_requests,
                daily_tokens_in=daily_tokens_in,
                daily_tokens_out=daily_tokens_out,
                daily_cost_usd=daily_cost_usd,
                monthly_reports=monthly_reports,
                monthly_cost_usd=monthly_cost_usd,
                last_request_date=today,
            )
        
        self._usage_cache[cache_key] = stats
        return stats
    
    async def update_usage(
        self,
        user_id: str,
        tokens_in: int,
        tokens_out: int,
        model: str,
        is_report: bool = False
    ):
        """Update usage stats after LLM call."""
        today = datetime.now(timezone.utc).date().isoformat()
        current_month = today[:7]  # YYYY-MM
        
        # Calculate cost
        pricing = MODEL_PRICING.get(model, MODEL_PRICING["gpt-4o-mini"])
        cost_usd = (tokens_in / 1000 * pricing["input"]) + (tokens_out / 1000 * pricing["output"])
        
        # Update daily global spend
        self._check_daily_reset()
        self.daily_spend_usd += cost_usd
        
        if self.db is None:
            return
        
        # Update user stats in DB
        update_ops = {
            "$inc": {
                "daily_requests": 1,
                "daily_tokens_in": tokens_in,
                "daily_tokens_out": tokens_out,
                "daily_cost_usd": cost_usd,
                "total_requests": 1,
                "total_tokens_in": tokens_in,
                "total_tokens_out": tokens_out,
                "total_cost_usd": cost_usd,
            },
            "$set": {
                "last_request_date": today,
                "last_request_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        
        if is_report:
            update_ops["$inc"]["monthly_reports"] = 1
            update_ops["$inc"]["monthly_cost_usd"] = cost_usd
            update_ops["$set"]["last_report_month"] = current_month
        
        await self.db.ai_usage.update_one(
            {"user_id": user_id},
            update_ops,
            upsert=True
        )
        
        # Invalidate cache
        cache_key = f"{user_id}_{today}"
        if cache_key in self._usage_cache:
            del self._usage_cache[cache_key]
        
        logger.info(
            f"AI usage updated: user={user_id}, tokens_in={tokens_in}, "
            f"tokens_out={tokens_out}, cost=${cost_usd:.4f}, model={model}"
        )
    
    def _check_daily_reset(self):
        """Reset daily spend if new day."""
        today = datetime.now(timezone.utc).date()
        if today != self.daily_spend_reset:
            self.daily_spend_usd = 0.0
            self.daily_spend_reset = today
    
    async def check_request(
        self,
        user: Dict[str, Any],
        product_type: str = "complete_report",
        input_text: str = "",
        hitl_level: int = 1,
        is_report_generation: bool = False,
    ) -> GuardrailDecision:
        """
        Main guardrail check before any LLM call.
        Returns decision with allowed limits or block reason.
        """
        user_id = user.get("user_id", "unknown")
        
        # Determine tier
        tier = self.get_tier_from_product(product_type)
        user_tier = self.get_tier_from_user(user)
        
        # Use higher tier if user has subscription
        if user_tier.value > tier.value:
            tier = user_tier
        
        limits = TIER_LIMITS[tier]
        
        # HITL Level 3 → NO LLM CALL
        if hitl_level >= 3:
            return GuardrailDecision(
                allowed=False,
                tier=tier,
                limits=limits,
                max_output_tokens=0,
                max_input_chars=0,
                model="none",
                block_reason="HITL_LEVEL_3_BLOCK",
            )
        
        # Check daily global budget
        self._check_daily_reset()
        if self.daily_spend_usd >= self.daily_budget_usd:
            return GuardrailDecision(
                allowed=False,
                tier=tier,
                limits=limits,
                max_output_tokens=0,
                max_input_chars=0,
                model="none",
                block_reason="DAILY_GLOBAL_BUDGET_EXCEEDED",
                retry_after=self._seconds_until_midnight(),
            )
        
        # Get user's current usage
        stats = await self.get_usage_stats(user_id)
        
        # Check daily request limit
        if stats.daily_requests >= limits.daily_requests:
            return GuardrailDecision(
                allowed=False,
                tier=tier,
                limits=limits,
                max_output_tokens=0,
                max_input_chars=0,
                model="none",
                block_reason="DAILY_REQUEST_LIMIT_REACHED",
                retry_after=self._seconds_until_midnight(),
            )
        
        # Check monthly report limit (for subscription tiers)
        if is_report_generation and limits.monthly_reports is not None:
            if stats.monthly_reports >= limits.monthly_reports:
                return GuardrailDecision(
                    allowed=False,
                    tier=tier,
                    limits=limits,
                    max_output_tokens=400,  # Allow summary only
                    max_input_chars=limits.max_input_chars,
                    model="gpt-4o-mini",
                    concise_mode=True,
                    block_reason="MONTHLY_REPORT_LIMIT_REACHED",
                    warning="Limit laporan bulanan tercapai. Hanya ringkasan yang tersedia.",
                )
        
        # Check input length
        input_chars = len(input_text)
        if input_chars > limits.max_input_chars:
            return GuardrailDecision(
                allowed=False,
                tier=tier,
                limits=limits,
                max_output_tokens=0,
                max_input_chars=limits.max_input_chars,
                model="none",
                block_reason=f"INPUT_TOO_LONG:{input_chars}>{limits.max_input_chars}",
            )
        
        # Check if user soft cap reached → degrade mode
        is_degraded = stats.daily_cost_usd >= limits.user_soft_cap_usd
        
        if is_degraded:
            return GuardrailDecision(
                allowed=True,
                tier=tier,
                limits=limits,
                max_output_tokens=limits.degraded_output_tokens,
                max_input_chars=limits.max_input_chars,
                model=limits.degraded_model,
                concise_mode=True,
                degraded=True,
                warning="Batas penggunaan harian hampir tercapai. Mode hemat diaktifkan.",
            )
        
        # Normal allowed request
        model = "gpt-4o" if tier != ProductTier.FREE else "gpt-4o-mini"
        
        return GuardrailDecision(
            allowed=True,
            tier=tier,
            limits=limits,
            max_output_tokens=limits.max_output_tokens,
            max_input_chars=limits.max_input_chars,
            model=model,
            concise_mode=limits.draft_only,
        )
    
    def _seconds_until_midnight(self) -> int:
        """Calculate seconds until midnight UTC."""
        now = datetime.now(timezone.utc)
        midnight = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        return int((midnight - now).total_seconds())
    
    def estimate_cost(
        self,
        tokens_in: int,
        tokens_out: int,
        model: str = "gpt-4o"
    ) -> float:
        """Estimate cost in USD for given tokens."""
        pricing = MODEL_PRICING.get(model, MODEL_PRICING["gpt-4o"])
        return (tokens_in / 1000 * pricing["input"]) + (tokens_out / 1000 * pricing["output"])


# Singleton instance
_guardrail_gateway: Optional[AIGuardrailGateway] = None


def get_guardrail_gateway(db=None) -> AIGuardrailGateway:
    """Get or create singleton guardrail gateway."""
    global _guardrail_gateway
    if _guardrail_gateway is None:
        _guardrail_gateway = AIGuardrailGateway(db)
    elif db is not None and _guardrail_gateway.db is None:
        _guardrail_gateway.db = db
    return _guardrail_gateway


def set_guardrail_db(db):
    """Set database for guardrail gateway."""
    gateway = get_guardrail_gateway()
    gateway.db = db
