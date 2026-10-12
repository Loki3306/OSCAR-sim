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
