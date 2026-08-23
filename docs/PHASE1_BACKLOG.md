# Phase 1 Implementation Backlog

### Status Legend
`P0` = Required for Phase 1 completion
`P1` = Strongly Recommended
`P2` = Nice to Have

---

## P0: Core Observability Target Simulation
- [x] **Validation Run**: Execute `docker compose down -v` to destroy the stale persistent volume and allow SQLx migrations to establish a clean baseline.
- [x] **Validation Run**: Execute `docker compose up -d --build` and manually validate the `POST /users` and `GET /users/:id` flow.
- [x] **Validation Run**: Verify the creation of `cache_hits_total`, `cache_misses_total`, `postgres_queries_total`, and `active_connections` in `/metrics`.

## P1: Missing Dashboards & Error Telemetry
- [x] **Implementation**: Add `error_rate_total` metric to API middleware for HTTP 500s. (Implemented via Prometheus `rate()` queries in Grafana on the `http_requests_total` metric).
- [x] **Implementation**: Provision "Database Overview" Grafana Dashboard (`Queries`, `Connections`, `Latency`).
- [x] **Implementation**: Add "Error Rate" panel to "OSCAR-Sim Overview" dashboard.
- [x] **Implementation**: Add "Cache Hit Rate" panel to "OSCAR-Sim Overview" dashboard.
- [x] **Implementation**: Add `GET /users` endpoint.
- [x] **Implementation**: Add `GET /cache` endpoint.

## Phase 1 Final Status
- All endpoints, routing, cache, database, and telemetry implemented.
- 24-Hour Soak Test: **PENDING 24-HOUR SOAK TEST**

## P2: Stability & Resilience
- [ ] **Validation Run**: Perform a formal Restart/Recovery test (`docker compose down -v` followed by `up -d`), documenting the persistence of provisioned Grafana dashboards and Postgres volumes.
- [ ] **Validation Run**: Execute a 24-hour stability soak test to ensure no memory leaks exist in the API or Prometheus TSDB.
- [ ] **Documentation**: Freeze Phase 1 documentation and cut a git release tag.
