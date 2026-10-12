# OSCAR Platform User Guide

Welcome to **OSCAR** (Observability & Simulation for Causal Analysis and Root-cause attribution), a full-stack, enterprise-grade Root Cause Analysis platform for distributed microservices.

---

## 1. Quick Start

### 1.1 Single-Command Launch (Unified Full-Stack)
Run the platform with the backend and compiled frontend unified on port `8000`:
```bash
# From the repository root
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload
```
Open your browser at:
- **Application Web UI:** [http://localhost:8000/](http://localhost:8000/) (or [http://localhost:8000/ui](http://localhost:8000/ui))
- **Interactive OpenAPI Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

### 1.2 Development Mode (Hot Reload)
If actively developing or styling React/TypeScript components:
```bash
# Terminal 1: FastAPI Backend
python -m uvicorn server.main:app --port 8000 --reload

# Terminal 2: Vite React Frontend
cd frontend
npm run dev
```
Access the Vite dev server at [http://localhost:5173/](http://localhost:5173/). All `/api/*` and `/figures/*` calls automatically proxy to `:8000`.

---

## 2. Platform Architecture & Visual Palette

The OSCAR console has been designed to meet strict enterprise software design standards:
* **Palette:** Calm, neutral, high-readability light theme using warm stone (`#fcfbf9` / `#f6f3eb`), pure white cards (`#ffffff`), subtle borders (`#e8e4db`), and high-contrast charcoal typography (`#181d27`).
* **Visual Hierarchy:** Distinct status badges for operational, degraded, offline, and replay states. Cyberpunk and fluorescent neon glows have been completely removed.
* **Header Bar:**
  - **Environment Badge:** Displays `Docker Cluster Live` (when Docker engine is detected) or `Replay Archive Mode` (when operating from verified recorded experiments).
  - **About & Research Guide:** Accessible modal explaining the microservice call chain, the cascading victim trap, the Callee Dominance Rule, and Phase II benchmark findings.
  - **Guided 5-Min Demo:** Walkthrough button guiding users step-by-step through a complete fault-to-diagnosis sequence.

---

## 3. Navigating the Operational Views

OSCAR is organized into two distinct, strictly separated operating modes:

### Mode A: Live Simulation Lab
1. **System Overview:**
   - Top metric summary: Discovered Services, Active Incidents, Active Faults, Benchmark Cases.
   - **Subsystem Health & Connectivity Matrix:** Explicit status for Application Server, Docker Engine Daemon, Simulation Microservices, Telemetry Backend, State Persistence, and RCA Workers.
   - Incident Registry & Recorded Experiments table with quick navigation.
   - Phase II Empirical Benchmark leaderboard.
2. **Service Topology:**
   - Interactive SVG directed graph of the microservice architecture (`client -> nginx -> api -> postgres, redis`).
   - Call protocols clearly indicated (HTTP, PostgreSQL wire protocol, RESP).
   - Side Inspector displaying real-time CPU, memory, request latency, error rate, inbound callers, and outbound callees.
3. **Live Observability:**
   - Multi-metric time-series streaming (CPU utilization, request latency).
   - Sourced from live Prometheus or verified experiment cache with clear provenance tagging.
   - Service filter dropdown (`ALL`, `CLIENT`, `NGINX`, `API`, `POSTGRES`, `REDIS`).
4. **Fault Laboratory:**
   - Controlled fault injection panel for CPU saturation (`stress-ng`), memory leak, network latency, and service pause.
   - Transparent Replay notice when Docker is offline, replaying verified telemetry without faking container mutations.
   - Safety bounds (max duration 300s) and background auto-recovery thread.
   - Historical audit log of previous fault experiments.
5. **Incident Timeline:**
   - Synchronized chronological event stack showing exact timestamps.
   - Tracks lifecycle milestones: Experiment Started $\to$ Workload Started $\to$ Baseline Started $\to$ Fault Requested $\to$ Fault Started $\to$ Fault Stopped $\to$ Recovery Started $\to$ Experiment Completed.
6. **RCA Workbench:**
   - Multi-model diagnosis workbench executing 7 algorithms side-by-side (`OSCAR-CTRCL`, `RCD`, `BARO`, `CIRCA`, `MicroCause`, `E-Diagnosis`, `Multi-Source BARO`).
   - Blind diagnosis ensures ground truth is concealed during inference.
   - **Reveal Ground Truth (Evaluation)** button exposes the true injected root cause and computes Hit@1 / Miss status with execution runtime.

### Mode B: Research Benchmark Lab
1. **Benchmark Explorer:**
   - Catalog of all 735 official RCAEval failure cases across RE1 (metric-only), RE2 (multimodal), and RE3 (code faults) in Online Boutique, Sock Shop, and Train Ticket.
   - Filter by suite, microservice system, and fault category.
   - Inspect individual case topologies and run blind diagnosis against real benchmark datasets.
2. **Research Results:**
   - Confirmatory metrics table across 120 ground-truth CPU failure cases.
   - Hit@1, 95% bootstrap confidence intervals, Hit@3, Hit@5, MRR, and mean runtime.
   - Publication figure gallery rendering all 6 verified publication figures (PDF & PNG) directly from reproducible experiments.
3. **Report Center:**
   - Export SRE incident post-mortems and scientific benchmark comparisons in Markdown (`.md`) or HTML (`.html`).
   - Single-click clipboard copying and direct file download.

---

## 4. Demonstrating the Platform to Advisors or Colleagues

Follow this 5-step presentation script:
1. **Explain the Architecture:** Click **About & Research Guide** to explain why microservices suffer from the "cascading victim trap" when downstream databases exhaust CPU.
2. **Review System Health:** On **System Overview**, demonstrate the Subsystem Health Matrix, showing complete transparency regarding host daemons and replay cache.
3. **Inspect the Call Graph:** Navigate to **Service Topology** to inspect the dependency flow from synthetic client through Nginx and API to PostgreSQL.
4. **Run Diagnosis:** On **RCA Workbench**, click **Execute Diagnosis** on incident `EXP-postgres_cpu_stress_001`. Point out how `OSCAR-CTRCL` localizes `postgres` at #1, while baseline `RCD` falls for the victim trap by blaming caller `api`.
5. **Export Post-Mortem:** In **Report Center**, preview and export the SRE incident diagnostic report containing real measurements, candidate consensus, and ground-truth validation.
