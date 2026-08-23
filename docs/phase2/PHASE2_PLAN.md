# OSCAR-Sim — Phase 2 Design & Build Plan

Based on the finalized OSCAR-Sim architecture and the existing Phase 1/Phase 2 definitions, I would lock Phase 2 around one objective:

> **Build a controlled, repeatable workload-generation layer that exercises the healthy Phase 1 environment and produces meaningful, measurable telemetry for later fault-injection experiments.**

The simulator remains the test environment for OSCAR; we are not moving into RCA or fault injection yet. 

---

# 1. Phase 2 Position in the Overall Project

The complete system is:

```text
                         OSCAR PROJECT
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
           OSCAR-Sim                     OSCAR
        Experimental Lab              RCA System
                │                           ▲
                │ telemetry                 │
                └───────────────────────────┘
```

Inside OSCAR-Sim:

```text
PHASE 1
Environment
    +
Observability
        │
        ▼
PHASE 2
Controlled Workload
        │
        ▼
PHASE 3
Fault Injection
        │
        ▼
PHASE 4
Ground Truth
        │
        ▼
PHASE 5
Scenario Library
        │
        ▼
PHASE 6
OSCAR Integration
```

The finalized project plan explicitly establishes this sequence. 

---

# 2. Phase 2 Goal

At the end of Phase 2 we should be able to do something conceptually like:

```text
Start Phase 1 environment
        ↓
Select workload
        ↓
Start workload
        ↓
Generate controlled traffic
        ↓
Observe system telemetry
        ↓
Stop workload
        ↓
Record experiment metadata
```

For example:

```text
Workload: normal
Duration: 10 minutes
Target: Nginx → API → Redis/PostgreSQL
Traffic: mixed read/write
Users: 50
```

And observe:

```text
Requests ↑
API activity ↑
Redis activity ↑
PostgreSQL activity ↑
CPU ↑
Memory ↑
Network ↑
```

The numbers themselves should be measured rather than predetermined.

---

# 3. What Phase 2 Does NOT Build

We should explicitly freeze these out.

### Not Phase 2

```text
❌ Pumba
❌ CPU faults
❌ Memory leaks
❌ Disk saturation
❌ Network failures
❌ Container crashes
❌ Cascading failures
❌ Ground truth
❌ RCA
❌ Causal graphs
❌ OSCAR inference
❌ Full Rust control plane
```

Fault injection begins in Phase 3, while ground truth begins in Phase 4. 

---

# 4. Phase 2 Architecture

The architecture should be:

```text
                         ┌──────────────┐
                         │     k6       │
                         │   Workload   │
                         │   Generator  │
                         └──────┬───────┘
                                │
                                │ HTTP
                                ▼
                         ┌──────────────┐
                         │    Nginx     │
                         │ Entry Point  │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   Rust API   │
                         │    Axum      │
                         └──────┬───────┘
                                │
                       ┌────────┴────────┐
                       ▼                 ▼
                 ┌──────────┐      ┌──────────┐
                 │  Redis   │      │Postgres  │
                 └──────────┘      └──────────┘
                       │                 │
                       └────────┬────────┘
                                ▼
                       System Activity
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
           Prometheus        cAdvisor        Grafana
```

Phase 2 primarily introduces the **k6 → Nginx** side.

Everything below that already belongs to Phase 1.

---

# 5. Phase 2 Components

I would divide the implementation into **five components**.

## Component A — Workload Definitions

Defines what traffic should look like.

```text
workload
├── name
├── duration
├── stages
├── virtual users
└── request distribution
```

---

## Component B — k6 Scenarios

Actually generates the traffic.

```text
k6
├── baseline
├── normal
├── load
└── spike
```

We don't need six completely independent scenarios initially.

---

## Component C — Workload Configuration

Controls parameters without modifying scenario logic.

For example:

```yaml
name: normal

duration: 10m

stages:
  - duration: 1m
    target: 10

  - duration: 7m
    target: 50

  - duration: 2m
    target: 10
```

Request distribution should also be configurable.

---

## Component D — Experiment Metadata

Every workload execution should have an identity.

Example:

