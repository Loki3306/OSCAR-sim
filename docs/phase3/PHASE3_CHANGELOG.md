# Phase 3 Changelog

## [0.1.2] - 2026-08-23
### Fixed
- Fixed the OS-level Windows Console deadlock causing a 4-minute delay during `fault_started`. Rewrote `StressNgExecutor` and `PumbaExecutor` to use the `bollard` HTTP client instead of `std::process::Command`, reducing injection latency to ~269ms.

## [0.1.1] - 2026-08-23
### Fixed
- Added missing `chrono` dependency to `Cargo.toml`.
- Removed unused `FaultType` import from `limits.rs`.

## [0.1.0] - 2026-08-23
### Added
- Implemented Rust Controller with CLI, Target Resolver, and Experiment Runner.
- Implemented Docker, Pumba, and `stress-ng` executors.
- Created `timeline.jsonl` structured event logging.
