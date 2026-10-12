# Phase 2 Artifact Catalog

| Component | File | Purpose | Status | Verified |
| --------- | ---- | ------- | ------ | -------- |
| Workload Library | `workloads/lib/client.js` | HTTP wrappers | IMPLEMENTED | YES |
| Workload Library | `workloads/lib/users.js` | API definitions | IMPLEMENTED | YES |
| Workload Library | `workloads/lib/cache.js` | Cache logic | IMPLEMENTED | YES |
| Workload Library | `workloads/lib/checks.js` | k6 Assertions | IMPLEMENTED | YES |
| Workload Config | `workloads/config/baseline.json` | Idle settings | IMPLEMENTED | YES |
| Workload Config | `workloads/config/normal.json` | Normal settings | IMPLEMENTED | YES |
| Workload Config | `workloads/config/load.json` | Ramping settings | IMPLEMENTED | YES |
| Workload Config | `workloads/config/sustained.json` | High pressure | IMPLEMENTED | YES |
| Workload Config | `workloads/config/spike.json` | Sudden traffic | IMPLEMENTED | YES |
| Workload Config | `workloads/config/burst.json` | Transient traffic | IMPLEMENTED | YES |
| Workload Script | `workloads/scenarios/baseline.js` | Idle execution | IMPLEMENTED | YES |
| Workload Script | `workloads/scenarios/normal.js` | Normal execution | IMPLEMENTED | YES |
| Workload Script | `workloads/scenarios/load.js` | Ramping execution | IMPLEMENTED | YES |
| Workload Script | `workloads/scenarios/sustained.js` | High pressure exec | IMPLEMENTED | YES |
| Workload Script | `workloads/scenarios/spike.js` | Sudden traffic exec | IMPLEMENTED | YES |
| Workload Script | `workloads/scenarios/burst.js` | Transient traffic exec | IMPLEMENTED | YES |
| Orchestrator | `scripts/run_workload.ps1` | Docker injection | IMPLEMENTED | YES |
| Metadata | `experiments/metadata/*.json` | Execution tracking | IMPLEMENTED | YES |
