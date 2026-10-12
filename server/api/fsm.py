from fastapi import APIRouter, Query
from typing import Optional, Dict, Any

from server.models import FSMStatusResponse, TimelineScrubResponse
from server.services.sim_service import sim_service

router = APIRouter(prefix="/api/fsm", tags=["Finite State Machine & Timeline Scrubber"])

@router.get("/status", response_model=FSMStatusResponse)
def get_fsm_status(experiment_id: Optional[str] = Query(None, description="Optional experiment identifier")):
    """Returns the Experiment Lifecycle FSM and all Service Health FSM state histories."""
    return sim_service.get_fsm_status(experiment_id)

@router.get("/timeline-scrub", response_model=TimelineScrubResponse)
def get_timeline_scrub(incident_id: Optional[str] = Query(None, description="Optional incident identifier")):
    """Returns time-indexed slices from T-30s to T+90s for second-by-second timeline scrubbing."""
    return sim_service.get_timeline_scrub(incident_id)

@router.get("/experiments")
def list_experiment_fsms() -> Dict[str, Any]:
    """Returns all tracked experiment IDs, active statuses, and states."""
    active_id = sim_service.active_experiment_id
    experiments = []
    for exp_id, fsm in sim_service.experiment_fsms.items():
        experiments.append({
            "experiment_id": exp_id,
            "current_state": fsm.current_state.value,
            "transitions_count": len(fsm.history),
            "is_active": (exp_id == active_id)
        })
    return {
        "active_experiment_id": active_id,
        "total_experiments": len(experiments),
        "experiments": experiments
    }