```json
{
  "experiment_id": "exp-001",
  "workload": "normal",
  "start_time": "...",
  "end_time": "...",
  "virtual_users": 50
}
```

This is intentionally simple in Phase 2.

Later Phase 3 can add:

```text
fault
fault_target
fault_start
fault_duration
```

And Phase 4 can add:

```text
ground_truth
```

---

## Component E — Validation

The final component isn't another service.

It's the verification system that proves:

```text
workload
    ↓
traffic
    ↓
application activity
    ↓
infrastructure activity
    ↓
telemetry
```

actually happens.

---

# 6. Workload Model

I recommend **four core profiles**, rather than implementing six separate scripts immediately.

## Profile 1 — Baseline

Purpose:

Establish healthy idle/low-traffic behavior.

Example:

```text
VUs: 1–2
Duration: 5 min
```

---

## Profile 2 — Normal

This becomes the primary OSCAR-Sim workload.

Example:

```text
VUs: 25–50
Duration: 10 min
```

Mixed traffic:

```text
GET /users
GET /users/:id
POST /users
GET /cache
GET /health
```

---

## Profile 3 — Load Ramp

Gradually increase traffic:

```text
10
 ↓
25
 ↓
50
 ↓
100
```

Purpose:

Measure how healthy infrastructure responds to increasing workload.

---

## Profile 4 — Traffic Spike

Example:

```text
10 VUs
   ↓
100 VUs
   ↓
200 VUs
   ↓
10 VUs
```

Purpose:

Create a controlled transient workload anomaly.

---

### Later profiles

Once the core system works, we can derive:

```text
Sustained High Load
Burst
Connection Storm
Retry Storm
```

The project already identifies traffic spikes, connection storms and retry storms as eventual workload/failure scenarios. 

But they should not block the initial Phase 2 implementation.

---

# 7. API Workload

The workload should exercise the actual application.

I would structure requests around:

```text
GET /health
GET /users
GET /users/:id
POST /users
GET /cache
```

The Phase 1 design already identifies these endpoints as the intended application interface. 

The important point is that requests should travel through:

```text
k6
 ↓
Nginx
 ↓
API
```

rather than directly hitting the API container.

That makes Nginx part of the actual experiment.

---

# 8. Mixed Traffic Distribution

A first version could use:

```text
GET /users          30%
GET /users/:id      30%
POST /users         10%
GET /cache          20%
GET /health          5%
invalid requests     5%
```

These are **initial workload parameters**, not claimed production statistics.

They should eventually be configurable.

The goal is to exercise:

```text
API
 ├── PostgreSQL reads
 ├── PostgreSQL writes
 └── Redis
```

with enough diversity to produce useful telemetry.

---

# 9. Important Redis Requirement

There is a dependency on Phase 1 here.

For the workload to actually exercise Redis, the API needs a meaningful cache flow:

```text
GET /users/:id
       │
       ▼
     Redis
       │
   ┌───┴────┐
   │        │
 HIT       MISS
   │        │
   ▼        ▼
Return   PostgreSQL
            │
            ▼
          Redis
            │
            ▼
          Return
```

Without this, putting `/cache` into k6 doesn't give us a realistic application dependency.

So before Phase 2 implementation begins, we need to verify that the relevant Phase 1 API/Redis functionality is actually complete.

The existing Phase 1 closure material explicitly identified this as something that needed verification. 

---

# 10. PostgreSQL Requirement

Similarly, the workload needs actual database activity.

For example:

```text
POST /users
      ↓
PostgreSQL INSERT
```

and:

```text
GET /users
      ↓
PostgreSQL SELECT
```

Otherwise we are generating API traffic without generating meaningful database telemetry.

Therefore Phase 2's acceptance criteria must include **downstream activity**, not just HTTP request success.

---

# 11. Directory Design

I would use:

```text
oscar-sim/
│
├── workloads/
│   │
│   ├── scenarios/
│   │   ├── baseline.js
│   │   ├── normal.js
│   │   ├── load.js
│   │   └── spike.js
│   │
│   ├── config/
│   │   ├── baseline.yaml
│   │   ├── normal.yaml
│   │   ├── load.yaml
│   │   └── spike.yaml
│   │
│   ├── lib/
│   │   ├── client.js
│   │   ├── users.js
│   │   ├── cache.js
│   │   └── checks.js
│   │
│   └── README.md
│
├── experiments/
│   └── metadata/
│
├── services/
├── monitoring/
├── postgres/
├── scripts/
└── docs/
```

### Why this structure?

It separates:

```text
Scenario definition
        ≠
Request implementation
        ≠
Configuration
        ≠
Experiment metadata
```

That will make Phase 3 considerably easier.

---

# 12. k6 Script Architecture

Don't put everything into one huge `normal.js`.

Instead:

```text
normal.js
    │
    ├── users.js
    ├── cache.js
    ├── client.js
    └── checks.js
```

For example conceptually:

```text
normal.js
    │
    ├── choose operation
    │
    ├── execute request
    │
    ├── validate response
    │
    └── record k6 metrics
```

This gives us reusable request functions for later scenarios.

---

# 13. k6 Metrics vs Prometheus Metrics

There are two different telemetry sources here.

### k6

Measures the **workload generator's perspective**:

```text
request duration
request success
request failures
throughput
```

### Prometheus

Measures the **system's perspective**:

```text
API activity
Redis activity
Postgres activity
CPU
Memory
Network
```

We should preserve this distinction.

For OSCAR eventually, the important data source will be the simulator's exported telemetry, not k6's internal statistics alone.

---

# 14. Experiment Metadata

For Phase 2, keep this minimal.

Example:

```json
{
  "experiment_id": "exp-2026-001",
  "workload": {
    "name": "normal",
    "profile_version": "1.0",
    "vus": 50,
    "duration_seconds": 600
  },
  "start_time": "2026-08-23T16:00:00Z",
  "end_time": "2026-08-23T16:10:00Z"
}
```

Later:

```json
{
  "workload": {},
  "fault": {},
  "ground_truth": {}
}
```

This is the beginning of the experiment schema without prematurely implementing the entire experiment engine.

---

# 15. Phase 2 Build Sequence

## Step 0 — Phase 1 Gate

Before touching k6:

```text
Verify:
Nginx
API
Redis
PostgreSQL
Prometheus
Grafana
cAdvisor
```

And specifically verify:

```text
GET /users
POST /users
Redis flow
PostgreSQL flow
required metrics
```

because Phase 2 depends on them. 

---

# Step 1 — Create Workload Directory

Create:

```text
workloads/
├── scenarios/
├── config/
├── lib/
└── README.md
```

No architecture changes.

---

# Step 2 — Build Baseline Scenario

Implement the smallest workload:

```text
1–2 VUs
5 minutes
```

Use:

```text
GET /health
```

Validate:

```text
Nginx receives requests
API receives requests
Prometheus request counter increases
Grafana changes
```

---

# Step 3 — Build Normal Scenario

Introduce:

```text
GET /users
GET /users/:id
POST /users
GET /cache
GET /health
```

with configurable distribution.

Validate:

```text
API activity
Redis activity
Postgres activity
container activity
```

---

# Step 4 — Add Load Ramp

Example:

```text
10 VUs
  ↓
25
  ↓
50
  ↓
100
```

Measure:

```text
request rate
latency
CPU
memory
DB activity
Redis activity
```

Do not define expected numerical values before measurement.

---

# Step 5 — Add Traffic Spike

Implement:

```text
10
 ↓
100
 ↓
200
 ↓
10
```

Validate both:

```text
load increase
```

and:

```text
recovery
```

---

# Step 6 — Add Configuration

Once the scenarios work, extract parameters:

```text
VUs
duration
stages
traffic distribution
```

Don't build a complicated configuration engine before the basic scenarios work.

---

# Step 7 — Add Experiment Metadata

Every execution should produce:

```text
experiment ID
workload profile
parameters
start time
end time
```

This establishes reproducibility.

---

# Step 8 — Validate Telemetry

This is the major Phase 2 validation.

Run:

```text
Baseline
      ↓
Normal
      ↓
Load Ramp
      ↓
Spike
      ↓
Recovery
```

