"""
Utils Package
=============
Logging, metrics, and observability utilities.
"""

from .logging import (
    setup_logging,
    get_logger,
    log_request,
    log_llm_call,
    log_hitl_event,
    RequestContextMiddleware,
    request_id_var,
    user_id_var
)

from .sentry import (
    init_sentry,
    capture_exception,
    capture_message,
    set_user_context
)

from .metrics import (
    increment_counter,
    observe_histogram,
    set_gauge,
    record_request,
    record_llm_call,
    record_hitl_event
)

__all__ = [
    # Logging
    "setup_logging",
    "get_logger",
    "log_request",
    "log_llm_call", 
    "log_hitl_event",
    "RequestContextMiddleware",
    "request_id_var",
    "user_id_var",
    # Sentry
    "init_sentry",
    "capture_exception",
    "capture_message",
    "set_user_context",
    # Metrics
    "increment_counter",
    "observe_histogram",
    "set_gauge",
    "record_request",
    "record_llm_call",
    "record_hitl_event",
]
