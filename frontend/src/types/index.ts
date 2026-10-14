export interface SubsystemStatus {
  name: string;
  status: string;
  detail: string;
  is_live: boolean;
}

export interface SystemHealthMatrix {
  app_server: SubsystemStatus;
  docker_engine: SubsystemStatus;
  simulation_services: SubsystemStatus;
  telemetry_backend: SubsystemStatus;
  persistence_store: SubsystemStatus;
  rca_workers: SubsystemStatus;
  operating_mode: string;
  services_count: number;
  healthy_count: number;
  unhealthy_count: number;
  active_faults_count: number;
  open_incidents_count: number;
  timestamp: string;
}

export interface SystemStatus {
  status: string;
  timestamp: number;
  docker_available: boolean;
  mode: string;
  services_count: number;
  healthy_count: number;
  unhealthy_count: number;
  active_faults_count: number;
  open_incidents_count: number;
  health_matrix?: SystemHealthMatrix;
}

export interface ServiceNode {
  name: string;
  display_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'fault';
  cpu_percent?: number;
  memory_mb?: number;
  error_rate?: number;
  latency_ms?: number;
  is_root_cause?: boolean;
  is_injected_target?: boolean;
  is_observed_abnormal?: boolean;
  is_algorithm_inferred?: boolean;
  is_ground_truth_target?: boolean;
  fsm_state?: string;
}

export interface DependencyEdge {
  from_service: string;
  to_service: string;
  relationship: string;
  is_active_path?: boolean;
  active_qps?: number;
  is_impacted?: boolean;
  is_request_path?: boolean;
  is_inferred_causal?: boolean;
  is_expected_propagation?: boolean;
  latency_ms?: number;
  error_rate?: number;
}

export interface TopologyData {
  services: ServiceNode[];
  edges: DependencyEdge[];
  updated_at: number;
  nodes?: any[];
}

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface MetricSeries {
  metric_name: string;
  service: string;
  unit: string;
  points?: MetricPoint[];
  values?: MetricPoint[];
}

export interface MetricQueryResponse {
  series: MetricSeries[];
  start_time: number;
  end_time: number;
  step: number;
  source?: string;
}

export interface FaultConfig {
  fault_type: string;
  target_service: string;
  intensity: number;
  duration_seconds: number;
}

export interface FaultRecord {
  fault_id: string;
  fault_type: string;
  target_service: string;
  intensity: number;
  duration_seconds: number;
  start_time: number;
  end_time?: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'STOPPED' | 'FAILED';
  incident_id?: string;
  logs: string[];
}

export interface IncidentRecord {
  incident_id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'RESOLVED' | 'INVESTIGATING';
  created_at: number;
  detected_at?: number;
  resolved_at?: number;
  target_service?: string;
  fault_type?: string;
  ground_truth_root_cause?: string;
  symptoms: string[];
  algorithm_predictions?: Record<string, any>;
}

export interface RankedCandidate {
  rank: number;
  service: string;
  score: number;
  confidence?: number;
  supporting_evidence?: string[];
  anomalous_metrics?: string[];
  suspected_indicator?: string;
  evidence?: string;
  score_breakdown?: Record<string, number>;
}

export interface AlgorithmDiagnosis {
  algorithm_name: string;
  version?: string;
  status: string;
  runtime_sec: number;
  top_1_prediction?: string;
  top_k_predictions: string[];
  ranked_candidates: RankedCandidate[];
  error_message?: string;
}

export interface RCADiagnosisResponse {
  incident_id?: string;
  incident_or_case_id?: string;
  case_id?: string;
  evaluated_at?: number;
  results: Record<string, AlgorithmDiagnosis>;
  ground_truth_service?: string;
  ground_truth_root_cause?: string;
  hit_at_1_summary?: Record<string, boolean>;
}

export interface BenchmarkCaseSummary {
  case_id: string;
  suite: string;
  system_name: string;
  fault: string;
  root_cause_service: string;
  inject_time: number;
  metrics_count: number;
  has_logs: boolean;
  has_traces: boolean;
}

export interface BenchmarkCaseDetail {
  summary: BenchmarkCaseSummary;
  services: string[];
  edges: [string, string][];
  metric_columns: string[];
  sample_metrics?: Record<string, number[]>;
  time_points?: number[];
  eligible_algorithms: string[];
}

export interface AlgorithmMetricSummary {
  algorithm: string;
  total_cases: number;
  hit_1: number;
  hit_3: number;
  hit_5: number;
  mrr: number;
  ci_lower: number;
  ci_upper: number;
  avg_runtime_sec: number;
}

