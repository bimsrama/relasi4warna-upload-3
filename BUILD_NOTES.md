# Build Notes

## Engineering Decisions

This document captures engineering decisions made during the production hardening of Relasi4Warna.

---

## Architecture Decisions

### 1. Monorepo Structure

**Decision:** Use `/apps/api` and `/apps/web` structure as the canonical paths.

**Rationale:** 
- Clean separation of concerns
- Standard monorepo layout
- No symlinks required in production

**Implementation:**
```
/app/apps/api    → FastAPI backend
/app/apps/web    → React frontend
```

**Note:** Local development environments (like Emergent preview) may create temporary symlinks for compatibility with their supervisor configs. These are NOT committed to git and are listed in `.gitignore`.

### 2. In-Memory Rate Limiting

**Decision:** Use in-memory rate limiting instead of Redis.

**Rationale:**
- Single-worker deployment doesn't require distributed state
- Reduces infrastructure complexity
- Sufficient for current scale

**Trade-off:** Won't work correctly with multiple backend workers. If scaling horizontally, switch to Redis-based rate limiting.

**Migration Path:**
```python
# Replace in middleware/rate_limit.py
import redis
r = redis.from_url(os.environ.get("REDIS_URL"))
# Use redis.incr() with EXPIRE for rate limit counters
```

### 3. Abuse Guard Pre-Check

**Decision:** Run abuse detection BEFORE LLM calls, not just on output.

**Rationale:**
- Prevents wasted API calls and costs
- Faster rejection of malicious requests
- Defense in depth with HITL post-check

**Implementation:**
- Abuse guard runs on user input
- High severity (9+) blocks without LLM call
- Lower severity adds to HITL risk score

### 4. Structured JSON Logging

**Decision:** JSON format for all logs in production.

**Rationale:**
- Machine-parseable for log aggregation
- Consistent schema for querying
- Includes request_id for tracing

**Configuration:**
```env
LOG_FORMAT=json  # or "text" for development
```

### 5. Optional Sentry Integration

**Decision:** Sentry is opt-in via environment variable.

**Rationale:**
- Not all deployments need paid error tracking
- Clean startup without extra dependencies
- Easy to enable when needed

**Usage:**
```env
SENTRY_DSN=https://xxx@sentry.io/xxx  # Enable
SENTRY_DSN=  # Disable (default)
```

### 6. Prometheus Metrics Format

**Decision:** Simple Prometheus-compatible metrics endpoint.

**Rationale:**
- Industry standard format
- Works with existing Prometheus/Grafana setups
- Minimal implementation overhead

**Trade-off:** In-memory metrics reset on restart. For persistent metrics, integrate with StatsD or Prometheus push gateway.

---

## Security Decisions

### 1. Rate Limits Configuration

**Decision:** Conservative rate limits for LLM endpoints.

| Endpoint | Limit | Window |
|----------|-------|--------|
| Report generation | 3 | 1 hour |
| PDF generation | 3 | 1 hour |
| Login | 5 | 5 min |

**Rationale:**
- LLM calls are expensive
- Prevents abuse and cost overruns
- User-friendly limits for legitimate use

### 2. Request Size Limit

**Decision:** 256KB default, 10MB for uploads.

**Rationale:**
- JSON payloads should never exceed 256KB
- Prevents DoS via large payloads
- Upload routes can be explicitly allowed

### 3. CORS in Production

**Decision:** No wildcard CORS in production.

**Rationale:**
- Security best practice
- Prevents unauthorized cross-origin requests
- Must explicitly list allowed origins

**Configuration:**
```env
# Development
CORS_ORIGINS=*

# Production
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## LLM Decisions

### 1. Model Fallback Chain

**Decision:** Primary (gpt-4o) → Fallback (gpt-4o-mini) → Error.

**Rationale:**
- High availability for report generation
- Cost optimization when primary fails
- Clear error when all models fail

### 2. Token Limits

**Decision:** Separate limits for Premium (4096) and Elite (8192).

**Rationale:**
- Elite reports are more comprehensive
- Cost control per tier
- Prevents runaway token usage

### 3. Daily Budget

**Decision:** Optional daily budget cap.

**Rationale:**
- Prevents unexpected cost spikes
- Configurable per deployment
- Disabled by default (0 = no limit)

---

## Testing Decisions

### 1. k6 for Load Tests

**Decision:** Use k6 instead of Locust or JMeter.

**Rationale:**
- Modern JavaScript-based tool
- Lightweight and fast
- Good Grafana integration
- Active community

### 2. Smoke Test in CI

**Decision:** Health endpoint smoke test in GitHub Actions.

**Rationale:**
- Validates server starts correctly
- Catches import/config errors
- Fast feedback loop

---

## Deployment Decisions

### 1. Docker Compose for VPS

**Decision:** Single docker-compose.yml for all services.

**Rationale:**
- Simple deployment: one command
- Self-contained environment
- Easy to backup and restore

**Trade-off:** Not suitable for large-scale deployments. Use Kubernetes for horizontal scaling.

### 2. Health Check Endpoint

**Decision:** Simple `/api/health` returning `{"status":"healthy"}`.

**Rationale:**
- Standard pattern for load balancers
- Minimal overhead
- Easy to extend with dependency checks

---

## Self-Hosting Migration (January 2025)

### Removed Dependencies
- `emergentintegrations` Python package
- Emergent auth session endpoint
- All references to `emergent.sh` platform

### Added Components
- Direct OpenAI SDK integration
- Security middleware (rate limit, request size, headers)
- Prompt abuse guard
- Structured logging
- Optional Sentry integration
- k6 load test scripts

---

## Known Limitations

### 1. Single Worker

Current deployment uses single uvicorn worker. Rate limiting is in-memory.

**Impact:** Rate limits may not be accurate across restarts.

**Mitigation:** For multi-worker, switch to Redis rate limiting.

### 2. No Redis

No Redis dependency for simplicity.

**Impact:** 
- Rate limits reset on restart
- No distributed caching
- Sessions are JWT-only

**Mitigation:** Add Redis when scaling needs justify complexity.

### 3. No File Upload Storage

User file uploads not implemented.

**Impact:** Profile pictures, attachments not supported.

**Future:** Add S3-compatible storage if needed.

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-22 | 1.0.0 | Initial production hardening, self-host migration |

---

## Contact

For questions about these decisions:
- Create an issue in the repository
- Or contact the maintainers directly
