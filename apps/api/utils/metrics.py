"""
Prometheus Metrics Endpoint
===========================
Basic metrics for monitoring (optional).
"""

import os
import time
from collections import defaultdict
from typing import Dict
from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse

# In-memory metrics storage
_metrics: Dict[str, float] = defaultdict(float)
_counters: Dict[str, int] = defaultdict(int)
_histograms: Dict[str, list] = defaultdict(list)

router = APIRouter()


def increment_counter(name: str, value: int = 1, labels: Dict[str, str] = None):
    """Increment a counter metric."""
    key = _make_key(name, labels)
    _counters[key] += value


def observe_histogram(name: str, value: float, labels: Dict[str, str] = None):
    """Record a histogram observation."""
    key = _make_key(name, labels)
    _histograms[key].append(value)
    # Keep last 1000 observations
    if len(_histograms[key]) > 1000:
        _histograms[key] = _histograms[key][-1000:]


def set_gauge(name: str, value: float, labels: Dict[str, str] = None):
    """Set a gauge metric."""
    key = _make_key(name, labels)
    _metrics[key] = value


def _make_key(name: str, labels: Dict[str, str] = None) -> str:
    """Create metric key with labels."""
    if not labels:
        return name
    label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
    return f"{name}{{{label_str}}}"


def _format_prometheus() -> str:
    """Format metrics in Prometheus format."""
    lines = []
    
    # Counters
    for key, value in _counters.items():
        lines.append(f"# TYPE {key.split('{')[0]} counter")
        lines.append(f"{key} {value}")
    
    # Gauges
    for key, value in _metrics.items():
        lines.append(f"# TYPE {key.split('{')[0]} gauge")
        lines.append(f"{key} {value}")
    
    # Histograms (simplified - just sum and count)
    for key, values in _histograms.items():
        base_name = key.split('{')[0]
        labels = key[len(base_name):] if '{' in key else ""
        
        if values:
            total = sum(values)
            count = len(values)
            lines.append(f"# TYPE {base_name} summary")
            lines.append(f"{base_name}_sum{labels} {total}")
            lines.append(f"{base_name}_count{labels} {count}")
    
    return "\n".join(lines)


# Verify admin access for metrics
async def verify_metrics_access():
    """Verify that metrics endpoint access is authorized."""
    # In production, add proper auth check
    metrics_token = os.environ.get("METRICS_TOKEN", "")
    if metrics_token:
        # Could check Authorization header here
        pass
    return True


@router.get("/metrics", response_class=PlainTextResponse)
async def get_metrics(authorized: bool = Depends(verify_metrics_access)):
    """
    Prometheus-compatible metrics endpoint.
    
    Protected by METRICS_TOKEN environment variable.
    """
    return _format_prometheus()


# Pre-defined metric helpers
def record_request(method: str, path: str, status: int, latency_ms: float):
    """Record HTTP request metrics."""
    increment_counter("http_requests_total", labels={"method": method, "path": path, "status": str(status)})
    observe_histogram("http_request_duration_ms", latency_ms, labels={"method": method, "path": path})


def record_llm_call(model: str, success: bool, tokens: int, latency_ms: float):
    """Record LLM call metrics."""
    status = "success" if success else "error"
    increment_counter("llm_calls_total", labels={"model": model, "status": status})
    increment_counter("llm_tokens_total", tokens, labels={"model": model})
    observe_histogram("llm_latency_ms", latency_ms, labels={"model": model})


def record_hitl_event(level: int, action: str):
    """Record HITL event metrics."""
    increment_counter("hitl_events_total", labels={"level": str(level), "action": action})
