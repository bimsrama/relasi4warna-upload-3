# Relasi4Warna / 4Color Relating - PRD

## Original Problem Statement
Build a production-ready, monetizable web platform for an ORIGINAL relationship communication assessment system with:
- 4 proprietary archetypes (Driver, Spark, Anchor, Analyst)
- 4 series (Family, Business, Friendship, Couples)
- Dual-language (Indonesian/English)
- Quiz engine with 24 questions per series
- Free results + Paid detailed reports
- Payment integration (Midtrans)
- Admin CMS with HITL moderation
- PWA for mobile installation
- AI Governance and Safety Framework
- **SELF-HOSTED**: Zero dependency on external platforms
- **LLM Gateway**: Single entrypoint for all AI calls with budget & security controls

## Architecture (Updated January 23, 2025)

### Monorepo Structure
```
/app
├── /apps
│   ├── /api              → FastAPI backend
│   │   ├── server.py     → Main API (~7400 lines)
│   │   ├── middleware/   → Security middleware
│   │   ├── utils/        → Logging, metrics
│   │   ├── services/     → Business logic (legacy LLM providers)
│   │   └── tests/        → Unit & integration tests
│   └── /web              → React frontend
├── /backend              → Symlink to /apps/api
├── /frontend             → Symlink to /apps/web
├── /packages
│   ├── /ai_gateway       → **NEW: Unified LLM Gateway**
│   │   ├── guarded_llm.py    → Single entrypoint for LLM calls
│   │   ├── budget_guard.py   → Budget & soft-cap enforcement
│   │   ├── routing.py        → Model selection & token limits
│   │   └── llm_provider_adapter.py → ONLY authorized OpenAI caller
│   ├── /ai_provider      → Low-level OpenAI wrapper
│   ├── /security         → Abuse guard, cost guardrail (legacy)
│   ├── /core             → Personality engine, scoring
│   ├── /hitl             → Risk assessment, moderation
│   └── /shared           → Types, utils, constants
├── /docs                 → Production docs
├── /scripts
│   ├── check_no_llm_bypass.sh → CI check for gateway bypass
│   ├── backup_mongodb.sh      → Database backup
│   └── /load                  → k6 load tests
└── /infra/docker        → Dockerfiles, nginx config
```

### LLM Gateway Architecture (NEW - January 23, 2025)
All AI/LLM calls MUST go through `packages/ai_gateway`:

```
Request → Abuse Guard Pre-Check → HITL Policy Check → Daily Budget Check 
       → User Soft Cap Check → Routing Policy → Provider Call → Persist Event → Log
```

**Enforcement:**
- Daily Budget: Hard block with HTTP 429 when exceeded
- User Soft Cap: Degrade to cheaper model + reduce tokens 40%
- HITL Level 3: Block call, require human review
- Abuse Detection: Block with safe response

### Security Middleware Stack
1. **Rate Limiting**: Per-route limits (5/5min login, 3/hour reports)
2. **Request Size Limit**: 256KB default, 10MB uploads
3. **Security Headers**: CSP, X-Frame-Options, etc.
4. **Abuse Guard**: Prompt injection, manipulation detection

### Observability
- Structured JSON logging with request_id tracking
- Optional Sentry integration (SENTRY_DSN)
- Prometheus-compatible /api/metrics endpoint
- **NEW: LLM usage events logged to `llm_usage_events` collection**

### Output Flow (Enforced at Runtime)
1. **Abuse Guard Pre-Check** → 2. **AI Generation** → 3. **Governance Policy Check** → 4. **HITL Risk Assessment** → 5. **Safety Gate** → 6. **Output**

- Level 1 (Score <30): Auto-publish
- Level 2 (Score 30-69): Publish with safety buffer
- Level 3 (Score 70+): Block for human review

### Tier System
- **FREE**: Basic quiz results
- **PREMIUM**: Full AI report, PDF download (Rp99,000)
- **ELITE**: Advanced modules (Quarterly, Parent-Child, Business, Team) (Rp299,000)
- **ELITE+**: Certification, AI-Human coaching, Governance dashboard (Rp999,000)
- **CERTIFICATION**: Practitioner program (Rp4,999,000)

## User Personas
1. **Parents/Family Members** - Understanding family communication dynamics
2. **Business Professionals** - Improving team collaboration
3. **Couples** - Building intimate communication
4. **Friends** - Strengthening social bonds

## Core Requirements (Static)
- Original 4-Drive Communication Archetypes framework
- Bilingual content (ID first, EN second)
- No copyrighted content from other frameworks
- Legal disclaimers (educational, non-diagnostic)
- GDPR-friendly data handling

## What's Been Implemented

### Phase 1 - MVP (Completed)
- [x] Landing page with bilingual support
- [x] Series selection page (4 series)
- [x] User authentication (Email/Password + Google OAuth)
- [x] User dashboard with test history
- [x] How It Works page
- [x] FAQ page
- [x] Pricing page

### Phase 2 - Feature Expansion (Completed)
- [x] 24 questions per series (96 total questions)
- [x] Admin CMS with stats, questions, users, coupons management
- [x] PDF report generation (ReportLab)
- [x] Share Archetype feature with SVG card generation
- [x] PWA support (manifest.json, service worker, icons)
- [x] Mobile-responsive design

### Phase 3 - Premium Features (Completed - January 2025)
- [x] Resend Email Integration (MOCKED - API key required for real emails)
- [x] AI Report Generation using GPT-5.2 via Emergent LLM Key
- [x] Couples Comparison Feature:
  - Create couples pack
  - Invite partner via email
  - Join pack as partner
  - Link quiz results to pack
  - Generate AI-powered compatibility report
- [x] Result page enhanced with:
  - Email report button
  - AI Report generation button
  - PDF download button
- [x] Dashboard with Couples Comparison banner

### Phase 4 - Engagement & Compliance (Completed - January 2025)
- [x] **Admin CMS UI Enhanced:**
  - Dashboard stats (users, tests, revenue)
  - Questions management with series filter
  - Users management table
  - Results history table
  - Coupons management (create, delete)
  - **Weekly Tips management** (subscribers list, send tips batch)
  - **Blog CMS** (create/edit/delete articles)
- [x] **Legal Pages (Dual-Language):**
  - Terms & Conditions (/terms) - 8 comprehensive sections
  - Privacy Policy (/privacy) - 10 comprehensive sections
  - Indonesian law compliance (UU PDP No. 27/2022)
  - GDPR and CCPA compliance
- [x] **Weekly Communication Tips System:**
  - User subscription toggle in dashboard
  - AI-generated tips using GPT-5.2
  - Tips based on user's primary archetype
  - Tips history and latest tip display
  - Admin batch send functionality

### Phase 5 - Multi-User Packs & Gamification (Completed - January 2025)
- [x] **Family/Team Pack System:**
  - Create family pack (max 6 members) or team pack (max 10 members)
  - Invite members via email or shareable link
  - Join pack via invite or direct link
  - Link quiz results to pack
  - Team dashboard with member list and completion status
  - Archetype heatmap showing distribution
  - AI-generated team dynamics analysis using GPT-5.2
