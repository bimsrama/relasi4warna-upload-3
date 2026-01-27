# Observability Guide

## Overview

Relasi4Warna implements structured logging, optional error tracking, and metrics for production monitoring.

---

## Structured Logging

### Configuration

```env
LOG_LEVEL=INFO           # DEBUG, INFO, WARNING, ERROR
LOG_FORMAT=json          # json or text
LOG_INCLUDE_SOURCE=false # Include file/line in logs
```

### Log Format (JSON)

```json
{
  "timestamp": "2025-01-22T14:30:00.000Z",
  "level": "INFO",
  "logger": "http.request",
  "message": "GET /api/quiz/series 200",
  "request_id": "a1b2c3d4",
  "user_id": "user_abc123",
  "method": "GET",
  "path": "/api/quiz/series",
  "status_code": 200,
  "latency_ms": 45.23
}
```

### Log Categories

| Logger | Description |
|--------|-------------|
| `http.request` | HTTP request/response logs |
| `llm.call` | LLM API calls with tokens/latency |
| `hitl.event` | HITL risk assessments and decisions |
| `auth` | Authentication events |
| `payment` | Payment transactions |
| `server` | Application lifecycle |

### LLM Call Logging

```json
{
  "timestamp": "2025-01-22T14:30:15.000Z",
  "level": "INFO",
  "logger": "llm.call",
  "message": "LLM call to gpt-4o",
  "model": "gpt-4o",
  "tokens_in": 1500,
  "tokens_out": 2000,
  "latency_ms": 5432.10,
  "success": true,
  "hitl_level": 1
}
```

### HITL Event Logging

```json
{
  "timestamp": "2025-01-22T14:30:20.000Z",
  "level": "WARNING",
  "logger": "hitl.event",
  "message": "HITL: risk_assessment",
  "event_type": "risk_assessment",
  "result_id": "result_abc123",
  "risk_level": 3,
  "risk_score": 75,
  "action": "blocked"
}
```

---

## Sentry Integration (Optional)

### Setup

```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_TRACES_RATE=0.1    # 10% of transactions
SENTRY_PROFILES_RATE=0.1  # 10% profiling
ENVIRONMENT=production
APP_VERSION=1.0.0
```

### Features

- **Error tracking:** Automatic exception capture
- **Performance:** Transaction traces
- **Profiling:** CPU/memory profiling
- **Alerting:** Real-time notifications

### Data Scrubbing

Sensitive data automatically redacted:
- Passwords, tokens, API keys
- Credit card numbers
- Personal identifiers

### Usage in Code

```python
from utils.sentry import capture_exception, capture_message

try:
    risky_operation()
except Exception as e:
    capture_exception(e, user_id=user_id, context="report_generation")
```

---

## Metrics Endpoint

### Enable Metrics

```env
METRICS_TOKEN=your-secret-token  # Protect /metrics endpoint
```

### Endpoint

```
GET /api/metrics
Authorization: Bearer your-secret-token
```

### Available Metrics (Prometheus Format)

```
# HTTP Requests
http_requests_total{method="GET",path="/api/quiz/series",status="200"} 1234
http_request_duration_ms_sum{method="GET",path="/api/quiz/series"} 56789
http_request_duration_ms_count{method="GET",path="/api/quiz/series"} 1234

# LLM Calls
llm_calls_total{model="gpt-4o",status="success"} 567
llm_tokens_total{model="gpt-4o"} 1234567
llm_latency_ms_sum{model="gpt-4o"} 2345678
llm_latency_ms_count{model="gpt-4o"} 567

# HITL Events
hitl_events_total{level="1",action="approved"} 890
hitl_events_total{level="2",action="buffered"} 45
hitl_events_total{level="3",action="blocked"} 12
```

### Prometheus Scrape Config

```yaml
scrape_configs:
  - job_name: 'relasi4warna'
    static_configs:
      - targets: ['api.yourdomain.com']
    metrics_path: '/api/metrics'
    bearer_token: 'your-secret-token'
```

---

## Log Aggregation

### Option A: Docker Logs + Loki

```yaml
# docker-compose.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Use Promtail to ship to Loki/Grafana.

### Option B: CloudWatch (AWS)

```yaml
logging:
  driver: "awslogs"
  options:
    awslogs-group: "relasi4warna"
    awslogs-region: "ap-southeast-1"
    awslogs-stream-prefix: "backend"
```

### Option C: Datadog

```yaml
logging:
  driver: "datadog"
  options:
    datadog.api-key: "${DD_API_KEY}"
```

---

## Health Checks

### Endpoint

```
GET /api/health

Response:
{
  "status": "healthy"
}
```

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8001/api/health || exit 1
```

### Load Balancer Health Check

Configure your load balancer to check:
- Path: `/api/health`
- Expected: HTTP 200
- Interval: 30s
- Timeout: 10s
- Unhealthy threshold: 3

---

## Alerting

### Recommended Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | >5% 5xx in 5 min | Critical |
| Slow Response | p95 >5s in 5 min | Warning |
| HITL Queue Full | >50 pending items | Warning |
| LLM Failures | >10% failures | Critical |
| Memory High | >80% usage | Warning |
| Disk Full | >90% usage | Critical |

### Sentry Alert Rules

1. Go to Sentry → Alerts → Create Alert
2. Set conditions:
   - Error count > 10 in 10 minutes
   - Transaction duration > 30s
3. Configure notification (Slack, email)

### Grafana Alert Example

```yaml
alert:
  name: High Error Rate
  condition:
    - query: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
  for: 5m
  severity: critical
```

---

## Debugging

### View Logs

```bash
# All services
docker compose logs -f

# Backend only, last 100 lines
docker compose logs -f --tail=100 backend

# Filter by level
docker compose logs backend | jq 'select(.level == "ERROR")'

# Search for request
docker compose logs backend | jq 'select(.request_id == "a1b2c3d4")'
```

### Trace Request

1. Get request ID from response header: `X-Request-ID`
2. Search logs: `grep "a1b2c3d4" logs/*.log`
3. View in Sentry if integrated

### Performance Analysis

```bash
# LLM latency analysis
docker compose logs backend | jq 'select(.logger == "llm.call") | .latency_ms' | sort -n

# Slow requests
docker compose logs backend | jq 'select(.latency_ms > 5000)'
```

---

## Dashboard Recommendations

### Grafana Panels

1. **Request Rate** - Requests per second by status
2. **Error Rate** - 5xx percentage over time
3. **Latency Distribution** - p50, p95, p99
4. **LLM Usage** - Tokens consumed, cost estimate
5. **HITL Funnel** - Level 1/2/3 distribution
6. **Active Users** - Unique users per hour

### Business Metrics

- Quiz completions per day
- Report generations per day
- Payment success rate
- User signups per day
- Tier distribution
