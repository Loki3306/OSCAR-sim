import {
  SystemStatus,
  TopologyData,
  MetricQueryResponse,
  FaultRecord,
  IncidentRecord,
  RCADiagnosisResponse,
  BenchmarkCaseSummary,
  BenchmarkCaseDetail,
  ResearchSummary,
  FSMStatusResponse,
  TimelineScrubResponse,
  EvaluationReportData,
  ScenarioTraceData,
  RichIncidentReport
} from '../types';

const BASE_URL = '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, options);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error ${res.status}: ${errorText || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // System & Health
  async getSystemStatus(): Promise<SystemStatus> {
    return fetchJson<SystemStatus>('/api/system/status');
  },

  async startSimulation(): Promise<any> {
    return fetchJson<any>('/api/system/simulate/start', { method: 'POST' });
  },

  async stopSimulation(): Promise<any> {
    return fetchJson<any>('/api/system/simulate/stop', { method: 'POST' });
  },

  // Topology
  async getTopology(): Promise<TopologyData> {
    return fetchJson<TopologyData>('/api/system/topology');
  },

  // Metrics
  async queryMetrics(params?: {
    services?: string[];
    metrics?: string[];
    start_time?: number;
    end_time?: number;
  }): Promise<MetricQueryResponse> {
    const query = new URLSearchParams();
    if (params?.services) params.services.forEach(s => query.append('services', s));
    if (params?.metrics) params.metrics.forEach(m => query.append('metrics', m));
    if (params?.start_time) query.append('start_time', params.start_time.toString());
    if (params?.end_time) query.append('end_time', params.end_time.toString());
    return fetchJson<MetricQueryResponse>(`/api/metrics/query?${query.toString()}`);
  },

  // Faults
  async getFaultScenarios(): Promise<{ scenarios: any[]; total: number }> {
    return fetchJson('/api/faults/scenarios');
  },

  async getActiveFaults(): Promise<FaultRecord[]> {
    return fetchJson<FaultRecord[]>('/api/faults/active');
  },

  async getFaultHistory(): Promise<FaultRecord[]> {
    return fetchJson<FaultRecord[]>('/api/faults/history');
  },

  async injectFault(data: {
    fault_type: string;
    target_service: string;
    intensity: number;
    duration_seconds: number;
    scenario_id?: string;
    parameters?: Record<string, any>;
  }): Promise<FaultRecord> {
    return fetchJson<FaultRecord>('/api/faults/inject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async stopFault(faultId: string): Promise<any> {
    return fetchJson<any>(`/api/faults/${faultId}/stop`, { method: 'POST' });
  },

  // Incidents
  async getIncidents(): Promise<IncidentRecord[]> {
    return fetchJson<IncidentRecord[]>('/api/incidents');
  },

  async getIncident(incidentId: string): Promise<IncidentRecord> {
    return fetchJson<IncidentRecord>(`/api/incidents/${incidentId}`);
  },

  async createIncident(data: {
    title: string;
    severity: string;
    target_service?: string;
    fault_type?: string;
  }): Promise<IncidentRecord> {
    return fetchJson<IncidentRecord>('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // RCA
  async getAlgorithms(): Promise<{ algorithms: Array<{ id: string; name: string; version: string; description: string; eligible_modalities: string[] }> }> {
    return fetchJson('/api/rca/algorithms');
  },

  async runDiagnosis(data: {
    incident_id?: string;
    case_id?: string;
    algorithms: string[];
  }): Promise<RCADiagnosisResponse> {
    return fetchJson<RCADiagnosisResponse>('/api/rca/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async evaluateDiagnosis(data: {
    incident_id?: string;
    case_id?: string;
    results: any;
  }): Promise<EvaluationReportData> {
    return fetchJson<EvaluationReportData>('/api/rca/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // FSM & Timeline Scrubber
  async getFSMStatus(experimentId?: string): Promise<FSMStatusResponse> {
    const query = experimentId ? `?experiment_id=${encodeURIComponent(experimentId)}` : '';
    return fetchJson<FSMStatusResponse>(`/api/fsm/status${query}`);
  },

  async getTimelineScrub(incidentId?: string): Promise<TimelineScrubResponse> {
    const query = incidentId ? `?incident_id=${encodeURIComponent(incidentId)}` : '';
    return fetchJson<TimelineScrubResponse>(`/api/fsm/timeline-scrub${query}`);
  },

  // Benchmark
  async getBenchmarkCases(params?: {
    suite?: string;
    system?: string;
    fault?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total_matched: number; limit: number; offset: number; cases: BenchmarkCaseSummary[] }> {
    const query = new URLSearchParams();
    if (params?.suite) query.append('suite', params.suite);
    if (params?.system) query.append('system', params.system);
    if (params?.fault) query.append('fault', params.fault);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    return fetchJson(`/api/benchmark/cases?${query.toString()}`);
  },

  async getBenchmarkCaseDetail(caseId: string): Promise<BenchmarkCaseDetail> {
    return fetchJson<BenchmarkCaseDetail>(`/api/benchmark/cases/${caseId}`);
  },

  // Research
  async getResearchSummary(): Promise<ResearchSummary> {
    return fetchJson<ResearchSummary>('/api/research/summary');
  },

  async getStatisticalSignificance(): Promise<any> {
    return fetchJson<any>('/api/research/statistical_significance');
  },

  async getFigures(): Promise<{ figures: Array<{ id: string; filename: string; title: string; description: string; url: string }> }> {
    return fetchJson('/api/research/figures');
  },

  // Reports
  async getReport(reportType: 'incident' | 'comparison' | 'benchmark_audit', format: 'markdown' | 'html', incidentId?: string, caseId?: string): Promise<string> {
    const query = new URLSearchParams({ report_type: reportType, format });
    if (incidentId) query.append('incident_id', incidentId);
    if (caseId) query.append('case_id', caseId);
    const res = await fetch(`/api/reports/generate?${query.toString()}`);
    return res.text();
  },

  async getIncidentReportDetail(incidentId?: string, scenarioId?: string): Promise<RichIncidentReport> {
    const query = new URLSearchParams();
    if (incidentId) query.append('incident_id', incidentId);
    if (scenarioId) query.append('scenario_id', scenarioId);
    return fetchJson<RichIncidentReport>(`/api/reports/incident-detail?${query.toString()}`);
  },

  // Propagation Trace Laboratory
  async getPropagationTrace(scenarioId: string = 'slow_database', target?: string): Promise<ScenarioTraceData> {
    const query = new URLSearchParams({ scenario_id: scenarioId });
    if (target) query.append('target', target);
    return fetchJson<ScenarioTraceData>(`/api/propagation/trace?${query.toString()}`);
  }
};
