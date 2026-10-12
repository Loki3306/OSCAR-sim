# Phase 3 Known Issues

- **[RESOLVED] Docker Pipe Deadlock:** `std::process::Command` spawned `docker.exe`, which caused a 4-minute delay deadlock due to OS-level Windows Console handle contention against the heavily-printing PowerShell workload script (`k6`). Resolved by rewriting all executors to use `bollard` (which makes asynchronous HTTP requests directly to the Docker Daemon named pipe, entirely bypassing OS processes and console locks).
- **[OPEN] Process Cleanup:** If the Rust controller panics or is killed forcefully, the background PowerShell workload (`run_workload.ps1`) and spawned Docker fault containers might not be cleanly removed.
