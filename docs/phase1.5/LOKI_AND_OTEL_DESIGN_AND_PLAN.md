# OSCAR-Sim Phase 1.5: Observability Expansion (Loki & OpenTelemetry)

## 1. Why Phase 1.5?
The original Phase 1 built the foundational infrastructure (Docker) and the Metrics layer (Prometheus + Grafana). Phase 2 added Workload Generation (k6). 

However, metrics alone are insufficient for automated Root Cause Analysis (RCA). 
- **Metrics (Prometheus)** indicate *symptoms* (e.g., latency spiked).
- **Logs (Loki)** provide *application context* (e.g., "Connection refused to database").
- **Traces (OpenTelemetry)** provide *causal pathways* (e.g., `Client -> Nginx -> API -> Redis` showing exactly which span took the most time).

Phase 1.5 bridges this gap by instrumenting the environment with Loki (Log aggregation) and Tempo/OpenTelemetry (Distributed Tracing) **before** we introduce Fault Injection (Phase 3). This ensures that when we inject faults, we have the complete "Three Pillars of Observability" to capture the system's reaction.

## 2. Architecture Additions

### Log Aggregation (Loki + Promtail)
- **Loki:** A horizontally scalable, highly available, multi-tenant log aggregation system. It will store the logs.
- **Promtail:** The agent responsible for gathering logs. It will mount the Docker daemon's container log directory (`/var/lib/docker/containers`) to automatically scrape the stdout/stderr of Nginx, API, Redis, and Postgres.

### Distributed Tracing (Tempo + OpenTelemetry)
- **Grafana Tempo:** A high-scale distributed tracing backend that perfectly integrates with Grafana.
- **Rust API (Axum):** Will be instrumented with the OpenTelemetry SDK (`opentelemetry-otlp`) to emit spans (traces) to Tempo over gRPC/HTTP.

```text
    ┌──────────────────────────────────┐
    │          Grafana (UI)            │
    └────┬──────────────┬─────────┬────┘
         │              │         │
    ┌────▼────┐   ┌─────▼───┐ ┌───▼────┐
    │Prometheus│   │  Loki   │ │ Tempo  │ (Backend)
    └────▲────┘   └─────▲───┘ └───▲────┘
         │              │         │
         │         ┌────┴────┐    │
         │         │ Promtail│    │
         │         └────▲────┘    │
    ┌────┴──────────────┴─────────┴────┐
    │     Nginx  ->  Rust API  ->  DB  │ (Target System)
    └──────────────────────────────────┘
```

## 3. Implementation Plan

### Step 1: Docker Compose Updates
Add the following services to `docker-compose.yml`:
- **loki:** The log database (Port 3100).
- **promtail:** Log scraper mounting `/var/lib/docker/containers`.
- **tempo:** Trace backend (Port 4317 for OTLP gRPC).

### Step 2: Rust API Instrumentation
Modify `services/api/Cargo.toml` to include:
- `opentelemetry`
- `opentelemetry_sdk`
- `opentelemetry-otlp`
- `tracing-opentelemetry`

Modify `services/api/src/main.rs` to configure the `tracing` subscriber to output spans to the OTLP exporter pointing to `http://tempo:4317`.

### Step 3: Grafana Provisioning
Update `monitoring/grafana/provisioning/datasources/datasource.yml` to automatically register:
- Loki (`http://loki:3100`)
- Tempo (`http://tempo:3200`)

### Step 4: Verification
Execute `docker compose up -d`, then run the Phase 2 baseline workload (`run_workload.ps1 -WorkloadName baseline`). Verify in Grafana that:
1. Logs from the API are searchable in the Explore tab.
2. Traces for `GET /users` are visible and show spans for DB/Redis interaction.