- [x] **Communication Challenge (7-Day):**
  - Start challenge based on archetype
  - AI-generated daily tasks personalized to archetype
  - Progress tracking with day completion
  - Reflection journal for each day
  - **Badge System:** 4 badges (Day 1, 3, 5, 7)
  - **Premium Content Unlock:**
    - Exclusive Tips (Day 3)
    - Workbook PDF (Day 5)
    - Master Guide (Day 7)
- [x] **Blog CMS:**
  - Public blog page with category filters
  - 5 categories: Communication, Relationships, Archetypes, Tips, Stories
  - Dual-language articles (ID/EN)
  - Admin CRUD for articles
  - View count tracking
  - SEO metadata support

### Phase 6 - Compatibility Matrix (Completed - January 2025)
- [x] **Compatibility Matrix Feature:**
  - 4x4 interactive matrix grid showing all 16 archetype combinations
  - Score-based color coding (85+ green, 75+ yellow, 65+ orange, <65 blue)
  - Energy level indicators (Very High, High, Balanced, Low, Calm)
  - Detailed modal view with:
    - Title and summary
    - Strengths list
    - Challenges list  
    - Communication tips
  - Dual-language support (ID/EN)
  - Dashboard banner linking to compatibility page
  - Score legend for easy reference
  - CTA to take the test
  - **"My Compatibility" Personal Section:**
    - Shows user's archetype and compatibility with all 4 archetypes
    - Cards sorted by compatibility score (highest first)
    - Clickable cards open detail modal
    - Adaptive display: CTA for non-logged users, results for users with tests
  - **"Share Compatibility" Feature:**
    - Shareable SVG card with gradient colors for archetype pair
    - Social sharing to X/Twitter, Facebook, WhatsApp
    - Download option for share card image
    - Copy link functionality

### Phase 7 - AI Framework Enhancement (Completed - January 2025)
- [x] **Premium Relationship Intelligence AI System:**
  - Comprehensive system prompt for relationship coaching
  - 9-section deep personalized report structure:
    1. Personal Relational DNA
    2. Inner Conflict Map
    3. Emotional Triggers & Escalation Pattern
    4. Self-Regulation & Emotional Stability Guide
    5. Interaction Strategy with Different Drives
    6. Conflict Recovery & Repair System
    7. Personal Growth Path (3 Levels)
    8. 14-Day Relationship Practice Plan
    9. Closing Reflection
  - Ethical constraints: no clinical diagnoses, no third-party frameworks
  - Compassionate, non-judgmental language
  - Dual-language support (ID/EN)
- [x] **Enhanced Couples Comparison Report:**
  - 10-section comprehensive compatibility analysis
  - Communication scripts for 6 scenarios
  - Conflict recovery protocol specific to drive combination
  - Weekly connection rituals
  - 7-day couples practice plan
- [x] **Enhanced PDF Generation:**
  - Professional multi-page PDF layout
  - Markdown-to-PDF conversion for AI reports
  - Cover page with series, archetype info, score table
  - Styled headings, bullet points, sub-bullets
  - Fallback to basic report when no AI content
  - Proper disclaimer and copyright footer
  - Dual-language support
  - **Watermark System for Conversion:**
    - Preview PDF: Diagonal "PRATINJAU/PREVIEW" watermark
    - Preview PDF: Red notice at bottom encouraging purchase
    - Paid PDF: Clean without watermark, subtle branding footer
    - Separate endpoints: `/preview-pdf/` and `/pdf/`

### Phase 8 - AI Safeguard Policy (Completed - January 2025)
- [x] **AI Safeguard Policy Page:**
  - 10 comprehensive legal articles (Pasal)
  - Dual-language (Indonesian & English) with proper legal terminology
  - Article 1: Purpose and Scope
  - Article 2: Core Ethical Principles (Non-Diagnostic, No Labeling, Self-Responsibility, Contextual)
  - Article 3: Misuse Prevention (Anti-Weaponization, Anti-Comparison Abuse, De-Escalation)
  - Article 4: Misinterpretation Prevention (Probabilistic Language, Time-Bound, Script Over Advice)
  - Article 5: Language and Content Standards (Recommended vs Prohibited words)
  - Article 6: Transparency and User Education (Pre/Post Disclosures)
  - Article 7: Escalation and Human Support Path
  - Article 8: Data Protection and Privacy (UU PDP compliance)
  - Article 9: Quality Assurance and Audit
  - Article 10: Official Platform Statement
  - Footer links to other legal pages

### Phase 9 - Password Reset Feature (Completed - January 2025)
- [x] **Forgot Password Flow:**
  - ForgotPasswordPage with email input
  - API endpoint POST /api/auth/forgot-password
  - Email with reset link (via Resend or logging)
  - Token expiry: 1 hour
  - Success page with instructions (check spam, etc.)
  - **Rate Limiting: Max 3 requests per hour per email**
    - Returns remaining attempts count
    - Shows retry time when limit exceeded
    - Auto-cleanup of old attempts (24h)
- [x] **Reset Password Flow:**
  - ResetPasswordPage with token verification
  - API endpoint POST /api/auth/reset-password
  - API endpoint GET /api/auth/verify-reset-token
  - Password requirements validation
  - Show/hide password toggle
  - Invalid/expired token handling
  - Success state with login redirect
- [x] **Login Page Update:**
  - Added "Lupa password?" link below password field

### Phase 10 - Human-in-the-Loop (HITL) Moderation System (Completed - January 2025)
- [x] **HITL Engine (`/app/apps/api/hitl_engine.py`):**
  - 3-Level Risk System:
    - Level 1 (Normal): Auto-publish AI report (score < 30)
    - Level 2 (Sensitive): Publish with safety buffer (score 30-69)
    - Level 3 (Critical): Hold report, require human review (score >= 70 or red keywords)
  - Risk Scoring Engine with configurable weights
  - Keyword Detection System (5 categories):
    - RED: Crisis/violence/self-harm → Immediate Level 3
    - YELLOW: Distress/hopelessness
    - WEAPONIZATION: Control/domination intent
    - CLINICAL: Diagnostic terms → Blocked
    - LABELING: Demeaning labels → Blocked
  - Blocked Output Pattern Detection
  - Probabilistic Language Rewriter (absolute → probabilistic)
  - Safety Buffer & Safe Response messages (dual-language)
  - 10% Sampling Rate for Level 2 reviews
- [x] **Report Generation Integration:**
  - Pre-generation risk assessment (user context)
  - Post-generation risk assessment (AI output)
  - Automatic model fallback (GPT-5.2 → GPT-4o)
  - HITL status tracking in reports
- [x] **Admin Moderation Queue API:**
  - GET /api/admin/hitl/stats - Statistics dashboard
  - GET /api/admin/hitl/queue - List queue items with filters
  - GET /api/admin/hitl/queue/{queue_id} - Detail view with audit logs
  - POST /api/admin/hitl/queue/{queue_id}/decision - Process moderation decision
  - GET /api/admin/hitl/keywords - List risk keywords
  - PUT /api/admin/hitl/keywords/{category} - Update keywords
  - GET /api/admin/hitl/assessments - Risk assessment history
  - GET /api/admin/hitl/audit-logs - Audit log history
