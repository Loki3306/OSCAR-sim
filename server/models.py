from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- System & Topology Models ---
class ServiceHealth(BaseModel):
    name: str
    status: str  # healthy, degraded, unhealthy, offline
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    error_rate: float = 0.0
    latency_ms: float = 0.0
    container_id: Optional[str] = None

class TopologyNode(BaseModel):
    id: str
    label: str
    type: str  # ingress, service, database, cache, client
    status: str
    metrics: Dict[str, float] = {}
    is_injected_target: bool = False
    is_observed_abnormal: bool = False
    is_algorithm_inferred: bool = False
    is_ground_truth_target: bool = False
    fsm_state: str = "HEALTHY"

class TopologyEdge(BaseModel):
    source: str
    target: str
    protocol: str = "HTTP"
    active_qps: float = 0.0
    is_impacted: bool = False
    is_request_path: bool = True
    is_inferred_causal: bool = False
    is_expected_propagation: bool = False
    latency_ms: float = 0.0
    error_rate: float = 0.0

class TopologyResponse(BaseModel):
    nodes: List[TopologyNode]
    edges: List[TopologyEdge]
    system_status: str
    mode: str  # "LIVE_SIM" or "REPLAY_DEMO"
    experiment_id: Optional[str] = None
    timeline_offset_sec: Optional[int] = None

class SubsystemStatus(BaseModel):
    name: str
    status: str  # operational, degraded, offline, replayed
    detail: str
    is_live: bool = False

class SystemHealthMatrix(BaseModel):
    app_server: SubsystemStatus
    docker_engine: SubsystemStatus
    simulation_services: SubsystemStatus
    telemetry_backend: SubsystemStatus
    persistence_store: SubsystemStatus
    rca_workers: SubsystemStatus
    operating_mode: str  # "LIVE_SIM" or "REPLAY_DEMO"
    services_count: int
    healthy_count: int
    unhealthy_count: int
    active_faults_count: int
    open_incidents_count: int
    timestamp: str

class SystemHealthResponse(BaseModel):
    status: str
    docker_available: bool
    prometheus_available: bool
    app_api_available: bool
    mode: str
    services: List[ServiceHealth]
    active_incidents_count: int
    timestamp: str
    health_matrix: Optional[SystemHealthMatrix] = None

# --- Metrics Models ---
class MetricDataPoint(BaseModel):
    timestamp: float
    value: float

class MetricSeries(BaseModel):
    metric_name: str
    service: str
    values: List[MetricDataPoint]
    unit: str

class MetricsQueryResponse(BaseModel):
    series: List[MetricSeries]
    time_range_start: str
    time_range_end: str
    source: str  # "Prometheus" or "ReplayCache"

# --- Fault Models ---
class FaultTriggerRequest(BaseModel):
    fault_type: str  # cpu_stress, memory_spike, network_delay, packet_loss, container_pause, container_kill
    target_service: str  # postgres, redis, api, nginx
    duration_seconds: int = Field(ge=5, le=300, default=30)
    intensity: Optional[float] = Field(ge=1.0, le=100.0, default=80.0)

class FaultExecutionStatus(BaseModel):
    fault_id: str
    fault_type: str
    target_service: str
    status: str  # PENDING, RUNNING, COMPLETED, STOPPED, FAILED
    started_at: str
    duration_seconds: int
    message: str
    incident_id: Optional[str] = None

# --- Incident & Timeline Models ---
class TimelineEvent(BaseModel):
    timestamp: str
    event_type: str  # fault_injected, metric_anomaly, alert, rca_run, recovery
    service: str
    description: str
    severity: str  # info, warning, critical

class IncidentRecord(BaseModel):
    incident_id: str
    title: str
    target_service: str
    fault_type: str
    status: str  # active, investigating, resolved
    created_at: str
    resolved_at: Optional[str] = None
    ground_truth: Optional[str] = None
    events: List[TimelineEvent] = []
    source: str  # live_sim, recorded_replay, benchmark

# --- RCA Models ---
class RCACandidate(BaseModel):
    rank: int
    service: str
    score: float
    suspected_indicator: str
    evidence: str
    score_breakdown: Optional[Dict[str, float]] = None

class RCADiagnosisRequest(BaseModel):
    incident_id: Optional[str] = None
    case_id: Optional[str] = None
    algorithms: List[str] = ["OSCAR-CTRCL (Proposed)", "RCD", "BARO"]

class SingleModelResult(BaseModel):
    algorithm: str
    version: str
    runtime_sec: float
    ranked_candidates: List[RCACandidate]
    top_1_prediction: str
    status: str  # success, error
    error_message: Optional[str] = None

class RCADiagnosisResponse(BaseModel):
    incident_or_case_id: str
    ground_truth_root_cause: Optional[str] = None
    ground_truth_service: Optional[str] = None
    is_ground_truth_revealed: bool = False
    results: Dict[str, SingleModelResult]
    candidate_set: List[str]

# --- Benchmark Models ---
class BenchmarkCaseSummary(BaseModel):
    case_id: str
    system: str
    suite: str
    fault: str
    root_cause_service: str
    num_metrics: int
    duration_sec: float
    has_logs: bool
    has_traces: bool

class BenchmarkFilterResponse(BaseModel):
    total_cases: int
    suites: List[str]
    systems: List[str]
    fault_types: List[str]
    cases: List[BenchmarkCaseSummary]

class BenchmarkCaseDetail(BaseModel):
    case_id: str
    system: str
    suite: str
    fault: str
    root_cause_service: str
    injection_timestamp: float
    duration_sec: float
    services: List[str]
    metric_sample: Dict[str, List[float]]
    time_series_timestamps: List[float]
 
# --- FSM & Timeline Scrub Models ---
class StateTransitionModel(BaseModel):
    timestamp: str
    from_state: str
    to_state: str
    trigger_event: str
    evidence: Dict[str, Any] = {}

class ServiceFSMModel(BaseModel):
    service_name: str
    current_state: str
    history: List[StateTransitionModel] = []

class FSMStatusResponse(BaseModel):
    experiment_id: str
    experiment_state: str
    experiment_history: List[StateTransitionModel] = []
    service_states: Dict[str, ServiceFSMModel] = {}

class TimelineSlice(BaseModel):
    offset_seconds: int
    timestamp: str
    experiment_state: str
    nodes: List[TopologyNode]
    edges: List[TopologyEdge]
    system_health_status: str

class TimelineScrubResponse(BaseModel):
    incident_id: str
    total_duration_seconds: int
    current_offset_seconds: int
    slices: List[TimelineSlice]
