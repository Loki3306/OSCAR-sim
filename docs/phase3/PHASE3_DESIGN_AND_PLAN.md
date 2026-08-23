# OSCAR-Sim Phase 3: Fault Injection Layer — Design, Plan & Checklist

This document acts as the definitive specification, architectural design, and completion checklist for Phase 3 of OSCAR-Sim.

## 1. Core Philosophy & Objective
**Principle:** Phase 2 controls what the system is doing. Phase 3 controls what goes wrong.
- Phase 3 operates alongside the Phase 2 workload system, never replacing or modifying it.
- **Objective:** Create controlled disturbances for reproducibility without determining *why* they happened (which is OSCAR's job in Phase 6).
- **Tooling Strategy:** Use Pumba (for Network/Docker Lifecycle faults) AND `stress-ng` (for CPU/Memory/Disk resource faults).
- **Outputs:** Fault Execution Records & Telemetry. No Causal Chains are generated here.

## 2. Experimental Model
An experiment wraps Workloads (Phase 2) and Faults (Phase 3).
Every experiment contains 3 critical windows:
1. **BASELINE** (Workload running, no faults)
2. **FAULT** (Workload running + Injected fault)
3. **RECOVERY** (Workload running + Fault stopped)

```yaml
experiment:
  name: postgres_cpu_stress_001
  workload:
    profile: normal
  phases:
    baseline: 60s
    fault: 60s
    recovery: 60s
  fault:
    type: cpu_stress
    target: postgres
    parameters:
      workers: 4
      load: 80
```

## 3. High-Level Architecture
```text
                         OSCAR-Sim
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
        Workload Layer                Fault Layer
           Phase 2                     Phase 3
             │                             │
             ▼                             ▼
             k6                     Fault Controller
             │                             │
             │                  ┌──────────┼──────────┐
             │                  ▼          ▼          ▼
             │               Pumba     stress-ng   Docker
             │                  │          │          │
             └──────────────────┴──────────┴──────────┘
                                │
                                ▼
                       Synthetic Application
```

## 4. Phase 3 Rust Controller Design (LLD)
A central Rust control plane application to execute and track these faults.
Proposed directory: `controller/`

```text
controller/
├── experiment/   (model.rs, runner.rs, state.rs)
├── faults/       (model.rs, registry.rs, validator.rs, executor.rs)
│   ├── pumba.rs
│   ├── stress_ng.rs
│   └── docker.rs
├── targets/      (resolver.rs, model.rs)
├── events/       (model.rs, writer.rs)
└── safety/       (limits.rs)
```
### CLI Commands
- `oscar-sim fault list`
- `oscar-sim fault validate cpu_stress --target postgres`
- `oscar-sim fault run cpu_stress --target postgres --duration 60s`
- `oscar-sim experiment run experiments/postgres_cpu.yaml`

## 5. Development Order & Implementation Checklist

### Step 1: Fault Model & Core Framework
- [ ] Initialize `controller` Rust crate.
- [ ] Define `Fault`, `Target`, `Parameters`, `Duration`, `Intensity` models.
- [ ] Implement `Safety Limits` (max duration, max memory).
- [ ] Define Event Schema and Logging (`tracing`).

### Step 2: Target Resolver
- [ ] Implement Docker-aware resolution mapping logical names (`api`, `postgres`, `redis`) to actual container IDs.

### Step 3: Executor Abstraction
- [ ] Define `FaultExecutor` trait (`start()`, `stop()`, `status()`).

### Step 4: Implement Docker Executor
- [ ] `Container Crash` (kill)
- [ ] `Container Pause` (pause)
- [ ] `Service Restart` (restart)

### Step 5: Implement `stress-ng` Executor
- [ ] `CPU Stress` (cpu)
- [ ] `Memory Spike` (vm)
- [ ] `Disk I/O` (hdd)

### Step 6: Implement Pumba Executor
- [ ] `Network Latency` (delay)
- [ ] `Packet Loss` (loss)

### Step 7: Fault Lifecycle & Registry
- [ ] Implement fault state machine (`CREATED` -> `VALIDATING` -> `ACTIVE` -> `STOPPING` -> `COMPLETED`).
- [ ] Build Target Capability Matrix validation.
- [ ] Ensure cleanup reliability (even if fault panics, guarantee removal).

### Step 8: Experiment Runner
- [ ] Parse `yaml` Experiment definitions.
- [ ] Orchestrate Phase 2 (`run_workload.ps1`) and Phase 3 (Fault) simultaneously.
- [ ] Enforce timeline boundaries (Baseline -> Fault -> Recovery).

### Step 9: Data & Telemetry Tracking
- [ ] Output `EXP-XXX` metadata tracking folder.
- [ ] Output `experiment.json` and `timeline.jsonl`.
- [ ] Correlate exact timestamps of injection boundaries.

### Step 10: Validation Framework (Definition of Done)
- [ ] **Validation Layer 1:** Did the fault actually start? (e.g. `stress-ng` process exists).
- [ ] **Validation Layer 2:** Did telemetry react? (e.g. Postgres CPU ↑).
- [ ] **Validation Layer 3:** Did the system recover? (e.g. CPU returned to baseline).
- [ ] End-to-end test of the 10 core scenarios (CPU, Mem Spike, Mem Leak, Disk I/O, Disk Pressure, Latency, Loss, Crash, Pause, Dependency Failure).