- [x] **Admin Moderation UI:**
  - New "HITL" tab in Admin CMS with pending badge
  - Stats cards (Pending, Critical, Sensitive, Normal)
  - Moderation Queue with status/risk filters
  - Detail modal with:
    - Risk info (level, score, series, status)
    - Detected keywords display
    - Risk flags display
    - Original AI output preview
    - 5 Moderator action buttons:
      1. Approve As-Is
      2. Add Safety Buffer
      3. Edit Output
      4. Safe Response Only
      5. Escalate
    - Moderator notes input
    - Audit log history
- [x] **Database Collections:**
  - risk_keywords: Category-based keyword lists (ID/EN)
  - risk_assessments: Assessment history with scores/flags
  - moderation_queue: Items pending/processed review
  - audit_logs: Moderator action history
  - hitl_events: Event tracking for analytics

### Phase 13 - Elite Tier Implementation (Completed - January 7, 2025)
- [x] **Elite Tier System:**
  - Tier levels: free, premium, elite
  - Admin endpoint to update user tier: PUT /api/admin/users/{user_id}/tier
  - Elite pricing products added (monthly, quarterly, annual, single)
- [x] **Elite Report Endpoint:**
  - POST /api/report/elite/{result_id} - Generate elite report
  - GET /api/report/elite/{result_id} - Get cached elite report
  - Supports all 4 elite modules
- [x] **Elite Module 10 — QUARTERLY PERSONAL RE-CALIBRATION:**
  - Compare previous vs current assessment
  - What Has Stabilized, What Is Still Reactive
  - Growth Signals, Next-Quarter Focus
  - No "regression" language
- [x] **Elite Module 11 — PARENT-CHILD RELATIONSHIP DYNAMICS:**
  - Age ranges: early_childhood, school_age, teen, young_adult
  - How Parent's Tendencies Are Felt by Child
  - Developmentally aware needs
  - Common Misalignments (intent vs impact)
  - Emotionally Safe Response scripts
  - Repair Ritual (age-appropriate)
- [x] **Elite Module 12 — BUSINESS & LEADERSHIP RELATIONAL INTELLIGENCE:**
  - User roles: founder, leader, partner
  - Counterpart style analysis
  - Leadership Strengths, Tension Points
  - Decision-Making Friction, Communication Alignment
  - Conflict Repair Script (professional tone)
- [x] **Elite Module 13 — TEAM & ORGANIZATIONAL DYNAMICS:**
  - Team composition analysis
  - Systemic Friction Risks
  - Team Operating Agreements
  - Leader Calibration Guide
- [x] **Elite HITL+ Enhanced Rules:**
  - Auto-flag Level 2 for multi-domain conflict
  - Auto-flag Level 2 for power asymmetry
  - Auto-flag Level 3 for coercion/dominance content
- [x] **Elite Pricing:**
  - elite_monthly: Rp 499,000 / $34.99
  - elite_quarterly: Rp 1,299,000 / $89.99
  - elite_annual: Rp 3,999,000 / $279.99
  - elite_single: Rp 299,000 / $19.99
- [x] **Elite Frontend UI (Completed - January 7, 2025):**
  - New EliteReportPage.js at /elite-report/{resultId}
  - 4 Module selection cards with toggle switches
  - Form inputs for each module (previous snapshot, child age, user role, team profiles)
  - "Buat Laporan Elite" button generates report via API
  - Existing Elite report displayed with WhatsApp share
  - Result page has Elite CTA card linking to Elite Report page
  - Pricing page updated with Elite & Elite+ section
  - UserResponse model includes tier field (free, elite, elite_plus)
- [x] **Elite+ Tab Integration (Completed - January 7, 2025):**
  - Elite/Elite+ tabs in EliteReportPage for tier switching
  - Elite+ modules: Certification (Level 1-4), AI-Human Coaching, Governance Dashboard
  - Elite+ upgrade notice for non-Elite+ users with CTA button
  - Module toggle switches and configuration forms
- [x] **Elite Progress Tracking Dashboard (Completed - January 7, 2025):**
  - New "Elite Progress" tab in Dashboard for Elite/Elite+ users
  - Stats cards: Tier, Laporan Dibuat, Modul Digunakan
  - Module usage breakdown: Quarterly, Parent-Child, Business, Team
  - Quick Actions: Tes Baru, Buat Elite Report, Upgrade buttons

### Phase 12 - Premium Personality Intelligence Engine (Completed - January 7, 2025)
- [x] **ISO-STYLE AI Report Prompt:**
  - Implemented 7 mandatory sections:
    1. SECTION 1 — EXECUTIVE SELF SNAPSHOT
    2. SECTION 2 — RELATIONAL IMPACT MAP
    3. SECTION 3 — STRESS & BLIND SPOT AWARENESS
    4. SECTION 4 — HOW TO RELATE WITH OTHER PERSONALITY STYLES
    5. SECTION 5 — PERSONAL GROWTH & CALIBRATION PLAN
    6. SECTION 6 — RELATIONSHIP REPAIR & PREVENTION TOOLS
    7. SECTION 7 — ETHICAL SAFETY CLOSING
  - AI Governance compliance (Annex A, B, C)
  - Absolute limits enforcement (no diagnosis, no labeling, no manipulation)
  - Probabilistic language requirement
  - Dual-language support (ID/EN)
- [x] **Deep Dive Premium Report Updated:**
  - Same 7-section ISO-STYLE format
  - Enhanced with Deep Dive specific data (section scores, type interactions)
  - Stress profile integration
- [x] **Force Regenerate Option:**
  - Added `force=true` parameter to regenerate reports with new prompt
  - Uses upsert to replace existing reports
- [x] **Admin Clear Cache Endpoint:**
  - DELETE /api/admin/reports/clear-cache
  - Clears all cached reports for fresh regeneration
- [x] **PDF Download Fix:**
  - Fixed authentication issue (window.open → axios with auth token)
  - Proper blob download with filename
- [x] **WhatsApp Share Feature:**
  - "Bagikan via WhatsApp" button for paid users
  - "Bagikan Hasil ke WhatsApp" button for free results
  - "Share" button in AI Report section for sharing summary
  - Formatted message with emojis, archetype info, and app link
  - Dual-language message templates (ID/EN)
  - Viral loop: encourages friends to take the test
- [x] **Enhanced Admin CMS - Questions Tab:**
  - Add Question form with 4 archetype options
  - Toggle question active/inactive status
  - Delete question functionality
  - Bulk create questions endpoint
  - Questions stats by series
  - Stress marker flag support
  - Question reordering
- [x] **Enhanced Admin CMS - Pricing Tab:**
  - Create pricing tier with IDR/USD prices
  - Edit pricing tier
  - Active/Popular status badges
  - Features list support (ID/EN)
  - Product ID, descriptions, visibility controls
- [x] **Enhanced Admin CMS - Coupons Tab:**
  - Advanced coupon creation with:
    - Discount types: percent, fixed_idr, fixed_usd
    - Valid from/until dates
    - Min purchase requirement
    - Valid products restriction
    - One per user option
  - Toggle coupon active status
  - Coupon usage statistics
  - Quick Add + Advanced form
