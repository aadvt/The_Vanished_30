# The Vanished 30: Luminous Real Estate - Comprehensive Documentation

## 1. Introduction

"Luminous Real Estate" is an advanced analytical platform designed for real-time detection of bubble risk within the Indian residential property market. It integrates five distinct government data sources with six statistical models, orchestrated by a LangGraph multi-agent system, to provide a real-time 3D dashboard with voice-activated Q&A capabilities. The primary objective is to offer a more accurate and dynamic assessment of property market health compared to traditional commercial platforms, which often rely on listing prices rather than actual transaction data and fail to account for live monetary policy changes [1].

The system updates its risk score every 15 minutes, with Monetary Policy Committee (MPC) rate decisions reflecting in under 90 seconds, ensuring highly current and relevant insights into market dynamics [1].

## 2. Architecture Overview

The project is structured into two main components: a `backend` and a `frontend`. The `backend` is built with FastAPI and incorporates a LangGraph multi-agent system, an ingestion pipeline for data, and various calculation modules. The `frontend` is a Next.js 15 application that provides a rich, interactive 3D visualization of the Indian property market, along with user interface elements for interaction and data display.

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

## 3. Data Pipeline

The system ingests data from multiple sources, each contributing specific indicators crucial for real estate market analysis. The choice of data sources, particularly NHB RESIDEX over commercial listing data, is deliberate to ensure accuracy, as commercial listings can be significantly inflated compared to actual transaction prices [1].

| Source                  | What it feeds                                      | Refresh Rate                     |
| :---------------------- | :------------------------------------------------- | :------------------------------- |
| **RBI DBIE**            | Repo rate, G-Sec yields, M3, bank credit           | Every 30 min                     |
| **World Bank Open Data**| GDP growth, unemployment, urbanization             | Daily                            |
| **NHB RESIDEX**         | City HPI across 50 cities (transaction-based)      | Daily scrape, quarterly release  |

## 4. Risk Models

All six risk models are implemented in pure Python/NumPy, ensuring that the LLM's role is purely narrative and does not influence the numerical calculations. These models provide a multi-faceted view of potential bubble conditions [1].

*   **DCF (Discounted Cash Flow)**: Calculates property valuation based on future cash flows, with WACC derived from the live repo rate, SBI credit spread, and a 200 bps risk premium.
*   **Cap Rate Spread**: Compares property yield to G-Sec 10Y. A spread of less than 100 basis points is considered a bubble signal.
*   **Price-to-Income (PIR) Ratio**: Measures housing affordability. For example, Mumbai's 2023 ratio of 11.4x is significantly above the critical threshold of 9x.
*   **Price-to-Rent (PRR) Ratio**: Indicates speculative activity. A PRR ≥ 40x suggests a gross yield below 2.5%, pointing to speculative territory.
*   **Affordability Index**: Assesses the percentage of median income required for monthly mortgage payments. A stressed level is considered above 43%.
*   **Monte Carlo Simulation**: Runs 1,000–10,000 paths across three RBI-calibrated shock scenarios to generate P10/P50/P90 distributions, providing probabilistic risk assessments.

## 5. Agent System (Backend)

The core intelligence of the backend is a multi-agent system built with LangGraph, orchestrated to perform various analytical tasks and respond to user queries. The system uses a routing mechanism to direct tasks to specialized agents [1].

```
Orchestrator (LangGraph)
├── Valuation Agent   → DCF + cap rate → Gemini/Groq narrative
├── Risk Agent        → PIR + PRR + affordability → bubble score 0–100
├── Scenario Agent    → Monte Carlo → P10/P50/P90 distribution
└── Query Agent       → RAG (Qdrant) → voice answer via ElevenLabs
```

### 5.1. Orchestrator

The `orchestrator_node` acts as the entry point for agent runs. It directs the flow based on the `trigger` in the agent state. If the trigger is a `query`, it routes to the `query` agent; otherwise, it proceeds to the `valuation` agent for a full analytical run.

### 5.2. Valuation Agent (`valuation_node`)

This agent performs detailed property valuations. It takes the macro snapshot as input and calculates DCF and various ratios (Price-to-Income, Price-to-Rent, Affordability, Cap Rate Spread). It then uses an LLM (Gemini/Groq) to generate a narrative summary of the valuation results.

### 5.3. Risk Agent (`risk_node`)

The Risk Agent calculates an overall bubble risk score (0-100) based on the Price-to-Income ratio, Price-to-Rent ratio, affordability percentage, and cap rate spread. It also uses an LLM to provide a narrative explaining the bubble risk level and primary indicators. If the overall score exceeds 60, a `BubbleFlag` is written to the database.

### 5.4. Scenario Agent (`scenario_node`)

This agent runs Monte Carlo simulations based on predefined shock scenarios (e.g., RBI rate hike, inflation persistence, IT sector slowdown). It calculates percentile distributions (P10, P25, P50, P75, P90) and the probability of values falling below the current base value. An LLM then generates a narrative summarizing the impact, worst-case, base-case, and probability assessments for each scenario.

### 5.5. Query Agent (`query_node`)

The Query Agent handles natural language questions from users. It uses Retrieval-Augmented Generation (RAG) with Qdrant to fetch relevant context and then employs an LLM to generate a voice answer via ElevenLabs. It can leverage the current macro snapshot, valuation results, and risk scores to provide context-aware responses.

