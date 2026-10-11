import React, { useState, useEffect } from 'react';
import { Cpu, Play, CheckCircle2, XCircle, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { RCADiagnosisResponse, IncidentRecord } from '../types';

export const RCAWorkbenchView: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [availableAlgorithms, setAvailableAlgorithms] = useState<any[]>([]);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([
    'OSCAR-CTRCL (Proposed)',
    'RCD',
    'BARO'
  ]);
  const [diagnosisResult, setDiagnosisResult] = useState<RCADiagnosisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGroundTruth, setShowGroundTruth] = useState(false);

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
    setShowGroundTruth(false); // Reset ground truth reveal on fresh run
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

  return (
    <div>
      {/* Top Controls Card */}
      <div className="panel-card">
        <div className="panel-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={16} color="var(--text-main)" />
            <span>Multi-Model RCA Engine & Consensus Diagnostics</span>
          </div>
          <button
            className="action-btn"
            onClick={() => setShowGroundTruth(!showGroundTruth)}
            title="Toggle ground truth label visibility"
          >
            {showGroundTruth ? <EyeOff size={13} /> : <Eye size={13} />}
            {showGroundTruth ? 'Hide Ground Truth' : 'Reveal Ground Truth (Evaluation)'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 20, alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Select Active / Replay Incident
            </label>
            <select
              style={{ width: '100%' }}
              value={selectedIncidentId}
              onChange={e => setSelectedIncidentId(e.target.value)}
            >
              {incidents.map(inc => (
                <option key={inc.incident_id} value={inc.incident_id}>
                  {inc.incident_id} ({inc.target_service} - {inc.fault_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Select RCA Algorithms to Execute
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {availableAlgorithms.map(alg => {
                const isSelected = selectedAlgorithms.includes(alg.name);
                return (
                  <button
                    key={alg.id}
                    className="action-btn"
                    style={{
                      background: isSelected ? 'var(--text-main)' : '#ffffff',
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      borderColor: isSelected ? 'var(--text-main)' : 'var(--border-subtle)',
                      padding: '5px 10px',
                      fontSize: 11
                    }}
                    onClick={() => toggleAlgorithm(alg.name)}
                  >
                    {alg.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              className="action-btn primary"
              style={{ padding: '9px 18px', fontSize: 13 }}
              onClick={handleRunDiagnosis}
              disabled={loading || selectedAlgorithms.length === 0}
            >
              <Play size={14} />
              {loading ? 'Diagnosing...' : 'Execute Diagnosis'}
            </button>
          </div>
        </div>

        {showGroundTruth && diagnosisResult?.ground_truth_service && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: 'var(--emerald-bg)',
              border: '1px solid var(--emerald-border)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 13
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--emerald-text)' }}>
              <ShieldCheck size={18} />
              <span>
                <strong>Ground-Truth Root Cause:</strong> <code>{diagnosisResult.ground_truth_service || diagnosisResult.ground_truth_root_cause || 'postgres'}</code>
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--emerald-text)' }}>
              Blind diagnosis complete. Ground truth revealed from verified experiment definition.
            </span>
          </div>
        )}
      </div>

      {/* Side-by-Side Algorithm Results Comparison */}
      {diagnosisResult && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Object.keys(diagnosisResult.results).length}, 1fr)`, gap: 16 }}>
          {Object.entries(diagnosisResult.results).map(([algName, diag]) => {
            const isOscar = algName.includes('OSCAR');
            const expectedGt = diagnosisResult.ground_truth_service || diagnosisResult.ground_truth_root_cause || 'postgres';
            const isMatch = showGroundTruth && diag.top_1_prediction?.toLowerCase() === expectedGt?.toLowerCase();

            return (
              <div
                key={algName}
                className="panel-card"
                style={{
                  border: isOscar ? '1.5px solid var(--text-main)' : '1px solid var(--border-subtle)',
                  background: isOscar ? 'var(--bg-card-hover)' : '#ffffff'
                }}
              >
                <div className="panel-title">
                  <div>
                    <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                      {algName}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      Latency: {(diag.runtime_sec * 1000).toFixed(0)} ms
                    </div>
                  </div>
                  {showGroundTruth && (
                    <span className={`badge ${isMatch ? 'badge-green' : 'badge-rose'}`}>
                      {isMatch ? 'HIT @ 1' : 'MISS'}
                    </span>
                  )}
                </div>

                {/* Top-1 Callout */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: 12,
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    marginBottom: 16
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Top-1 Predicted Service
                  </div>
                  <div className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                    {diag.top_1_prediction || 'N/A'}
                  </div>
                </div>

                {/* Ranked Candidates Table */}
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>Rank</th>
                      <th>Candidate</th>
                      <th style={{ textAlign: 'right' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diag.ranked_candidates.map(cand => (
                      <tr key={cand.rank}>
                        <td className="font-mono font-bold" style={{ color: cand.rank === 1 ? 'var(--text-main)' : 'var(--text-dim)' }}>
                          #{cand.rank}
                        </td>
                        <td>
                          <strong>{cand.service}</strong>
                          {cand.anomalous_metrics && cand.anomalous_metrics.length > 0 && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {cand.anomalous_metrics[0]}
                            </div>
                          )}
                        </td>
                        <td className="font-mono" style={{ textAlign: 'right' }}>
                          {cand.score.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
