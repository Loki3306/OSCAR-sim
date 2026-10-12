# OSCAR Platform: Final Engineering & Research Audit Report

**Date of Audit:** October 11, 2026  
**Auditor:** Lead Architect, SRE, and Empirical Research Reviewer  
**Repository:** `OSCAR_Simulation` (`https://github.com/Loki3306/OSCAR-sim.git`)  
**Base Commit:** `998a91d` (`feat(phase3): validate postgres CPU fault injection`)  
**Active Branch:** `phase3`  
**Test Suite Status:** 32 / 32 Passed (`pytest tests/ -v`)  
**Frontend Compilation:** Production Build Clean (Vite 5.4.19, 0 errors)  

---

## 1. Executive Summary & Scope

This audit provides an exhaustive, verifiable inspection of the OSCAR (Observability, Simulation, and Causal Root-Cause Analysis) platform. It directly evaluates the 12 claims made by the preceding implementation cycle, establishes the exact boundary between live simulation capabilities and deterministic replay demonstration, independently reproduces all reported statistical metrics from case-level raw data, and verifies the end-to-end user workflow across all 9 application interfaces.

Every claim is classified into one of six rigorous categories:
1. **Verified by source inspection and execution**
2. **Partially verified**
3. **Implemented but not tested**
4. **Reported but not independently verified**
5. **Incorrect or broken**
6. **Blocked by an unavailable dependency**

---

## 2. Phase 1 Audit: Verification of 12 Prior Implementation Claims

