# OSCAR-Sim Phase 1 Closure Report

## Objective
Establish a healthy, observable synthetic enterprise environment capable of producing robust telemetry. Phase 1 focused strictly on building the foundation and the signal chain, deferring fault injection and RCA to future phases.

---

## A. Current Architecture

### 1. Service Topology
```text
Client -> Nginx (:8080) -> Rust API (:3000)
                             |-> Redis (:6379)
                             |-> PostgreSQL (:5432)
```

### 2. Monitoring Topology & Telemetry Flow
```text
[ Application Telemetry ]
Rust API (/metrics) --------> Prometheus (:9090) -> Grafana (:3001)

[ Infrastructure Telemetry ]
Docker Daemon -> cAdvisor (:8081) -> Prometheus (:9090) -> Grafana (:3001)
```

### 3. Container Inventory
*   `nginx` (Alpine)
*   `api` (Rust 1.80)
*   `postgres` (16-alpine)
*   `redis` (7-alpine)
*   `prometheus` (v2.54.0)
*   `grafana` (11.1.0)
*   `cadvisor` (v0.57.0)

---

## B. Completed Deliverables

### 1. Application Observability
*   **Request Counter:** `http_requests_total`
*   **Request Duration:** `http_request_duration_seconds` (Histogram)
*   **Active Requests:** `active_requests` (Gauge)
*   **Cardinality Protection:** `MatchedPath` routing extraction.
*   **404 Protection:** `UNMATCHED_ROUTE` grouping.

### 2. Infrastructure Observability
*   cAdvisor integration tracking CPU, Memory, Network (Rx/Tx), and Filesystem Usage mapped by compose service label.

### 3. Dashboards (Provisioned as Code)
*   **OSCAR-Sim Overview:** Total Requests, Active Requests, Request Rate, Average Latency.
*   **Container Overview:** CPU, Memory, Net Rx/Tx, and FS Usage grouped by service.

---

## C. Validation Summary

### 1. Validated Components
*   **Docker Networking:** Service discovery and internal routing verified.
*   **Database Connectivity:** API to Postgres/Redis connection confirmed.
*   **Metrics Pipeline:** API -> Prometheus verified via manual curl and `UP` targets.
*   **Dashboard Provisioning:** Git-ops driven JSON loading verified in Grafana UI.
*   **cAdvisor Discovery:** Host socket and cgroup parsing successfully validated.

### 2. Unresolved Validation Gaps
*   **Reproducibility Checks:** Have not formally verified `docker compose down && up` preserves all state and cleanly resurrects without manual intervention.

---

## D. Major Engineering Decisions

1.  **Passive Monitoring:** Prometheus operates out-of-band, preventing observability overhead from blocking the primary client request path.
2.  **Dashboard-as-Code:** Grafana UI creation is banned. Dashboards must be provisioned via committed JSON to ensure Git remains the single source of truth.
3.  **Observability Validation Hierarchy:** A strict debugging protocol forcing validation from Metric Source -> Prometheus -> Grafana to prevent misdiagnosing the visualization layer.
4.  **cAdvisor Version Pinning:** Deliberately abandoned older cAdvisor images (e.g. `v0.49.1`) for `v0.57.0` specifically to support Docker's newer `io.containerd.snapshotter.v1` driver.

---

## E. Debugging Timeline: The cAdvisor Case Study

*   **Failure:** Prometheus displayed only `id="/"` with no container metrics.
*   **Hypothesis 1 (Permissions):** cAdvisor needs `privileged: true` and `/dev/kmsg`. *Result: Rejected. Output unchanged.*
*   **Hypothesis 2 (Namespaces):** Docker defaults to private cgroups; added `cgroupns_mode: host` and explicit socket mounts. *Result: Falsified. Output unchanged. (Also exposed a Compose schema rejection).*
*   **Hypothesis 3 (Runtime Parsing):** Manual `curl` from inside cAdvisor proved socket access and identified `io.containerd.snapshotter.v1`.
*   **Root Cause Found:** cAdvisor `v0.49.1` lacked the logic to parse the modern containerd snapshotter, failing silently.
*   **Fix Applied:** Bumped cAdvisor to `v0.57.0` (which contained PR #3709).
*   **Lesson Learned:** Observability tools must be kept in version parity with the underlying orchestration engine.

---

## F. Technical Debt & Limitations

1.  **Health Check Domination:** Docker health checks hitting `/health` heavily skew request volume metrics. Phase 2 or 3 should consider filtering `path="/health"` in Grafana.
2.  **Average Latency vs. P95:** We explicitly chose average latency for Phase 1 simplicity. Real RCA often requires percentile tracking.
3.  **cAdvisor Overhead:** Scraping cAdvisor every 5s produces immense timeseries volume. Acceptable for 1-day local retention, but potentially noisy.

---

## G. Phase 1 Completion Assessment

*   **Completion Status:** 98%
*   **Blockers:** None.
*   **Remaining Tasks:** Final manual reproducibility and restart verification.

---

## Phase 2 Readiness Checklist (User Action Required)

Execute the following commands to formally close Phase 1:

- [ ] **Infrastructure Destruction:** `docker compose down -v`
- [ ] **Clean Resurrection:** `docker compose up -d`
- [ ] **Grafana Persistence:** Verify `admin`/`admin` (or `.env` password) works and both dashboards auto-load without manual imports.
- [ ] **Prometheus Continuity:** Verify all targets show `UP` after 15 seconds.
- [ ] **Metric Continuity:** Hit `localhost:8080/health` a few times and verify Grafana immediately graphs the new requests and cAdvisor CPU loads.
