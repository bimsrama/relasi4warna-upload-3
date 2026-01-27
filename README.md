# Relasi4Warna + RELASI4™

[![Deploy Status](https://img.shields.io/badge/deploy-ready-brightgreen)](./DEPLOYMENT.md)
[![License](https://img.shields.io/badge/license-proprietary-blue)]()

A full-stack web platform for personality assessment and relationship communication analysis, featuring the premium RELASI4™ engine for deep psychological insights.

## 🎯 Features

### Core Features (Relasi4Warna)
- **4-Color Personality Assessment** - Red (Driver), Yellow (Spark), Green (Anchor), Blue (Analyst)
- **Relationship Compatibility Analysis** - Understand communication styles
- **Multi-language Support** - Indonesian & English

### Premium Features (RELASI4™)
- **Deep Psychological Analysis** - Need dimensions & conflict styles
- **AI-Powered Reports** - GPT-4 generated insights
- **Couple & Family Reports** - Multi-person compatibility analysis
- **Trigger Maps & Conflict Loops** - Understanding relationship patterns
- **A/B/C CTA Testing** - Behavioral conversion optimization
- **Emotional Heatmap** - Aggregate Indonesia user insights

## 🏗️ Architecture

```
relasi4warna/
├── apps/
│   ├── api/              # FastAPI backend
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   └── server.py     # Main application
│   └── web/              # React frontend
│       ├── components/   # UI components
│       ├── pages/        # Page components
│       └── utils/        # Utilities
├── packages/
│   ├── ai_gateway/       # LLM integration (OpenAI)
│   └── relasi4tm/        # RELASI4™ scoring engine
├── nginx/                # Nginx configuration
├── scripts/              # Deployment scripts
└── docker-compose.yml    # Production deployment
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- OpenAI API Key
- Midtrans Account (for payments)
- MongoDB (Atlas recommended)

### Development Setup

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/relasi4warna.git
cd relasi4warna

# Copy environment template
cp .env.example .env
# Edit .env with your values

# Install dependencies
cd apps/web && yarn install && cd ../..
cd apps/api && pip install -r requirements.txt && cd ../..

# Start development servers
# Backend
cd apps/api && uvicorn server:app --reload --port 8001

# Frontend (new terminal)
cd apps/web && yarn start
```

### Production Deployment

```bash
# Copy production template
cp .env.production.example .env

# Edit .env with production values
nano .env

# Build and start
docker compose up -d --build

# Run seed (first time only)
docker compose run --rm seed

# Verify deployment
./scripts/smoke_test.sh https://yourdomain.com
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

## ⚙️ Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGO_URL` | MongoDB connection string |
| `DB_NAME` | Database name |
| `JWT_SECRET` | JWT signing secret (64 chars) |
| `OPENAI_API_KEY` | OpenAI API key |
| `MIDTRANS_SERVER_KEY` | Midtrans server key |
| `MIDTRANS_CLIENT_KEY` | Midtrans client key |
| `APP_URL` | Your domain URL |
| `CORS_ORIGINS` | Allowed CORS origins |

See `.env.example` for full list with descriptions.

## 📡 API Endpoints

### Core API
- `GET /api/health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/quiz/series` - Get quiz series
- `GET /api/quiz/archetypes` - Get archetype data

### RELASI4™ API
- `GET /api/relasi4/question-sets` - Get question sets
- `POST /api/relasi4/assessments/start` - Start assessment
- `POST /api/relasi4/assessments/submit` - Submit answers
- `POST /api/relasi4/reports/generate` - Generate AI report
- `GET /api/relasi4/analytics/summary` - Analytics summary
- `GET /api/relasi4/analytics/heatmap` - Emotional heatmap

### Payment API
- `POST /api/payments/midtrans/create` - Create payment
- `POST /api/payments/midtrans/webhook` - Payment webhook

## 🧪 Testing

```bash
# Run smoke test
./scripts/smoke_test.sh https://yourdomain.com

# Run backend tests
cd apps/api && pytest

# Run frontend tests
cd apps/web && yarn test
```

## 📦 Deployment

Supports multiple deployment methods:

1. **Docker Compose** (Recommended) - See [DEPLOYMENT.md](./DEPLOYMENT.md)
2. **Manual** - Run services individually
3. **CI/CD** - GitHub Actions workflow included

## 🔒 Security

- JWT-based authentication
- CORS protection
- Rate limiting
- Input validation
- Secret scanning in CI/CD

**Never commit:**
- `.env` files with real credentials
- API keys or tokens
- Database connection strings

## 📄 License

Proprietary - All rights reserved.

## 🙏 Credits

- OpenAI for GPT-4 API
- Midtrans for payment processing
- MongoDB for database