### 5.6. LLM Routing

The system employs a robust LLM routing strategy, prioritizing faster models like Gemini 2.0 Flash and Groq Llama-4, with OpenRouter as an auto-fallback. This ensures resilience and optimal performance in generating narratives and structured outputs [1].

## 6. Frontend

The frontend is a Next.js 15 application designed for an immersive and interactive user experience, providing real-time insights into the Indian real estate market.

### 6.1. India Digital Twin

This is a 3D property market visualization built on Mapbox, offering a dynamic and intuitive way to explore market data across different regions. It serves as the central visual component of the dashboard.

### 6.2. Voice Q&A

Users can interact with the system using voice commands. Questions are processed by the Query Agent, and answers are synthesized into speech using ElevenLabs TTS, providing a natural conversational interface.

### 6.3. Live Token Stream

Agent reasoning and LLM outputs are streamed live over WebSocket, allowing users to see the analytical process unfold in real-time as the agents generate their responses.

### 6.4. Bubble Alerts

Server-Sent Events (SSE) are used to push real-time notifications to the frontend when risk score thresholds are breached, keeping users informed of critical market changes.

### 6.5. Key Components

*   **`RealityEngine.tsx`**: The main component responsible for rendering the 3D Mapbox visualization.
*   **`HUD.tsx`**: The Head-Up Display, which includes navigation (city selection), backend status indicators, and integrates other dashboard elements like `MetricStrip`, `PropertyPanel`, `BottomDrawer`, and `VoiceControl`.
*   **`ChatPanel.tsx`**: Manages the display of agent transcripts and user input for natural language queries.
*   **`LiveDataLoop.tsx`**: A crucial component that continuously fetches and updates data from the backend via polling and SSE, ensuring the dashboard displays the latest macro snapshots, bubble flags, and valuation records.

## 7. Technical Stack

The project leverages a modern and efficient technical stack, with a focus on free-tier services for infrastructure [1].

| Category       | Technologies Used                                                                  |
| :------------- | :--------------------------------------------------------------------------------- |
| **Backend**    | FastAPI, LangGraph, Pydantic v2, TimescaleDB, PostgreSQL, Redis, Qdrant, APScheduler, NumPy |
| **Frontend**   | Next.js 15, Mapbox, ElevenLabs, WebSocket, SSE                                     |
| **LLMs**       | Gemini 2.0 Flash, Groq Llama-4, OpenRouter (fallback)                              |
| **Infrastructure** | Supabase (PostgreSQL), Upstash Redis, Qdrant Cloud                                 |

## 8. API Endpoints

The backend exposes several API endpoints for interaction with the frontend and other services [1].

| Method | Endpoint             | Description                                   |
| :----- | :------------------- | :-------------------------------------------- |
| `GET`  | `/health/detail`     | Provides status of DB, Redis, and Qdrant      |
| `GET`  | `/api/market/snapshot` | Returns live macro snapshot (18 fields)       |
| `POST` | `/api/valuate`       | Triggers DCF calculation, ratios, and LLM narrative |
| `POST` | `/api/scenario/run`  | Runs Monte Carlo simulation with custom shock parameters |
| `GET`  | `/api/risk/scores`   | Retrieves current bubble score (0–100)        |
| `POST` | `/api/query`         | Processes natural language questions via RAG  |
| `WS`   | `/ws/{client_id}`    | Provides live agent stream and bubble alerts  |
| `SSE`  | `/api/alerts/stream` | Pushes notifications on flag triggers         |

## 9. Data Storage

*   **PostgreSQL / TimescaleDB**: Used for persistent storage of macro indicators, bubble flags, scenario results, and other relational data. `SQLAlchemy` with `asyncpg` driver is used for asynchronous database operations.
*   **Redis**: Employed for caching frequently accessed data (e.g., macro snapshots) and for managing WebSocket connections and publishing events across the system.
*   **Qdrant**: A vector database used for Retrieval-Augmented Generation (RAG) in the Query Agent. It stores document embeddings (generated by `SentenceTransformer`) to facilitate semantic search and context retrieval for LLM queries.

## 10. Scheduler

`APScheduler` is used to manage scheduled tasks within the backend. It ensures that critical data ingestion and agent runs occur at regular intervals.

*   **`macro_refresh` job**: Runs at a configurable interval (e.g., every 30 minutes) to refresh macro data from external sources via the `IngestCoordinator`. After refreshing, it publishes updates to WebSocket and SSE streams and invalidates the geo cache.
*   **`agent_run` job**: Runs at a configurable interval (e.g., every 6 hours) to trigger a full run of the LangGraph agent system, recalculating valuations, risk scores, and scenarios.

## 11. Conclusion

"Luminous Real Estate" represents a sophisticated application of AI, data engineering, and modern web technologies to address a critical need in the Indian residential property market. By integrating diverse data sources, employing robust statistical models, and leveraging a multi-agent LLM system, it provides real-time, data-driven insights into bubble risk, offering a valuable tool for stakeholders in the real estate sector.

## References

[1] aadvt. (n.d.). *The_Vanished_30*. GitHub. Retrieved from [https://github.com/aadvt/The_Vanished_30](https://github.com/aadvt/The_Vanished_30)
