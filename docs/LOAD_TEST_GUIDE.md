# Load Test Guide

## Overview

Load tests verify system stability under concurrent user load, focusing on:
- Premium AI report generation
- PDF generation
- Abuse detection effectiveness

---

## Prerequisites

### Install k6

```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

### Test User Setup

Ensure test user exists with paid results:

```bash
# Login to get token
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"testpassword"}'

# Verify user has paid results
curl http://localhost:8001/api/quiz/history \
  -H "Authorization: Bearer <token>"
```

---

## Test Scripts

### 1. Premium Report Generation

Tests AI report generation under load.

```bash
# Basic run
k6 run scripts/load/k6_premium_report.js

# Custom parameters
k6 run \
  -e BASE_URL=https://api.yourdomain.com \
  -e TEST_EMAIL=loadtest@test.com \
  -e TEST_PASSWORD=testpassword \
  --vus 10 \
  --duration 5m \
  scripts/load/k6_premium_report.js
```

**Expected Results:**
- p95 latency < 45s
- Error rate < 10%
- All health checks passing

### 2. PDF Generation

Tests PDF report generation under load.

```bash
k6 run scripts/load/k6_pdf_generation.js

# Higher load
k6 run --vus 20 --duration 3m scripts/load/k6_pdf_generation.js
```

**Expected Results:**
- p95 latency < 15s
- Error rate < 10%
- Valid PDF content returned

### 3. Abuse Detection

Verifies security controls under adversarial load.

```bash
k6 run scripts/load/k6_abuse_attempts.js
```

**Expected Results:**
- >90% of abuse attempts blocked
- No system errors
- Safe responses returned

---

## Test Scenarios

### Scenario 1: Normal Load

Simulates typical daily usage.

```bash
k6 run \
  --vus 5 \
  --duration 10m \
  scripts/load/k6_premium_report.js
```

### Scenario 2: Peak Load

Simulates traffic spike (e.g., marketing campaign).

```bash
k6 run \
  --vus 50 \
  --duration 5m \
  scripts/load/k6_premium_report.js
```

### Scenario 3: Stress Test

Find breaking point.

```bash
k6 run \
  --vus 100 \
  --duration 2m \
  scripts/load/k6_premium_report.js
```

### Scenario 4: Soak Test

Long-running stability test.

```bash
k6 run \
  --vus 10 \
  --duration 1h \
  scripts/load/k6_premium_report.js
```

---

## Cost Guardrails

### Environment Variables

```env
# Maximum tokens per premium report
LLM_MAX_TOKENS_PREMIUM=4096

# Maximum tokens per elite report
LLM_MAX_TOKENS_ELITE=8192

# Daily budget in USD (optional)
LLM_DAILY_BUDGET_USD=50

# Rate limit for LLM calls
LLM_RATE_LIMIT_PER_MINUTE=60
```

### Cost Estimation

| Model | Input (1K tokens) | Output (1K tokens) |
|-------|-------------------|---------------------|
| gpt-4o | $0.005 | $0.015 |
| gpt-4o-mini | $0.00015 | $0.0006 |

**Per Report Estimate:**
- Premium report (gpt-4o): ~$0.05-0.10
- Elite report (gpt-4o): ~$0.10-0.20
- Fallback (gpt-4o-mini): ~$0.005

### Budget Monitoring

```python
# Implement in LLM provider
daily_cost = 0

def check_budget():
    budget = float(os.environ.get("LLM_DAILY_BUDGET_USD", 0))
    if budget > 0 and daily_cost >= budget:
        raise BudgetExceededException("Daily LLM budget exceeded")
```

---

## Interpreting Results

### k6 Output

```
     scenarios: (100.00%) 1 scenario, 10 max VUs, 2m30s max duration
     
     ✓ report generated
     ✓ has content
     ✓ has hitl_status
     
     checks.........................: 98.52% ✓ 597      ✗ 9
     data_received..................: 15 MB  125 kB/s
     data_sent......................: 1.2 MB 10 kB/s
     http_req_duration..............: avg=5.2s min=2.1s med=4.8s max=42s p(90)=8.2s p(95)=12.5s
     iterations.....................: 203    1.69/s
     report_generation_latency......: avg=5.1s min=2.0s med=4.7s max=41s p(90)=8.0s p(95)=12.3s
```

### Key Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Error rate | <1% | 1-5% | >5% |
| p95 latency (report) | <30s | 30-45s | >45s |
| p95 latency (PDF) | <10s | 10-15s | >15s |
| Throughput | >1 rps | 0.5-1 rps | <0.5 rps |

---

## Troubleshooting

### High Error Rate

1. Check backend logs: `docker compose logs backend`
2. Verify OpenAI API key is valid
3. Check rate limits aren't exhausted
4. Verify MongoDB connectivity

### Slow Response Times

1. Check LLM latency specifically
2. Verify server resources (CPU, memory)
3. Check for connection pool exhaustion
4. Review concurrent request handling

### Budget Issues

1. Monitor token usage in logs
2. Implement model fallback (gpt-4o → gpt-4o-mini)
3. Cache frequently requested reports
4. Set appropriate rate limits

---

## CI Integration

### GitHub Actions

```yaml
load-test:
  name: Load Test
  runs-on: ubuntu-latest
  needs: [integration]
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  
  steps:
    - uses: actions/checkout@v4
    
    - name: Setup k6
      run: |
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update && sudo apt-get install k6
    
    - name: Run smoke test
      run: |
        k6 run --vus 2 --duration 30s scripts/load/k6_premium_report.js
      env:
        BASE_URL: ${{ secrets.STAGING_API_URL }}
```

---

## Reporting

### Generate HTML Report

```bash
k6 run --out json=results.json scripts/load/k6_premium_report.js

# Convert to HTML (requires k6-reporter)
npm install -g k6-reporter
k6-reporter results.json
```

### Export to Grafana

```bash
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  scripts/load/k6_premium_report.js
```

Then visualize in Grafana with k6 dashboard.