export interface ResearchSummary {
  dataset: string;
  total_cases_evaluated: number;
  algorithms: AlgorithmMetricSummary[];
  mcnemar_p_value_vs_rcd: number;
  key_findings: string[];
}

export interface StateTransitionItem {
  timestamp: string;
  from_state: string;
  to_state: string;
  trigger_event: string;
  evidence: Record<string, any>;
}

export interface ServiceFSMData {
  service_name: string;
  current_state: string;
  history: StateTransitionItem[];
}

export interface FSMStatusResponse {
  experiment_id: string;
  experiment_state: string;
  experiment_history: StateTransitionItem[];
  service_states: Record<string, ServiceFSMData>;
}

export interface TimelineSliceData {
  offset_seconds: number;
  timestamp: string;
  experiment_state: string;
  nodes: ServiceNode[];
  edges: DependencyEdge[];
  system_health_status: string;
}

export interface TimelineScrubResponse {
  incident_id: string;
  total_duration_seconds: number;
  current_offset_seconds: number;
  slices: TimelineSliceData[];
}

export interface AlgorithmEvaluationData {
  algorithm: string;
  top_1_prediction: string;
  hit_1: boolean;
  hit_3: boolean;
  hit_5: boolean;
  reciprocal_rank: number;
  ground_truth: string;
  runtime_sec: number;
}

export interface EvaluationReportData {
  experiment_id: string;
  ground_truth: {
    target_service: string;
    fault_type: string;
    expected_impact_chain: string[];
    observed_impact_chain: string[];
  };
  algorithm_evaluations: Record<string, AlgorithmEvaluationData>;
  expected_vs_observed_match: boolean;
  observed_chain: string[];
  expected_chain: string[];
  evaluated_at: string;
}

export interface PropagationHopData {
  hop_index: number;
  offset_ms: number;
  service: string;
  display_name: string;
  status: 'fault' | 'degraded' | 'healthy';
  fsm_state: string;
  role: string;
  edge?: {
    from: string;
    to: string;
    protocol: string;
    latency_jump_ms: number;
  };
  causal_mechanism: string;
  telemetry_delta: {
    latency_before_ms: number;
    latency_after_ms: number;
    cpu_delta_pct: number;
    error_rate: number;
  };
  symptoms: string[];
}

export interface ScenarioTraceData {
  scenario_id: string;
  title: string;
  target_service: string;
  total_propagation_ms: number;
  blast_chain: string[];
  unaffected_services: string[];
  hops: PropagationHopData[];
  generated_at: string;
}

export interface InvestigationFlowContext {
  incidentId: string;
  scenarioId: string;
  targetService: string;
  stage: 'propagating' | 'rca_diagnosing' | 'report_ready';
  autoAdvance: boolean;
}

export interface IncidentTelemetryProof {
  metric: string;
  service: string;
  baseline: string;
  incident_peak: string;
  delta: string;
  severity: 'critical' | 'warning' | 'info';
  threshold: string;
  breached: boolean;
}

export interface AlgorithmConsensusItem {
  algorithm: string;
  version: string;
  predicted_service: string;
  confidence_score: number;
  rank: number;
  verdict: string;
  is_match: boolean;
  runtime_ms: number;
  attribution_rationale: string;
}

export interface RichIncidentReport {
  incident_metadata: {
    incident_id: string;
    title: string;
    target_service: string;
    target_label: string;
    scenario_id: string;
    scenario_name: string;
    severity: string;
    status: string;
    created_at: string;
    resolved_at: string;
    duration_seconds: number;
    environment: string;
    impact_scope: string;
  };
  executive_summary: {
    headline: string;
    problem_description: string;
    impact_assessment: string;
    root_cause_service: string;
    root_cause_label: string;
  };
  telemetry_proofs: IncidentTelemetryProof[];
  statistical_verification: {
    anomaly_changepoint_time: string;
    z_score: number;
    p_value: number;
    test_method: string;
    confidence_level: number;
    unaffected_branch_proof: string;
  };
  propagation_summary: {
    total_propagation_ms: number;
    blast_chain: string[];
    unaffected_services: string[];
    hops: Array<{
      hop_index: number;
      offset_ms: number;
      service: string;
      display_name: string;
      role: string;
      status: string;
      causal_mechanism: string;
      telemetry_delta: Record<string, any>;
      symptoms: string[];
    }>;
  };
  algorithm_consensus: AlgorithmConsensusItem[];
  remediation_playbook: {
    immediate_mitigations: string[];
    architectural_recommendations: string[];
    runbook_links: Array<{ title: string; ref: string }>;
  };
}

