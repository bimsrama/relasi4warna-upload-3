# Runbook: Go Live

## Overview

This runbook guides the deployment of Relasi4Warna to production.

**Estimated Time:** 30-60 minutes  
**Prerequisites:** Docker, domain, SSL certificate (or Cloudflare)

---

## Phase 1: Infrastructure Setup (15 min)

### 1.1 Server Requirements

- **Minimum:** 2 vCPU, 4GB RAM, 40GB SSD
- **Recommended:** 4 vCPU, 8GB RAM, 80GB SSD
- **OS:** Ubuntu 22.04 LTS or Debian 12

### 1.2 Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### 1.3 Clone Repository

```bash
cd /opt
git clone https://github.com/your-org/relasi4warna.git
cd relasi4warna
```

---

## Phase 2: Configuration (10 min)

### 2.1 Environment File

```bash
cp .env.example .env
nano .env
```

**Required Variables:**

```env
# Security (CHANGE THESE!)
JWT_SECRET=<random-64-char-string>

# Database
MONGO_URL=mongodb://mongo:27017/relasi4warna
DB_NAME=relasi4warna

# LLM
OPENAI_API_KEY=sk-your-production-key
OPENAI_MODEL_PREMIUM=gpt-4o
OPENAI_MODEL_FALLBACK=gpt-4o-mini

# Payment (PRODUCTION)
MIDTRANS_SERVER_KEY=Mid-server-xxxxx
MIDTRANS_CLIENT_KEY=Mid-client-xxxxx
MIDTRANS_MERCHANT_ID=Gxxxxxxx
MIDTRANS_IS_PRODUCTION=true

# Frontend
REACT_APP_BACKEND_URL=https://api.yourdomain.com

# Security
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_ENABLED=true
```

### 2.2 Generate JWT Secret

```bash
openssl rand -hex 32
```

---

## Phase 3: Deploy (10 min)

### 3.1 Build and Start

```bash
docker compose up -d --build
```

### 3.2 Verify Containers

```bash
docker compose ps
# All should show "healthy" or "running"
```

### 3.3 Check Logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend
```

### 3.4 Health Check

```bash
curl -f http://localhost:8001/api/health
# Expected: {"status":"healthy"}
```

---

## Phase 4: DNS & TLS (15 min)

### Option A: Cloudflare (Recommended)

1. Add domain to Cloudflare
2. Create A record: `api.yourdomain.com` → server IP
3. Create A record: `yourdomain.com` → server IP
4. Set SSL/TLS to "Full (Strict)"
5. Enable "Always Use HTTPS"

### Option B: Caddy (Auto TLS)

Replace nginx with Caddy in docker-compose:

```yaml
caddy:
  image: caddy:2
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
```

**Caddyfile:**
```
yourdomain.com {
    reverse_proxy frontend:80
}

api.yourdomain.com {
    reverse_proxy backend:8001
}
```

### Option C: Let's Encrypt + Nginx

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

---

## Phase 5: Post-Deploy Verification (10 min)

### 5.1 API Tests

```bash
# Health
curl -f https://api.yourdomain.com/api/health

# Quiz series
curl https://api.yourdomain.com/api/quiz/series

# Auth (test login)
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"testpassword"}'
```

### 5.2 Frontend Verification

1. Open https://yourdomain.com
2. Verify homepage loads
3. Test login flow
4. Test quiz flow
5. Verify payment redirect works

### 5.3 Midtrans Webhook

1. Go to Midtrans Dashboard → Settings → Payment Notification URL
2. Set: `https://api.yourdomain.com/api/payment/webhook`
3. Test with sandbox transaction first

---

## Phase 6: Monitoring Setup

### 6.1 Basic Log Monitoring

```bash
# Create log rotation
cat > /etc/logrotate.d/relasi4warna << 'EOF'
/var/log/relasi4warna/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
EOF
```

### 6.2 Uptime Monitoring

Set up external monitoring for:
- `https://api.yourdomain.com/api/health`
- `https://yourdomain.com`

Recommended tools: UptimeRobot, Pingdom, or Healthchecks.io

### 6.3 Sentry (Optional)

```bash
# Add to .env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs backend

# Common issues:
# - MongoDB not ready: wait and retry
# - Missing env vars: check .env
# - Port conflict: check `netstat -tlnp`
```

### API Returns 502

```bash
# Check if backend is healthy
docker compose ps backend

# Restart backend
docker compose restart backend
```

### Payment Webhook Fails

1. Verify webhook URL in Midtrans dashboard
2. Check backend logs for errors
3. Ensure signature validation is correct
4. Test with curl:
```bash
curl -X POST https://api.yourdomain.com/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"order_id":"test","transaction_status":"settlement"}'
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Limit resources in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
```

---

## Maintenance Commands

```bash
# View logs
docker compose logs -f --tail=100

# Restart all services
docker compose restart

# Update and redeploy
git pull
docker compose up -d --build

# Backup MongoDB
docker compose exec mongo mongodump --out /backup

# Scale backend (if needed)
docker compose up -d --scale backend=2
```

---

## SLA Targets

| Metric | Target |
|--------|--------|
| Uptime | 99.5% |
| API Response (p95) | < 500ms |
| Report Generation (p95) | < 45s |
| Error Rate | < 1% |

---

## Contact

For issues during deployment, contact:
- Technical: [your-email]
- Emergency: [your-phone]
