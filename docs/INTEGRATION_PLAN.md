# OSCAR Unified Platform Integration Plan

## 1. Architectural Strategy

We will build an engineering-grade, demonstrable software platform connecting the existing Docker simulator, live telemetry, and the empirical research subsystem without duplicating or rewriting existing research code.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        OSCAR UNIFIED ROOT CAUSE ANALYSIS PLATFORM                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
             ┌─────────────────────────────┴─────────────────────────────┐
             ▼                                                           ▼
┌───────────────────────────────┐                       ┌────────────────────────────────┐
│   FRONTEND WEB APPLICATION    │                       │     BACKEND API & ENGINE       │
│   (React 18 + TypeScript +    │  REST / WebSocket     │   (Python FastAPI + Uvicorn)   │
│    Vite + Tailwind / Lucide)  │◄─────────────────────►│                                │
│   Port: 5173 / Production     │                       │   Port: 8000                   │
└───────────────────────────────┘                       └────────────────────────────────┘
             │                                                           │
             │                                   ┌───────────────────────┴───────────────────────┐
             │                                   ▼                                               ▼
             │                        ┌───────────────────────┐                     ┌────────────────────────┐
             │                        │   SIMULATION BRIDGE   │                     │    RCA ENGINE CORE     │
             │                        │   - Docker Health     │                     │   - OSCAR-CTRCL        │
             │                        │   - Prometheus Query  │                     │   - RCD, BARO, CIRCA   │
             │                        │   - Fault Triggers    │                     │   - MicroCause, E-Diag │
             │                        │   - Recorded Replay   │                     │   - Multi-Source BARO  │
             │                        └───────────────────────┘                     │   - Benchmark Loader   │
             │                                   │                                  └────────────────────────┘
             ▼                                   ▼                                               │
┌───────────────────────────────┐     ┌───────────────────────┐                                  ▼
│      9 INTEGRATED VIEWS       │     │   DOCKER STACK (SIM)  │                     ┌────────────────────────┐
│ 1. Overview Dashboard         │     │ - Nginx (8080)        │                     │   VERIFIED ARTIFACTS   │
│ 2. Service Topology Explorer  │     │ - Rust API            │                     │ - Phase II 120 CPU     │
│ 3. Live Observability         │     │ - Postgres & Redis    │                     │ - Error Decomposition  │
│ 4. Fault Laboratory           │     │ - Prometheus (9090)   │                     │ - Robustness Curves    │
│ 5. Incident Timeline          │     │ - cAdvisor (8081)     │                     │ - Publication Figures  │
│ 6. RCA Workbench              │     │ - Tempo & Loki        │                     └────────────────────────┘
│ 7. Benchmark Explorer         │     └───────────────────────┘
│ 8. Research Results Explorer  │
│ 9. Report Center              │
└───────────────────────────────┘
```

---

## 2. Component Design & Responsibilities

### 2.1 Backend Application API (`server/`)
- **Technology:** Python 3.13 + FastAPI + Uvicorn.
  - *Rationale:* Directly imports existing validated algorithms (`research/baselines/`, `research/proposed_method/`, `research/evaluation/metrics.py`) and data loaders (`research/preprocessing/data_loader.py`) without translation layers or IPC overhead.
- **Submodules:**
  - `server/api/simulation.py`: System health checks (Docker daemon, Prometheus ping, synthetic API ping), service topology graph, metric queries.
  - `server/api/faults.py`: Safe fault injection trigger (`cpu_stress`, `memory_spike`, `network_delay`, `container_pause`), safety bounds, recovery.
  - `server/api/incidents.py`: In-memory and file-persisted incident store, timeline tracking, and replay engine from `experiments/metadata/`.
  - `server/api/rca.py`: Unified multi-algorithm diagnosis runner executing OSCAR-CTRCL and baselines on either live/replayed incidents or benchmark cases.
  - `server/api/benchmark.py`: Pagination, filtering, and telemetry retrieval across all 735 cases in RCAEval.
  - `server/api/research.py`: Exposes Phase II verified metrics, statistical significance test matrices, error decomposition, and robustness summaries.
  - `server/api/reports.py`: Dynamic report generation in Markdown and HTML.

### 2.2 Frontend Operations Console (`frontend/`)
- **Technology:** React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Recharts / Canvas SVG.
- **Theme:** Dark engineering operations console (neutral grays `#0f172a`, `#1e293b`, vibrant status accents: emerald green, amber warning, rose failure, cyan telemetry).
- **Navigation Structure (All 9 Pages):**
  1. **Overview Dashboard:** Fleet status, active faults, recent incidents, cluster load, research summary.
  2. **Service Topology Explorer:** Interactive node-link graph with status badges, live metrics per node, dependency call relationships, and incident propagation highlighting.
  3. **Live Observability:** Time-series charts for CPU, Memory, Latency, Throughput, and Error Rate with selectable time windows and services.
  4. **Fault Laboratory:** Interactive fault injector with service dropdown, fault type selector, duration slider, safety checks, and emergency stop.
  5. **Incident Timeline:** Synchronized event timeline linking fault injection, telemetry anomaly onset, log events, RCA execution, and recovery.
  6. **RCA Workbench:** Incident selector, algorithm selector (OSCAR-CTRCL vs. 6 baselines), run button, side-by-side candidate rankings, score bars, and ground-truth reveal toggle.
  7. **Benchmark Explorer:** Full RCAEval case browser (735 cases) with suite, system, and fault filters; case inspector showing telemetry charts, root cause labels, and on-demand algorithm evaluation.
  8. **Research Results Explorer:** Interactive charts for Hit@1/3/5, MRR, 95% bootstrap CIs, McNemar contingency tables, failure decomposition, and robustness curves.
  9. **Report Center:** Generator for Incident Reports, Algorithm Comparison Reports, and Benchmark Audits with one-click export (Markdown/HTML/JSON).

---

## 3. Implementation Stages & Execution Order

1. **Stage 1 (Audit & Specs):** Produce `PROJECT_INVENTORY.md`, `ARCHITECTURE_AS_IS.md`, `IMPLEMENTATION_GAPS.md`, `INTEGRATION_PLAN.md`.
2. **Stage 2 (Backend Core):** Create `server/` with FastAPI, data models, simulation controllers, benchmark accessors, and RCA dispatchers.
3. **Stage 3 (Frontend Foundation):** Initialize Vite + React + TypeScript in `frontend/`, configure Tailwind design system and global navigation.
4. **Stage 4 (Telemetry & Topology):** Implement Topology visualizer, Live Observability charts, and Prometheus connector with offline fallback.
5. **Stage 5 (Fault Lab & Incidents):** Implement Fault Lab controls, Incident Timeline, and deterministic replay from `experiments/metadata/`.
6. **Stage 6 (RCA Workbench):** Implement multi-model diagnostic execution, candidate ranking comparison, and ground-truth validation.
7. **Stage 7 (Benchmark & Research Explorers):** Build Benchmark case browser and Research Results visualizer using verified Phase II outputs.
8. **Stage 8 (Report Center & Guided Demo):** Build Report Center with export options and the 5-minute guided demo workflow.
9. **Stage 9 (Documentation & Testing):** Write user guides, demo script, algorithm docs, and run automated integration and E2E tests.
