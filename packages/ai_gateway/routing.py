"""
LLM Routing Policy
==================
Determines model and token limits based on tier, mode, and degradation status.

Rules:
- draft => LLM_MODEL_DRAFT + LLM_MAX_TOKENS_DRAFT
- final => LLM_MODEL_PREMIUM (based on tier)
- pdf => Allow bigger tokens for formatting
- degraded => Switch to cheaper model + reduce tokens 40%
"""

import os
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class RouteConfig:
    """Configuration for a route."""
    model_preferred: str
    model_degraded: str
    model_fallback: str
    max_tokens: int
    max_tokens_degraded: int


# Default models from environment
DEFAULT_MODEL_DRAFT = os.environ.get("LLM_MODEL_DRAFT", "gpt-4o-mini")
DEFAULT_MODEL_PREMIUM = os.environ.get("LLM_MODEL_PREMIUM", "gpt-4o")
DEFAULT_MODEL_ELITE = os.environ.get("LLM_MODEL_ELITE", "gpt-4o")
DEFAULT_MODEL_FALLBACK = os.environ.get("LLM_MODEL_FALLBACK", "gpt-4o-mini")

# Default token limits
DEFAULT_TOKENS_DRAFT = int(os.environ.get("LLM_MAX_TOKENS_DRAFT", "400"))
DEFAULT_TOKENS_PREMIUM = int(os.environ.get("LLM_MAX_TOKENS_PREMIUM", "1800"))
DEFAULT_TOKENS_ELITE = int(os.environ.get("LLM_MAX_TOKENS_ELITE", "4200"))
DEFAULT_TOKENS_PDF = int(os.environ.get("LLM_MAX_TOKENS_PDF", "500"))

# Environment control
ALLOW_DRAFT_PREMIUM = os.environ.get("ALLOW_DRAFT_PREMIUM", "false").lower() == "true"


# Tier-specific limits
TIER_CONFIGS = {
    "free": {
        "model": DEFAULT_MODEL_DRAFT,
        "max_tokens": 400,
    },
    "premium": {
        "model": DEFAULT_MODEL_PREMIUM,
        "max_tokens": 1800,
    },
    "elite": {
        "model": DEFAULT_MODEL_ELITE,
        "max_tokens": 4200,
    },
    "elite_monthly": {
        "model": DEFAULT_MODEL_ELITE,
        "max_tokens": 3200,
    },
    "elite_plus": {
        "model": DEFAULT_MODEL_ELITE,
        "max_tokens": 3500,
    },
    "couple": {
        "model": DEFAULT_MODEL_PREMIUM,
        "max_tokens": 4400,
    },
    "family": {
        "model": DEFAULT_MODEL_PREMIUM,
        "max_tokens": 7600,
    },
    "team": {
        "model": DEFAULT_MODEL_PREMIUM,
        "max_tokens": 9200,
    },
}


class RoutingPolicy:
    """
    Determines LLM routing based on tier, mode, and degradation.
    
    Routing Rules:
    1. mode=draft => Always use draft model (gpt-4o-mini), limited tokens
    2. mode=final => Use tier-specific model and tokens
    3. mode=pdf => Use tier model but limited tokens (formatting only)
    4. degraded=True => Switch to fallback model, reduce tokens by 40%
    """
    
    def __init__(self):
        self._load_config()
    
    def _load_config(self):
        """Load routing configuration."""
        self.model_draft = DEFAULT_MODEL_DRAFT
        self.model_premium = DEFAULT_MODEL_PREMIUM
        self.model_elite = DEFAULT_MODEL_ELITE
        self.model_fallback = DEFAULT_MODEL_FALLBACK
        
        self.tokens_draft = DEFAULT_TOKENS_DRAFT
        self.tokens_premium = DEFAULT_TOKENS_PREMIUM
        self.tokens_elite = DEFAULT_TOKENS_ELITE
        self.tokens_pdf = DEFAULT_TOKENS_PDF
        
        self.allow_draft_premium = ALLOW_DRAFT_PREMIUM
    
    def get_route(
        self,
        tier: str = "free",
        mode: str = "draft",
        degraded: bool = False,
        admin_override: bool = False
    ) -> Dict[str, Any]:
        """
        Get routing decision for LLM call.
        
        Args:
            tier: User tier (free, premium, elite, elite_plus, etc.)
            mode: Call mode (draft, final, pdf)
            degraded: Whether to use degraded/fallback model
            admin_override: Allow premium model for draft (admin only)
            
        Returns:
            {
                "model_preferred": str,
                "model_degraded": str,
                "model_fallback": str,
                "max_tokens": int,
                "max_tokens_degraded": int,
                "mode": str,
                "tier": str
            }
        """
        # Get tier config
        tier_config = TIER_CONFIGS.get(tier, TIER_CONFIGS["free"])
        
        # Mode-based routing
        if mode == "draft":
            # Draft mode: always use draft model unless admin override
            if admin_override and self.allow_draft_premium:
                model = tier_config["model"]
                max_tokens = tier_config["max_tokens"]
            else:
                model = self.model_draft
                max_tokens = self.tokens_draft
                
        elif mode == "pdf":
            # PDF mode: use tier model but limited tokens (formatting only)
            model = tier_config["model"]
            max_tokens = self.tokens_pdf
            
        else:  # final
            # Final mode: full tier-based routing
            model = tier_config["model"]
            max_tokens = tier_config["max_tokens"]
        
        # Calculate degraded values
        model_degraded = self.model_fallback
        max_tokens_degraded = int(max_tokens * 0.6)  # 40% reduction
        
        route = {
            "model_preferred": model,
            "model_degraded": model_degraded,
            "model_fallback": self.model_fallback,
            "max_tokens": max_tokens,
            "max_tokens_degraded": max_tokens_degraded,
            "mode": mode,
            "tier": tier,
            "degraded": degraded
        }
        
        logger.debug(f"Route decision: tier={tier}, mode={mode}, degraded={degraded} => model={model}, tokens={max_tokens}")
        
        return route
    
    def validate_model_access(self, tier: str, model: str) -> bool:
        """
        Validate that tier has access to requested model.
        
        Args:
            tier: User tier
            model: Requested model
            
        Returns:
            True if access is allowed, False otherwise
        """
        # Free tier can only use draft model
        if tier == "free" and model != self.model_draft:
            return False
        
        # Premium tiers can use their configured model or cheaper
        allowed_models = [self.model_draft, self.model_fallback]
        if tier in ["premium", "elite", "elite_monthly", "elite_plus", "couple", "family", "team"]:
            allowed_models.extend([self.model_premium, self.model_elite])
        
        return model in allowed_models
    
    def get_tier_limits(self, tier: str) -> Dict[str, Any]:
        """Get limits for a tier."""
        config = TIER_CONFIGS.get(tier, TIER_CONFIGS["free"])
        return {
            "tier": tier,
            "model": config["model"],
            "max_tokens": config["max_tokens"],
            "max_tokens_degraded": int(config["max_tokens"] * 0.6)
        }


# Singleton instance
_routing_policy: Optional[RoutingPolicy] = None


def get_routing_policy() -> RoutingPolicy:
    """Get or create singleton routing policy."""
    global _routing_policy
    if _routing_policy is None:
        _routing_policy = RoutingPolicy()
    return _routing_policy
