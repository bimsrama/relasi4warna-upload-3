"""
Structured Logging Configuration
================================
JSON-formatted logs with request context.
"""

import os
import sys
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Optional, Any, Dict
from contextvars import ContextVar
from functools import wraps

# Context variables for request tracking
request_id_var: ContextVar[str] = ContextVar("request_id", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")


class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    SENSITIVE_KEYS = {
        "password", "token", "secret", "api_key", "apikey",
        "authorization", "cookie", "credit_card", "ssn"
    }
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_var.get(""),
            "user_id": user_id_var.get(""),
        }
        
        # Add extra fields
        if hasattr(record, "extra_data"):
            extra = self._mask_sensitive(record.extra_data)
            log_data.update(extra)
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add source location in debug mode
        if os.environ.get("LOG_INCLUDE_SOURCE", "false").lower() == "true":
            log_data["source"] = {
                "file": record.pathname,
                "line": record.lineno,
                "function": record.funcName
            }
        
        return json.dumps(log_data, default=str)
    
    def _mask_sensitive(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Mask sensitive values in log data."""
        if not isinstance(data, dict):
            return data
        
        masked = {}
        for key, value in data.items():
            if any(s in key.lower() for s in self.SENSITIVE_KEYS):
                masked[key] = "***MASKED***"
            elif isinstance(value, dict):
                masked[key] = self._mask_sensitive(value)
            else:
                masked[key] = value
        return masked


class StructuredLogger(logging.Logger):
    """Logger with structured data support."""
    
    def _log_with_extra(self, level: int, msg: str, extra_data: Dict = None, **kwargs):
        if extra_data:
            kwargs.setdefault("extra", {})["extra_data"] = extra_data
        super()._log(level, msg, (), **kwargs)
    
    def info_struct(self, msg: str, **extra):
        self._log_with_extra(logging.INFO, msg, extra)
    
    def warning_struct(self, msg: str, **extra):
        self._log_with_extra(logging.WARNING, msg, extra)
    
    def error_struct(self, msg: str, **extra):
        self._log_with_extra(logging.ERROR, msg, extra)
    
    def debug_struct(self, msg: str, **extra):
        self._log_with_extra(logging.DEBUG, msg, extra)


def setup_logging(
    level: str = None,
    json_format: bool = None,
    include_source: bool = False
) -> logging.Logger:
    """
    Configure structured logging for the application.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR)
        json_format: Use JSON format (default: True in production)
        include_source: Include file/line info
    
    Returns:
        Configured root logger
    """
    # Defaults from environment
    level = level or os.environ.get("LOG_LEVEL", "INFO").upper()
    
    if json_format is None:
        json_format = os.environ.get("LOG_FORMAT", "json").lower() == "json"
    
    # Set class for all new loggers
    logging.setLoggerClass(StructuredLogger)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level, logging.INFO))
    
    # Remove existing handlers
    root_logger.handlers.clear()
    
    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, level, logging.INFO))
    
    if json_format:
        handler.setFormatter(StructuredFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
        ))
    
    root_logger.addHandler(handler)
    
    # Reduce noise from libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    return root_logger


def get_logger(name: str) -> StructuredLogger:
    """Get a structured logger instance."""
    return logging.getLogger(name)


def log_request(
    method: str,
    path: str,
    status_code: int,
    latency_ms: float,
    user_id: str = None,
    tier: str = None,
    **extra
):
    """Log an HTTP request with structured data."""
    logger = get_logger("http.request")
    
    log_data = {
        "method": method,
        "path": path,
        "status_code": status_code,
        "latency_ms": round(latency_ms, 2),
    }
    
    if user_id:
        log_data["user_id"] = user_id
    if tier:
        log_data["tier"] = tier
    
    log_data.update(extra)
    
    level = logging.INFO
    if status_code >= 500:
        level = logging.ERROR
    elif status_code >= 400:
        level = logging.WARNING
    
    logger._log_with_extra(level, f"{method} {path} {status_code}", log_data)


def log_llm_call(
    model: str,
    tokens_in: int = None,
    tokens_out: int = None,
    latency_ms: float = None,
    success: bool = True,
    hitl_level: int = None,
    **extra
):
    """Log an LLM API call with metrics."""
    logger = get_logger("llm.call")
    
    log_data = {
        "model": model,
        "success": success,
    }
    
    if tokens_in is not None:
        log_data["tokens_in"] = tokens_in
    if tokens_out is not None:
        log_data["tokens_out"] = tokens_out
    if latency_ms is not None:
        log_data["latency_ms"] = round(latency_ms, 2)
    if hitl_level is not None:
        log_data["hitl_level"] = hitl_level
    
    log_data.update(extra)
    
    level = logging.INFO if success else logging.ERROR
    logger._log_with_extra(level, f"LLM call to {model}", log_data)


def log_hitl_event(
    event_type: str,
    result_id: str = None,
    risk_level: int = None,
    risk_score: int = None,
    action: str = None,
    **extra
):
    """Log HITL events for audit trail."""
    logger = get_logger("hitl.event")
    
    log_data = {
        "event_type": event_type,
    }
    
    if result_id:
        log_data["result_id"] = result_id
    if risk_level is not None:
        log_data["risk_level"] = risk_level
    if risk_score is not None:
        log_data["risk_score"] = risk_score
    if action:
        log_data["action"] = action
    
    log_data.update(extra)
    
    logger._log_with_extra(logging.INFO, f"HITL: {event_type}", log_data)


class RequestContextMiddleware:
    """Middleware to set request context for logging."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Generate request ID
        req_id = str(uuid.uuid4())[:8]
        request_id_var.set(req_id)
        
        # Track timing
        start_time = time.time()
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Add request ID header
                headers = list(message.get("headers", []))
                headers.append((b"X-Request-ID", req_id.encode()))
                message["headers"] = headers
                
                # Log request
                latency_ms = (time.time() - start_time) * 1000
                log_request(
                    method=scope.get("method", "UNKNOWN"),
                    path=scope.get("path", "/"),
                    status_code=message.get("status", 0),
                    latency_ms=latency_ms,
                    user_id=user_id_var.get("")
                )
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)
