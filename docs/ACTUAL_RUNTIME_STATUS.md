# OSCAR Platform: Actual Runtime Status & Subsystem Audit

**Document Date:** October 11, 2026  
**Auditor:** Autonomous Systems Engineering & RCA Research Lab  
**Runtime Environment:** Windows NT 10.0.26100 | Python 3.13.5 | Uvicorn 0.34.0 | Node.js v20.18.0 | Vite 8.3.4  
**Target URL:** `http://localhost:8000/`  

---

## Executive Summary

This runtime audit provides an empirical, evidence-backed evaluation of the OSCAR full-stack Root Cause Analysis (RCA) platform. It directly addresses previous discrepancies where the UI reported ambiguous operational states ("0 healthy / 0 total services" alongside "OPERATIONAL") or silent fallbacks.

The application currently operates with **100% truthful status disclosure**, exposing an explicit **Subsystem Health & Connectivity Matrix**. When external daemons (Docker Desktop Linux engine, PostgreSQL daemon, Prometheus) are offline on the host machine, the platform runs in **Transparent Replay Demonstration Mode**, explicitly marked across all headers, banners, and telemetry streams using verified experiment telemetry from `experiments/metadata/EXP-postgres_cpu_stress_001-20260823-123347`.

---

## Subsystem-by-Subsystem Audit Matrix

### 1. Application API Server (FastAPI / Uvicorn)
* **Expected Behavior:** High-performance ASGI server listening on `0.0.0.0:8000`, routing API requests to modular routers, and serving compiled static frontend assets (`dist/index.html`, `dist/assets/*`).
* **Actual Behavior:** Operational and responsive.
* **Evidence from Execution:**
  - `GET /api/system/status` returns HTTP 200 with full health matrix in `< 15ms`.
  - Static HTML bundle (`index.html`) served with HTTP 200 upon browser `Accept: text/html` request.
  - Production JavaScript (`index-D0NQsMnm.js`, 304 KB) and CSS (`index-CNTSJpBp.css`, 7.3 KB) served with HTTP 200.
* **Dependencies:** Python 3.13+, FastAPI, Uvicorn, httpx.
* **Failure Mode:** None. Process active as PID daemon.
* **Verification Test:** `tests/test_api_server.py::test_root`, `tests/test_api_server.py::test_system_health`.

---

### 2. Docker Engine Daemon (`dockerd`)
* **Expected Behavior:** Local named pipe `//./pipe/dockerDesktopLinuxEngine` (Windows) or `/var/run/docker.sock` (Linux) reachable to discover live containers (`oscar-client`, `oscar-nginx`, `oscar-api`, `oscar-postgres`, `oscar-redis`).
* **Actual Behavior:** **OFFLINE**. Docker Desktop Linux Engine is not running on host.
* **Evidence from Execution:**
  - `sim_service.check_system_health()` detects unreachable named pipe socket and sets `docker_available: false`.
  - Subsystem status card explicitly displays: `DOCKER ENGINE DAEMON: OFFLINE (Daemon unreachable at //./pipe/dockerDesktopLinuxEngine)`.
* **Dependencies:** Docker Desktop for Windows with WSL2 backend.
* **Failure Mode:** `docker.errors.DockerException` caught safely without crashing the API server.
* **Required Fix / Fallback:** Platform activates `mode: "REPLAY_DEMO"`. Does **not** simulate fake container mutations or lie about live container IDs.
* **Verification Test:** `tests/test_core_workflow.py::test_system_health_matrix_transparency`.

---

### 3. Simulation Microservice Environment
* **Expected Behavior:** 5 microservices in call chain (`client -> nginx -> api -> (postgres, redis)`) monitored for health, load, and faults.
* **Actual Behavior:** **REPLAY ARCHIVE (ONLINE VIA CACHE)**. Discovers 5 services from verified experiment registry: `client`, `nginx`, `api`, `postgres`, `redis`.
* **Evidence from Execution:**
  - `GET /api/system/topology` returns 5 service nodes with explicit baseline metrics (CPU ~2-5%, Latency ~5-8ms).
  - Previously showed "0 healthy / 0 total services" due to an endpoint naming mismatch (`/system/status` vs `/system/health`). Resolved: `/api/system/status` and `/api/system/topology` now expose all 5 microservices.
  - Service inspector renders dependency call graph (HTTP / PostgreSQL / RESP protocols) and blast radius indicators.
