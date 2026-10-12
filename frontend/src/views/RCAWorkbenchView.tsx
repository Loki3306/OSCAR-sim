import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  Award,
  Layers,
  ChevronRight,
  GitBranch
} from 'lucide-react';
import { api } from '../services/api';
import {
  RCADiagnosisResponse,
  IncidentRecord,
  EvaluationReportData
} from '../types';

export const RCAWorkbenchView: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [availableAlgorithms, setAvailableAlgorithms] = useState<any[]>([]);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([
    'OSCAR-CTRCL (Proposed)',
    'RCD',
    'BARO',
    'CIRCA'
  ]);
  const [diagnosisResult, setDiagnosisResult] = useState<RCADiagnosisResponse | null>(null);
  const [evaluationReport, setEvaluationReport] = useState<EvaluationReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [incList, algList] = await Promise.all([
        api.getIncidents(),
        api.getAlgorithms()
      ]);
      setIncidents(incList);
      if (incList.length > 0) {
        setSelectedIncidentId(incList[0].incident_id);
      }
      setAvailableAlgorithms(algList.algorithms);
    } catch (err) {
      console.error('Failed to load initial workbench data', err);
    }
  };

  const toggleAlgorithm = (name: string) => {
    setSelectedAlgorithms(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const handleRunDiagnosis = async () => {
    if (!selectedIncidentId || selectedAlgorithms.length === 0) return;
    setLoading(true);
    setEvaluationReport(null); // Reset evaluation on fresh inference run
    try {
      const res = await api.runDiagnosis({
        incident_id: selectedIncidentId,
        algorithms: selectedAlgorithms
      });
      setDiagnosisResult(res);
    } catch (err: any) {
      alert(`Diagnosis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateGroundTruth = async () => {
    if (!diagnosisResult) return;
    setEvaluating(true);
    try {
      const report = await api.evaluateDiagnosis({
        incident_id: selectedIncidentId,
        results: diagnosisResult.results
      });
      setEvaluationReport(report);
    } catch (err: any) {
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Control Console Card */}
      <div className="panel-card" style={{ padding: 16 }}>
        <div className="panel-title" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={16} color="var(--text-main)" />
            <span style={{ fontWeight: 800, fontSize: 14 }}>
              Multi-Model RCA Engine & Causal Reasoning Laboratory
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Permitted Telemetry & Call Topology Snapshot Only (Strict Ground-Truth Isolation)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr auto', gap: 16, alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Select Experiment Incident Snapshot
            </label>
            <select
              style={{ width: '100%', padding: '8px 10px', fontSize: 12 }}
              value={selectedIncidentId}
              onChange={e => {
                setSelectedIncidentId(e.target.value);
                setDiagnosisResult(null);
                setEvaluationReport(null);
              }}
            >
              {incidents.map(inc => (
                <option key={inc.incident_id} value={inc.incident_id}>
                  {inc.incident_id} ({inc.target_service} - {inc.fault_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Select RCA Algorithms to Execute
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {availableAlgorithms.map(alg => {
                const isSelected = selectedAlgorithms.includes(alg.name);
                return (
                  <button
                    key={alg.name}
                    className="action-btn"
                    style={{
                      background: isSelected ? 'var(--text-main)' : '#ffffff',
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      borderColor: isSelected ? 'var(--text-main)' : 'var(--border-subtle)',
                      padding: '4px 8px',
                      fontSize: 11,
                      fontWeight: isSelected ? 700 : 500
                    }}
                    onClick={() => toggleAlgorithm(alg.name)}
                  >
                    {alg.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ alignSelf: 'flex-end', display: 'flex', gap: 8 }}>
            <button
              className="action-btn primary"
              style={{ padding: '8px 16px', fontSize: 12 }}
              onClick={handleRunDiagnosis}
              disabled={loading || selectedAlgorithms.length === 0}
            >
              <Play size={13} />
              {loading ? 'Running Inference...' : 'Execute Blind Diagnosis'}
            </button>

            {diagnosisResult && (
              <button
                className="action-btn"
                style={{
                  padding: '8px 14px',
                  fontSize: 12,
                  background: evaluationReport ? '#ecfdf3' : '#fffaeb',
                  borderColor: evaluationReport ? '#abefc6' : '#fedf89',
                  color: evaluationReport ? '#027a48' : '#b54708',
                  fontWeight: 700
                }}
                onClick={handleEvaluateGroundTruth}
                disabled={evaluating}
              >
                <ShieldCheck size={14} />
                {evaluating ? 'Evaluating...' : evaluationReport ? 'Evaluation Verified' : 'Evaluate Ground Truth'}
              </button>
            )}
          </div>
        </div>

        {/* Post-Inference Evaluation Callout */}
        {evaluationReport && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: '#ecfdf3',
              border: '1px solid #abefc6',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#027a48' }}>
                <ShieldCheck size={18} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  Isolated Ground-Truth Evaluation Unlocked (Post-Inference):
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: '#027a48' }}>
                  {evaluationReport.ground_truth.target_service.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#027a48', fontFamily: 'monospace' }}>
                Scenario: {evaluationReport.ground_truth.fault_type}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#027a48' }}>
              <div>
                <strong>Expected Blast Chain:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>
                  {evaluationReport.expected_chain.join(' → ')}
                </span>
              </div>
              <div>
                <strong>Observed Telemetry Chain:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>
                  {evaluationReport.observed_chain.join(' → ')}
                </span>
              </div>
              <div>
                <strong>Propagation Match:</strong>{' '}
                <span style={{ fontWeight: 800 }}>
                  {evaluationReport.expected_vs_observed_match ? '100% Verified Match' : 'Discrepancy Detected'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Algorithm Comparison Cards */}
      {diagnosisResult && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Object.keys(diagnosisResult.results).length}, 1fr)`, gap: 16 }}>
          {Object.entries(diagnosisResult.results).map(([algName, diag]) => {
            const isOscar = algName.includes('OSCAR');
            const evalData = evaluationReport?.algorithm_evaluations[algName];

            return (
              <div
                key={algName}
                className="panel-card"
                style={{
                  border: isOscar ? '2px solid var(--text-main)' : '1px solid var(--border-subtle)',
                  background: isOscar ? '#faf8f5' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 14
                }}
              >
                <div className="panel-title" style={{ marginBottom: 10 }}>
                  <div>
                    <span style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: 13 }}>
                      {algName}
                    </span>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      Runtime: {(diag.runtime_sec * 1000).toFixed(0)} ms | v{diag.version}
                    </div>
                  </div>
                  {evalData && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 800,
                        background: evalData.hit_1 ? '#ecfdf3' : '#fee4e2',
                        color: evalData.hit_1 ? '#027a48' : '#b42318',
                        border: `1px solid ${evalData.hit_1 ? '#abefc6' : '#fda29b'}`
                      }}
                    >
                      {evalData.hit_1 ? 'HIT @ 1' : 'MISS @ 1'}
                    </span>
                  )}
                </div>

                {/* Top-1 Suspect Callout */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    marginBottom: 12
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                    Top-1 Localized Suspect
                  </div>
                  <div className="font-mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>
                    {diag.top_1_prediction || 'N/A'}
                  </div>
                </div>

                {/* Ranked Candidates Table */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 35 }}>Rank</th>
                        <th>Candidate Service</th>
                        <th style={{ textAlign: 'right', width: 55 }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diag.ranked_candidates.map(cand => (
                        <tr key={cand.rank}>
                          <td className="font-mono font-bold" style={{ color: cand.rank === 1 ? 'var(--text-main)' : 'var(--text-dim)' }}>
                            #{cand.rank}
                          </td>
                          <td>
                            <strong style={{ fontSize: 12 }}>{cand.service}</strong>
                            {cand.evidence && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                {cand.evidence}
                              </div>
                            )}

                            {/* Intermediate Formula Breakdown for OSCAR-CTRCL */}
                            {cand.score_breakdown && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                {Object.entries(cand.score_breakdown).map(([k, v]) => (
                                  <span
                                    key={k}
                                    style={{
                                      fontSize: 9,
                                      fontFamily: 'monospace',
                                      background: '#f2f4f7',
                                      padding: '1px 5px',
                                      borderRadius: 3,
                                      color: '#344054'
                                    }}
                                  >
                                    {k}: {v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="font-mono font-bold" style={{ textAlign: 'right', fontSize: 11 }}>
                            {cand.score.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
