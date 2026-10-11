import React, { useState, useEffect } from 'react';
import { Flame, Play, Square, CheckCircle2, History, AlertTriangle, Info } from 'lucide-react';
import { api } from '../services/api';
import { FaultRecord, SystemStatus } from '../types';

export const FaultLabView: React.FC = () => {
  const [targetService, setTargetService] = useState('postgres');
  const [faultType, setFaultType] = useState('cpu_stress');
  const [intensity, setIntensity] = useState(85);
  const [duration, setDuration] = useState(60);
  const [activeFaults, setActiveFaults] = useState<FaultRecord[]>([]);
  const [faultHistory, setFaultHistory] = useState<FaultRecord[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const services = ['postgres', 'redis', 'api', 'nginx'];
  const faultTypes = [
    { id: 'cpu_stress', name: 'CPU Saturation (stress-ng)', desc: 'Exhausts worker threads with matrix arithmetic' },
    { id: 'mem_leak', name: 'Memory Pressure (RSS Spike)', desc: 'Allocates heap memory to induce GC and eviction' },
    { id: 'latency_inject', name: 'Network Latency Delay', desc: 'Adds synthetic transit delay to incoming packets' },
    { id: 'service_kill', name: 'Service Unavailability', desc: 'Sends SIGSTOP or simulated pause to target' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [active, history, status] = await Promise.all([
        api.getActiveFaults(),
        api.getFaultHistory(),
        api.getSystemStatus()
      ]);
      setActiveFaults(active);
      setFaultHistory(history);
      setSystemStatus(status);
    } catch (err) {
      console.error('Failed to load fault history', err);
    }
  };

  const handleTriggerFault = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await api.injectFault({
        target_service: targetService,
        fault_type: faultType,
        intensity: intensity,
        duration_seconds: duration
      });
      const modeLabel = systemStatus?.docker_available ? 'Live Container Mutation' : 'Replay Incident Simulated';
      setActionMessage(`${modeLabel} triggered successfully (Incident ID: ${res.incident_id})`);
      await loadData();
    } catch (err: any) {
      setActionMessage(`Execution error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopFault = async (faultId: string) => {
    try {
      await api.stopFault(faultId);
      setActionMessage('Fault stopped and recovery initiated.');
      await loadData();
    } catch (err: any) {
      setActionMessage(`Stop failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 20 }}>
      {/* Fault Injection Configuration */}
      <div className="panel-card">
        <div className="panel-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={16} color="var(--rose-text)" />
            <span>Controlled Fault Experiment</span>
          </div>
          <span className={`badge ${systemStatus?.docker_available ? 'badge-rose' : 'badge-amber'}`}>
            {systemStatus?.docker_available ? 'LIVE CONTAINER MUTATION' : 'RECORDED REPLAY EXPERIMENT'}
          </span>
        </div>

        {!systemStatus?.docker_available && (
          <div style={{ padding: 10, background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 6, marginBottom: 14, fontSize: 11, color: 'var(--amber-text)' }}>
            <strong>Transparent Replay:</strong> Docker daemon is offline. Triggering will replay the verified timeline and telemetry of experiment <code>EXP-postgres_cpu_stress_001</code>.
          </div>
        )}

        {actionMessage && (
          <div
            style={{
              padding: 12,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 12,
              color: 'var(--text-main)'
            }}
          >
            {actionMessage}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Target Microservice
            </label>
            <select
              style={{ width: '100%' }}
              value={targetService}
              onChange={e => setTargetService(e.target.value)}
            >
              {services.map(s => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Fault Type
            </label>
            <select
              style={{ width: '100%' }}
              value={faultType}
              onChange={e => setFaultType(e.target.value)}
            >
              {faultTypes.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {faultTypes.find(f => f.id === faultType)?.desc}
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Load Intensity</span>
              <span className="font-mono">{intensity}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={intensity}
              onChange={e => setIntensity(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Duration (Safety Max 300s)</span>
              <span className="font-mono">{duration} seconds</span>
            </div>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginTop: 6 }}>
            <button
              className="action-btn primary"
              style={{ width: '100%', padding: '10px 0', justifyContent: 'center' }}
              onClick={() => setShowConfirmModal(true)}
              disabled={loading}
            >
              <Play size={14} /> {systemStatus?.docker_available ? 'Trigger Live Fault Injection' : 'Initiate Replay Experiment'}
            </button>
          </div>
        </div>
      </div>

      {/* Active Faults & History */}
      <div>
        <div className="panel-card" style={{ marginBottom: 20 }}>
          <div className="panel-title">
            <span>Active Running Faults</span>
            <span className="badge badge-amber">{activeFaults.length} Running</span>
          </div>

          {activeFaults.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              No active faults currently executing.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fault ID</th>
                  <th>Target</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeFaults.map(f => (
                  <tr key={f.fault_id}>
                    <td className="font-mono" style={{ fontSize: 11 }}>{f.fault_id}</td>
                    <td><strong>{f.target_service}</strong></td>
                    <td><span className="badge badge-rose">{f.fault_type}</span></td>
                    <td>{f.duration_seconds}s</td>
                    <td>
                      <button
                        className="action-btn danger"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={() => handleStopFault(f.fault_id)}
                      >
                        <Square size={10} /> Stop / Recover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel-card">
          <div className="panel-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={16} />
              <span>Experiment Audit History</span>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Target Service</th>
                <th>Fault Type</th>
                <th>Status</th>
                <th>Logs</th>
              </tr>
            </thead>
            <tbody>
              {(faultHistory || []).slice(0, 6).map(f => (
                <tr key={f.fault_id}>
                  <td className="font-mono" style={{ fontSize: 11 }}>{f.incident_id || f.fault_id}</td>
                  <td><strong>{f.target_service}</strong></td>
                  <td><span className="badge badge-indigo">{f.fault_type}</span></td>
                  <td>
                    <span className={`badge ${f.status === 'RUNNING' ? 'badge-rose' : 'badge-green'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {f.logs[0] || 'Completed normally'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--rose-text)', marginBottom: 12 }}>
              <AlertTriangle size={20} />
              <h3 style={{ fontSize: 16 }}>Confirm Fault Experiment</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
              You are about to execute <strong>{faultType}</strong> ({intensity}% intensity) against target microservice <strong>{targetService}</strong> for <strong>{duration}s</strong>.
              {systemStatus?.docker_available
                ? ' This will apply real container load and degrade service performance.'
                : ' This will replay the recorded incident and propagate telemetry changes.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="action-btn" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </button>
              <button className="action-btn primary" onClick={handleTriggerFault}>
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
