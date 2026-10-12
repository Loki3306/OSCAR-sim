# OSCAR Known Limitations & Scope Boundaries

In accordance with rigorous scientific and engineering practices, this document explicitly records the current limitations, unsupported features, and boundary conditions of the OSCAR platform.

---

## 1. Environment & Infrastructure Limitations

1. **Docker Daemon Dependency for Live Container Execution:**
   - When the host Docker daemon is offline (`//./pipe/dockerDesktopLinuxEngine` unreachable), live container mutation commands (`docker exec stress-ng`) cannot be issued.
   - The platform transparently handles this via `REPLAY_DEMO` mode using verified recorded telemetry from `EXP-postgres_cpu_stress_001`. Live mutations require an active Docker socket.
2. **State Persistence Store (PostgreSQL Offline):**
   - When the PostgreSQL daemon is offline, incident creation and timeline annotations are persisted in an in-memory dictionary.
   - Data persists for the lifetime of the API process but resets upon server restart. The UI explicitly flags this state as `IN-MEMORY (EPHEMERAL)`.
3. **Centralized OpenTelemetry Tracing vs. Metrics:**
   - Live telemetry currently focuses on container and application metric time series (Prometheus/cAdvisor).
   - Distributed trace spans (Jaeger/Tempo) and centralized JSON logs are integrated for RCAEval RE2 benchmark cases, but local live tracing relies on simulated span spans rather than an OpenTelemetry Collector daemon. Full OpenTelemetry Demo collector integration is documented in the architecture roadmap.

---

## 2. Algorithm Compatibility & Ground-Truth Boundaries

1. **Modalities Supported per Algorithm:**
   - **OSCAR-CTRCL, RCD, MicroCause, E-Diagnosis:** Fully compatible with metric time series and topological call graphs.
   - **Multi-Source BARO:** Optimized for metric streams; multimodal log fusion is evaluated on RE2 cases.
   - **BARO:** Evaluates metric time series via trimmed kurtosis anomaly detection without explicit call graph propagation.
2. **Hard Thresholding in CIRCA:**
   - In low-signal-to-noise ratio regimes, CIRCA frequently encounters ties across non-anomalous services and falls back to lexical sorting, which leads to degraded Hit@1 scores (3.3%) on complex datasets. This reproduces findings reported in recent benchmark literature.
3. **Causal Graph Density Scaling in RCD:**
   - For systems with more than 30 microservices (e.g., Train Ticket in RE1), RCD's constraint-based causal discovery exhibits polynomial runtime scaling ($>10\text{s}$ per incident), whereas OSCAR-CTRCL executes in $<0.05\text{s}$.

---

## 3. Scope of Verified Research Claims

- **Empirically Verified:** The Phase II campaign verified that OSCAR-CTRCL outperforms RCD, BARO, MicroCause, E-Diagnosis, and CIRCA across the full 120-incident CPU cohort in RCAEval, achieving Hit@1 = 0.9250 (vs RCD 0.8333) with exact McNemar test significance ($p = 0.0433$).
- **Pilot / Exploratory Scopes:** Non-CPU fault categories (memory exhaustion, synthetic network packet drops, code mutations) in RE3 are supported for exploratory diagnosis, but have not yet undergone a multi-seed statistical significance campaign with bootstrap confidence intervals.
