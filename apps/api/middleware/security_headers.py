"""
Security Headers Middleware
===========================
Add security headers to all responses.
"""

import os
from fastapi import Request


class SecurityHeadersMiddleware:
    """
    ASGI middleware to add security headers.
    """
    
    def __init__(self, app):
        self.app = app
        self.cors_origins = os.environ.get("CORS_ORIGINS", "").split(",")
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                
                # Security headers
                security_headers = [
                    (b"X-Content-Type-Options", b"nosniff"),
                    (b"X-Frame-Options", b"DENY"),
                    (b"X-XSS-Protection", b"1; mode=block"),
                    (b"Referrer-Policy", b"strict-origin-when-cross-origin"),
                    (b"Permissions-Policy", b"geolocation=(), microphone=(), camera=()"),
                ]
                
                # CSP - minimal but effective
                csp = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' https://app.sandbox.midtrans.com https://app.midtrans.com; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data: https:; "
                    "font-src 'self' data:; "
                    "connect-src 'self' https://api.sandbox.midtrans.com https://api.midtrans.com; "
                    "frame-src https://app.sandbox.midtrans.com https://app.midtrans.com;"
                )
                security_headers.append((b"Content-Security-Policy", csp.encode()))
                
                headers.extend(security_headers)
                message["headers"] = headers
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)
