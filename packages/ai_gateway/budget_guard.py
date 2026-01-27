"""
Budget Guard
============
Manages daily budget and per-user soft caps.

Enforcement:
- Daily budget: Hard block with HTTP 429
- User soft cap: Degrade model + reduce tokens
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from collections import defaultdict

logger = logging.getLogger(__name__)


# Tier soft caps (USD per day)
TIER_SOFT_CAPS = {
    "free": 0.10,
    "premium": 1.20,
    "elite": 3.00,
    "elite_monthly": 6.00,
    "elite_plus": 12.00,
    "couple": 1.80,
    "family": 3.50,
    "team": 4.50,
}


class BudgetGuard:
    """
    Manages LLM budget and per-user caps.
    
    Daily Budget:
    - Reads from LLM_DAILY_BUDGET_USD env
    - Tracks spent today from llm_usage_events
    - Hard blocks at 100% with retry-after
    - Warns at LLM_BUDGET_WARN_PCT (default 80%)
    
    User Soft Cap:
    - Tracks per-user daily spend
    - Degrades model when cap exceeded
    - Does not hard block user
    """
    
    def __init__(self, db=None):
        self.db = db
        self.daily_budget = float(os.environ.get("LLM_DAILY_BUDGET_USD", "50"))
        self.warn_pct = float(os.environ.get("LLM_BUDGET_WARN_PCT", "0.8"))
        self.reset_hour_utc = int(os.environ.get("LLM_BUDGET_RESET_HOUR_UTC", "0"))
        
        # In-memory cache (updated from DB periodically)
        self._daily_spent = 0.0
        self._user_spent: Dict[str, float] = defaultdict(float)
        self._last_cache_update = None
        self._cache_ttl_seconds = 60
    
    def _get_today_start(self) -> datetime:
        """Get start of budget day (UTC)."""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=self.reset_hour_utc, minute=0, second=0, microsecond=0)
        if now < today_start:
            today_start -= timedelta(days=1)
        return today_start
    
    def _get_seconds_until_reset(self) -> int:
        """Get seconds until budget reset."""
        now = datetime.now(timezone.utc)
        today_start = self._get_today_start()
        next_reset = today_start + timedelta(days=1)
        return int((next_reset - now).total_seconds())
    
    async def _refresh_cache(self):
        """Refresh spending cache from database."""
        now = datetime.now(timezone.utc)
        
        # Check if cache is still valid
        if (self._last_cache_update and 
            (now - self._last_cache_update).total_seconds() < self._cache_ttl_seconds):
            return
        
        if self.db is None:
            return
        
        today_start = self._get_today_start()
        
        try:
            # Get total daily spend
            pipeline = [
                {
                    "$match": {
                        "ts_utc": {"$gte": today_start},
                        "status": {"$in": ["ok", "degraded"]}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total_cost": {"$sum": "$cost_estimate_usd"}
                    }
                }
            ]
            
            result = await self.db.llm_usage_events.aggregate(pipeline).to_list(1)
            self._daily_spent = result[0]["total_cost"] if result else 0.0
            
            # Get per-user spend
            user_pipeline = [
                {
                    "$match": {
                        "ts_utc": {"$gte": today_start},
                        "status": {"$in": ["ok", "degraded"]},
                        "user_id": {"$ne": None}
                    }
                },
                {
                    "$group": {
                        "_id": "$user_id",
                        "total_cost": {"$sum": "$cost_estimate_usd"}
                    }
                }
            ]
            
            user_results = await self.db.llm_usage_events.aggregate(user_pipeline).to_list(1000)
            self._user_spent = defaultdict(float)
            for r in user_results:
                self._user_spent[r["_id"]] = r["total_cost"]
            
            self._last_cache_update = now
            
        except Exception as e:
            logger.error(f"Failed to refresh budget cache: {e}")
    
    async def check_daily_budget(self) -> Dict[str, Any]:
        """
        Check if daily budget is exceeded.
        
        Returns:
            {
                "blocked": bool,
                "spent_usd": float,
                "budget_usd": float,
                "remaining_usd": float,
                "percent_used": float,
                "warning": bool,
                "retry_after_seconds": int
            }
        """
        await self._refresh_cache()
        
        remaining = max(0, self.daily_budget - self._daily_spent)
        percent_used = (self._daily_spent / self.daily_budget * 100) if self.daily_budget > 0 else 0
        
        blocked = self._daily_spent >= self.daily_budget
        warning = percent_used >= (self.warn_pct * 100)
        
        if warning and not blocked:
            logger.warning(f"BUDGET_WARNING: {percent_used:.1f}% of daily budget used (${self._daily_spent:.2f}/${self.daily_budget})")
        
        if blocked:
            logger.error(f"BUDGET_EXCEEDED: Daily budget exhausted (${self._daily_spent:.2f}/${self.daily_budget})")
        
        return {
            "blocked": blocked,
            "spent_usd": round(self._daily_spent, 4),
            "budget_usd": self.daily_budget,
            "remaining_usd": round(remaining, 4),
            "percent_used": round(percent_used, 2),
            "warning": warning,
            "retry_after_seconds": self._get_seconds_until_reset() if blocked else 0
        }
    
    async def check_user_soft_cap(self, user_id: Optional[str], tier: str = "free") -> Dict[str, Any]:
        """
        Check if user has exceeded their soft cap.
        
        Returns:
            {
                "exceeded": bool,
                "spent_usd": float,
                "cap_usd": float,
                "remaining_usd": float,
                "percent_used": float
            }
        """
        if user_id is None:
            return {
                "exceeded": False,
                "spent_usd": 0.0,
                "cap_usd": 0.0,
                "remaining_usd": 0.0,
                "percent_used": 0.0
            }
        
        await self._refresh_cache()
        
        user_spent = self._user_spent.get(user_id, 0.0)
        cap = TIER_SOFT_CAPS.get(tier, TIER_SOFT_CAPS["free"])
        
        remaining = max(0, cap - user_spent)
        percent_used = (user_spent / cap * 100) if cap > 0 else 0
        
        exceeded = user_spent >= cap
        
        if exceeded:
            logger.info(f"USER_SOFT_CAP_EXCEEDED: user={user_id}, tier={tier}, spent=${user_spent:.4f}, cap=${cap}")
        
        return {
            "exceeded": exceeded,
            "spent_usd": round(user_spent, 4),
            "cap_usd": cap,
            "remaining_usd": round(remaining, 4),
            "percent_used": round(percent_used, 2)
        }
    
    async def record_usage(self, user_id: Optional[str], cost_usd: float, 
                          tokens_in: int = 0, tokens_out: int = 0):
        """Record usage in cache (DB update happens in gateway)."""
        self._daily_spent += cost_usd
        if user_id:
            self._user_spent[user_id] += cost_usd
        
        # Check for token spikes
        await self._check_token_spike(tokens_out)
    
    async def _check_token_spike(self, tokens_out: int):
        """Check for unusual token usage spikes."""
        spike_threshold = int(os.environ.get("TOKENS_SPIKE_HARD_THRESHOLD_OUT", "2500"))
        
        if tokens_out > spike_threshold:
            logger.warning(f"TOKENS_SPIKE: Output tokens {tokens_out} exceeds threshold {spike_threshold}")
    
    async def get_budget_status_public(self) -> Dict[str, Any]:
        """
        Get budget status for public endpoint.
        No sensitive info exposed.
        """
        status = await self.check_daily_budget()
        
        return {
            "status": "blocked" if status["blocked"] else "warning" if status["warning"] else "ok",
            "capacity_remaining_percent": round(100 - status["percent_used"], 1),
            "retry_after_seconds": status["retry_after_seconds"],
            "reset_hour_utc": self.reset_hour_utc
        }
    
    async def get_usage_summary(self, days: int = 7) -> Dict[str, Any]:
        """
        Get usage summary for admin endpoint.
        
        Returns aggregated stats for the specified number of days.
        """
        if self.db is None:
            return {"error": "Database not available"}
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        try:
            # Daily breakdown
            pipeline = [
                {
                    "$match": {
                        "ts_utc": {"$gte": start_date}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts_utc"}},
                            "status": "$status"
                        },
                        "count": {"$sum": 1},
                        "total_cost": {"$sum": "$cost_estimate_usd"},
                        "total_tokens_in": {"$sum": "$tokens_in"},
                        "total_tokens_out": {"$sum": "$tokens_out"},
                        "avg_latency": {"$avg": "$latency_ms"}
                    }
                },
                {
                    "$sort": {"_id.date": -1}
                }
            ]
            
            results = await self.db.llm_usage_events.aggregate(pipeline).to_list(100)
            
            # Top endpoints
            endpoint_pipeline = [
                {
                    "$match": {
                        "ts_utc": {"$gte": start_date},
                        "status": {"$in": ["ok", "degraded"]}
                    }
                },
                {
                    "$group": {
                        "_id": "$endpoint_name",
                        "count": {"$sum": 1},
                        "total_cost": {"$sum": "$cost_estimate_usd"}
                    }
                },
                {
                    "$sort": {"total_cost": -1}
                },
                {
                    "$limit": 10
                }
            ]
            
            endpoints = await self.db.llm_usage_events.aggregate(endpoint_pipeline).to_list(10)
            
            # Total stats
            total_cost = sum(r["total_cost"] for r in results if r["_id"]["status"] in ["ok", "degraded"])
            total_calls = sum(r["count"] for r in results)
            blocked_calls = sum(r["count"] for r in results if r["_id"]["status"] == "blocked")
            
            return {
                "period_days": days,
                "total_cost_usd": round(total_cost, 4),
                "total_calls": total_calls,
                "blocked_calls": blocked_calls,
                "block_rate_percent": round(blocked_calls / total_calls * 100, 2) if total_calls > 0 else 0,
                "daily_breakdown": results,
                "top_endpoints": endpoints,
                "current_daily_budget": self.daily_budget,
                "current_daily_spent": round(self._daily_spent, 4)
            }
            
        except Exception as e:
            logger.error(f"Failed to get usage summary: {e}")
            return {"error": str(e)}


# Singleton instance
_budget_guard: Optional[BudgetGuard] = None


def get_budget_guard(db=None) -> BudgetGuard:
    """Get or create singleton budget guard."""
    global _budget_guard
    if _budget_guard is None:
        _budget_guard = BudgetGuard(db)
    elif db is not None:
        _budget_guard.db = db
    return _budget_guard
