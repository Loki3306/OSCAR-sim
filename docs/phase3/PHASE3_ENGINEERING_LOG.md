# Phase 3 Engineering Log

## 2026-08-23 - Fault Start Delay Investigation
**Issue:** `fault_started` occurred exactly ~4m05s after `fault_requested`. Because the workload script (`run_workload.ps1`) runs for exactly 5m00s and baseline is 60s, the fault was starting *exactly* when the workload finished (60s + 4m05s = 5m05s).
**Investigation:** Disproved the theory that the Docker image was pulling. Initially hypothesized standard pipe EOF deadlocking (`output().await`), but the `spawn()` + `wait()` fix still hung for exactly 4m05s (tied exactly to the `k6` workload duration). Further analysis confirmed a Windows OS-level console handle/Job Object lock: spawning `docker.exe` from Tokio while a concurrent PowerShell script is heavily manipulating the shared console blocked `docker.exe`'s initialization until the console was released.
**Fix:** Completely bypassed `std::process::Command` and `docker.exe`. Rewrote `StressNgExecutor` and `PumbaExecutor` to use `bollard`, firing HTTP requests directly to `\\.\pipe\docker_engine`. Delay reduced from ~4 minutes to ~269ms.
