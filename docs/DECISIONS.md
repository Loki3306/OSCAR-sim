# Architectural Decisions

## Phase 1: Docker Foundation
* **Database**: PostgreSQL 16. Chosen for stability and wide support. Uses named volume `postgres_data` for persistence.
* **Cache**: Redis 7-alpine. Ephemeral for Phase 1 (no persistence), as cache loss is acceptable and simulating cache restart is useful.
* **Networking**: Custom bridge network `oscar_sim_net`. Chosen to allow DNS-based service discovery (e.g., `postgres:5432`) without relying on hardcoded IPs.
* **Configuration**: Externalized to `.env` using environment variables to keep code separate from deployment config.

## Phase 1: API Architecture
* **Runtime Image**: `debian:bookworm-slim` selected over distroless for the Rust API container to maintain local debugging capabilities.
* **API Endpoints**: Minimal footprint enforcing `/` for service identity and `/health` specifically for Docker health checks.
* **API Configuration**: Enforced strict fail-fast configuration for `API_PORT` using `.env`. Removed all hardcoded fallbacks to prevent silent failures during deployment.

## Phase 1: Nginx Architecture
* **Reverse Proxy**: `nginx:alpine` serves as the sole external entry point for the simulation.
* **Network Isolation**: The `api` container is locked off from the host. Traffic must explicitly route through Nginx on host port `8080`.
* **Header Forwarding**: Standard tracing and identity headers (`X-Real-IP`, `X-Forwarded-For`, `X-Request-ID`) are preserved to support accurate telemetry simulation in future phases.

## Phase 1: Metrics Architecture
* **Instrumentation Library**: Selected the raw `prometheus` crate over `metrics` facade. This enforces a lower-level understanding of Prometheus primitives (Counter, Gauge, Histogram, Registry) as OSCAR-Sim is a learning/research platform.
* **Code Organization**: Implemented a dedicated `src/metrics` module utilizing `once_cell::sync::Lazy` to cleanly decouple metric registration from business logic, preparing for future Postgres/Redis telemetry.
* **Middleware Design**: Metrics are captured via Axum middleware, explicitly excluding `/metrics` from being recorded to avoid skewed data from Prometheus scrapes.

## Phase 1: Observability Architecture
* **Monitoring Segregation**: Infrastructure telemetry (Prometheus, Grafana) resides in the `monitoring/` directory, treating them as infrastructure separate from application `services/`.
* **Reproducible Builds**: All external Docker images must be strictly pinned to specific versions (e.g., `prom/prometheus:v2.54.0`) to avoid instability from `latest` tags.
* **Passive Observation**: Prometheus operates entirely out-of-band of the request path, passively scraping metrics without interfering with client -> Nginx -> API network flows.
* **Infrastructure Metrics**: cAdvisor captures container-level metrics (CPU, Memory, Network, Disk). To ensure stable long-term dashboards, Prometheus and Grafana queries must filter and group strictly by the `container_label_com_docker_compose_service` label rather than ephemeral container IDs.
* **Validation Hierarchy**: Observability validation strictly follows: Metric Source (cAdvisor/API) → Prometheus UI (Targets/Query) → Grafana.
* **cAdvisor Version Pinning**: During Phase 1, it was discovered that older cAdvisor releases (e.g. `v0.49.1`) lack support for the `io.containerd.snapshotter.v1` storage driver enabled by default in Docker 29+. This caused a silent failure in container discovery. To fix this, cAdvisor was explicitly bumped and pinned to `v0.57.0` (which incorporates PR #3709 adding snapshotter support). `v0.53.0` was rejected as it lacked this fix, and the floating `latest` tag was rejected to uphold the reproducible builds rule. Note: Starting with version `v0.53.0`, cAdvisor migrated from `gcr.io` to `ghcr.io/google/cadvisor`.