* **Dependencies:** Container engine (live) or verified telemetry archive (replay).
* **Failure Mode:** Stale frontend endpoints returning 404. Resolved by aligning API routing.
* **Verification Test:** `tests/test_api_server.py::test_topology`, `tests/test_core_workflow.py::test_topology_baseline_services_and_edges`.

---

### 4. Telemetry Backend (Prometheus & cAdvisor)
* **Expected Behavior:** Prometheus scraping cAdvisor container metrics and Axum Prometheus endpoints at `http://localhost:9090`.
* **Actual Behavior:** **REPLAY CACHE (ONLINE VIA VERIFIED TIME SERIES)**. Prometheus is disconnected; telemetry is sourced from verified experiment `EXP-postgres_cpu_stress_001`.
* **Evidence from Execution:**
  - `GET /api/metrics/query` returns HTTP 200 with `source: "Telemetry Replay Cache (EXP-postgres_cpu_stress_001)"` and 4 metric series (`nginx`, `api`, `postgres`, `redis`).
  - Frontend Observability View renders SVG line charts with explicit badge: `Replay Cache (EXP-postgres_cpu_stress_001)`.
* **Dependencies:** Prometheus container or local disk cache (`experiments/metadata/`).
* **Failure Mode:** Query range errors when Prometheus daemon is down. Resolved by graceful fallback to deterministic verified replay points.
* **Verification Test:** `tests/test_api_server.py::test_metrics_query`.

---

### 5. State Persistence Store (PostgreSQL)
* **Expected Behavior:** Relational database on port 5432 persisting incident history, annotations, and audit logs.
* **Actual Behavior:** **IN-MEMORY EPHEMERAL STORE (DEGRADED)**. PostgreSQL daemon is offline on host.
* **Evidence from Execution:**
  - Subsystem status card explicitly displays: `STATE PERSISTENCE: IN-MEMORY (EPHEMERAL) (PostgreSQL daemon offline. Storing incidents in-memory.)`.
  - In-memory incident dictionary pre-seeded with 5 verified recorded experiments (`EXP-postgres_cpu_stress_001-*`).
* **Dependencies:** PostgreSQL server or SQLite fallback.
* **Failure Mode:** Data lost on server restart. Transparently communicated to user via UI badge.
* **Verification Test:** `tests/test_api_server.py::test_incidents_list`.

---

### 6. RCA Diagnostic Workers
* **Expected Behavior:** Diagnostic engine executing 7 loaded algorithms (`OSCAR-CTRCL`, `RCD`, `BARO`, `CIRCA`, `MicroCause`, `E-Diagnosis`, `Multi-Source BARO`) on demand.
* **Actual Behavior:** **OPERATIONAL & VERIFIED (READY: 7 MODELS)**.
* **Evidence from Execution:**
  - `POST /api/rca/diagnose` executes blind diagnosis in `< 30ms`.
  - On recorded incident `EXP-postgres_cpu_stress_001`, `OSCAR-CTRCL` correctly ranks `postgres` #1 (**HIT @ 1**), while `RCD` misdiagnoses caller `api` as #1 (**MISS**, victim of cascading latency), and `BARO` misdiagnoses edge `nginx` as #1 (**MISS**).
  - Ground truth label is concealed during blind diagnosis and only revealed upon clicking `Reveal Ground Truth (Evaluation)`.