For each one observe:

```text
HTTP
API
Redis
Postgres
Container
```

---

# 16. Validation Matrix

| Test      | Request Rate | API    | Redis  | PostgreSQL | Containers | Recovery |
| --------- | ------------ | ------ | ------ | ---------- | ---------- | -------- |
| Baseline  | Low          | Low    | Low    | Low        | Stable     | N/A      |
| Normal    | Stable       | Stable | Active | Active     | Stable     | Yes      |
| Load Ramp | ↑            | ↑      | ↑      | ↑          | ↑          | Yes      |
| Spike     | Sharp ↑      | ↑      | ↑      | ↑          | ↑          | Yes      |

The arrows are **expected directional behavior**, not fixed numerical requirements.

---

# 17. Phase 2 Acceptance Criteria

I would make these the official criteria.

### Workload generation

* [ ] k6 integrated
* [ ] Baseline workload works
* [ ] Normal workload works
* [ ] Load-ramp workload works
* [ ] Traffic-spike workload works

### Application exercise

* [ ] Nginx receives workload
* [ ] API receives workload
* [ ] PostgreSQL is exercised
* [ ] Redis is exercised
* [ ] Read operations work
* [ ] Write operations work

### Observability

* [ ] Request rate changes with workload
* [ ] API latency is observable
* [ ] API activity changes
* [ ] Redis activity changes
* [ ] PostgreSQL activity changes
* [ ] Container resource usage changes
* [ ] Grafana reflects workload changes

### Reproducibility

* [ ] Workload configurations version controlled
* [ ] Workload parameters recorded
* [ ] Experiment ID generated
* [ ] Workload can be rerun

### Recovery

* [ ] Workload can stop cleanly
* [ ] System returns toward baseline
* [ ] No persistent application corruption
* [ ] Docker environment remains reusable

---

# 18. What "Phase 2 Complete" Means

This is the most important definition.

Phase 2 is **not** complete when:

```text
k6 installed
```

or:

```text
k6 script executes
```

It is complete when we can demonstrate:

```text
             Controlled Workload
                     │
                     ▼
                    k6
                     │
                     ▼
                   Nginx
                     │
                     ▼
                  Rust API
                 /        \
                ▼          ▼
             Redis      PostgreSQL
                 \        /
                  \      /
                   ▼    ▼
                System Activity
                     │
                     ▼
              Prometheus/Grafana
```

and the behavior is:

```text
Repeatable
Observable
Configurable
Measurable
Recoverable
```

---

# 19. Phase 3 Contract

After Phase 2 is frozen, Phase 3 should be able to say:

```text
Experiment
│
├── workload = normal
│
├── workload_start = T0
│
├── baseline_duration = 60s
│
├── fault_start = T0 + 60s
│
└── workload_end = T0 + 300s
```

Then:

```text
Phase 3
       │
       ▼
Start normal workload
       │
       ▼
Wait for baseline
       │
       ▼
Inject Pumba fault
       │
       ▼
Observe telemetry
       │
       ▼
Stop fault
       │
       ▼
Observe recovery
```

This is exactly why Phase 2 needs controlled timing and reproducible workloads.

---

# 20. Final Phase 2 Plan

I would therefore freeze the implementation plan as:

```text
PHASE 2 — TRAFFIC / WORKLOAD GENERATION
│
├── 0. Phase 1 readiness verification
│
├── 1. Workload directory + conventions
│
├── 2. k6 integration
│
├── 3. Baseline workload
│
├── 4. Normal mixed workload
│
├── 5. Load-ramp workload
│
├── 6. Traffic-spike workload
│
├── 7. Configurable workload parameters
│
├── 8. Experiment metadata
│
├── 9. Telemetry validation
│
├── 10. Recovery validation
│
├── 11. Reproducibility validation
│
└── 12. Phase 2 closure
```

### Architectural rule

```text
Phase 2 builds the WORKLOAD layer.

Phase 3 builds the FAULT layer.

Phase 4 builds the GROUND-TRUTH layer.

OSCAR consumes the resulting TELEMETRY.
```
