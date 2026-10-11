from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from server.models import BenchmarkFilterResponse, BenchmarkCaseDetail
from server.services.benchmark_service import benchmark_service

router = APIRouter(prefix="/api/benchmark", tags=["Benchmark Explorer"])

@router.get("/cases", response_model=BenchmarkFilterResponse)
def get_benchmark_cases(
    suite: Optional[str] = Query(None),
    system: Optional[str] = Query(None),
    fault: Optional[str] = Query(None),
    limit: int = Query(50)
):
    """Browses the 735 official RCAEval cases with filtering by suite, system, and fault type."""
    return benchmark_service.get_filter_summary(suite=suite, system=system, fault=fault, limit=limit)

@router.get("/case/{case_id}", response_model=BenchmarkCaseDetail)
def get_benchmark_case_detail(case_id: str):
    """Loads a single benchmark incident's metadata and downsampled telemetry time series."""
    try:
        return benchmark_service.get_case_detail(case_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Case {case_id} could not be loaded: {str(e)}")