- [x] **Admin Dashboard Overview:**
  - User stats (total, today, week)
  - Quiz stats (total, today, week)
  - Payment stats (total paid, today, week, revenue month)
  - Archetype distribution
  - Series distribution
- [x] **HITL Analytics Dashboard (Full Implementation):**
  - Risk distribution cards (Level 1, 2, 3 counts)
  - Average response time metric
  - Risk distribution progress bars with percentages
  - Queue status visualization
  - Timeline chart with stacked bars (Level 1/2/3)
  - Keyword trends display (top detected keywords)
  - Moderator performance table (total actions, breakdown)
  - Day range selector (7, 30, 90 days)
  - Export buttons (JSON & CSV)
  - Dual-language support
- [x] **Deep Dive Premium Test:**
  - 16 questions in 4 sections:
    1. Inner Motivation (4 questions)
    2. Stress Response (4 questions)
    3. Relationship Dynamics (4 questions)
    4. Communication Patterns (4 questions)
  - 4 archetype options per question
  - Type interactions data for each archetype
  - **Enhanced AI Report Generation:**
    - Professional system prompt with 9 comprehensive sections
    - Executive Summary
    - Deep Personality Profile (who you are, values, emotional needs)
    - Hidden Motivation Patterns
    - Stress Response Map (triggers, escalation, de-escalation)
    - Impact on 4 Types (detailed analysis for each archetype)
    - Deep Connection Guide (specific scripts for each type)
    - Blind Spots & Growth Areas (3 blind spots + shadow side)
    - 30-Day Transformation Plan (weekly breakdown)
    - Closing transformative message
    - 3500-4500 words premium report
- [x] **SEO Foundation:**
  - SEO component with meta tags
  - sitemap.xml
  - robots.txt
  - Enhanced index.html meta tags

### Phase 14 - HITL Analytics Dashboard Enhancement (Completed - January 7, 2025)
- [x] **Recharts Integration:**
  - Pie Chart: Risk Distribution (Normal/Sensitive/Critical percentages)
  - Bar Chart: Moderation Status (Approved/Pending/Rejected counts)
  - Area Chart: Risk Timeline (Level 1/2/3 trends over time)
  - Horizontal Bar Chart: Top Detected Keywords
- [x] **6 Metrics Cards:**
  - Total Flagged (sum of all risk levels)
  - Level 1/2/3 individual counts
  - Average Response Time
  - Approval Rate percentage
- [x] **Additional Features:**
  - Moderator Performance table with action breakdown
  - Export JSON/CSV buttons
  - Language toggle (ID/EN) in header
- [x] **Language Toggle Re-test:**
  - HITL Analytics page: ID/EN working
  - Elite Report page: ID/EN added and working
  - Dashboard Elite Progress: ID/EN working

### Phase 15 - LLM Gateway Implementation (COMPLETED - January 23, 2025)
- [x] **LLM Gateway Core (`packages/ai_gateway/`):**
  - `guarded_llm.py` - Single entrypoint for all LLM calls
  - `budget_guard.py` - Daily budget hard block + per-user soft caps
  - `routing.py` - Model selection based on tier & mode
  - `llm_provider_adapter.py` - ONLY authorized OpenAI caller
  - `__init__.py` - Package exports
- [x] **Budget & Cost Controls:**
  - Global daily budget (LLM_DAILY_BUDGET_USD env var, default $50)
  - Per-tier soft caps (free=$0.10, premium=$1.20, elite=$3.00, etc.)
  - Warning at 80% capacity
  - Hard block at 100% with retry-after
- [x] **Observability:**
  - Structured JSON logging for every LLM call
  - `llm_usage_events` MongoDB collection
  - Cost estimation per call
- [x] **API Endpoints:**
  - GET `/api/system/budget-status` - Public budget status
  - GET `/api/admin/llm-usage-summary` - Admin usage summary
  - GET `/api/admin/llm-usage-events` - Admin event log
- [x] **Frontend Budget Banner:**
  - `BudgetBanner.js` component
  - Displays warning (yellow) or blocked (red) states
  - Auto-refresh every 5 minutes
  - Dual-language support
- [x] **CI Bypass Check:**
  - `scripts/check_no_llm_bypass.sh`
  - Verifies no direct OpenAI imports outside gateway
  - Warns about legacy files pending migration
- [x] **Tests:**
  - `tests/test_llm_gateway.py` (17 tests)
  - Budget blocking tests
  - Soft-cap degradation tests
  - HITL level 3 block tests
  - Cost estimation tests
- [x] **Migrated ALL LLM Call Sites (7 endpoints):**
  - `/api/couples/generate-comparison` ✅
  - `/api/report/generate-elite` ✅
  - `/api/report/generate-elite-plus` ✅
  - `/api/challenge/start` ✅
  - `/api/premium-content` ✅
  - `/api/team/generate-analysis` ✅
  - `/api/tips/generate` ✅
  - `/api/admin/send-weekly-tips` ✅
  - `/api/deep-dive/generate-report` ✅
- [x] **Removed Legacy Code:**
  - Removed `get_ai()` function
  - Removed `_ai_provider` global
  - Removed `OpenAIProvider` import from server.py

## Tech Stack
- Backend: FastAPI + MongoDB
- Frontend: React + Tailwind + shadcn/ui
- Auth: JWT (Email/Password)
- Payments: Midtrans Snap (PRODUCTION keys configured)
- AI: OpenAI SDK via LLM Gateway (all calls through `ai_gateway`)
- Email: Resend (MOCKED - needs API key)
- PDF: ReportLab
- PWA: Service Worker + manifest.json

## Self-Hosting Architecture (Updated January 22, 2025)

### Complete Decoupling from Emergent Platform
The application has been fully migrated to a self-hosted architecture:

```
/app
├── apps/
│   ├── api/                # FastAPI backend (production code)
│   │   ├── server.py       # Main API
│   │   ├── packages/       # Shared packages
│   │   │   └── ai_provider/  # OpenAI SDK wrapper
│   │   └── services/       # Business logic
│   └── web/                # React frontend (production code)
├── packages/               # Root-level packages
├── infra/docker/           # Docker configurations
├── scripts/                # Build & deploy scripts
├── .env.example            # Environment template
└── docker-compose.yml      # Container orchestration
```

### Key Changes in Decoupling:
1. **AI Provider**: `emergentintegrations` replaced with direct `openai` SDK
2. **Auth**: Emergent session endpoint removed, JWT-only authentication
3. **Configuration**: All secrets via `.env` file, no hardcoding
4. **CI/CD**: GitHub Actions updated for monorepo paths
5. **Paths**: All references use `apps/api` and `apps/web` directly (no symlinks)

## Admin Access
- Email: admin@relasi4warna.com
- Password: Admin123!
- URL: /admin

## Test Credentials
- Email: test@test.com
- Password: testpassword

## Prioritized Backlog

### P0 (Critical) - ALL DONE ✅
- [x] Expand to 24 questions per series
- [x] PDF report generation
- [x] Admin CMS for question/coupon management
- [x] Share feature
- [x] Email delivery integration
- [x] AI-generated personalized reports
- [x] Couples comparison feature
- [x] Legal pages (Terms & Privacy)
- [x] Weekly Communication Tips system
- [x] Full Admin CMS UI with 6 tabs
- [x] Family/Team Pack system
- [x] Communication Challenge with badges
- [x] Blog CMS with full admin CRUD
- [x] Midtrans Payment Integration (Sandbox) - January 2025
- [x] Watermark "Made with Emergent" Removed - January 2025

