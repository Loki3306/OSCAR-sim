# Phase 1 Requirements Traceability Matrix

| Requirement | Status | Evidence |
| :--- | :--- | :--- |
| **Infrastructure Setup** |
| Nginx | VALIDATED | `curl http://localhost:8080/health` returns `{"status":"ok"}` |
| Rust API skeleton | VALIDATED | Endpoints `/` and `/health` reachability confirmed |
| PostgreSQL container | VALIDATED | Docker compose UP logs; DB accessible |
| Redis container | VALIDATED | Docker compose UP logs; Redis ping healthy |
| Prometheus container | VALIDATED | Grafana datasource connects successfully |
| Grafana container | VALIDATED | UI accessible at `localhost:3001`; dashboards provisioning |
| cAdvisor container | VALIDATED | `io.containerd.snapshotter.v1` container discovery working |
| **API Endpoints** |
| `GET /health` | VALIDATED | Returns `200 OK` via Nginx |
| `GET /metrics` | VALIDATED | Returns Prometheus formatted text via `curl` |
| `POST /users` | IMPLEMENTED | Added to `routes.rs` (Validation Pending) |
| `GET /users/:id` | IMPLEMENTED | Added to `routes.rs` (Validation Pending) |
| **API Integrations** |
| PostgreSQL CRUD | IMPLEMENTED | `db::insert_user`, `db::get_user` logic (Validation Pending) |
| Redis Cache hit/miss | IMPLEMENTED | `cache::get_cached_user` logic (Validation Pending) |
| **Application Metrics** |
| `http_requests_total` | VALIDATED | Populates Grafana Service Dashboard |
| `http_request_duration_seconds` | VALIDATED | Populates Grafana Service Dashboard |
| `active_requests` | VALIDATED | Populates Grafana Service Dashboard |
| `cache_hits_total` | IMPLEMENTED | Defined in `registry.rs` (Validation Pending) |
| `cache_misses_total` | IMPLEMENTED | Defined in `registry.rs` (Validation Pending) |
| `postgres_queries_total` | IMPLEMENTED | Defined in `registry.rs` (Validation Pending) |
| `active_connections` | IMPLEMENTED | Defined in `registry.rs` (Validation Pending) |
| **Grafana Dashboards** |
| OSCAR-Sim Overview | VALIDATED | Request Rate, Latency rendered via provisioned JSON |
| Container Overview | VALIDATED | CPU, Memory, Network, FS rendered via provisioned JSON |
| Database Dashboard | NOT_STARTED | Missing metrics and JSON definition |
| Error Rate Panel | NOT_STARTED | Missing from OSCAR-Sim Overview |
| Cache Hit Rate Panel | NOT_STARTED | Missing from OSCAR-Sim Overview |
| **Stability & Lifecycle** |
| 24h Stability Run | NOT_STARTED | Pending load generation and continuous operation |
| Clean Restart Recovery | NOT_STARTED | Pending formal `down -v` && `up -d` verification |
