import React, { useState, useEffect } from 'react';
import { Database, Search, Filter, Play, Eye, EyeOff, Layers, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { BenchmarkCaseSummary, BenchmarkCaseDetail } from '../types';

export const BenchmarkExplorerView: React.FC = () => {
  const [cases, setCases] = useState<BenchmarkCaseSummary[]>([]);
  const [totalMatched, setTotalMatched] = useState(0);
  const [suiteFilter, setSuiteFilter] = useState('');
  const [systemFilter, setSystemFilter] = useState('');
  const [faultFilter, setFaultFilter] = useState('');
  const [selectedCase, setSelectedCase] = useState<BenchmarkCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGroundTruth, setShowGroundTruth] = useState(false);

  useEffect(() => {
    loadCases();
  }, [suiteFilter, systemFilter, faultFilter]);

  const loadCases = async () => {
    try {
      setLoading(true);
      const res = await api.getBenchmarkCases({
        suite: suiteFilter || undefined,
        system: systemFilter || undefined,
        fault: faultFilter || undefined,
        limit: 50
      });
      setCases(res.cases);
      setTotalMatched(res.total_matched);
    } catch (err) {
      console.error('Failed to load benchmark cases', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectCase = async (caseId: string) => {
    try {
      const detail = await api.getBenchmarkCaseDetail(caseId);
      setSelectedCase(detail);
    } catch (err) {
      console.error('Failed to inspect benchmark case', err);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedCase ? '1fr 420px' : '1fr', gap: 20 }}>
      {/* Benchmark Case Catalog */}
      <div className="panel-card">
        <div className="panel-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={16} color="var(--accent-cyan)" />
            <span>RCAEval Official Benchmark Cases ({totalMatched} indexed)</span>
          </div>
          <button
            className="action-btn"
            onClick={() => setShowGroundTruth(!showGroundTruth)}
          >
            {showGroundTruth ? <EyeOff size={13} /> : <Eye size={13} />}
            {showGroundTruth ? 'Hide Ground Truth' : 'Reveal Ground Truth'}
          </button>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Dataset Suite</label>
            <select
              style={{ width: '100%' }}
              value={suiteFilter}
              onChange={e => setSuiteFilter(e.target.value)}
            >
              <option value="">All Suites (RE1, RE2, RE3)</option>
              <option value="RE1">RE1 (375 Metric-Only Cases)</option>
              <option value="RE2">RE2 (270 Multimodal Cases)</option>
              <option value="RE3">RE3 (90 Code Fault Cases)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Microservice System</label>
            <select
              style={{ width: '100%' }}
              value={systemFilter}
              onChange={e => setSystemFilter(e.target.value)}
            >
              <option value="">All Systems</option>
              <option value="OnlineBoutique">Online Boutique (11 Services)</option>
              <option value="SockShop">Sock Shop (8 Services)</option>
              <option value="TrainTicket">Train Ticket (40+ Services)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Fault Category</label>
            <select
              style={{ width: '100%' }}
              value={faultFilter}
              onChange={e => setFaultFilter(e.target.value)}
            >
              <option value="">All Fault Classes</option>
              <option value="cpu">CPU Stress / Saturation</option>
              <option value="mem">Memory Leak / Pressure</option>
              <option value="delay">Network Transit Delay</option>
              <option value="loss">Packet Loss</option>
            </select>
          </div>
        </div>

        {/* Case List Table */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Filtering benchmark cases...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Case Identifier</th>
                <th>Suite</th>
                <th>System</th>
                <th>Fault</th>
                {showGroundTruth && <th>Ground Truth Service</th>}
                <th>Modalities</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cases.map(c => (
                <tr key={c.case_id}>
                  <td className="font-mono" style={{ fontSize: 11 }}>{c.case_id}</td>
                  <td><span className="badge badge-indigo">{c.suite}</span></td>
                  <td><strong>{c.system_name}</strong></td>
                  <td><span className="badge badge-rose">{c.fault}</span></td>
                  {showGroundTruth && (
                    <td>
                      <code style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                        {c.root_cause_service}
                      </code>
                    </td>
                  )}
                  <td>
                    <span className="badge badge-cyan" style={{ marginRight: 4 }}>Metrics</span>
                    {c.has_logs && <span className="badge badge-indigo" style={{ marginRight: 4 }}>Logs</span>}
                    {c.has_traces && <span className="badge badge-amber">Traces</span>}
                  </td>
                  <td>
                    <button
                      className="action-btn"
                      style={{ padding: '4px 8px', fontSize: 11 }}
                      onClick={() => handleInspectCase(c.case_id)}
                    >
                      Inspect Case
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Case Details Drawer */}
      {selectedCase && (
        <div className="panel-card" style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
          <div className="panel-title">
            <span>Case Telemetry & Graph</span>
            <button className="action-btn" onClick={() => setSelectedCase(null)}>Close</button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 className="font-mono" style={{ fontSize: 14, color: 'var(--text-main)', fontWeight: 700 }}>
              {selectedCase.summary.case_id}
            </h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              System: <strong>{selectedCase.summary.system_name}</strong> | Fault: <strong>{selectedCase.summary.fault}</strong>
            </div>
          </div>

          <div className="status-chip" style={{ marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Injection Timestamp:</span>
            <span className="font-mono font-bold">T = {selectedCase.summary.inject_time}s</span>
          </div>

          <div className="status-chip" style={{ marginBottom: 16 }}>
            <span style={{ color: 'var(--text-muted)' }}>Metrics Tracked:</span>
            <span className="font-mono font-bold">{selectedCase.summary.metrics_count} columns</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
              Eligible Baseline Algorithms
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedCase.eligible_algorithms.map(alg => (
                <span key={alg} className="badge badge-indigo">{alg}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
              Tracked Microservices ({selectedCase.services.length})
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedCase.services.map(s => (
                <span
                  key={s}
                  className={`badge ${showGroundTruth && s === selectedCase.summary.root_cause_service ? 'badge-green' : 'badge-cyan'}`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