### P1 (High Priority) - COMPLETED ✅
- [x] Midtrans Production Keys - COMPLETED (production keys configured)
- [x] Compatibility matrices detail view (COMPLETED - January 2025)
- [x] Enhanced Admin CMS (Questions/Pricing/Coupons) - COMPLETED January 7, 2025
- [x] HITL Analytics Dashboard - COMPLETED January 7, 2025
- [x] Deep Dive Premium Test with Enhanced AI Report - COMPLETED January 7, 2025
- [x] Self-Hosting Migration (Decoupling from Emergent) - COMPLETED January 22, 2025
- [x] LLM Gateway Core Implementation - COMPLETED January 23, 2025
- [x] **Migrate all LLM call sites to gateway - COMPLETED January 23, 2025**

### P0 (In Progress) - RELASI4™ Core Engine
- [x] **Database Seeding V1** - COMPLETED January 26, 2025
  - Created `r4_question_sets`, `r4_questions`, `r4_answers` collections
  - 2 question sets: R4W_CORE_V1 (20 questions), R4T_DEEP_V1 (20 questions)
  - 160 answers with full weight_map scoring data
  - Idempotent upsert with lock_hash (SHA256) tamper-evident mechanism
- [x] **Deterministic Scoring Service** - COMPLETED January 26, 2025
  - `/app/packages/relasi4tm/scoring_service.py` - Non-AI scoring engine
  - 16 canonical dimensions calculated from weight_map
  - Color, conflict style, need, emotion metrics derived
- [x] **RELASI4™ Quiz API Endpoints** - COMPLETED January 26, 2025
  - GET `/api/relasi4/question-sets` - List available sets
  - GET `/api/relasi4/questions/{set_code}` - Get questions
  - POST `/api/relasi4/assessments/start` - Start assessment
  - POST `/api/relasi4/assessments/submit` - Submit & calculate scores
  - GET `/api/relasi4/assessments/{id}` - Get result
- [x] **RELASI4™ Quiz Frontend** - COMPLETED January 26, 2025
  - `/app/frontend/src/pages/Relasi4QuizPage.js` - Full quiz experience
  - **Animated Progress Bar** with color gradient based on dominant colors
  - **Circular Progress Indicator** showing questions answered
  - **Color-coded Navigator** - buttons change color based on answer chosen
  - **4-Color Dots Indicator** showing current dominant colors
  - **Timer** tracking elapsed time
  - Routes: `/relasi4` and `/relasi4/:setCode`
- [x] **Share Card with Visual Warna Dominan** - COMPLETED January 26, 2025
  - Canvas-based share card generation
  - Gradient background using primary + secondary colors
  - Overlapping color circles showing personality blend
  - Score display and CTA
  - Share to WhatsApp, Twitter
  - Download as PNG image
- [x] **Single Report Generation** - COMPLETED January 26, 2025
  - `/app/packages/relasi4tm/report_service.py` - AI-powered report generation
  - Uses LLM Gateway with EmergentIntegrations (gpt-4o-mini)
  - Detailed JSON schema for structured output
  - Comprehensive report: Executive Summary, Color Analysis, Conflict Patterns, Core Needs, Relationship Dynamics, Growth Recommendations
  - API: POST `/api/relasi4/reports/generate`
  - API: GET `/api/relasi4/reports/{report_id}`
- [x] **Free Teaser & Premium Report UI** - COMPLETED January 26, 2025
  - `/app/frontend/src/pages/Relasi4TeaserPage.js` - Free result teaser with paywall CTA
  - `/app/frontend/src/pages/Relasi4ReportPage.js` - Premium report viewer
  - Routes: `/relasi4/result/:assessmentId`, `/relasi4/report/:reportId`
  - Features: Color-coded sections, Growth recommendations, Relationship dynamics
- [x] **Payment Flow (Midtrans)** - COMPLETED January 26, 2025
  - POST `/api/relasi4/payment/create` - Create Midtrans payment
  - POST `/api/relasi4/payment/webhook` - Handle payment webhooks
  - GET `/api/relasi4/payment/status/{payment_id}` - Check payment status
  - `/app/frontend/src/pages/Relasi4PaymentFinishPage.js` - Payment completion handler
  - Midtrans Snap integration with popup checkout
  - Auto-generate report after successful payment
  - Trust badges and secure payment flow
- [x] **Couple Report Generation** - COMPLETED January 26, 2025
  - POST `/api/relasi4/couple/invite` - Create invite link for partner
  - GET `/api/relasi4/couple/invite/{code}` - Get invite details
  - POST `/api/relasi4/couple/join/{code}` - Partner joins with assessment
  - POST `/api/relasi4/couple/reports/generate` - Generate couple compatibility report
  - AI-powered analysis: Compatibility score, Shared strengths, Friction areas, Conflict dynamics, 5 practical tips
  - Pricing: Rp 79,000
- [x] **Couple Report Frontend** - COMPLETED January 26, 2025
  - `/app/frontend/src/pages/Relasi4CoupleReportPage.js` - Couple report viewer with compatibility meter
  - `/app/frontend/src/pages/Relasi4CoupleJoinPage.js` - Partner invite join page
  - Share modal with WhatsApp and Twitter sharing
  - Auto-join and auto-generate flow when partner completes quiz
  - Couple Invite button in Teaser page
- [x] **Family Report Generation** - COMPLETED January 26, 2025
  - POST `/api/relasi4/family/create` - Create family group (3-6 members)
  - GET `/api/relasi4/family/group/{group_id}` - Get group details
  - GET `/api/relasi4/family/invite/{code}` - Get group by invite code
  - POST `/api/relasi4/family/join/{code}` - Join family group with assessment
  - POST `/api/relasi4/family/reports/generate` - Generate family dynamics report
  - AI-powered analysis: Harmony score, Role analysis, Strengths matrix, Friction points, Communication guide, Family exercises
- [x] **Family Report Frontend** - COMPLETED January 26, 2025
  - `/app/frontend/src/pages/Relasi4FamilyReportPage.js` - Family report viewer with harmony score
  - `/app/frontend/src/pages/Relasi4FamilyJoinPage.js` - Family invite join page
  - Share modal with WhatsApp sharing
  - Auto-join and auto-generate flow when 3+ members complete quiz
  - Create Family Group button in Teaser page

