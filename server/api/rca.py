from fastapi import APIRouter
from typing import List, Dict, Any

from server.models import RCADiagnosisRequest, RCADiagnosisResponse
from server.services.rca_service import rca_service

router = APIRouter(prefix="/api/rca", tags=["RCA Workbench & Algorithms"])

@router.get("/algorithms")
def list_algorithms():
    """Returns available algorithms, versions, descriptions, and required inputs."""
    algs = []
    for name, (model, ver) in rca_service.models.items():
        algs.append({
            "name": name,
            "version": ver,
            "is_proposed": bool("OSCAR" in name),
            "paradigm": "Causal-Temporal & Resource Dominance" if "OSCAR" in name else ("Non-parametric Independence" if "RCD" in name else "Kurtosis Anomaly Filter"),
            "required_modalities": ["metrics", "topology"] if ("CIRCA" in name or "OSCAR" in name or "Micro" in name or "Diag" in name) else ["metrics"]
        })
    return {"algorithms": algs}

@router.post("/diagnose", response_model=RCADiagnosisResponse)
def run_diagnosis(req: RCADiagnosisRequest):
    """Executes selected algorithms against the chosen incident or benchmark case."""
    return rca_service.diagnose(req)

@router.post("/evaluate")
def evaluate_diagnosis(req: Dict[str, Any]):
    """Evaluates algorithm candidate ranking against isolated ground truth strictly post-inference."""
    incident_id = req.get("incident_id") or req.get("case_id") or "sim_live_incident"
    results = req.get("results", {})
    return rca_service.evaluate_post_inference(incident_id, results)
