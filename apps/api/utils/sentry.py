"""
Sentry Integration (Optional)
=============================
Error tracking and performance monitoring.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_sentry_initialized = False


def init_sentry() -> bool:
    """
    Initialize Sentry SDK if SENTRY_DSN is configured.
    
    Returns:
        True if Sentry was initialized, False otherwise
    """
    global _sentry_initialized
    
    if _sentry_initialized:
        return True
    
    sentry_dsn = os.environ.get("SENTRY_DSN", "").strip()
    
    if not sentry_dsn:
        logger.info("Sentry DSN not configured, skipping initialization")
        return False
    
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        
        environment = os.environ.get("ENVIRONMENT", "production")
        release = os.environ.get("APP_VERSION", "1.0.0")
        
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            release=f"relasi4warna@{release}",
            
            # Performance monitoring
            traces_sample_rate=float(os.environ.get("SENTRY_TRACES_RATE", "0.1")),
            profiles_sample_rate=float(os.environ.get("SENTRY_PROFILES_RATE", "0.1")),
            
            # Integrations
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                StarletteIntegration(transaction_style="endpoint"),
                LoggingIntegration(
                    level=logging.WARNING,
                    event_level=logging.ERROR
                ),
            ],
            
            # Data scrubbing
            send_default_pii=False,
            before_send=_scrub_sensitive_data,
            
            # Ignore certain errors
            ignore_errors=[
                KeyboardInterrupt,
                SystemExit,
            ],
        )
        
        _sentry_initialized = True
        logger.info(f"Sentry initialized for environment: {environment}")
        return True
        
    except ImportError:
        logger.warning("sentry-sdk not installed, skipping Sentry initialization")
        return False
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")
        return False


def _scrub_sensitive_data(event, hint):
    """Scrub sensitive data from Sentry events."""
    
    sensitive_keys = {
        "password", "token", "secret", "api_key", "apikey",
        "authorization", "cookie", "credit_card", "ssn",
        "openai_api_key", "midtrans_server_key"
    }
    
    def scrub_dict(d):
        if not isinstance(d, dict):
            return d
        
        scrubbed = {}
        for key, value in d.items():
            if any(s in key.lower() for s in sensitive_keys):
                scrubbed[key] = "[REDACTED]"
            elif isinstance(value, dict):
                scrubbed[key] = scrub_dict(value)
            elif isinstance(value, list):
                scrubbed[key] = [scrub_dict(item) if isinstance(item, dict) else item for item in value]
            else:
                scrubbed[key] = value
        return scrubbed
    
    # Scrub request data
    if "request" in event:
        event["request"] = scrub_dict(event["request"])
    
    # Scrub extra data
    if "extra" in event:
        event["extra"] = scrub_dict(event["extra"])
    
    # Scrub contexts
    if "contexts" in event:
        event["contexts"] = scrub_dict(event["contexts"])
    
    return event


def capture_exception(error: Exception, **extra):
    """Capture an exception to Sentry if configured."""
    if not _sentry_initialized:
        return
    
    try:
        import sentry_sdk
        with sentry_sdk.push_scope() as scope:
            for key, value in extra.items():
                scope.set_extra(key, value)
            sentry_sdk.capture_exception(error)
    except Exception:
        pass


def capture_message(message: str, level: str = "info", **extra):
    """Capture a message to Sentry if configured."""
    if not _sentry_initialized:
        return
    
    try:
        import sentry_sdk
        with sentry_sdk.push_scope() as scope:
            for key, value in extra.items():
                scope.set_extra(key, value)
            sentry_sdk.capture_message(message, level=level)
    except Exception:
        pass


def set_user_context(user_id: str, email: str = None, tier: str = None):
    """Set user context for Sentry events."""
    if not _sentry_initialized:
        return
    
    try:
        import sentry_sdk
        sentry_sdk.set_user({
            "id": user_id,
            "email": email,
            "tier": tier
        })
    except Exception:
        pass
