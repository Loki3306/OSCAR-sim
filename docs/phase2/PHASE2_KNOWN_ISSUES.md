# Phase 2 Known Issues & Technical Debt

## 1. Filesystem Telemetry Missing
- **Current State:** The cAdvisor `Filesystem Usage` metric in the Grafana Container Overview dashboard returns "No Data".
- **Severity:** TECHNICAL DEBT
- **Impact on Phase 2:** None. Workload generation and fundamental environment validation is fully successful.
- **Future Impact:** This must be addressed before or during Phase 3 when disk-saturation fault injection scenarios are introduced. The telemetry must be fixed to capture the fault.
