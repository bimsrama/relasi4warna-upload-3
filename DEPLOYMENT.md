# =============================================================================
# RELASI4WARNA + RELASI4™ - DEPLOYMENT RUNBOOK
# =============================================================================
# This guide covers deploying the application to your own server.
# No Emergent platform dependencies - fully self-hosted.
# =============================================================================

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [DNS & SSL Setup](#dns--ssl-setup)
4. [Application Deployment](#application-deployment)
5. [RELASI4™ Seed](#relasi4-seed)
6. [Midtrans Webhook Configuration](#midtrans-webhook-configuration)
7. [Smoke Test](#smoke-test)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 22.04 LTS (recommended) or any Linux with Docker support
- **RAM**: Minimum 2GB (4GB recommended)
- **CPU**: 2 cores minimum
- **Storage**: 20GB minimum
- **Ports**: 80, 443 open

### Software Requirements
- Docker 24.0+
- Docker Compose v2.20+
- Git

### External Services
- **MongoDB Atlas** account (or self-hosted MongoDB)
- **OpenAI API** key (for AI features)
- **Midtrans** account (for payments)
- Domain name with DNS access

---

## Server Setup

### 1. Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 2. Clone Repository

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/relasi4warna.git
cd relasi4warna
```

### 3. Create Environment File

```bash
# Copy production template
cp .env.production.example .env

# Edit with your values
nano .env
```

**Required environment variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DB_NAME` | Database name | `relasi4warna` |
| `JWT_SECRET` | Random 64-char hex string | `openssl rand -hex 32` |
| `OPENAI_API_KEY` | Your OpenAI API key | `sk-...` |
| `MIDTRANS_SERVER_KEY` | Midtrans server key | `Mid-server-...` |
| `MIDTRANS_CLIENT_KEY` | Midtrans client key | `Mid-client-...` |
| `APP_URL` | Your domain (no trailing slash) | `https://yourdomain.com` |
| `CORS_ORIGINS` | Allowed origins | `https://yourdomain.com` |

---

## DNS & SSL Setup

### 1. Configure DNS

Point your domain to your server's IP address:

```
A    @       YOUR_SERVER_IP
A    www     YOUR_SERVER_IP
```

### 2. SSL Certificate with Certbot

```bash
# Install Certbot
sudo apt install certbot -y

# Generate certificate (stop nginx first if running)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to nginx/ssl directory
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
sudo chown -R $USER:$USER nginx/ssl
```

### 3. Auto-renewal

```bash
# Add cron job for auto-renewal
echo "0 0 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/*.pem /opt/relasi4warna/nginx/ssl/ && docker compose restart nginx" | sudo crontab -
```

---

## Application Deployment

### 1. Build and Start Services

```bash
cd /opt/relasi4warna

# Build and start all services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 2. Verify Services

```bash
# Check all containers are running
docker compose ps

# Expected output:
# relasi4_mongo     running (healthy)
# relasi4_backend   running (healthy)
# relasi4_frontend  running (healthy)
# relasi4_nginx     running (healthy)
```

---

## RELASI4™ Seed

The RELASI4™ question sets need to be seeded into the database.

### Run Seed Command

```bash
# Run the seed script
docker compose run --rm seed

# Or manually:
docker compose exec backend python /app/packages/relasi4tm/seed_relasi4_v1.py
```

### Verify Seed

```bash
# Check question sets exist
curl https://yourdomain.com/api/relasi4/question-sets

# Expected: JSON array with R4T_CORE_V1 and R4T_DEEP_V1
```

---

## Midtrans Webhook Configuration

### 1. Login to Midtrans Dashboard
- Go to https://dashboard.midtrans.com
- Navigate to Settings → Configuration

### 2. Set Webhook URL
- **Payment Notification URL**: `https://yourdomain.com/api/payments/midtrans/webhook`
- **Finish Redirect URL**: `https://yourdomain.com/relasi4/payment/success`
- **Unfinish Redirect URL**: `https://yourdomain.com/relasi4/payment/pending`
- **Error Redirect URL**: `https://yourdomain.com/relasi4/payment/failed`

### 3. Enable Required Payment Methods
- Bank Transfer (VA)
- E-Wallet (GoPay, OVO, etc.)
- Credit Card (optional)

---

## Smoke Test

Run the automated smoke test to verify deployment:

```bash
# From project directory
./scripts/smoke_test.sh https://yourdomain.com

# Expected output: All tests passed!
```

### Manual Verification Checklist

- [ ] Homepage loads (`https://yourdomain.com`)
- [ ] Can register new user
- [ ] Can login
- [ ] Quiz works
- [ ] RELASI4™ question sets available
- [ ] Payment flow works (use sandbox mode first!)
- [ ] AI report generation works

---

## Troubleshooting

### Container Issues

```bash
# View logs
docker compose logs backend
docker compose logs frontend
docker compose logs nginx

# Restart specific service
docker compose restart backend

# Rebuild and restart
docker compose up -d --build --force-recreate
```

### Database Connection Issues

```bash
# Check MongoDB connection
docker compose exec backend python -c "from motor.motor_asyncio import AsyncIOMotorClient; import os; c = AsyncIOMotorClient(os.environ['MONGO_URL']); print('Connected!')"

# Check if MongoDB Atlas IP whitelist includes your server IP
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Renew certificate
sudo certbot renew --force-renewal
```

### Common Errors

| Error | Solution |
|-------|----------|
| `502 Bad Gateway` | Backend not running. Check `docker compose logs backend` |
| `Connection refused` | Firewall blocking ports. Run `sudo ufw allow 80,443/tcp` |
| `CORS error` | Update `CORS_ORIGINS` in `.env` to include your domain |
| `JWT decode error` | Ensure `JWT_SECRET` is set correctly |
| `OpenAI API error` | Check `OPENAI_API_KEY` is valid |

### Logs Location

| Service | Log Command |
|---------|-------------|
| Backend | `docker compose logs -f backend` |
| Frontend | `docker compose logs -f frontend` |
| Nginx | `docker compose logs -f nginx` |
| MongoDB | `docker compose logs -f mongo` |

---

## Maintenance

### Backup Database

```bash
# Backup to local file
docker compose exec mongo mongodump --out=/backup
docker cp relasi4_mongo:/backup ./backup-$(date +%Y%m%d)
```

### Update Application

```bash
cd /opt/relasi4warna
git pull origin main
docker compose up -d --build
```

### Monitor Resources

```bash
docker stats
```

---

## Support

For issues specific to:
- **Midtrans Payment**: https://docs.midtrans.com
- **OpenAI API**: https://platform.openai.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com

---

*Last updated: January 2025*
