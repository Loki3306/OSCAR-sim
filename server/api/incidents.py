from fastapi import APIRouter, HTTPException
from typing import List, Optional

from server.models import IncidentRecord, TimelineEvent
from server.services.sim_service import sim_service

router = APIRouter(prefix="/api/incidents", tags=["Incident Management & Timeline"])

@router.get("", response_model=List[IncidentRecord])
def list_incidents():
    """Returns all active, recorded, and historical incidents."""
    return list(sim_service.incidents.values())

@router.get("/{incident_id}", response_model=IncidentRecord)
def get_incident(incident_id: str):
    """Returns details and timeline event stream for a specific incident."""
    if incident_id not in sim_service.incidents:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return sim_service.incidents[incident_id]

@router.get("/{incident_id}/timeline", response_model=List[TimelineEvent])
def get_incident_timeline(incident_id: str):
    """Returns chronological timeline events for correlation."""
    if incident_id not in sim_service.incidents:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return sim_service.incidents[incident_id].events
