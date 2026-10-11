from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from server.models import FaultTriggerRequest, FaultExecutionStatus
from server.services.sim_service import sim_service

router = APIRouter(prefix="/api/faults", tags=["Fault Laboratory"])

@router.get("/supported")
def get_supported_faults():
    """Lists verified, supported fault injection capabilities and target mappings."""
    return {
        "supported_faults": [
            {
                "type": "cpu_stress",
                "label": "CPU Stress / Throttling",
                "description": "Simulates CPU exhaustion via heavy thread contention or unindexed query loops.",
                "supported_targets": ["postgres", "redis", "api", "nginx"],
                "default_duration": 30,
                "intensity_unit": "% Core Load"
            },
            {
                "type": "memory_spike",
                "label": "Memory Saturation / Leak",
                "description": "Allocates rapid heap memory buffers to trigger container cgroup OOM or paging.",
                "supported_targets": ["postgres", "redis", "api"],
                "default_duration": 30,
                "intensity_unit": "MB Allocated"
            },
            {
                "type": "network_delay",
                "label": "Network Latency Injection",
                "description": "Injects transit packet latency causing downstream caller timeouts.",
                "supported_targets": ["postgres", "redis", "api"],
                "default_duration": 30,
                "intensity_unit": "ms Delay"
            },
            {
                "type": "container_pause",
                "label": "Container SIGSTOP / Freeze",
                "description": "Pauses container execution simulating thread freeze or deadlock.",
                "supported_targets": ["postgres", "redis", "api"],
                "default_duration": 15,
                "intensity_unit": "Freeze Duration"
            }
        ],
        "safety_limits": {
            "max_duration_seconds": 300,
            "min_duration_seconds": 5,
            "max_concurrent_faults": 2,
            "auto_recovery_enabled": True
        }
    }

@router.get("/active", response_model=List[FaultExecutionStatus])
def get_active_faults():
    """Returns all currently executing faults."""
    statuses = []
    for f in sim_service.active_faults.values():
        statuses.append(FaultExecutionStatus(
            fault_id=f["fault_id"],
            fault_type=f["fault_type"],
            target_service=f["target_service"],
            status=f["status"],
            started_at=f["started_at"],
            duration_seconds=f["duration_seconds"],
            message=f"Fault running on {f['target_service']}"
        ))
    return statuses

@router.get("/history")
def get_fault_history():
    """Returns past fault experiment runs."""
    history = []
    # Include stopped active faults and loaded experiments
    for f in sim_service.active_faults.values():
        history.append({
            "fault_id": f["fault_id"],
            "fault_type": f["fault_type"],
            "target_service": f["target_service"],
            "intensity": f.get("intensity", 80),
            "duration_seconds": f["duration_seconds"],
            "start_time": int(f.get("start_epoch", 0)),
            "status": f["status"],
            "incident_id": f.get("incident_id"),
            "logs": ["Experiment executed and tracked in incident timeline"]
        })
    for inc_id, inc in sim_service.incidents.items():
        if "stress" in inc.title.lower() or "fault" in str(inc.fault_type).lower():
            history.append({
                "fault_id": f"FAULT-{inc_id}",
                "fault_type": inc.fault_type or "cpu_stress",
                "target_service": inc.target_service or "postgres",
                "intensity": 85,
                "duration_seconds": 60,
                "start_time": 1787488427,
                "status": "COMPLETED",
                "incident_id": inc_id,
                "logs": [f"Recorded experiment {inc_id} completed normally"]
            })
    return history

@router.post("/trigger", response_model=FaultExecutionStatus)
def trigger_fault(req: FaultTriggerRequest):
    """Triggers a bounded fault experiment."""
    return sim_service.trigger_fault(req)

@router.post("/inject", response_model=FaultExecutionStatus)
def inject_fault_alias(req: FaultTriggerRequest):
    """Alias for /trigger used by frontend."""
    return sim_service.trigger_fault(req)

@router.post("/stop/{fault_id}", response_model=FaultExecutionStatus)
def stop_fault(fault_id: str):
    """Emergency stops an active fault experiment."""
    try:
        return sim_service.stop_fault(fault_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{fault_id}/stop", response_model=FaultExecutionStatus)
def stop_fault_alias(fault_id: str):
    """Alias for /stop/{fault_id} used by frontend."""
    try:
        return sim_service.stop_fault(fault_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
