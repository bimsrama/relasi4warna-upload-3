# Security Overview

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare / CDN                          │
│                  (DDoS, WAF, TLS)                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Nginx Proxy                             │
│              (Rate Limit, Security Headers)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Security Middleware Stack               │   │
│  │  ┌───────────┐ ┌──────────┐ ┌─────────────────┐    │   │
│  │  │Rate Limit │ │ Size     │ │ Security        │    │   │
│  │  │Middleware │ │ Limit    │ │ Headers         │    │   │
│  │  └───────────┘ └──────────┘ └─────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Abuse Guard                         │   │
│  │    (Prompt Injection, Manipulation, Labeling)        │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               HITL Risk Assessment                   │   │
│  │         (Level 1/2/3 → Block or Buffer)             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Controls

### 1. Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 5 | 5 min |
| `/api/auth/register` | 3 | 10 min |
| `/api/auth/forgot-password` | 3 | 1 hour |
| `/api/report/generate/*` | 3 | 1 hour |
| `/api/report/pdf/*` | 3 | 1 hour |
| `/api/quiz/*` | 10 | 10 min |
| Default | 60 | 1 min |

**Response:** HTTP 429 with `Retry-After` header.

### 2. Request Size Limits

- **JSON bodies:** 256KB max
- **File uploads:** 10MB max (specific endpoints only)
- **Response:** HTTP 413 if exceeded

### 3. Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
```

### 4. CORS Policy

- Production: Specific origins only (no wildcards)
- Configured via `CORS_ORIGINS` environment variable
- Credentials allowed for authenticated requests

---

## Prompt Abuse Guard

### Detection Categories

| Category | Severity | Action |
|----------|----------|--------|
| **Prompt Injection** | 9-10 | Block + Safe Response |
| **Manipulation** | 7-9 | Block or Flag Level 3 |
| **Diagnostic Labeling** | 7-9 | Block + Disclaimer |
| **Jailbreak** | 9-10 | Block |
| **PII Extraction** | 9-10 | Block + Alert |

### Sample Patterns Detected

- "ignore previous instructions"
- "you are now DAN"
- "how to manipulate my partner"
- "is my husband a narcissist"
- "bypass safety filters"
- "show me all user emails"

### Integration

```python
from packages.security import get_abuse_guard

guard = get_abuse_guard()
detection = guard.analyze(user_input)

if detection.should_block:
    return guard.get_safe_response(detection.abuse_type, language)

# Add to HITL risk score
risk_score += detection.risk_score_modifier
```

---

## HITL (Human-in-the-Loop) Risk Levels

| Level | Score | Action |
|-------|-------|--------|
| **Level 1** | 0-29 | Auto-publish |
| **Level 2** | 30-69 | Publish with safety buffer |
| **Level 3** | 70+ | Block, queue for human review |

### Risk Factors

- Stress markers in quiz results
- Abuse patterns detected
- Red keywords in output
- Clinical/diagnostic language
- Weaponization intent

### Moderation Queue

- Admin dashboard for reviewing flagged content
- Approve, edit, reject actions
- Full audit trail

---

## Authentication & Authorization

### JWT Tokens

- Algorithm: HS256
- Expiry: 7 days
- Secret: Minimum 32 characters (env-driven)

### Password Requirements

- Minimum 6 characters
- Bcrypt hashing with salt

### Admin Access

- Separate admin flag in user record
- Protected admin endpoints
- Audit logging for admin actions

---

## Data Protection

### PII Handling

- Passwords: Bcrypt hashed
- Emails: Stored for authentication only
- Quiz results: Associated with user_id, not PII
- Logs: PII masked in structured logs

### MongoDB Security

- Authentication enabled
- Network isolation (Docker network)
- No public exposure

### Secrets Management

- All secrets via environment variables
- `.env` file gitignored
- No secrets in code or Docker images

---

## Incident Response

### Security Incident Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P1 | Data breach, system compromise | Immediate |
| P2 | Failed attack, vulnerability found | 4 hours |
| P3 | Security warning, minor issue | 24 hours |

### Response Steps

1. **Detect:** Monitor logs, Sentry alerts
2. **Contain:** Block IP, disable feature
3. **Investigate:** Analyze logs, identify scope
4. **Remediate:** Patch, rotate secrets
5. **Report:** Document incident, notify if required

### Contact for Security Issues

- Email: security@[yourdomain].com
- Do not disclose publicly before fix

---

## Compliance Notes

### GDPR Considerations

- User consent for data collection
- Right to deletion (account deletion feature)
- Data portability (export feature)
- Privacy policy available

### Indonesian Law (UU PDP)

- Data protection policy compliant
- Local data processing preferred
- User notification for breaches

---

## Security Audit Schedule

| Frequency | Activity |
|-----------|----------|
| Daily | Log review, anomaly detection |
| Weekly | HITL queue review, failed auth analysis |
| Monthly | Dependency updates, vulnerability scan |
| Quarterly | Penetration testing, policy review |