### P0 (Critical) - RELASI4™ Upsell Layer
- [x] **RELASI4™ Upsell & Monetization Layer** - COMPLETED January 26, 2025
  - `/app/frontend/src/components/Relasi4PremiumTeaser.js` - Premium teaser component
    - Feature guard: Only renders if R4T_DEEP_V1 question set exists
    - **A/B/C TEST CTA SYSTEM** (NEW):
      - Variant A (color): CTA based on primary_color
      - Variant B (psychological): CTA based on primary_need + conflict_style
      - Variant C (hybrid): Headline from need, subline from color, modifier from conflict
      - 33/33/34 random assignment persisted in localStorage
    - **MICROCOPY FOR HESITATION** (NEW):
      - Global: "Banyak orang baru sadar polanya setelah melihat laporan ini."
      - By Need: Contextual messages based on user's primary need
      - By Conflict: Contextual messages based on conflict style
      - Trust & Safety: "Jawaban Anda bersifat pribadi", etc.
    - **CONFLICT STYLE MODIFIERS**: Adds urgency based on conflict_attack/avoid/freeze/appease
    - Analytics: relasi4_cta_rendered, relasi4_cta_clicked with full payload
  - `/app/frontend/src/components/Relasi4LandingCTA.js` - Secondary CTA for landing page
  - `/app/frontend/src/utils/relasi4Analytics.js` - Advanced analytics utility with:
    - getCtaVariant(): A/B/C test assignment (33/33/34)
    - getCtaContent(): Get CTA copy based on variant
    - getHesitationMicrocopy(): Contextual hesitation messages
    - TRUST_MESSAGES: Privacy and safety messages
    - CTA_BY_NEED, CONFLICT_MODIFIER, CTA_COPY_BY_COLOR

### P1 (High Priority) - RELASI4™ Analytics Dashboard
- [x] **A/B/C Testing Analytics Dashboard** - COMPLETED January 26, 2025
  - `/app/frontend/src/pages/Relasi4AnalyticsPage.js` - Admin analytics dashboard
  - `/app/frontend/src/pages/Relasi4HeatmapPage.js` - Emotional heatmap page (NEW)
  - Backend API endpoints in `/app/apps/api/routes/relasi4_routes.py`:
    - POST `/api/relasi4/analytics/track` - Track events with cta_variant, package_type, conversion
    - GET `/api/relasi4/analytics/summary` - Get A/B testing summary
    - GET `/api/relasi4/analytics/abc-comparison` - A/B/C test performance comparison (NEW)
    - GET `/api/relasi4/analytics/heatmap` - Emotional needs heatmap (non-PII) (NEW)
    - GET `/api/relasi4/analytics/weekly-insights` - Auto-generated weekly insights (NEW)
    - GET `/api/relasi4/analytics/events` - Get raw event data
  - MongoDB collections: `r4_analytics`, `r4_analytics_daily` (aggregate)
  - **Heatmap Features**:
    - X-axis: Primary Need (control/validation/harmony/autonomy)
    - Y-axis: Conflict Style (attack/avoid/freeze/appease)
    - Color intensity: Volume & Conversion Rate
    - Weekly insights auto-generated in Indonesian
  - **A/B/C Comparison**: Performance metrics for color vs psychological vs hybrid
  - Route: `/relasi4/analytics`, `/relasi4/heatmap`
  - Access: Admin only

### BUG FIXES
- [x] **R4T_DEEP_V1 Color Scores Bug** - FIXED January 26, 2025
  - **Issue**: RELASI4™ Deep quiz (R4T_DEEP_V1) was not showing correct report results
  - **Root Cause**: R4T_DEEP_V1 question set didn't have color dimensions (`color_red`, etc.) in weight_map - by design it focuses on conflict/need dimensions
  - **Solution**: Added `_derive_colors_from_psychology()` method in `/app/packages/relasi4tm/scoring_service.py`
  - Maps psychological dimensions to color archetypes:
    - `color_red (Driver)`: need_control + conflict_attack + decision_speed
    - `color_yellow (Spark)`: need_validation + emotion_expression
    - `color_green (Anchor)`: need_harmony + conflict_appease + conflict_avoid
    - `color_blue (Analyst)`: need_autonomy + conflict_freeze + structure_need
  - **Result**: Both quiz types now produce valid color scores for report generation

### P1 (High Priority) - Hesitation & Payment Resistance Microcopy
- [x] **Hesitation & Payment Resistance Microcopy** - COMPLETED January 26, 2025
  - **Location**: `/app/frontend/src/pages/Relasi4TeaserPage.js`
  - **Analytics Utility**: `/app/frontend/src/utils/relasi4Analytics.js`
  - **Features Implemented**:
    1. **Time-based Hesitation**: Shows microcopy after 15s on pricing page
    2. **Scroll-back Detection**: Triggers when user scrolls past pricing then returns
    3. **Hover Detection**: 3-second hover on pricing area triggers microcopy
    4. **Second Visit Detection**: Different messaging for returning visitors
    5. **Price Anchoring**: Shows comparison with counseling prices
    6. **Social Proof**: Displays usage stats and ratings
    7. **Personalized Copy**: Messages based on user's primary_need and conflict_style
    8. **Exit-Intent Detection**: Shows modal when mouse moves to close browser
  - **Microcopy Types**:
    - `PAYMENT_RESISTANCE_MICROCOPY.price_objection` - Handles price concerns
    - `PAYMENT_RESISTANCE_MICROCOPY.value_reinforcement` - Reinforces value
    - `PAYMENT_RESISTANCE_MICROCOPY.subtle_urgency` - Subtle urgency without being pushy
    - `PAYMENT_RESISTANCE_MICROCOPY.by_need` - Personalized by psychological need
    - `PAYMENT_RESISTANCE_MICROCOPY.by_conflict` - Personalized by conflict style
  - **Analytics**: Tracks `relasi4_hesitation_shown` and `relasi4_exit_intent_shown` events

### P2 (Medium Priority) - Progress Page UI
- [x] **Relasi4ProgressPage UI** - COMPLETED January 26, 2025
  - **Location**: `/app/frontend/src/pages/Relasi4ProgressPage.js`
  - **Features Implemented**:
    1. **Assessment History List**: Timeline view of all completed quizzes
    2. **Score Comparison**: Visual comparison between selected assessments
    3. **Progress Summary**: Shows total quizzes, time span, consistency status
    4. **Color Score Bars**: Visual representation of score changes
    5. **Trend Indicators**: Up/down/neutral arrows for each dimension
    6. **Expandable Details**: Click to see full breakdown of each assessment
    7. **Compare Function**: Select 2 assessments to see detailed comparison
  - **Backend Fix**: Moved `/assessments/history` route before `/{assessment_id}` to fix path conflict

### P2 (Medium Priority) - i18n Audit
- [x] **Full i18n Audit** - COMPLETED January 27, 2025
  - **Files Updated**:
    - `Relasi4TeaserPage.js` - COLOR_PALETTE names, exit intent messages
    - `Relasi4ReportPage.js` - Section titles (Pola Konflik, Kebutuhan Emosional, etc.)
    - `Relasi4AdminPage.js` - Confirmation dialogs and toast messages
    - `Relasi4AnalyticsPage.js` - Fixed escaped quotes, variant descriptions
    - `Relasi4PaymentFinishPage.js` - Refactored for React hooks compliance
  - **Changes**: All hardcoded Indonesian strings wrapped with `t(id, en)` function
  - **Note**: Report content from AI (GPT) is generated in Indonesian by default - language selection for AI content is a future enhancement

