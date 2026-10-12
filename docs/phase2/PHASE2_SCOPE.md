# Phase 2 Scope

This document defines the approved scope and requirements for Phase 2 Workload Generation.

## Requirements Baseline
Phase 2 defines the implementation of a controlled traffic generation layer utilizing k6. It requires:
- **Realistic mixed traffic**: Exercising API reads, writes, cache lookups, cache misses, and errors.
- **Configurable workload parameters**: Easily adjustable VUs, stages, and duration via configuration files.
- **Reproducibility**: Parameter and execution tracking via metadata artifacts.
- **Workload Lifecycle**: Graceful orchestration, clean startup, and clean termination.
- **Telemetry Validation**: Verification that workloads correctly trigger corresponding observability metrics in Prometheus/Grafana.
- **Stability & Recovery**: The normal workload must be able to run for sustained durations, and the system must recover to baseline after spikes.
- **Docker Reusability**: The environment must not be permanently corrupted across workload execution runs.
- **Phase 3 Handoff**: A clean boundary ensuring Phase 3 can dependably run faults against a known workload.

## Required Workload Profiles
The scope mandates six specific workload profiles:
1. Idle
2. Normal
3. Moderate Load
4. Sustained High Load
5. Traffic Spike
6. Burst Load

### Implementation Mapping
| Scope Profile | Implementation Profile |
| ------------- | ---------------------- |
| Idle | baseline |
| Normal | normal |
| Moderate Load | load |
| Sustained High Load | sustained |
| Traffic Spike | spike |
| Burst Load | burst |
