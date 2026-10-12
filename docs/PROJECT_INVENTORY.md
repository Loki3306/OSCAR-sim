# OSCAR Repository Component Inventory

## 1. Executive Summary
This document provides a comprehensive inventory and classification of every major directory, module, script, and artifact across the OSCAR codebase as of Phase II audit completion.

---

## 2. Component Inventory & Classification

| Directory / File | Core Purpose | Implementation Status | Tech Stack & Dependencies | Current Usage in Application | Integration Opportunities | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `docker-compose.yml` | Local microservice testbed & telemetry stack specification | Functional & Complete | Docker Compose, Postgres 16, Redis 7, Nginx, Prometheus v2.54, Grafana 11.1, cAdvisor, Loki, Promtail, Tempo | Primary orchestration for Mode A (Live Sim) | Central entrypoint for Mode A containers | **Reuse as-is** |
| `services/api/` | Synthetic microservice target application (Users API with DB/Cache) | Functional & Complete | Rust 2021, Axum, SQLx (PostgreSQL), deadpool-redis, Prometheus client | Provides live HTTP endpoints (`/health`, `/users`, `/cache`, `/metrics`) | Primary target for live fault injection & tracing | **Reuse as-is** |
| `services/nginx/` | Reverse proxy and ingress gateway | Functional & Complete | Nginx Alpine, custom proxy conf | Ingress for synthetic app (port 8080) | Ingress telemetry & edge latency monitoring | **Reuse as-is** |
| `controller/` | Fault injection & experiment control plane | Functional & Complete | Rust 2021, Tokio, Clap, Bollard (Docker API), serde | CLI tool for executing faults & experiment YAMLs | Bridge to web backend for executing controlled faults | **Integrate via API / Controller Runner** |
| `monitoring/prometheus/` | Metrics scraping configuration | Functional & Complete | Prometheus YAML, scrapes API (5s), cAdvisor (5s) | Telemetry collection backend | Query source for live observability & RCA | **Reuse as-is** |
| `monitoring/grafana/` | Dashboard provisioning & visual metrics | Functional & Complete | Grafana JSON dashboards & datasources | Visual dashboard (port 3001) | Visual reference & live iframe/embed | **Reuse as-is** |
| `monitoring/tempo/` | OpenTelemetry distributed trace backend | Configured | Grafana Tempo 2.4.0 (ports 3200, 4317, 4318) | Tracing backend in docker-compose | Span visualization & trace exploration | **Reuse as-is** |
| `monitoring/loki/` | Centralized log ingestion | Configured | Grafana Loki 2.9.4 | Log storage | Centralized incident log queries | **Reuse as-is** |
| `workloads/` | Synthetic HTTP traffic scenarios | Functional & Complete | JavaScript (k6 runner compatible) | Scenarios: baseline, burst, load, normal, spike, sustained | Triggerable traffic generator in Mode A | **Integrate into UI / Workload Manager** |
| `experiments/` | Experiment manifests and recorded runs | Functional & Complete | YAML specs, JSON metadata, JSONL event streams | 20 recorded runs in `metadata/` with timelines | Basis for Mode A replay and guided demo | **Integrate into Timeline & Replay Engine** |
| `research/baselines/` | 6 algorithm adapters (BARO, CIRCA, RCD, MicroCause, E-Diagnosis, MS-BARO) | Functional, Audited & Guarded | Python 3.13, NumPy, SciPy, Pandas, NetworkX | Tested & validated on 150 benchmark incidents | Core RCA engine for Mode B and Mode A incidents | **Integrate as Core RCA Engine** |
| `research/proposed_method/` | OSCAR-CTRCL reference algorithm | Functional, Audited & Verified | Python 3.13, NumPy, SciPy, NetworkX | Verified 0.925 Hit@1 on 120 CPU cohort | Highlighted algorithm in RCA Workbench | **Integrate as Primary Method** |
| `research/hybrids/` | Reciprocal Rank Fusion & CausalTemporal | Functional & Tested | Python 3.13 | Evaluated in Phase II campaign | Baseline comparisons in Workbench | **Integrate as Comparative Baselines** |
| `research/evaluation/` | Deterministic metrics & statistical tests (`metrics.py`) | Functional & Verified | Python 3.13, statsmodels | Exact McNemar, Holm correction, Bootstrap CI | On-demand evaluation & benchmark scoring | **Reuse as-is & Expose via API** |
| `research/preprocessing/` | RCAEval data loader & cache | Functional & Cached | Python 3.13, Parquet, Hugging Face Hub | 150+ incidents cached locally in `data_cache/` | Case browser & telemetry feeder | **Integrate into Benchmark Explorer** |
| `research/results/` | Pilot v1 and Phase II verified result files | Functional & Verified | CSV, JSON, Parquet | Source of truth for 120 CPU cohort & robustness | Source data for Research Results Explorer | **Expose via API to UI** |
| `research/figures/` | 6 publication figures (PNG & PDF) | Functional & Generated | Matplotlib, Seaborn | Figures 1-6 in 300 DPI | Renderable visual assets in Report Center | **Reuse as-is in UI** |
| `research/reports/` | 9 comprehensive markdown reports & matrix | Complete & Verified | Markdown, CSV | Academic & technical documentation | Source for Report Center & exports | **Integrate into Report Center** |
| `tests/` | Unit test suite (baselines, metrics, stats) | 17/17 passing | Pytest, Python 3.13 | Verified in CI/test pipeline | Quality gate for RCA algorithms | **Reuse as-is & Expand** |
| `web/` (Target) | Interactive Web Platform (React/TS Dashboard) | **Not Yet Implemented** | React 18, TypeScript, Tailwind/Vanilla CSS, Lucide icons, Chart.js / SVG | Missing top-level user-facing platform | Unified visual cockpit for Mode A & B | **New Implementation** |
| `api_server/` (Target) | Unified Backend Application API Server | **Not Yet Implemented** | Python FastAPI / Uvicorn (integrating research engine, telemetry, simulation) | Bridges Web UI to Research & Simulator | Dispatches RCA runs, queries Prometheus, streams replays | **New Implementation** |

---

## 3. Classification Summary
1. **Reuse as-is:** `docker-compose.yml`, `services/api/`, `monitoring/`, `research/evaluation/metrics.py`, `research/results/phase2_verified/`, `research/figures/`.
2. **Integrate:** `controller/` (fault execution), `workloads/` (traffic generation), `experiments/metadata/` (timeline replay), `research/baselines/` & `research/proposed_method/` (RCA algorithms), `research/preprocessing/` (benchmark loader).
3. **New Implementations Required:**
   - **Unified Application API Server (`server/`):** Exposes REST endpoints for system health, live metrics, topology, fault injection, incident management, on-demand RCA execution, benchmark exploration, and report generation.
   - **Engineering Operations Console Frontend (`frontend/`):** React + TypeScript rich application implementing all 9 required pages with live telemetry, interactive graph topology, fault controls, RCA workbench, and benchmark explorer.
