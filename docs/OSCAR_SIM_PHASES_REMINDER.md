# OSCAR-Sim Development Phases & Vision Reminder

## Final Recommended Stack (2026)
For a 1-person team and OSCAR-Sim only:

**Environment**
├── Docker
├── Docker Compose
├── Nginx
├── Rust API (Axum)
├── PostgreSQL
├── Redis
└── Rust Worker

**Traffic**
└── k6

**Fault Injection**
├── Pumba
└── Stress-ng (direct resource stress)

**Observability**
├── Prometheus
├── Grafana
├── OpenTelemetry
└── Loki

**Control Plane**
├── Rust
├── Tokio
├── Axum
├── SQLx
├── Serde
└── Bollard

**Ground Truth**
└── PostgreSQL

---

## One Important Change: Adding `stress-ng`
Instead of relying only on Pumba.

**Reason:**
Pumba is excellent for:
- Container Kill
- Container Pause
- Network Delay
- Packet Loss

But many incidents are actually:
- CPU Hog
- Memory Leak
- Disk Saturation
- IO Wait

Those are easier to create using [stress-ng](https://github.com/ColinIanKing/stress-ng) inside containers.

**Example:**
`stress-ng --cpu 8`
`stress-ng --vm 2 --vm-bytes 4G`
`stress-ng --hdd 4`

This will generate far more realistic telemetry.

---

## What We Are Actually Building

### Phase 1: Environment
`docker-compose up`
- **Services:** nginx, api, postgres, redis, worker, prometheus, grafana
- **Goal:** Healthy stack, Metrics visible
- *No faults yet.*

### Phase 2: Observability (And Traffic)
- **Add:** OpenTelemetry, Loki
- **Goal:** Metrics, Logs, Traces all flowing.
- *This is critical because later OSCAR consumes exactly these signals.*
*(Note: Traffic generation via k6 has also been integrated here to provide baseline telemetry before fault injection).*

### Phase 3: Traffic
- **Add:** k6
- **Scenarios:** Normal Traffic, Traffic Spike, Connection Storm
- **Goal:** Create realistic workloads

### Phase 4: Fault Injection
- **Add:** Pumba, stress-ng
- **Scenarios:** CPU Hog, Memory Leak, Disk Saturation, Container Crash, Network Delay, Packet Loss

### Phase 5: Ground Truth
- **Store:** scenario_runs, faults, affected_services, expected_chains
- **Example:**
```json
{
  "fault": "memory_leak",
  "target": "postgres",
  "expected_chain": [
    "memory_pressure",
    "disk_wait",
    "db_latency",
    "api_latency"
  ]
}
```

### Phase 6: Scenario Library
Now build buttons:
- Inject Memory Leak
- Inject CPU Hog
- Inject Disk Saturation
- Inject Network Delay
- Inject Service Crash
- Inject Cascading Failure
- Inject Traffic Spike

---

## Biggest Lesson From The Research
The research strongly suggests: **Don't build a simulator engine.**

**Use:**
Real Services + Real Containers + Real Telemetry + Controlled Fault Injection instead.

That gives:
- Real CPU Metrics
- Real Memory Metrics
- Real Logs
- Real Traces
- Real Network Effects

...which are far more valuable than synthetic simulations.

## What We Will Ignore Completely
Do not spend time on:
- SimPy
- CloudSim
- OMNeT++
- ns-3
- Custom Event Simulators

The research shows they are academic tools and poorly aligned with production RCA validation.

---

## The Foundation
First milestone is `docker-compose up` and successfully seeing Nginx, Rust API, Redis, Postgres, Prometheus, and Grafana running locally. 

**Rule:** If you cannot see CPU, memory, request count, latency, and error metrics in Grafana, do not proceed to k6, Pumba, or OSCAR. Everything else depends on that foundation.
