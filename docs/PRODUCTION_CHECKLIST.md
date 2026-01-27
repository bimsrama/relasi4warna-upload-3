# Production Checklist

## Pre-Launch Requirements

### 1. Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Set strong `JWT_SECRET` (minimum 32 characters, random)
- [ ] Configure `OPENAI_API_KEY` with valid key
- [ ] Set `MONGO_URL` to production MongoDB (Atlas recommended)
- [ ] Configure `MIDTRANS_SERVER_KEY` and `MIDTRANS_CLIENT_KEY` (production keys)
- [ ] Set `MIDTRANS_IS_PRODUCTION=true`
- [ ] Configure `CORS_ORIGINS` (no wildcards in production)
- [ ] Set `REACT_APP_BACKEND_URL` to production API domain

### 2. Security
- [ ] Enable rate limiting: `RATE_LIMIT_ENABLED=true`
- [ ] Set request size limits: `REQUEST_MAX_SIZE_KB=256`
- [ ] Configure CORS properly (specific origins only)
- [ ] Verify security headers are active
- [ ] Enable HTTPS/TLS (via Cloudflare or Caddy)
- [ ] Review admin credentials (change default password)

### 3. Database
- [ ] MongoDB Atlas or self-hosted with authentication
- [ ] Create indexes: `python scripts/create_indexes.py`
- [ ] Configure backups (daily recommended)
- [ ] Set up monitoring alerts

### 4. Observability
- [ ] Set `LOG_FORMAT=json` for structured logs
- [ ] Configure `SENTRY_DSN` (optional but recommended)
- [ ] Set appropriate `LOG_LEVEL` (INFO for production)
- [ ] Verify `/api/health` endpoint works

### 5. LLM Configuration
- [ ] Set cost guardrails:
  - `LLM_MAX_TOKENS_PREMIUM=4096`
  - `LLM_MAX_TOKENS_ELITE=8192`
  - `LLM_DAILY_BUDGET_USD=50` (optional)
- [ ] Configure fallback model: `OPENAI_MODEL_FALLBACK=gpt-4o-mini`
- [ ] Set timeout: `OPENAI_TIMEOUT_SECONDS=45`

### 6. Payment Gateway
- [ ] Midtrans production keys configured
- [ ] Webhook URL registered in Midtrans dashboard
- [ ] Test transaction flow in production mode
- [ ] Verify payment status callbacks

### 7. Email (Optional)
- [ ] Configure `RESEND_API_KEY` if email needed
- [ ] Verify sender domain in Resend dashboard
- [ ] Test password reset flow

### 8. DNS & TLS
- [ ] Point domain to server IP
- [ ] Configure TLS certificate:
  - Option A: Cloudflare Full Strict
  - Option B: Caddy auto-TLS
  - Option C: Let's Encrypt with certbot
- [ ] Verify HTTPS works

### 9. Docker Deployment
- [ ] `docker compose up -d --build`
- [ ] Verify all containers healthy: `docker compose ps`
- [ ] Check logs: `docker compose logs -f`
- [ ] Test health endpoint: `curl -f http://localhost:8001/api/health`

### 10. CI/CD
- [ ] GitHub Actions configured
- [ ] All tests passing
- [ ] Docker images building
- [ ] No `|| true` in CI

---

## Post-Launch Monitoring

### Daily Checks
- [ ] Health endpoint status
- [ ] Error rate in logs
- [ ] Payment success rate
- [ ] LLM token usage

### Weekly Checks
- [ ] HITL moderation queue review
- [ ] Cost analysis (LLM spend)
- [ ] Performance metrics
- [ ] Security scan

### Monthly Checks
- [ ] Dependency updates
- [ ] Database backup verification
- [ ] Load test execution
- [ ] Security audit

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| DevOps | TBD |
| Security | TBD |
| Product | TBD |

---

## Rollback Procedure

```bash
# 1. Stop current deployment
docker compose down

# 2. Checkout previous version
git checkout <previous-tag>

# 3. Rebuild and deploy
docker compose up -d --build

# 4. Verify
curl -f http://localhost:8001/api/health
```
