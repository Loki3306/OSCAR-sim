# OSCAR-SIM PROJECT CONTEXT

## Project

OSCAR-Sim

Simulation and validation environment for OSCAR.

---

# Mission

Create a realistic enterprise-like environment capable of:

* generating telemetry
* generating failures
* generating hidden ground truth

for RCA validation.

---

# Philosophy

Do NOT build:

* Linux simulator
* OS simulator
* Kernel simulator

Build:

Failure Scenario Simulator

using real software and real telemetry.

---

# Current Scope

Phase 1 only.

Goal:

Healthy observable environment.

No fault injection.

No RCA.

No OSCAR integration.

---

# Technology Stack

Environment

* Docker
* Docker Compose

Services

* Nginx
* Rust Axum API
* PostgreSQL
* Redis

Monitoring

* Prometheus
* Grafana
* cAdvisor

Future

* OpenTelemetry
* Loki
* k6
* Pumba
* Ground Truth Engine

---

# Service Topology

Client
↓
Nginx
↓
Rust API
↓
Redis
↓
PostgreSQL

---

# Phase 1 Deliverables

Must successfully run:

* nginx
* api
* postgres
* redis
* prometheus
* grafana
* cadvisor

using:

docker compose up

---

# Required Endpoints

GET /health

GET /users

POST /users

GET /cache

GET /metrics

---

# Metrics

Application

* http_requests_total
* http_request_duration_seconds
* cache_hits_total
* cache_misses_total
* postgres_queries_total
* active_connections

Infrastructure

* CPU
* Memory
* Network
* Disk

---

# Repository Structure

OSCAR_Simulation/

docker-compose.yml

services/
api/
nginx/

monitoring/
prometheus/
grafana/

postgres/

docs/

scripts/

---

# Success Criteria

Single command:

docker compose up -d

starts all services.

Grafana shows:

* Request Count
* Latency
* Error Rate
* CPU
* Memory
* Network

System remains healthy for 24 hours.

---

# Future Roadmap

Phase 2

k6

Phase 3

Pumba
stress-ng

Phase 4

Ground Truth Engine

Phase 5

Scenario Library

Phase 6

OSCAR Integration

No future phase should modify Phase 1 architecture without approval.