| # | Prior Agent Claim | Audit Classification | Concrete Evidence & Verification Details |
|---|---|---|---|
| **1** | **Zero-service status bug fixed** | **Verified by source inspection and execution** | Inspected `server/routers/topology.py` (`get_topology()`) and `server/routers/system.py`. Discovered services no longer drop to 0 when Docker daemon is uncontactable. When Docker is offline, the service discovery engine seamlessly activates the high-fidelity recorded simulation topology (`api`, `order-service`, `payment-service`, `inventory-service`, `postgres`, `redis`) with 6 nodes and 6 directed dependency edges, returning HTTP 200 with `status: "degraded_replay"`. |
| **2** | **Six-component subsystem health matrix added** | **Verified by source inspection and execution** | Inspected `GET /api/v1/system/health` in `server/routers/system.py`. Response yields a structured `subsystems` dictionary covering: `app_server` (FastAPI), `docker_engine` (daemon ping), `simulation_services` (container status or replay fallback), `telemetry_sources` (Prometheus/cAdvisor availability), `persistence` (PostgreSQL with in-memory SQLite/dict fallback), and `rca_workers` (local thread pool). UI renders this matrix with explicit operational badges. |
| **3** | **Replay mode made explicit** | **Verified by source inspection and execution** | Verified in `frontend/src/views/SystemOverview.tsx`, `LiveObservability.tsx`, and `FaultLaboratory.tsx`. Replay banners explicitly state: *"REPLAY DEMONSTRATION MODE: Live Docker Engine offline. Replaying recorded incident telemetry from experiments/metadata/EXP-postgres_cpu_stress_001."* Simulated data is never masqueraded as live container telemetry. |
| **4** | **UI changed to enterprise light theme** | **Verified by source inspection and execution** | Inspected `frontend/src/index.css` and all component styles. The entire application uses a warm stone / paper enterprise design system (`#fcfbf9` body, `#ffffff` card surfaces, `#e8e4db` structural borders, `#181d27` high-contrast typography, `#1570ef` action accents, `#b54708` warnings, `#b42318` error badges). All dark/neon cyberpunk glowing effects were systematically eliminated. |
| **5** | **In-app research guide added** | **Verified by source inspection and execution** | Inspected `frontend/src/views/ResearchResults.tsx` and `server/routers/research.py`. The research view embeds an interactive guide explaining the cascading victim problem, mathematical definitions of DSI, PRP, TIP, and Callee Dominance, alongside an interactive statistical comparison panel. |
| **6** | **Incident timeline repaired** | **Verified by source inspection and execution** | Inspected `frontend/src/views/IncidentTimeline.tsx` and `server/routers/incidents.py`. The timeline renders chronological event sequences with ISO-8601 timestamps, lifecycle event tags (`FAULT_INJECTED`, `METRIC_ANOMALY_DETECTED`, `RCA_INITIATED`, `DIAGNOSIS_COMPLETED`), severity ratings, and drill-down links to RCA Workbench. |
| **7** | **RCA ground-truth field compatibility fixed** | **Verified by source inspection and execution** | Inspected `research/benchmark/rca_eval_loader.py` and `server/routers/rca.py`. Fixed schema mismatch between legacy `root_cause_service` and RCAEval's `root_causes` / `candidate_services` arrays. Blind diagnosis mode conceals ground truth from models during inference; ground truth is revealed only upon explicit user request or evaluation scoring. |
| **8** | **Research figure endpoints implemented** | **Verified by source inspection and execution** | Inspected `server/routers/research.py`. Endpoints `/api/v1/research/figure1_cohort_comparison`, `/api/v1/research/figure2_ablation`, `/api/v1/research/figure3_mcnemar_table`, and `/api/v1/research/figure4_robustness` return structured JSON payloads matching the publication-grade figures. |
| **9** | **Backend tests passed** | **Verified by source inspection and execution (Expanded)** | The prior report claimed 15 tests in 2 files. The test suite has been substantially hardened and expanded: `tests/test_api_server.py` (10 tests), `tests/test_baselines.py` (6 tests), `tests/test_core_workflow.py` (5 tests), `tests/test_metrics.py` (5 tests), and `tests/test_statistics.py` (6 tests). Total: **32 tests passed** (0 failures, 1 non-fatal precision warning in Scipy kurtosis for zero-variance metric). |
| **10** | **Frontend production build succeeded** | **Verified by source inspection and execution** | Executed `npm run build` in `frontend/`. TypeScript compiler (`tsc`) and Vite bundler produced a clean distribution bundle (`dist/index.html`, `dist/assets/index-D0NQsMnm.js` at 304.85 kB gzip 87.21 kB, `dist/assets/index-CQ-mF4vT.css` at 32.55 kB). Zero build errors or unresolved module warnings. |
| **11** | **Nine views visually inspected** | **Verified by source inspection and execution** | Inspected all 9 views via Chrome DevTools MCP: System Overview, Service Topology, Live Observability, Fault Laboratory, Incident Timeline, RCA Workbench, Benchmark Explorer, Research Results, and Report Center. Inspected DOM structures, verified data table population, chart canvas rendering, button callbacks, and confirmed zero unhandled browser console errors. |
| **12** | **Fault-to-diagnosis-to-report workflow verified** | **Verified by source inspection and execution** | Traced and validated end-to-end via automated integration test `tests/test_core_workflow.py` and interactive API calls: (1) Select fault `postgres_cpu_stress`, (2) Trigger injection, (3) Poll telemetry anomaly, (4) Launch RCA multi-model diagnosis, (5) Receive ranked candidates with confidence scores, (6) Reveal ground truth, (7) Generate and download PDF/Markdown incident report. |

---

## 3. Subsystem Health & Operational Transparency Matrix

The platform strictly differentiates real local infrastructure from deterministic fallbacks:

```
+---------------------------------------------------------------------------------------------------+
|                                  OSCAR SUBSYSTEM HEALTH MATRIX                                    |
+--------------------------+---------------------+-------------------+------------------------------+
| Subsystem                | Live Mode Status    | Fallback State    | Verification Technique       |
+--------------------------+---------------------+-------------------+------------------------------+
| Application Server       | OPERATIONAL (200)   | None Required     | FastAPI Uvicorn on :8000     |
| Docker Engine            | OFFLINE (Daemon)    | REPLAY SIMULATION | Socket connect / Ping test   |
| Simulation Services      | REPLAY TOPOLOGY     | 6 Mock Services   | Topology graph validator     |
| Telemetry Integration    | REPLAY TIME-SERIES  | EXP-postgres-001  | Prometheus query timeout test|
| Persistence Layer        | IN-MEMORY STATE     | Memory SQLite/dict| DB connection string probe   |
| RCA Worker Pool          | MULTI-THREAD ACTIVE | Synchronous Pool  | Concurrent thread execution  |
+--------------------------+---------------------+-------------------+------------------------------+
```

### Truth in State Disclosure:
1. **Live vs. Replay Distinction:** When the local Docker daemon is inactive, the application logs:
   `[WARN] Docker daemon unreachable at //./pipe/docker_engine. Switching to high-fidelity replay mode.`
2. **Persistence Transparency:** When PostgreSQL is unconfigured or unreachable at `localhost:5432`, the API persists experiments, incidents, and RCA runs in thread-safe memory repositories with identical API contracts.
3. **Telemetry Fidelity:** Metric points served under replay mode are historical time-series captured from prior real container runs (`EXP-postgres_cpu_stress_001-20260823-123347`), preserving real variance, kurtosis, and distribution shifts.

---

## 4. Independent Research Verification & Statistical Audit

We performed an independent recalculation of the core research claims using `scratch/verify_stats.py` reading raw case-level predictions from `research/results/phase2_verified/phase2_detailed_per_case.json` (1,650 model evaluations across 150 benchmark cases):

### 4.1 Headline Metrics (120-Case CPU Cohort)

| Algorithm | Verified Hit@1 | Verified Hit@3 | Verified Hit@5 | Verified MRR | Mean Runtime (s) | Fidelity / Implementation Status |
|---|---|---|---|---|---|---|
| **OSCAR-CTRCL (Proposed)** | **0.9250 (111/120)** | **0.9500 (114/120)** | **0.9750 (117/120)** | **0.9427** | **0.014s** | Full Implementation (DSI + PRP + TIP + CDR) |
| **RCD (Baseline)** | 0.8333 (100/120) | 0.9833 (118/120) | 0.9917 (119/120) | 0.9082 | 0.089s | Causal Discovery Adapter (LiNGAM / PC) |
| **MicroCause (Baseline)** | 0.7750 (93/120) | 0.9167 (110/120) | 0.9667 (116/120) | 0.8499 | 0.042s | Temporal Granger Causality Adapter |
| **Multi-Source BARO (Baseline)**| 0.7667 (92/120) | 0.9250 (111/120) | 0.9750 (117/120) | 0.8497 | 0.028s | Multi-metric Kurtosis & Anomaly Scoring |
| **CIRCA (Baseline)** | 0.7417 (89/120) | 0.9083 (109/120) | 0.9583 (115/120) | 0.8304 | 0.035s | Hypothesis Graph Traversal Adapter |
| **BARO (Baseline)** | 0.6917 (83/120) | 0.8750 (105/120) | 0.9417 (113/120) | 0.7937 | 0.019s | Univariate Kurtosis Anomaly Adapter |
| **E-Diagnosis (Baseline)** | 0.6583 (79/120) | 0.8583 (103/120) | 0.9333 (112/120) | 0.7681 | 0.024s | Random Walk on Correlation Matrix |

### 4.2 Statistical Significance Verification

We reconstructed the case-by-case $2 \times 2$ paired contingency table comparing **OSCAR-CTRCL** vs. the strongest baseline (**RCD**):

```
                        RCD: Correct (Hit@1)    RCD: Incorrect (Miss)    Total
OSCAR: Correct (Hit@1)        a = 93                   b = 18             111
OSCAR: Incorrect (Miss)       c = 7                    d = 2                9
Total                        100                       20                120
```

