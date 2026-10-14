from fastapi import APIRouter
from datetime import datetime, timezone
from server.models import SystemHealthResponse, TopologyResponse
from server.services.sim_service import sim_service

router = APIRouter(prefix="/api", tags=["System & Topology"])

@router.get("/system/health", response_model=SystemHealthResponse)
def get_system_health():
    """Returns infrastructure health checks and mode indicator."""
    return sim_service.check_system_health()

@router.get("/system/status")
def get_system_status():
    """Returns aggregated executive health status and counts for the UI."""
    health = sim_service.check_system_health()
    matrix = health.health_matrix
    return {
        "status": health.status,
        "timestamp": int(datetime.now(timezone.utc).timestamp()),
        "docker_available": health.docker_available,
        "mode": health.mode,
        "services_count": matrix.services_count if matrix else len(health.services),
        "healthy_count": matrix.healthy_count if matrix else 5,
        "unhealthy_count": matrix.unhealthy_count if matrix else 0,
        "active_faults_count": matrix.active_faults_count if matrix else 0,
        "open_incidents_count": matrix.open_incidents_count if matrix else 0,
        "health_matrix": matrix.model_dump() if matrix else None
    }

@router.get("/topology", response_model=TopologyResponse)
def get_topology():
    """Returns microservice nodes, call edges, metrics, and incident status."""
    return sim_service.get_topology()

@router.get("/system/topology")
def get_system_topology():
    """Returns topology format aligned with frontend ServiceNode and DependencyEdge."""
    topo = sim_service.get_topology()
    services = []
    faulted_targets = [f["target_service"] for f in sim_service.active_faults.values() if f["status"] == "RUNNING"]

    for n in topo.nodes:
        m = n.metrics or {}
        services.append({
            "name": n.id,
            "display_name": n.label,
            "status": "unhealthy" if n.id in faulted_targets else ("healthy" if n.status in ["healthy", "replayed"] else n.status),
            "cpu_percent": m.get("cpu_percent", 10.0),
            "memory_mb": m.get("memory_mb", 120.0),
            "error_rate": m.get("error_rate", 0.0),
            "latency_ms": m.get("latency_ms", 5.0),
            "is_root_cause": n.id in faulted_targets,
            "is_injected_target": n.is_injected_target,
            "is_observed_abnormal": n.is_observed_abnormal,
            "is_algorithm_inferred": n.is_algorithm_inferred,
            "is_ground_truth_target": n.is_ground_truth_target,
            "fsm_state": n.fsm_state
        })

    edges = []
    for e in topo.edges:
        edges.append({
            "from_service": e.source,
            "to_service": e.target,
            "relationship": e.protocol,
            "is_active_path": e.is_impacted,
            "active_qps": e.active_qps,
            "is_impacted": e.is_impacted,
            "is_request_path": e.is_request_path,
            "is_inferred_causal": e.is_inferred_causal,
            "is_expected_propagation": e.is_expected_propagation,
            "latency_ms": e.latency_ms,
            "error_rate": e.error_rate
        })

    return {
        "services": services,
        "nodes": [n.model_dump() for n in topo.nodes],
        "edges": edges,
        "updated_at": int(datetime.now(timezone.utc).timestamp()),
        "mode": topo.mode
    }

@router.get("/propagation/trace")
def get_propagation_trace(
    scenario_id: str = "slow_database",
    target: str = None
):
    """Returns millisecond-resolution causal propagation trace and hop breakdown."""
    from server.services.propagation_tracer import propagation_tracer
    return propagation_tracer.build_trace(scenario_id, target)

@router.post("/system/simulate/start")
def start_simulation():
    """Starts simulated synthetic background traffic."""
    return {"status": "started", "mode": "SIMULATION_ACTIVE", "target_qps": 45}

@router.post("/system/simulate/stop")
def stop_simulation():
    """Stops simulated background traffic."""
    return {"status": "stopped", "mode": "IDLE"}
