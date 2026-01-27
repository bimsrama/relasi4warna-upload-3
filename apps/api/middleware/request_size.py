"""
Request Size Limit Middleware
=============================
Reject oversized request bodies.
"""

import os
from fastapi import Request
from fastapi.responses import JSONResponse


class RequestSizeLimitMiddleware:
    """
    ASGI middleware to enforce request body size limits.
    """
    
    # Default: 256KB for JSON, 10MB for uploads
    DEFAULT_MAX_SIZE = 256 * 1024  # 256KB
    UPLOAD_MAX_SIZE = 10 * 1024 * 1024  # 10MB
    
    # Routes that allow larger uploads
    UPLOAD_ROUTES = [
        "/api/upload",
        "/api/assets",
    ]
    
    def __init__(self, app):
        self.app = app
        self.default_max = int(os.environ.get("REQUEST_MAX_SIZE_KB", 256)) * 1024
        self.upload_max = int(os.environ.get("UPLOAD_MAX_SIZE_MB", 10)) * 1024 * 1024
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive, send)
        path = request.url.path
        content_length = request.headers.get("content-length")
        
        if content_length:
            size = int(content_length)
            
            # Determine max size based on route
            is_upload = any(path.startswith(route) for route in self.UPLOAD_ROUTES)
            max_size = self.upload_max if is_upload else self.default_max
            
            if size > max_size:
                response = JSONResponse(
                    status_code=413,
                    content={
                        "error": "request_too_large",
                        "message": f"Request body exceeds {max_size // 1024}KB limit",
                        "max_size_kb": max_size // 1024
                    }
                )
                await response(scope, receive, send)
                return
        
        await self.app(scope, receive, send)
