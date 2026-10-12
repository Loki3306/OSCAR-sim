# Phase 2 Backlog: Workload Generation

## Workload Generation
- [x] k6 integrated (via scripts running docker)
- [x] Baseline workload works
- [x] Normal workload works
- [x] Load-ramp workload works
- [x] Traffic-spike workload works

## Application Exercise
- [ ] Nginx receives workload
- [ ] API receives workload
- [ ] PostgreSQL is exercised
- [ ] Redis is exercised
- [ ] Read operations work
- [ ] Write operations work

## Observability
- [ ] Request rate changes with workload
- [ ] API latency is observable
- [ ] API activity changes
- [ ] Redis activity changes
- [ ] PostgreSQL activity changes
- [ ] Container resource usage changes
- [ ] Grafana reflects workload changes

## Reproducibility
- [x] Workload configurations version controlled
- [x] Workload parameters recorded (in JSON metadata)
- [x] Experiment ID generated
- [x] Workload can be rerun

## Technical Debt
- [ ] Implement Filesystem telemetry in cAdvisor / Prometheus (Currently marked as No Data in Grafana; needed for disk-saturation fault injection)

## Recovery
- [ ] Workload can stop cleanly
- [ ] System returns toward baseline
- [ ] No persistent application corruption
- [ ] Docker environment remains reusable
