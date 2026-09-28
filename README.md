# ResolveIQ

AI Incident Response Agent That Learns From Every Production Failure.

## Stack

- Frontend: React + Vite + TypeScript + CSS
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL
- AI: Groq
- Memory: Hindsight Cloud / Hindsight API

## Core demo

1. Open the dashboard.
2. Open the seeded Payment Service incident.
3. Click **Investigate with ResolveIQ**.
4. The backend recalls similar historical incidents from Hindsight.
5. Groq analyzes the current incident together with the recalled memories.
6. Record a successful resolution.
7. The resolution is retained in Hindsight.
8. Run the investigation again or use Demo Mode to show the learning loop.

## Setup

### 1. Configure environment

Copy `.env.example` to `.env`.

Required for AI:
- GROQ_API_KEY
- HINDSIGHT_API_KEY

Optional:
- HINDSIGHT_URL defaults to https://api.hindsight.vectorize.io
- GROQ_MODEL defaults to openai/gpt-oss-120b

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 3. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

In another terminal:

```bash
cd backend
python seed.py
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Hindsight

The backend uses the official `hindsight-client` package. It creates/uses a memory bank called `resolveiq-incidents`, retains incident knowledge, recalls related memories, and retains resolution outcomes.

If Hindsight is unavailable, the UI still loads and the API returns a clear memory-provider error instead of crashing.

## Demo story

Current incident:
- Payment Service
- 35% HTTP 500 errors
- Database connection timeout
- Connection pool exhaustion

Historical memory:
- Incident #127 had the same pattern.
- Root cause: connection pool exhaustion.
- Successful fix: increase pool from 50 to 100.

The point of the demo is not that the model magically knows the answer. The point is that the agent can retrieve the organization's previous experience and use it as evidence.

## API

- GET `/api/health`
- GET `/api/dashboard`
- GET `/api/incidents`
- GET `/api/incidents/{id}`
- POST `/api/incidents/{id}/investigate`
- POST `/api/incidents/{id}/resolution`
- GET `/api/memory/stats`
- GET `/api/demo`

## Production notes

This is a hackathon MVP. Before production, add authentication, RBAC, audit logging, rate limiting, secret management, observability, stronger validation, and integrations with Jira/Slack/GitHub/Prometheus.
