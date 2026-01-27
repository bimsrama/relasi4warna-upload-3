"""
Rate Limiting Middleware for FastAPI
=====================================
Per-route rate limits with Redis/in-memory fallback.
"""

import os
import time
import hashlib
from collections import defaultdict
from typing import Callable, Optional
from functools import wraps

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse


# In-memory storage (use Redis in production for multi-worker)
_rate_limit_storage: dict = defaultdict(list)


class RateLimitConfig:
    """Rate limit configuration per route pattern."""
    
    # Format: (max_requests, window_seconds)
    LIMITS = {
        "/api/auth/login": (5, 300),           # 5 per 5 min per IP
        "/api/auth/register": (3, 600),        # 3 per 10 min per IP
        "/api/auth/forgot-password": (3, 3600), # 3 per hour per IP
        "/api/report/generate": (3, 3600),     # 3 per hour per user
        "/api/report/elite": (3, 3600),        # 3 per hour per user
        "/api/report/pdf": (3, 3600),          # 3 per hour per user
        "/api/report/preview-pdf": (5, 3600),  # 5 per hour per user
        "/api/deep-dive/report": (3, 3600),    # 3 per hour per user
        "/api/quiz/start": (10, 600),          # 10 per 10 min per user
        "/api/quiz/submit": (10, 600),         # 10 per 10 min per user
        "/api/payment/create": (5, 600),       # 5 per 10 min per user
        "/api/couples/compatibility": (3, 3600), # 3 per hour per user
        "/api/team/dynamics": (3, 3600),       # 3 per hour per user
    }
    
    # Default for unspecified routes
    DEFAULT_LIMIT = (60, 60)  # 60 per minute


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_rate_limit_key(request: Request, user_id: Optional[str] = None) -> str:
    """Generate rate limit key based on route and client."""
    path = request.url.path
    
    # Use user_id for authenticated routes, IP for public routes
    if user_id:
        identifier = f"user:{user_id}"
    else:
        identifier = f"ip:{get_client_ip(request)}"
    
    # Normalize path (remove dynamic segments)
    normalized_path = path
    for pattern in RateLimitConfig.LIMITS.keys():
        if path.startswith(pattern.replace("/*", "")):
            normalized_path = pattern
            break
    
    return f"ratelimit:{normalized_path}:{identifier}"


def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> tuple[bool, int, int]:
    """
    Check if request is within rate limit.
    Returns: (is_allowed, remaining, retry_after)
    """
    now = time.time()
    window_start = now - window_seconds
    
    # Clean old entries
    _rate_limit_storage[key] = [
        ts for ts in _rate_limit_storage[key] if ts > window_start
    ]
    
    current_count = len(_rate_limit_storage[key])
    
    if current_count >= max_requests:
        # Calculate retry_after
        oldest = min(_rate_limit_storage[key]) if _rate_limit_storage[key] else now
        retry_after = int(oldest + window_seconds - now)
        return False, 0, max(1, retry_after)
    
    # Record this request
    _rate_limit_storage[key].append(now)
    remaining = max_requests - current_count - 1
    
    return True, remaining, 0


def get_limit_for_path(path: str) -> tuple[int, int]:
    """Get rate limit config for a path."""
    for pattern, limit in RateLimitConfig.LIMITS.items():
        if path.startswith(pattern.replace("/*", "")):
            return limit
    return RateLimitConfig.DEFAULT_LIMIT


class RateLimitMiddleware:
    """
    ASGI middleware for rate limiting.
    """
    
    def __init__(self, app):
        self.app = app
        self.enabled = os.environ.get("RATE_LIMIT_ENABLED", "true").lower() == "true"
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not self.enabled:
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive, send)
        path = request.url.path
        
        # Skip health checks and static files
        if path in ["/api/health", "/health", "/", "/docs", "/openapi.json"]:
            await self.app(scope, receive, send)
            return
        
        # Skip non-API routes
        if not path.startswith("/api/"):
            await self.app(scope, receive, send)
            return
        
        # Get user_id from auth header if present
        user_id = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            # Extract user_id from JWT (simplified - in production use proper JWT decode)
            token = auth_header[7:]
            user_id = hashlib.md5(token.encode()).hexdigest()[:16]
        
        # Check rate limit
        key = get_rate_limit_key(request, user_id)
        max_requests, window_seconds = get_limit_for_path(path)
        is_allowed, remaining, retry_after = check_rate_limit(key, max_requests, window_seconds)
        
        if not is_allowed:
            response = JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limited",
                    "message": "Too many requests. Please try again later.",
                    "retry_after": retry_after
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after)
                }
            )
            await response(scope, receive, send)
            return
        
        # Add rate limit headers to response
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend([
                    (b"X-RateLimit-Limit", str(max_requests).encode()),
                    (b"X-RateLimit-Remaining", str(remaining).encode()),
                ])
                message["headers"] = headers
            await send(message)
        
        await self.app(scope, receive, send_wrapper)