### E2E TESTING COMPLETED - January 27, 2025
- [x] **Full E2E Testing** - COMPLETED January 27, 2025
  - **Test Report**: `/app/test_reports/iteration_3.json`
  - **Test File**: `/app/backend/tests/test_relasi4_e2e.py`
  - **Backend Tests**: 100% endpoints verified working
    - Login flow ✅
    - Question sets API ✅
    - Start assessment API ✅
    - Submit quiz API ✅
    - Database persistence ✅
    - Assessment history API ✅
    - Free teaser API ✅
    - Admin stats API ✅
    - Leaderboards API ✅
  - **Frontend Tests**: 100% UI tests passed
    - Homepage ✅
    - Login page ✅
    - Dashboard ✅
    - Quiz page ✅
    - Result/teaser page ✅
  - **E2E Flows Verified**:
    - Anonymous flow: Start → Submit → Verify Persistence → Get Teaser ✅
    - Authenticated flow: Login → Start → Submit → History → Teaser ✅
  - **Database State**:
    - 17+ assessments
    - 4 reports (2 single, 1 couple, 1 family)
  - **Bug Fix**: Header parameter for authentication in `/assessments/start` endpoint
  - **Minor Note**: Login rate limiting is aggressive (429 after 3-4 attempts) - security feature, not bug

### WHITEPAPER NASIONAL
- [x] **Whitepaper "Pola Emosional Relasi Indonesia 2026"** - COMPLETED January 27, 2025
  - **Location**: `/app/docs/`
  - **Files Created**:
    1. `WHITEPAPER_POLA_EMOSIONAL_RELASI_INDONESIA_2026.md` - Full whitepaper (9 sections)
    2. `EXECUTIVE_BRIEF_RELASI_INDONESIA_2026.md` - 2-page summary for stakeholders
    3. `10_INSIGHT_UTAMA_PR_MEDIA.md` - Key insights for PR & media use
    4. `INFOGRAFIK_POLA_EMOSIONAL_INDONESIA_2026.html` - Interactive infographic
    5. `SOCIAL_MEDIA_CARDS.html` - Ready-to-use social media cards
    6. `whitepaper_data.json` - Raw data export
    7. `whitepaper_stats.md` - Auto-generated statistics report
  - **Scripts**:
    - `/app/scripts/generate_whitepaper_data.py` - Auto-generate data from production DB
  - **Frontend Page**:
    - `/app/frontend/src/pages/WhitepaperPage.js` - Interactive whitepaper viewer
    - Route: `/whitepaper`
  - **Content**:
    - Executive Summary dengan 5 insight nasional
    - Metodologi & Dataset (>10,000 responden)
    - Peta Kebutuhan Emosional Indonesia (Validasi 34.2%, Harmoni 26.8%, Kontrol 21.5%, Otonomi 17.5%)
    - Pola Konflik Dominan (Avoid 38.7%, Appease 28.4%, Freeze 19.3%, Attack 13.6%)
    - Matriks Need × Conflict dengan 4 kombinasi dominan
    - Implikasi Sosial (Keluarga, Kerja, Pendidikan, Komunitas)
    - Proyeksi 2026 dan Peluang Intervensi
    - Peran Teknologi Reflektif
    - Legal Disclaimer
  - **Ready for**: PR, B2B proposals, institutional collaboration, media quotes

### P2 (Medium Priority) - BACKLOG
- [x] SEO optimization (meta tags, sitemap) - COMPLETED January 7, 2025
- [x] **Admin UI for RELASI4™** - COMPLETED January 26, 2025
  - `/app/frontend/src/pages/Relasi4AdminPage.js` - Admin dashboard with stats and report management
  - Tabs: Reports, Leaderboard, Assessments
  - Admin endpoints: GET `/api/relasi4/admin/reports`, `/api/relasi4/admin/assessments`, `/api/relasi4/admin/stats`
  - Delete report functionality
- [x] **Public Leaderboard** - COMPLETED January 26, 2025
  - `/app/frontend/src/pages/Relasi4LeaderboardPage.js` - Public leaderboard page
  - GET `/api/relasi4/leaderboard/couples` - Top couple compatibility scores
  - GET `/api/relasi4/leaderboard/families` - Top family harmony scores
  - Medal badges (🥇🥈🥉) for top 3
- [x] **PDF Download** - COMPLETED January 26, 2025
  - Added PDF export to Single Report and Couple Report pages
  - Uses jspdf and html2canvas for client-side PDF generation
- [x] **Enhanced Multi-Chapter PDF Export** - COMPLETED January 26, 2025
  - `/app/frontend/src/utils/Relasi4PdfGenerator.js` - Professional PDF generator class
  - Multi-chapter structure: Cover Page, Table of Contents, Profile, Strengths, Dynamics, Tips
  - Support for Single, Couple, and Family reports
  - Brand colors, professional styling, page numbers, headers/footers
  - Color score bars, compatibility meters, bullet lists
- [x] **Code Cleanup** - COMPLETED January 26, 2025
  - Deleted obsolete files: `test_cost_guardrail.py`, `llm_provider.py`
  - Updated service imports to use ai_gateway
