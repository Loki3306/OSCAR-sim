# OSCAR-SIM ARCHITECTURE DECISIONS

## 1. Phase 3: Rust Controller
**Status:** Accepted
**Date:** 2026-08-23
**Decision:** Implement Phase 3 Fault Injection via a custom Rust control plane application (`controller`).
**Context:** Pumba handles Docker faults, but we need orchestration, target resolution, and structured experiment logging (timeline.jsonl). Rather than relying on fragile bash scripts, a strongly typed Rust controller (with `bollard`) prevents orchestration failures and provides exact timestamping.

## 2. Phase 3: Pumba and stress-ng Integration
**Status:** Accepted
**Date:** 2026-08-23
**Decision:** `stress-ng` and `pumba` run as ephemeral Docker containers, dynamically attaching to target containers.
**Context:** Modifying target application images (e.g. Postgres) to install fault tooling violates the requirement that targets must be realistic production images. By using sidecar containers that share PID/Network/Cgroup namespaces, we inject faults externally without touching the source images.

## 3. Phase 3: Docker Execution Strategy
**Status:** Accepted
**Date:** 2026-08-23
**Decision:** The Rust Controller must use the `bollard` HTTP client for all container operations instead of `std::process::Command` calling `docker.exe`.
**Context:** Running `docker.exe` via Tokio while a concurrent, heavily-printing background workload script (e.g. `k6` via PowerShell) executes causes the Windows Console subsystem to deadlock, preventing `docker.exe` from starting. Using `bollard` speaks directly to the Docker Daemon named pipe via HTTP, fully avoiding the OS-level process and console handle inheritance locks.
