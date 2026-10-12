# OSCAR Architecture As-Is

## 1. Architectural Overview

Prior to unified platform integration, the OSCAR repository consists of two decoupled subsystems developed across separate phases:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT REPOSITORY ARCHITECTURE                       │
├──────────────────────────────────────────┬──────────────────────────────────────┤
│  SUBSYSTEM 1: OSCAR-Sim (Local Microservice)│  SUBSYSTEM 2: Empirical Research     │
│  - Target app: Rust Axum + Postgres + Redis│  - RCAEval Benchmark Data Loader     │
│  - Ingress: Nginx Reverse Proxy (8080)   │  - 6 Baseline Algorithm Adapters     │
│  - Monitoring: Prometheus (9090), cAdvisor│  - Proposed OSCAR-CTRCL Localizer    │
│    Loki (3100), Tempo (3200), Grafana    │  - Statistical Evaluation Engine     │
│  - Traffic: k6 workload JS scenarios     │  - Phase II Verified Campaign Scripts│
│  - Controller: Rust CLI (Bollard/Docker) │  - Machine-readable JSON/CSV results │
│  - Status: Runs via Docker Compose & CLI │  - Status: Runs via Python scripts   │
└──────────────────────────────────────────┴──────────────────────────────────────┘
                                    │
                                    ▼ (GAP)
          [ NO UNIFIED GRAPHICAL USER INTERFACE OR ORCHESTRATION API ]
```

---

## 2. Subsystem 1: OSCAR-Sim Infrastructure

### 2.1 Topology & Data Flow
- Ingress: `nginx:alpine` exposed on port `8080`, proxying requests to `api` on internal container network `oscar_sim_net`.
- Application Service: `api` (Rust Axum service compiled in Docker container).
  - Handles `/health`, `/users`, `/cache`, `/metrics`.
  - Connects to `postgres:16` via `sqlx::PgPool` and `redis:7-alpine` via `deadpool-redis`.
- Monitoring Stack:
  - `prometheus` scrapes `api:3000/metrics` and `cadvisor:8080/metrics` at 5-second intervals.
  - `cadvisor` inspects cgroups on Linux/WSL2 host.
  - `tempo` receives OpenTelemetry traces over gRPC/HTTP (4317/4318).
  - `loki` receives container logs forwarded by `promtail`.
  - `grafana` exposes dashboard on port `3001`.
- Experiment Controller:
  - `controller/src/main.rs`: A Rust binary with subcommands:
    - `oscar-sim fault list`
    - `oscar-sim fault validate <type> --target <service>`
    - `oscar-sim fault run <type> --target <service> --duration <time>`
    - `oscar-sim experiment run experiments/<spec>.yaml`
  - Leverages Docker socket (`Bollard`) to control containers (`kill`, `pause`) or invoke `stress-ng` / `pumba`.

---

## 3. Subsystem 2: Empirical Research & Algorithm Pipeline

### 3.1 Components
- Data Loader (`research/preprocessing/data_loader.py`):
  - Ingests `cases.parquet` (735 cases in RCAEval).
  - Downloads / caches telemetry metrics, logs, traces, and service topologies.
  - Implements 300s/300s windowing around fault injection timestamp $t_{\text{inject}}$.
- Algorithm Adapters (`research/baselines/`):
  - Standardized interface `BaseRCAAdapter` with `.diagnose(incident) -> RCADiagnosisResult`.
  - 6 baseline models: BARO, CIRCA (with Ridge regularization), RCD, MicroCause, E-Diagnosis (with PageRank tie detection), Multi-Source BARO.
  - 2 hybrid methods: Reciprocal Rank Fusion, Causal-Temporal Hybrid.
  - Proposed method: OSCAR-CTRCL (Wasserstein quantile drift + Physical Resource Dominance + Causal Callee Dominance).
- Statistical Suite (`research/evaluation/metrics.py`):
  - Computes Hit@1..5, MRR, chance expectations, exact McNemar tests ($2 \times 2$ contingency tables), paired continuous Wilcoxon and permutation tests, and 10,000-resample stratified bootstrap confidence intervals.
- Verified Artifacts (`research/results/phase2_verified/`):
  - Detailed per-case predictions across 120 CPU cases and 30 cross-fault cases ($N=150$).
  - Full error decomposition with caller/callee symptom confusion classifications.
  - Multi-system noise and telemetry missingness results ($N=60$).

---

## 4. Current Limitations
1. **Lack of Graphical Interface:** No web UI currently exists; a user or professor must run Python scripts from PowerShell or CLI to view metrics or execute diagnosis.
2. **Disconnected Runtime Environments:** OSCAR-Sim and the Research Pipeline run as separate tools without a common incident data model.
3. **Absence of Real-Time Incident Orchestration:** There is no bridge to trigger a fault in the simulator, ingest the resulting Prometheus telemetry window into the RCA adapters, and immediately display the algorithms' ranked predictions side-by-side with ground truth.
