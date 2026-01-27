"""
AI Gateway Package
==================
SINGLE ENTRYPOINT for all LLM calls.

ALL AI/LLM calls in the application MUST go through this gateway.
Direct calls to OpenAI or other LLM providers are FORBIDDEN.

Usage:
    from ai_gateway import call_llm_guarded, GuardedLLMContext, LLMStatus

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
    elif result.status == LLMStatus.BLOCKED:
        print(f"Blocked: {result.blocked_reason}")
    elif result.status == LLMStatus.DEGRADED:
        print(f"Degraded mode: {result.degrade_reason}")
        print(result.output_text)
"""

from .guarded_llm import (
    GuardedLLMContext,
    GuardedLLMResult,
    GuardedLLMGateway,
    LLMStatus,
    LLMMode,
    call_llm_guarded,
    get_llm_gateway,
)

from .budget_guard import (
    BudgetGuard,
    get_budget_guard,
    TIER_SOFT_CAPS,
)

from .routing import (
    RoutingPolicy,
    RouteConfig,
    get_routing_policy,
    TIER_CONFIGS,
)

from .llm_provider_adapter import (
    LLMProviderAdapter,
    get_llm_adapter,
)

__all__ = [
    # Main gateway
    "GuardedLLMContext",
    "GuardedLLMResult", 
    "GuardedLLMGateway",
    "LLMStatus",
    "LLMMode",
    "call_llm_guarded",
    "get_llm_gateway",
    # Budget
    "BudgetGuard",
    "get_budget_guard",
    "TIER_SOFT_CAPS",
    # Routing
    "RoutingPolicy",
    "RouteConfig",
    "get_routing_policy",
    "TIER_CONFIGS",
    # Provider (internal use only)
    "LLMProviderAdapter",
    "get_llm_adapter",
]
