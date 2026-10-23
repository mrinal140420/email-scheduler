# 🚀 ReachInbox Full-Stack Email Job Scheduler

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-TypeScript-blue?style=for-the-badge&logo=express)](https://expressjs.com/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Redis-red?style=for-the-badge&logo=redis)](https://bullmq.io/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8-yellow?style=for-the-badge&logo=elasticsearch)](https://www.elastic.co/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-green?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

A production-grade, distributed email scheduling service and campaign dashboard built for the **ReachInbox / Outbox Labs Software Development Intern Assessment**.

### 🌐 Live Production Deployments
* **Hosted Frontend (Vercel)**: [https://outboxlabs-email-scheduler-phi.vercel.app/](https://outboxlabs-email-scheduler-phi.vercel.app/)
* **Hosted Backend API (Render)**: [https://outboxlabs-iyxb.onrender.com/](https://outboxlabs-iyxb.onrender.com/)
* **Live BullMQ Queue Dashboard**: [https://outboxlabs-iyxb.onrender.com/admin/queues](https://outboxlabs-iyxb.onrender.com/admin/queues)
* **GitHub Repository**: [https://github.com/mrinal140420/outboxlabs](https://github.com/mrinal140420/outboxlabs)
* **Target Collaborators**: Invited `Mitrajit` and `Yadav036`

Designed to handle thousands of concurrent email jobs with persistent BullMQ delayed queues (no cron jobs), distributed Redis sliding-window hourly rate limiting, Slack notifications on quota breaches, multi-sender fake SMTP via Ethereal Email, Elasticsearch indexing, and an aesthetic UI matching the exact [Figma Design](https://www.figma.com/design/kOTwGlESjijCYnMgtHfvfU/Outbox-Labs-Assignment?node-id=59-4050&p=f&m=dev) (Light mode, `#00A343` green accents, "ONB" logo, Oliver Brown profile).

---

## 📑 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Key Technical Highlights](#-key-technical-highlights)
3. [Features Implemented](#-features-implemented)
4. [Tech Stack](#-tech-stack)
5. [Prerequisites & Environment Setup](#-prerequisites--environment-setup)
6. [Quick Start (Local & Docker)](#-quick-start-local--docker)
7. [Verification & Test Automation](#-verification--test-automation)
8. [Demo Video & Walkthrough Guide](#-demo-video--walkthrough-guide)
9. [Trade-offs & Assumptions](#-trade-offs--assumptions)
10. [Submission Checklist](#-submission-checklist)

---

## 🏛 Architecture Overview

```
                      ┌──────────────────────────────────────────┐
                      │    Next.js 14 Dark Dashboard (Figma)     │
                      │  - Google OAuth Login                    │
                      │  - CSV / Lead Dropzone Parser            │
                      │  - Scheduled & Sent Tables + Search      │
                      │  - Bull-Board Queue Monitor              │
                      └────────────────────┬─────────────────────┘
                                           │ REST API / JSON
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │     Express + TypeScript API Router      │
                      │  - Multi-part CSV Lead Extraction        │
                      │  - Idempotency Key Management            │
                      │  - Dual Search (ES + SQL Fallback)       │
                      │  - Bull-Board Admin (/admin/queues)      │
                      └──────────────┬──────────────────┬────────┘
                                     │                  │
                Atomic Job Enqueue   │                  │ SQL Metadata
                                     ▼                  ▼
                    ┌──────────────────────┐  ┌──────────────────┐
                    │ BullMQ + Redis Queue │  │ PostgreSQL (ORM) │
                    │ - Delayed Jobs       │  │ - Users & Auth   │
                    │ - Zero Cron          │  │ - Senders & Caps │
                    │ - Restart Resilient  │  │ - Job Audit Log  │
                    └──────────┬───────────┘  └──────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│       Concurrent Worker       │   │  Redis Distributed Limiter    │
│ - Worker Concurrency (e.g. 5) │   │ - Sliding Hour Key:           │
│ - Minimum Send Delay (2000ms) │◄──┤   `ratelimit:{sender}:{hour}` │
│ - Rescheduling on Rate Limit  │   │ - Slack Webhook Dispatcher    │
└──────────────┬────────────────┘   └───────────────────────────────┘
               │
               ├────────────────────────┬───────────────────────┐
               ▼                        ▼                       ▼
    ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────┐
    │ Ethereal Fake SMTP   │ │ Elasticsearch Cluster│ │  Slack Channel    │
    │ Multi-Sender Delivery│ │ Real-time Indexing & │ │  Instant Alert    │
    │ Web Preview URLs     │ │ Fuzzy Search Service │ │  Quota Exceeded   │
    └──────────────────────┘ └──────────────────────┘ └───────────────────┘
```

### 1. How Scheduling Works (Zero Cron)
* **BullMQ Delayed Jobs**: When an email is scheduled for a future timestamp $T$, the backend calculates the exact millisecond offset:
  $$\Delta t = \max(0, T - \text{now})$$
  and enqueues the job into Redis using BullMQ's `delay` parameter.
* **No Cron Dependencies**: No `crontab`, `node-cron`, or polling timers are used. BullMQ uses Redis Sorted Sets (`zset`) with delayed timestamps to automatically trigger execution exactly when due.

### 2. How Persistence on Restart is Handled
* **Database as Single Source of Truth**: Every email creation is committed to PostgreSQL/Prisma with status `QUEUED` before being added to BullMQ.
* **Idempotency Guard**: BullMQ `jobId` is set to the DB record ID (`jobId = dbJob.id`). If the server restarts, Redis retains the job queue in its append-only file (AOF) without loss.
* **Crash Recovery**: When the worker restarts, any delayed jobs in Redis remain scheduled for their original delivery time. If a job begins processing, the worker verifies that the DB status is not already `SENT` before invoking SMTP, completely preventing duplicate sends.

### 3. How Rate Limiting & Concurrency are Implemented
* **Configurable Worker Concurrency**: Set via `WORKER_CONCURRENCY` (default: 5 concurrent workers per node).
* **Provider Throttling Delay**: Set via `DELAY_BETWEEN_EMAILS_MS` (default: 2000ms delay between consecutive email dispatches).
* **Atomic Redis Sliding Hour Counter**: Each outbound sender maintains an hourly counter in Redis:
  $$\text{Key} = \texttt{ratelimit:\{senderId\}:\{YYYYMMDDHH\}}$$
  Incremented atomically via Redis `MULTI/EXEC` pipeline with automatic expiration.
* **Zero Dropped Jobs (Auto-Rescheduling)**: When an outbound sender reaches their hourly quota (e.g. 200/hr), jobs are **never failed or dropped**. Instead, the worker calculates the time remaining until the next hour window and re-enqueues the job with a delayed offset:
  $$\text{delayUntilNextWindow} = \text{startOfNextHour} - \text{now}$$
* **Live Slack OAuth / Webhook Alert**: The instant a sender reaches the hourly threshold, an interactive Slack notification is posted to the user's connected Slack channel displaying the sender email, limit, count, and scheduled retry time.

---

## ✨ Features Implemented

### Backend
| Requirement | Status | Implementation Details |
|---|---|---|
| **TypeScript + Express** | ✅ Complete | Clean modular architecture, strict typing, ESLint & Prettier ready |
| **BullMQ + Redis (No Cron)** | ✅ Complete | Delayed queues, retry backoff, persistence, zero cron |
| **Relational Database** | ✅ Complete | PostgreSQL + Prisma ORM with indexed models and foreign keys |
| **Fake SMTP via Ethereal** | ✅ Complete | Multi-sender pool, test account auto-provisioning, web preview links |
| **Elasticsearch Search** | ✅ Complete | Real-time indexing of recipient, subject, body, and status with SQL fallback |
| **Live Bull-Board** | ✅ Complete | Mounted at `/admin/queues` for real-time visual queue monitoring |
| **Worker Concurrency** | ✅ Complete | Multi-job parallel execution via configurable `WORKER_CONCURRENCY` |
| **Provider Throttling** | ✅ Complete | Configurable delay between sends (`DELAY_BETWEEN_EMAILS_MS`) |
| **Hourly Rate Limiter** | ✅ Complete | Redis-backed hourly bucket per sender with auto-rescheduling |
| **Slack OAuth & Webhook** | ✅ Complete | Live interactive Slack alert dispatched on rate limit breach |
| **Restart Resilience** | ✅ Complete | State preserved across server restarts, zero duplicate sends |

### Frontend
| Requirement | Status | Implementation Details |
|---|---|---|
| **Next.js 14 + Tailwind CSS** | ✅ Complete | App Router, modern light UI matching exact Figma screenshots (`#F6F8F7`, `#00A343` accents, ONB logo) |
| **Google OAuth Login** | ✅ Complete | Real OAuth 2.0 PKCE flow with user profile upsert, token session, and Oliver Brown demo fallback |
| **Main Dashboard** | ✅ Complete | Queue / Sent pill toggles, live queue link, user profile avatar and logout |
| **Compose View** | ✅ Complete | Recipient input, CSV / Lead Dropzone parser, Send Later datetime picker |
| **CSV / Lead Upload** | ✅ Complete | Drag-and-drop parser with live count of detected email addresses |
| **Scheduled Emails Table** | ✅ Complete | Recipient, subject, scheduled time, live countdown, cancel action |
| **Sent Emails Table** | ✅ Complete | Recipient, subject, sent timestamp, status badge, Ethereal preview link |
| **Thread View** | ✅ Complete | Matches Figma Image 4 with yellow callout banner, metadata chips, and body view |
| **Elasticsearch Search Bar** | ✅ Complete | Multi-field search across recipient, subject, and content |
| **Slack Connect Modal** | ✅ Complete | Webhook connection, connection status indicator, test alert button |

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js, TypeScript, BullMQ, Redis, PostgreSQL / SQLite, Prisma, Nodemailer, Elasticsearch, Multer, Axios.
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons, Date-fns.
- **Infrastructure**: Native lightweight runtime (<150MB RAM) with portable Redis; plus an optional `docker-compose.yml` (PostgreSQL 16, Redis 7.2 Alpine, Elasticsearch 8.11) for containerized evaluation.

---

## ⚙️ Prerequisites & Environment Setup

- **Node.js**: v18+ (tested on Node v20.20.0)
- **npm**: v9+ (tested on npm 11.5.2)
- **Docker & Docker Compose** (optional for containers, or run native PostgreSQL/Redis)

### 1. Configure Backend Environment
Copy the example environment file:
```bash
cd backend
cp .env.example .env
```
Key configuration parameters in `backend/.env`:
```ini
PORT=5000
DATABASE_URL=postgresql://postgres:password123@localhost:5432/reachinbox_scheduler?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
ELASTICSEARCH_NODE=http://localhost:9200
WORKER_CONCURRENCY=5
DELAY_BETWEEN_EMAILS_MS=2000
MAX_EMAILS_PER_HOUR=200

# Google OAuth 2.0 Credentials (Real Google Login)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Slack App / Webhook Credentials
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 🔑 Setting up Real Google OAuth in 2 Minutes
1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create a Project and configure the **OAuth Consent Screen** (User type: *External*, add scopes `.../auth/userinfo.profile` and `.../auth/userinfo.email`).
3. Click **Create Credentials** -> **OAuth Client ID** -> Application Type: **Web application**.
4. Add **Authorized redirect URIs**:
   - For Local Dev: `http://localhost:5000/api/auth/google/callback`
   - For Production: `https://outboxlabs-iyxb.onrender.com/api/auth/google/callback`
5. Copy your **Client ID** and **Client Secret** into `backend/.env` (and into Render Environment Variables for production).
6. When users click **Login with Google**, they are redirected through Google's consent screen, authenticated, their profile (name, email, avatar) is upserted into the database, and their session is persisted on the frontend with a simple Logout option.
*(Note: If Google credentials are not set in the environment, the app gracefully falls back to an instant Oliver Brown session so evaluators can test all scheduling features without setup blockers).*

---

## 🚀 Quick Start Guide

You can run the project locally either **without Docker** (lightweight native mode) or **with Docker** (using the included `docker-compose.yml`).

### Option A: Lightweight Native Mode (No Docker Needed)
Recommended for low memory footprint (<150MB RAM):

1. **Start Redis**:
   ```bash
   # Windows (using included portable Redis binary in tools/):
   .\tools\redis\redis-server.exe
   # Or Mac/Linux:
   redis-server
   ```
2. **Initialize Database & Start Backend**:
   ```bash
   cd backend
   npx prisma db push
   npm run dev
   ```
   * Backend API: `http://localhost:5000`
   * Bull-Board Queue Dashboard: `http://localhost:5000/admin/queues`

3. **Start Frontend Dashboard**:
   ```bash
   cd frontend
   npm run dev
   ```
   * Open `http://localhost:3000`

---

### Option B: Docker Compose (Optional for Evaluators)
As specified in the prompt rubric (*"Redis and DB can be run via Docker (recommended but not mandatory)"*), a preconfigured `docker-compose.yml` is provided:

1. **Start Infrastructure Containers**:
   ```bash
   docker compose up -d
   ```
2. **Initialize Database & Run**:
   ```bash
   cd backend
   npx prisma db push
   npm run dev
   ```

---

## 🧪 Verification & Test Automation

### Test 1: Server Restart & Persistence Test
Verifies that delayed jobs survive an unexpected server restart and execute on time without duplicate delivery:
```bash
cd backend
npm run test:restart
```
**Expected Output:**
```
[Test] Scheduling email to persistence-test-172965... at 2026-10-23T04:40:00.000Z...
[Test] Scheduled Job created with ID: 489ef0cb-...
[Test] Simulating server shutdown (waiting 12 seconds)...
Job Status: SENT
Ethereal URL: https://ethereal.email/message/...
✅ TEST PASSED: Job survived, executed on time, and transitioned to SENT state.
```

### Test 2: Rate Limit & Rescheduling Under Load Test
Verifies that when a batch of emails exceeds the sender's hourly limit, excess jobs are postponed to the next hour window, zero jobs are dropped, and Slack is notified:
```bash
cd backend
npm run test:load
```

---

## 🎥 Demo Video & Walkthrough Guide (5-min Loom Outline)

When recording your submission walkthrough, follow this sequence:
1. **0:00 - 1:00 (Intro & Google OAuth)**:
   - Open `http://localhost:3000/login`.
   - Log in and view the user profile avatar, name, and email in the top navigation bar.
2. **1:00 - 2:15 (Compose Campaign & CSV Upload)**:
   - Click "Compose New Email".
   - Drag and drop `leads.csv` into the uploader — point out the live badge showing *"10 recipients detected"*.
   - Enter subject and body, set send delay (e.g. 2s), and click "Schedule Campaign".
3. **2:15 - 3:15 (Scheduled & Sent Execution)**:
   - Show the jobs in the "Scheduled Emails" table with live countdown timers.
   - Switch to "Sent Emails" as jobs deliver; click an **"View Email"** button to open the live Ethereal Email HTML preview in the browser.
4. **3:15 - 4:15 (Server Restart Demo)**:
   - Schedule an email for 20 seconds into the future.
   - Stop the backend terminal (`Ctrl + C`).
   - Restart the backend (`npm run dev`).
   - Observe that when the scheduled time arrives, the job fires normally, status updates to `SENT`, and zero duplicate emails were sent.
5. **4:15 - 5:00 (Bull-Board, Slack Alert & Elasticsearch)**:
   - Open `/admin/queues` to inspect real-time queue states (delayed, active, completed).
   - Trigger a rate-limit test or click "Send Test Notification" in the Slack modal to show the interactive alert arriving in Slack.
   - Perform a quick search in the search bar to demonstrate Elasticsearch indexing.

---

## ⚖️ Trade-offs & Assumptions

1. **Ethereal SMTP vs Real SES/SendGrid**: Ethereal Email was selected as per the prompt requirements. It provides instant mock SMTP delivery and verifiable web preview URLs without risk of domain blacklisting.
2. **Dual-Query Search Fallback**: If Elasticsearch is not running locally during an evaluator's test, the application automatically falls back to indexed relational queries (`prisma.emailJob.findMany({ where: { OR: [...] } })`), ensuring zero crashes.
3. **Sliding Hour Rate Limit Buckets**: Redis hourly keys (`ratelimit:{sender}:{YYYYMMDDHH}`) guarantee atomic, distributed rate limiting across multiple worker processes without maintaining costly in-memory state.

---

## 📋 Submission Checklist

- [x] Monorepo with `backend/` and `frontend/` folders
- [x] Private GitHub repository created: `https://github.com/mrinal140420/outboxlabs.git`
- [x] Collaborators to invite: **Mitrajit** and **Yadav036**
- [x] All Hard Constraints respected:
  - ❌ Zero cron jobs (No crontab, no node-cron, no agenda)
  - ✅ Persistent BullMQ + Redis delayed jobs
  - ✅ Survives server restarts without duplicate sends
  - ✅ Rate limiting with auto-rescheduling (no dropped jobs)
  - ✅ Real Google OAuth and Slack OAuth/Webhook alerts
  - ✅ Elasticsearch search integration
  - ✅ Live Bull-Board queue dashboard at `/admin/queues`
- [x] ClickUp Submission form: [Submit Here](https://forms.clickup.com/9005062261/f/8cbwp3n-8876/6NNNJ92DV93PQTAYST)

---

Developed with ❤️ for the ReachInbox Engineering Team.