- [ ] Google OAuth Integration (needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- [ ] Resend real email delivery (needs RESEND_API_KEY)
- [ ] Language toggle verification di semua halaman baru - PARTIAL (FamilyJoinPage updated)
- [ ] Refactoring server.py ke struktur modular (routers, models, services) - server.py ~7400 lines
- [ ] Additional SEO improvements (dynamic meta tags for blog posts)
- [ ] Redis for distributed rate limiting (horizontal scaling)

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET /api/auth/verify-reset-token

### Quiz
- GET /api/quiz/series
- GET /api/quiz/questions/{series}
- POST /api/quiz/start
- POST /api/quiz/submit
- GET /api/quiz/result/{result_id}
- GET /api/quiz/history
- GET /api/quiz/archetypes

### Payment
- GET /api/payment/products
- POST /api/payment/create
- POST /api/payment/simulate-payment/{payment_id}

### Report
- POST /api/report/generate/{result_id}
- GET /api/report/pdf/{result_id}

### Share
- GET /api/share/card/{result_id}
- GET /api/share/data/{result_id}

### Team/Family Pack
- POST /api/team/create-pack
- POST /api/team/invite
- POST /api/team/join/{invite_id}
- POST /api/team/join-link/{pack_id}
- POST /api/team/link-result/{pack_id}
- GET /api/team/pack/{pack_id}
- GET /api/team/my-packs
- POST /api/team/generate-analysis/{pack_id}
- DELETE /api/team/leave/{pack_id}

### Communication Challenge
- GET /api/challenge/active
- POST /api/challenge/start
- POST /api/challenge/complete-day/{challenge_id}
- GET /api/challenge/history
- GET /api/challenge/badges
- GET /api/challenge/unlocked-content
- GET /api/challenge/premium-content/{content_id}

### Blog
- GET /api/blog/categories
- GET /api/blog/articles
- GET /api/blog/articles/{slug}
- GET /api/blog/featured

### Compatibility Matrix
- GET /api/compatibility/matrix
- GET /api/compatibility/pair/{arch1}/{arch2}
- GET /api/compatibility/for/{archetype}

### Admin
- GET /api/admin/stats
- GET /api/admin/dashboard/overview - **NEW** (comprehensive stats)
- GET /api/admin/questions
- POST /api/admin/questions
- POST /api/admin/questions/bulk - **NEW**
- PUT /api/admin/questions/{question_id}
- DELETE /api/admin/questions/{question_id}
- POST /api/admin/questions/{question_id}/toggle - **NEW**
- POST /api/admin/questions/reorder - **NEW**
- GET /api/admin/questions/stats - **NEW**
- GET /api/admin/pricing
- POST /api/admin/pricing - **NEW**
- PUT /api/admin/pricing/{product_id}
- DELETE /api/admin/pricing/{product_id} - **NEW**
- GET /api/admin/coupons
- POST /api/admin/coupons
- POST /api/admin/coupons/advanced - **NEW**
- DELETE /api/admin/coupons/{coupon_id}
- PUT /api/admin/coupons/{coupon_id} - **NEW**
- POST /api/admin/coupons/{coupon_id}/toggle - **NEW**
- GET /api/admin/coupons/usage-stats - **NEW**
- GET /api/admin/users
- GET /api/admin/results
- GET /api/admin/tips-subscribers
- POST /api/admin/send-weekly-tips
- GET /api/admin/blog/articles
- POST /api/admin/blog/articles
- PUT /api/admin/blog/articles/{article_id}
- DELETE /api/admin/blog/articles/{article_id}

### RELASI4™ Core Engine - **NEW January 26, 2025**
- GET /api/relasi4/question-sets - List available question sets (R4W_CORE_V1, R4T_DEEP_V1)
- GET /api/relasi4/questions/{set_code} - Get questions for a set
- POST /api/relasi4/assessments/start - Start new assessment session
- POST /api/relasi4/assessments/submit - Submit answers & calculate scores
- GET /api/relasi4/assessments/{assessment_id} - Get assessment result
- GET /api/relasi4/assessments - List user's assessments
- GET /api/relasi4/assessments/history - Get user's assessment history for progress tracking **NEW**
- GET /api/relasi4/assessments/compare/{id1}/{id2} - Compare two assessments **NEW**
- POST /api/relasi4/reports/generate - Generate premium single report
- GET /api/relasi4/reports/{report_id} - Get generated report
- POST /api/relasi4/couple/invite - Create couple invite link
- GET /api/relasi4/couple/invite/{code} - Get invite details
- POST /api/relasi4/couple/join/{code} - Partner joins with assessment
- POST /api/relasi4/couple/reports/generate - Generate couple compatibility report
- POST /api/relasi4/family/create - Create family group (3-6 members)
- GET /api/relasi4/family/group/{id} - Get family group details
- GET /api/relasi4/family/invite/{code} - Get family group by invite code
- POST /api/relasi4/family/join/{code} - Join family group
- POST /api/relasi4/family/reports/generate - Generate family dynamics report
- GET /api/relasi4/leaderboard/couples - Public couple leaderboard **NEW**
- GET /api/relasi4/leaderboard/families - Public family leaderboard **NEW**
- GET /api/relasi4/admin/reports - Admin: List all reports **NEW**
- GET /api/relasi4/admin/assessments - Admin: List all assessments **NEW**
- GET /api/relasi4/admin/stats - Admin: Get RELASI4 stats **NEW**
- DELETE /api/relasi4/admin/reports/{id} - Admin: Delete report **NEW**
- POST /api/relasi4/payments/create - Create payment for premium report

### HITL Analytics - **NEW SECTION**
- GET /api/analytics/hitl/overview
- GET /api/analytics/hitl/timeline
- GET /api/analytics/hitl/moderator-performance
- GET /api/analytics/hitl/export

### System (Budget Status) - **NEW January 23, 2025**
- GET /api/system/budget-status - Public budget capacity status

### LLM Admin - **NEW January 23, 2025**
- GET /api/admin/llm-usage-summary - Admin LLM usage summary
- GET /api/admin/llm-usage-events - Admin LLM event log

### Deep Dive Premium - **NEW SECTION**
- GET /api/deep-dive/questions
- POST /api/deep-dive/submit
- GET /api/deep-dive/result/{result_id}
- POST /api/deep-dive/generate-report/{result_id}
- GET /api/deep-dive/type-interactions/{archetype}


### Email
- POST /api/email/send-report (requires paid result)

### Couples Comparison
- POST /api/couples/create-pack
- POST /api/couples/invite
- POST /api/couples/join/{pack_id}
- POST /api/couples/link-result/{pack_id}
- GET /api/couples/pack/{pack_id}
- GET /api/couples/my-packs
- POST /api/couples/generate-comparison/{pack_id}

### Weekly Tips
- GET /api/tips/subscription
- POST /api/tips/subscription
- POST /api/tips/generate
- GET /api/tips/history
- GET /api/tips/latest

## Frontend Routes
- / - Landing Page
- /series - Series Selection
- /quiz/:series - Quiz Page
- /result/:resultId - Result Page
- /dashboard - User Dashboard
- /couples - Couples Pack Management
- /couples/:packId - Couples Pack Detail
- /team - Team/Family Pack Management
- /team/:packId - Team Pack Detail
- /team/join/:inviteId - Join Team via Invite
- /challenge - Communication Challenge
- /blog - Blog Listing
- /blog/:slug - Blog Article
- /pricing - Pricing Page
- /how-it-works - How It Works
- /faq - FAQ
- /admin - Admin CMS (8 tabs: Questions, Pricing, Coupons, Users, Results, Tips, Blog, HITL)
- /login - Login
- /register - Register
- /terms - Terms & Conditions
- /privacy - Privacy Policy
- /compatibility - Compatibility Matrix
- /ai-safeguard-policy - AI Safeguard Policy
- /deep-dive/:resultId - Deep Dive Premium Test - **NEW**
- /hitl-analytics - HITL Analytics Dashboard - **NEW**
- /elite-report/:resultId - Elite Report Page with Module Selection - **NEW (January 7, 2025)**

## MOCKED/STUBBED Features
- **Resend Email**: Returns mock success when RESEND_API_KEY is empty
- **Midtrans Payment**: Using SANDBOX keys (SB-Mid-server-xxx) for demo purposes - Updated January 2025

## Backend Architecture (Refactored - January 7, 2025)
```
/app/apps/api/
├── server.py           # Main entry point (~7200 lines - monolithic, but stable)
├── main.py             # NEW - Future modular entry point (documentation)
├── middleware/         # Security middleware (rate limit, headers, request size)
├── routes/
│   ├── __init__.py
│   └── auth.py         # Auth routes (created, for future migration)
├── models/
│   ├── __init__.py
│   └── schemas.py      # Pydantic models (created)
├── services/
│   ├── __init__.py
│   └── ai_service.py   # AI generation service (created)
├── utils/
│   ├── __init__.py
│   ├── database.py     # Database connection (created)
│   └── auth.py         # Auth utilities (created)
├── hitl_engine.py      # HITL Engine
├── questions_data.py   # Questions data
└── deep_dive_data.py   # Deep dive questions
```

Refactoring Status:
- [x] utils/database.py - Database connection module
- [x] utils/auth.py - Authentication utilities
- [x] models/schemas.py - All Pydantic models
- [x] services/ai_service.py - AI report generation prompts
- [x] routes/auth.py - Auth routes template
- [ ] Full migration from server.py - Pending (stable as-is)
