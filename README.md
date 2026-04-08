# Luminous Real Estate

**Live bubble risk detection for the Indian residential property market.**  
Five government data sources → six statistical models → LangGraph multi-agent system → real-time 3D dashboard with voice Q&A.

---

## What it does

India's housing data is split across seven government agencies. No commercial platform — MagicBricks, 99acres, Housing.com — connects any of it to live monetary policy. They show you listing prices. This shows you whether those prices make mathematical sense right now, given the RBI's current repo rate, CPI, and household income data.

**Risk score updates every 15 minutes. MPC rate decisions reflect in under 90 seconds.**

---

## Structure

```
Luminous_Real_Estate/
├── backend/
│   └── re_bubble_engine/       # FastAPI + LangGraph agents + ingestion pipeline
└── frontend/
    ├── app/                    # Next.js 15 app router
    ├── components/             # India Digital Twin, dashboard panels
    ├── hooks/                  # WebSocket + SSE consumers
    ├── lib/                    # API clients, utilities
    ├── store/                  # State management
    └── public/                 # Static assets, Mapbox configs
```

---

## Data pipeline

| Source | What it feeds | Refresh |
|---|---|---|
| **RBI DBIE** | Repo rate, G-Sec yields, M3, bank credit | Every 30 min |
| **World Bank Open Data** | GDP growth, unemployment, urbanisation | Daily |
| **NHB RESIDEX** | City HPI across 50 cities (transaction-based, not listing-based) | Daily scrape, quarterly release |
| **MOSPI / data.gov.in** | CPI-Combined, household income, PLFS | Daily |
| **99acres** | Median rental rates by city | Every 4 hours |

NHB RESIDEX is used over commercial listing data because it's compiled from registered sale deed records. 99acres asking prices run 12–18% above actual transaction prices in Indian metros.

---

## Risk models

All implemented in pure Python/NumPy. The LLM narrates — it cannot alter the numbers.

- **DCF** — WACC derived live from repo rate + SBI credit spread + 200 bps risk premium
- **Cap rate spread** — property yield vs G-Sec 10Y; < 100 bps = bubble signal
- **Price-to-Income ratio** — Mumbai 2023: 11.4x (critical threshold: 9x)
- **Price-to-Rent ratio** — PRR ≥ 40x = gross yield < 2.5% = speculative territory
- **Affordability index** — monthly mortgage as % of median income; stressed > 43%
- **Monte Carlo** — 1K–10K paths across three RBI-calibrated shock scenarios → P10/P50/P90

---

## Agent system

```
Orchestrator (LangGraph)
├── Valuation Agent   → DCF + cap rate → Gemini/Groq narrative
├── Risk Agent        → PIR + PRR + affordability → bubble score 0–100
├── Scenario Agent    → Monte Carlo → P10/P50/P90 distribution
└── Query Agent       → RAG (Qdrant) → voice answer via ElevenLabs
```

LLM routing: Gemini 2.0 Flash → Groq Llama-4 → OpenRouter (auto-fallback).  
Full agent run every 6 hours. Triggered immediately on MPC rate decisions.

---

## Frontend

- **India Digital Twin** — 3D property market visualisation on Mapbox
- **Voice Q&A** — speak a question, get a synthesised answer (ElevenLabs TTS via Query Agent)
- **Live token stream** — agent reasoning streamed over WebSocket as it generates
- **Bubble alerts** — SSE push on risk score threshold breaches

---

## Stack

**Backend** — FastAPI · LangGraph · Pydantic v2 · TimescaleDB · PostgreSQL · Redis · Qdrant · APScheduler · NumPy

**Frontend** — Next.js 15 · Mapbox · ElevenLabs · WebSocket · SSE

**LLMs** — Gemini 2.0 Flash · Groq Llama-4 · OpenRouter fallback

**Infrastructure** — Supabase · Upstash Redis · Qdrant Cloud · all free tier, no Docker

---

## Quickstart

```bash
git clone https://github.com/aadvt/Luminous_Real_Estate.git
cd Luminous_Real_Estate

# Backend
cd backend/re_bubble_engine
cp .env.example .env        # fill in your keys (see below)
pip install -r requirements.txt
python -c "import asyncio; from storage.db import init_db; asyncio.run(init_db())"
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd ../../frontend
npm install
npm run dev                 # http://localhost:3000
```

**Keys needed** (all free tier):

| Key | Where |
|---|---|
| `DATABASE_URL` | [supabase.com](https://supabase.com) → Project Settings → Database → Transaction mode URI |
| `REDIS_URL` | [upstash.com](https://upstash.com) → Details → Redis URL (`rediss://`) |
| `QDRANT_URL` + `QDRANT_API_KEY` | [cloud.qdrant.io](https://cloud.qdrant.io) → Cluster |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |
| `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai) |

---

## API

| | Endpoint | |
|---|---|---|
| `GET` | `/health/detail` | DB + Redis + Qdrant status |
| `GET` | `/api/market/snapshot` | Live macro snapshot (18 fields) |
| `POST` | `/api/valuate` | DCF + ratios + LLM narrative |
| `POST` | `/api/scenario/run` | Monte Carlo with custom shock params |
| `GET` | `/api/risk/scores` | Current bubble score 0–100 |
| `POST` | `/api/query` | NL question → RAG-grounded answer |
| `WS` | `/ws/{client_id}` | Live agent stream + bubble alerts |
| `SSE` | `/api/alerts/stream` | Push notifications on flag triggers |

---

## Research basis

Full methodology in the accompanying IEEE technical report — data source justification, model formulations, Indian market threshold calibration, and comparative analysis of existing PropTech platforms.

> *Real-Time Data Ingestion Architecture for Indian Residential Real Estate Bubble Detection: A Multi-Agent Analytical Framework* · April 2026