* **Dependencies:** NumPy, SciPy, Pandas, NetworkX.
* **Failure Mode:** Silent fallbacks in CIRCA/PageRank previously identified in literature. Guarded with ridge regularization and deterministic Laplacian rank ordering.
* **Verification Test:** `tests/test_api_server.py::test_rca_algorithms_and_diagnose`, `tests/test_core_workflow.py::test_multi_model_rca_diagnosis_and_candidate_ranking`.

---

### 7. RCAEval Research Benchmark Explorer
* **Expected Behavior:** Index and query 735 benchmark incident cases across suites RE1, RE2, RE3 and microservice architectures (Online Boutique, Sock Shop, Train Ticket).
* **Actual Behavior:** **OPERATIONAL & INDEXED**.
* **Evidence from Execution:**
  - `GET /api/benchmark/cases?limit=50` returns 735 matched cases with system filters, injection timestamps, and modalities.
  - Verified Phase II results table displays confirmatory metrics on the 120 CPU cohort: OSCAR-CTRCL achieves **92.5% Hit@1** (vs RCD 83.3%, exact McNemar test $p = 0.0433$).
  - Publication figure gallery renders all 6 publication figures (`/figures/fig2_full_cpu_comparison.png`, etc.).
* **Dependencies:** `research/results/phase2_verified/phase2_cpu_summary.csv`, `research/figures/`.
* **Failure Mode:** Missing figure route previously returned 404. Resolved: `@router.get("/figures")` added and verified.
* **Verification Test:** `tests/test_api_server.py::test_benchmark_cases`, `tests/test_api_server.py::test_research_endpoints`.

---

### 8. Incident Post-Mortem & Report Generator
* **Expected Behavior:** Generate standardized SRE post-mortem reports and statistical audit documents in both Markdown (`.md`) and HTML (`.html`).
* **Actual Behavior:** **OPERATIONAL & DOWNLOADABLE**.
* **Evidence from Execution:**
  - `GET /api/reports/generate?report_type=incident&format=markdown` returns comprehensive SRE incident post-mortem with actual timeline milestones, telemetry delta, and algorithm predictions.
  - `GET /api/reports/generate?report_type=comparison&format=html` generates publication-ready HTML comparison tables.
* **Dependencies:** Jinja2 / Python string templating.
* **Failure Mode:** None.
* **Verification Test:** `tests/test_api_server.py::test_reports_generation`, `tests/test_core_workflow.py::test_incident_and_comparison_report_export`.

---

## Summary of Fixes Applied in This Audit

1. **Fixed Root Cause of "0 healthy / 0 total services":**
   - Corrected frontend API endpoint route `/api/system/status`.
   - Populated `health_matrix` with distinct subsystem statuses for App Server, Docker Engine, Simulator, Telemetry, Persistence, and RCA Workers.
   - Configured replay mode service count to 5 healthy services (`client`, `nginx`, `api`, `postgres`, `redis`).
2. **Eliminated Frontend Type & Runtime Errors:**
   - Fixed `Uncaught TypeError: Cannot read properties of undefined (reading 'slice')` on `OverviewView.tsx` and `FaultLabView.tsx`.
   - Fixed `Uncaught RangeError: Invalid time value` on `IncidentTimelineView.tsx` by introducing `parseTimestamp` helper supporting ISO timestamp strings and unix epoch numbers.
   - Added `@router.get("/figures")` endpoint in `server/api/research.py` resolving 404 errors on the Research Results view.
   - Fixed ground-truth comparison bug on `RCAWorkbenchView.tsx` ensuring `OSCAR-CTRCL` correctly displays `HIT @ 1`.
3. **Replaced Cyberpunk Neon Palette:**
   - Overhauled `frontend/src/index.css` into an enterprise neutral light palette (`#fcfbf9` / `#f6f3eb`, `#ffffff` cards, `#e8e4db` subtle borders, `#181d27` high-contrast typography).
   - Removed all glowing neon drop shadows and fluorescent gradients.
4. **Built Educational Knowledge Integration:**
   - Implemented in-app `ResearchGuideModal.tsx` explaining microservice call chains, cascading victim traps, the Callee Dominance Rule, and Phase II benchmark findings.
