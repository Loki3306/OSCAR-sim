# Phase 2 Implementation Details

## Workload Library (`workloads/lib/`)
The foundational JS library for k6 execution.
- **`client.js`**: Standardized HTTP request wrappers and error handling.
- **`users.js`**: Specific API request definitions (`getHealth`, `listUsers`, `createUser`, `getUser`).
- **`cache.js`**: Specific API request definitions targeting explicit cache misses.
- **`checks.js`**: k6 assertion logic for HTTP responses (`is200`, `is201`, etc).

## Workload Configurations (`workloads/config/`)
JSON definitions describing the VU scaling shapes.
- **`baseline.json`**: Constant 2 VUs for 5 minutes. Represents Idle traffic.
- **`normal.json`**: Constant 25 VUs for 10 minutes. Represents normal system behavior.
- **`load.json`**: Ramps up to 50 VUs and back down. Represents Moderate load.
- **`sustained.json`**: Ramps to 100 VUs and holds for 10 minutes. Represents continuous high pressure.
- **`spike.json`**: 10 VUs -> 200 VUs spike -> 10 VUs. Represents sudden transient traffic.
- **`burst.json`**: Oscillates rapidly between 25 VUs and 150 VUs. Represents Burst load.

## Workload Scenarios (`workloads/scenarios/`)
k6 executable JavaScript scripts corresponding to the JSON configurations. Each script loads its respective `.json` and orchestrates a probability distribution across the available API endpoints in the library to generate mixed reads, writes, cache hits, and errors.

## Orchestrator (`scripts/run_workload.ps1`)
The central orchestrator script for Phase 2.
- **Workload Selection:** Parses user input (e.g. `-WorkloadName spike`).
- **Configuration Validation:** Validates the input against the known 6 profiles.
- **Docker Networking:** Automatically attaches a ephemeral `grafana/k6` container to the existing `oscar_simulation_oscar_sim_net` docker network.
- **Targeting:** Directs traffic explicitly to Nginx via `-e TARGET_URL=http://nginx:80`.
- **Experiment Metadata:** Records execution details into a `.json` file within `experiments/metadata/` for reproducibility.