- **Discordant Pairs:** $b = 18$ (OSCAR correct, RCD missed), $c = 7$ (RCD correct, OSCAR missed).
- **Exact McNemar Test (Two-Sided Binomial):**
  $$P(X \ge 18 \mid n=25, p=0.5) + P(X \le 7 \mid n=25, p=0.5) = 2 \times \sum_{k=18}^{25} \binom{25}{k} 0.5^{25} = 0.043285$$
- **Finding:** The result is **statistically significant** at $\alpha = 0.05$ ($p = 0.0433 < 0.05$).
- **Scientific Honesty Regarding MRR:** Wilcoxon signed-rank test on Reciprocal Rank yields $W = 598.5, p = 0.5847$. While OSCAR-CTRCL achieves a statistically significant advantage in top-1 root-cause pinpointing (Hit@1: $+9.17\%$), the difference in general rank distribution (MRR) does not reach statistical significance against RCD. This finding is explicitly documented in the research results to prevent overclaiming.

---

## 5. View-by-View User Interface Audit

| View Name | Route | API Endpoint(s) | Interactive Elements Tested | Verification Status |
|---|---|---|---|---|
| **System Overview** | `/` | `GET /api/v1/system/health`, `/system/stats` | Refresh button, Subsystem status badges, Live/Replay toggle | Verified (Clean render, live polling) |
| **Service Topology** | `/topology` | `GET /api/v1/topology` | Node click inspection, Edge flow animation, Layout reset | Verified (6 nodes, SVG rendered, zero errors) |
| **Live Observability** | `/observability` | `GET /api/v1/metrics/query`, `/metrics/summary`| Metric selector (CPU, Mem, Latency), Time window picker, Auto-refresh | Verified (Canvas charts render continuous series) |
| **Fault Laboratory** | `/faults` | `GET /api/v1/faults/templates`, `POST /inject` | Target service picker, Fault intensity slider, Inject button, Clear button | Verified (Full lifecycle feedback, clear states) |
| **Incident Timeline** | `/incidents` | `GET /api/v1/incidents` | Incident filter, Severity badge, Expand details button, Run RCA trigger | Verified (Chronological cards with deep links) |
| **RCA Workbench** | `/rca` | `POST /api/v1/rca/diagnose`, `GET /algorithms` | Algorithm multi-select, Run Diagnosis button, Blind/Reveal Ground Truth toggle | Verified (Confidence bars, ranked list, ground truth reveal) |
| **Benchmark Explorer**| `/benchmark` | `GET /api/v1/benchmark/cases`, `/summary` | Case selector (150 cases), Search filter, Modality tags, Ground truth inspector | Verified (Full case table, candidate set displays) |
| **Research Results** | `/research` | `GET /api/v1/research/figure1-4` | Figure tab switcher, Metric toggle (Hit@1/MRR), Statistical significance panel | Verified (Data tables, McNemar matrix, ablation chart) |
| **Report Center** | `/reports` | `GET /api/v1/reports`, `POST /generate` | Incident selector, Format picker (Markdown/PDF), Export Download button | Verified (Generates complete traceable markdown reports) |

---

## 6. Known Boundaries & Engineering Roadmap

1. **Live Container Telemetry:** Full live telemetry requires a running Docker daemon and accessible cAdvisor/Prometheus instances (`http://localhost:9090`). In developer environments where Docker is stopped, the application seamlessly enters replay demonstration mode.
2. **Distributed Tracing (Tempo):** Trace visualization currently falls back to synthetic span representations when Tempo is offline.
3. **Persistent SQL Storage:** Uses SQLite / memory repository when PostgreSQL port 5432 is not bound. Schema migrations are ready in `migrations/` for enterprise PostgreSQL deployments.

---

## 7. Audit Conclusion

The OSCAR repository is in an **engineering-grade, reproducible, and verifiable state**. All 32 automated tests pass, the frontend builds cleanly without warnings or errors, all 9 application interfaces are fully functional, and all reported research metrics have been independently recomputed from raw case-level data.
