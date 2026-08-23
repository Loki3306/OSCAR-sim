# Phase 2 Validation & Testing

## Workload Path Tests
- **k6 -> Nginx -> API**: VERIFIED. Traffic successfully originates from a k6 docker container, resolves `nginx:80` via internal DNS, and hits the Rust API.
- **API -> Redis / PostgreSQL**: VERIFIED. Mixed distribution logic in the workload library correctly exercises cache hits/misses and DB writes.

## Workload Execution Tests
- **Baseline Test:** 2 VUs successfully executed. VERIFIED.
- **Normal Test:** 25 VUs successfully executed. VERIFIED.
- **Load Test:** Ramping VUs executed by user. VERIFIED.
- **Spike Test:** Sharp 200 VU spike executed. VERIFIED.
- **Burst Test:** Oscillating 150 VU bursts runtime-tested and verified. VERIFIED.
- **Sustained Test:** 100 VU hold runtime-tested and verified. VERIFIED.

## Negative Test
- Command: `.\scripts\run_workload.ps1 -WorkloadName invalid_name`
- Result: Exited with code 1. Cleanly prevented silent failure or default execution. VERIFIED.

## Clean Restart
- Command: `docker compose down; docker compose up -d`
- Result: Environment was wiped, rebuilt, and recovered to healthy state. VERIFIED.

## Reproducibility & Clean State
- Running the orchestrator creates a new metadata file in `experiments/metadata/`. VERIFIED.
- Workloads are executed in ephemeral `--rm` Docker containers ensuring no stale processes. VERIFIED.

## Telemetry Validation
- **Request Rate / Total Requests:** Verified to reflect workload intensity.
- **Error Request Rate:** Validated against 4xx/5xx endpoint logic. Dashboard renamed to avoid semantic confusion with percentages.
- **Redis Cache Hits/Misses:** Direct Prometheus API queries confirmed `cache_hits_total` (4,988) and `cache_misses_total` (12,626) mathematically correlate to observed 28% Hit Rate. VERIFIED.
- **PostgreSQL Query Rate / Connections:** Query rate scaled linearly with injected load; connections held steady at ~20 via pooling. VERIFIED.
- **CPU / Network:** container metrics confirmed to correlate with spikes. VERIFIED.
- **Filesystem Usage:** Marked as No Data. Identified as TECHNICAL DEBT.
