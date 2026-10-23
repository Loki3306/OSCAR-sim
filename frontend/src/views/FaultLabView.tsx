import React, { useState, useEffect } from 'react';
import {
  Flame,
  Play,
  Square,
  History,
  AlertTriangle,
  Layers,
  Activity,
  Network,
  Cpu,
  Database,
  Radio,
  Zap,
  Repeat,
  Inbox
} from 'lucide-react';
import { api } from '../services/api';
import { FaultRecord, SystemStatus } from '../types';

interface ScenarioMeta {
  id: string;
  name: string;
  category: 'resource' | 'network' | 'application' | 'composite';
  desc: string;
  defaultTarget: string;
  allowedTargets: string[];
  expectedChain: string[];
  effects: string[];
}

interface FaultLabViewProps {
  onNavigate?: (view: any, context?: any) => void;
}

export const FaultLabView: React.FC<FaultLabViewProps> = ({ onNavigate }) => {
  const [targetService, setTargetService] = useState('postgres');
  const [selectedScenarioId, setSelectedScenarioId] = useState('slow_database');
  const [duration, setDuration] = useState(60);
  const [intensity, setIntensity] = useState(85);

  // Specific custom parameter states
  const [queryDelayMs, setQueryDelayMs] = useState(300);
  const [netDelayMs, setNetDelayMs] = useState(250);
  const [netJitterMs, setNetJitterMs] = useState(30);
  const [packetLossRate, setPacketLossRate] = useState(20);
  const [trafficMultiplier, setTrafficMultiplier] = useState(4);
  const [retryMultiplier, setRetryMultiplier] = useState(4);
  const [queueArrivalQps, setQueueArrivalQps] = useState(30);

  const [activeFaults, setActiveFaults] = useState<FaultRecord[]>([]);
  const [faultHistory, setFaultHistory] = useState<FaultRecord[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Guided Transition State
  const [guidedRedirect, setGuidedRedirect] = useState<{
    incidentId: string;
    scenarioId: string;
    targetService: string;
    countdown: number;
  } | null>(null);

  useEffect(() => {
    let timer: any = null;
    if (guidedRedirect) {
      if (guidedRedirect.countdown > 0) {
        timer = setInterval(() => {
          setGuidedRedirect(prev => (prev ? { ...prev, countdown: prev.countdown - 1 } : null));
        }, 1000);
      } else if (guidedRedirect.countdown === 0) {
        const ctx = {
          incidentId: guidedRedirect.incidentId,
          scenarioId: guidedRedirect.scenarioId,
          targetService: guidedRedirect.targetService,
          stage: 'propagating',
          autoAdvance: true
        };
        setGuidedRedirect(null);
        if (onNavigate) {
          onNavigate('fault_trace', ctx);
        }
      }
    }
    return () => clearInterval(timer);
  }, [guidedRedirect, onNavigate]);

  const allServices = [
    'postgres',
    'redis',
    'api',
    'nginx',
    'order-service',
    'catalog-service',
    'auth-service',
    'payment-service',
    'notification-service',
    'queue',
    'client'
  ];

  const scenarios: ScenarioMeta[] = [
    {
      id: 'slow_database',
      name: 'Slow Database Query Cascade',
      category: 'application',
      desc: 'Injects query stall on PostgreSQL, exhausting caller connection pools and inducing gateway timeouts.',
      defaultTarget: 'postgres',
      allowedTargets: ['postgres'],
      expectedChain: ['postgres', 'order-service', 'catalog-service', 'api', 'nginx'],
      effects: ['Active connections maxed', 'Caller wait queue > 200ms', 'API latency 240ms', '504 Gateway Timeouts']
    },
    {
      id: 'cpu_saturation',
      name: 'CPU Saturation (stress-ng)',
      category: 'resource',
      desc: 'Saturates worker CPU cores with heavy matrix loops, causing thread starvation and context switching.',
      defaultTarget: 'order-service',
      allowedTargets: ['order-service', 'catalog-service', 'auth-service', 'api', 'postgres'],
      expectedChain: ['order-service', 'api', 'nginx'],
      effects: ['CPU utilization > 85%', 'Thread queueing', 'Downstream latency increase']
    },
    {
      id: 'memory_pressure',
      name: 'Memory Pressure & RSS Leak',
      category: 'resource',
      desc: 'Rapidly claims RSS memory pages, triggering garbage collection thrashing and cgroup eviction.',
      defaultTarget: 'catalog-service',
      allowedTargets: ['catalog-service', 'api', 'auth-service', 'order-service'],
      expectedChain: ['catalog-service', 'api', 'nginx'],
      effects: ['Memory working set spike', 'GC stop-the-world pauses', '504 Gateway timeouts']
    },
    {
      id: 'network_latency',
      name: 'Network Latency & Jitter',
      category: 'network',
      desc: 'Injects transit latency and packet jitter across service boundaries via synthetic netem delay.',
      defaultTarget: 'payment-service',
      allowedTargets: ['payment-service', 'postgres', 'redis', 'order-service'],
      expectedChain: ['payment-service', 'order-service', 'api', 'nginx'],
      effects: ['Trace span latency spikes', 'Caller socket timeout', 'Cascading queueing']
    },
    {
      id: 'packet_loss',
      name: 'Packet Loss & Corruption',
      category: 'network',
      desc: 'Drops configured percentage of TCP packets, inducing retransmission storms and connection resets.',
      defaultTarget: 'payment-service',
      allowedTargets: ['payment-service', 'catalog-service', 'order-service'],
      expectedChain: ['payment-service', 'order-service', 'api'],
      effects: ['TCP retransmission rate surge', '502 Bad Gateway', 'Throughput degradation']
    },
    {
      id: 'service_crash',
      name: 'Service Crash / Downtime',
      category: 'application',
      desc: 'Sends SIGSTOP or simulates process failure, triggering immediate connection refusal on callers.',
      defaultTarget: 'auth-service',
      allowedTargets: ['auth-service', 'payment-service', 'notification-service', 'redis'],
      expectedChain: ['auth-service', 'api', 'nginx'],
      effects: ['100% error rate on target', 'Immediate 503 Service Unavailable', 'Caller circuit trip']
    },
    {
      id: 'cache_failure',
      name: 'Cache Eviction Storm & Miss Spike',
      category: 'application',
      desc: 'Evicts Redis cache keys, forcing 100% of read requests to fall back directly to PostgreSQL.',
      defaultTarget: 'redis',
      allowedTargets: ['redis'],
      expectedChain: ['redis', 'catalog-service', 'postgres'],
      effects: ['100% Redis cache misses', 'PostgreSQL QPS doubles', 'Catalog latency increases']
    },
    {
      id: 'traffic_spike',
      name: 'Ingress Traffic Spike & Surge',
      category: 'composite',
      desc: 'Surges workload generator traffic by up to 10x, saturating ingress gateway worker threads.',
      defaultTarget: 'nginx',
      allowedTargets: ['nginx', 'api'],
      expectedChain: ['nginx', 'api', 'auth-service', 'catalog-service', 'order-service'],
      effects: ['Ingress QPS surge', 'Nginx CPU spike', '429 Rate Limited / 503 Overload']
    },
    {
      id: 'retry_storm',
      name: 'Retry Storm Amplification',
      category: 'composite',
      desc: 'Induces intermittent dependency failure with aggressive retries, amplifying request volume 4x.',
      defaultTarget: 'payment-service',
      allowedTargets: ['payment-service', 'order-service'],
      expectedChain: ['payment-service', 'order-service', 'api'],
      effects: ['Request amplification factor 4x', 'Thread pool exhaustion', 'Gateway timeout']
    },
    {
      id: 'queue_backlog',
      name: 'Queue Backpressure & Backlog',
      category: 'composite',
      desc: 'Stalls notification consumption while event publish rate continues, growing backlog buffer.',
      defaultTarget: 'queue',
      allowedTargets: ['queue'],
      expectedChain: ['queue', 'notification-service'],
      effects: ['Queue depth backlog growth', 'Processing delay > 180ms', 'Broker memory expansion']
    }
  ];

  const currentScenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];

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

  const handleSelectScenario = (scenId: string) => {
    setSelectedScenarioId(scenId);
    const scen = scenarios.find(s => s.id === scenId);
    if (scen) {
      if (!scen.allowedTargets.includes(targetService)) {
        setTargetService(scen.defaultTarget);
      }
    }
  };

  const handleTriggerFault = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setActionMessage(null);

    // Build specific parameter payload
    const customParams: Record<string, any> = { intensity };
    if (selectedScenarioId === 'slow_database') {
      customParams.query_delay_ms = queryDelayMs;
    } else if (selectedScenarioId === 'network_latency') {
      customParams.delay_ms = netDelayMs;
      customParams.jitter_ms = netJitterMs;
    } else if (selectedScenarioId === 'packet_loss') {
      customParams.loss_rate = packetLossRate;
    } else if (selectedScenarioId === 'traffic_spike') {
      customParams.rate_multiplier = trafficMultiplier;
    } else if (selectedScenarioId === 'retry_storm') {
      customParams.retry_multiplier = retryMultiplier;
    } else if (selectedScenarioId === 'queue_backlog') {
      customParams.arrival_qps = queueArrivalQps;
    }

    try {
      const res = await api.injectFault({
        target_service: targetService,
        fault_type: selectedScenarioId,
        intensity: intensity,
        duration_seconds: duration,
        scenario_id: selectedScenarioId,
        parameters: customParams
      });
      const modeLabel = systemStatus?.docker_available ? 'Live Container Mutation' : 'Replay Simulation Mode';
      setActionMessage(`${modeLabel} initiated successfully (Incident ID: ${res.incident_id})`);
      setGuidedRedirect({
        incidentId: res.incident_id || `INC-${Date.now()}`,
        scenarioId: selectedScenarioId,
        targetService: targetService,
        countdown: 3
      });
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
    <div style={{ display: 'grid', gridTemplateColumns: '460px 1fr', gap: 20 }}>
      {/* Fault Injection Configuration */}
      <div className="panel-card">
        <div className="panel-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={16} color="var(--rose-text)" />
            <span>Controlled Fault Experiment</span>
          </div>
          <span className={`badge ${systemStatus?.docker_available ? 'badge-rose' : 'badge-amber'}`}>
            {systemStatus?.docker_available ? 'LIVE CONTAINER MUTATION' : 'VERIFIED REPLAY MODE'}
          </span>
        </div>

        {!systemStatus?.docker_available && (
          <div style={{ padding: 10, background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 6, marginBottom: 14, fontSize: 11, color: 'var(--amber-text)' }}>
            <strong>Transparent Replay:</strong> Docker daemon is offline. Triggering will simulate the causal timeline, state transitions, and downstream telemetry cascade.
          </div>
        )}

        {guidedRedirect && (
          <div
            style={{
              padding: 14,
              background: '#fef3f2',
              border: '2px solid #fda29b',
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 4px 6px -1px rgba(180, 35, 24, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b42318', fontWeight: 800 }}>
                <Zap size={18} />
                <span>Fault Injected: Traveling Shockwave Initiated</span>
              </div>
              <span className="badge badge-rose">INCIDENT {guidedRedirect.incidentId}</span>
            </div>
            <div style={{ fontSize: 12, color: '#b42318', lineHeight: 1.4 }}>
              Guiding to <strong>Propagation Trace Laboratory</strong> to observe the traveling shockwave across microservices in <strong>{guidedRedirect.countdown}s</strong>...
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className="action-btn primary"
                style={{ background: '#b42318', borderColor: '#b42318', color: '#fff', fontWeight: 700, padding: '6px 14px', fontSize: 11 }}
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('fault_trace', {
                      incidentId: guidedRedirect.incidentId,
                      scenarioId: guidedRedirect.scenarioId,
                      targetService: guidedRedirect.targetService,
                      stage: 'propagating',
                      autoAdvance: true
                    });
                  }
                  setGuidedRedirect(null);
                }}
              >
                Watch Traveling Cascade Now →
              </button>
              <button
                className="action-btn"
                style={{ padding: '6px 12px', fontSize: 11 }}
                onClick={() => setGuidedRedirect(null)}
              >
                Stay on Page
              </button>
            </div>
          </div>
        )}

        {actionMessage && !guidedRedirect && (
          <div
            style={{
              padding: 12,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 12,
              color: 'var(--text-main)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div>{actionMessage}</div>
            {onNavigate && (
              <button
                className="action-btn"
                style={{
                  alignSelf: 'flex-start',
                  padding: '4px 10px',
                  fontSize: 11,
                  background: '#fef3f2',
                  borderColor: '#fda29b',
                  color: '#b42318',
                  fontWeight: 700
                }}
                onClick={() => onNavigate('fault_trace')}
              >
                Watch Traveling Cascade in Fault Trace Lab →
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Scenario Selection Dropdown */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
              Failure Scenario ({scenarios.length} Parameterized Scenarios)
            </label>
            <select
              style={{ width: '100%', padding: '7px 10px', fontSize: 12 }}
              value={selectedScenarioId}
              onChange={e => handleSelectScenario(e.target.value)}
            >
              <optgroup label="Application & Database Cascades">
                {scenarios.filter(s => s.category === 'application').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
              <optgroup label="Resource Saturation (CPU / Memory)">
                {scenarios.filter(s => s.category === 'resource').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
              <optgroup label="Network Degradation & Netem">
                {scenarios.filter(s => s.category === 'network').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
              <optgroup label="Composite & Cascading Storms">
                {scenarios.filter(s => s.category === 'composite').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            </select>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.4 }}>
              {currentScenario.desc}
            </p>
          </div>

          {/* Target Microservice */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
              Target Microservice (11-Service Topology)
            </label>
            <select
              style={{ width: '100%', padding: '7px 10px', fontSize: 12 }}
              value={targetService}
              onChange={e => setTargetService(e.target.value)}
            >
              {allServices.map(s => {
                const isAllowed = currentScenario.allowedTargets.includes(s);
                return (
                  <option key={s} value={s} disabled={!isAllowed}>
                    {s.toUpperCase()} {isAllowed ? '' : '(Not supported for this scenario)'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Scenario-Specific Parameter Controls */}
          {selectedScenarioId === 'slow_database' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Query Stall Delay:</span>
                <span className="font-mono font-bold">{queryDelayMs} ms</span>
              </div>
              <input
                type="range"
                min="50"
                max="2000"
                step="50"
                value={queryDelayMs}
                onChange={e => setQueryDelayMs(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {selectedScenarioId === 'network_latency' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Packet Delay / Jitter:</span>
                <span className="font-mono font-bold">{netDelayMs} ms (±{netJitterMs}ms)</span>
              </div>
              <input
                type="range"
                min="50"
                max="1500"
                step="25"
                value={netDelayMs}
                onChange={e => setNetDelayMs(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {selectedScenarioId === 'packet_loss' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>TCP Packet Drop Rate:</span>
                <span className="font-mono font-bold">{packetLossRate}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={packetLossRate}
                onChange={e => setPacketLossRate(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {selectedScenarioId === 'traffic_spike' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Ingress QPS Surge Multiplier:</span>
                <span className="font-mono font-bold">{trafficMultiplier}x (~{trafficMultiplier * 45} QPS)</span>
              </div>
              <input
                type="range"
                min="2"
                max="10"
                step="1"
                value={trafficMultiplier}
                onChange={e => setTrafficMultiplier(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {selectedScenarioId === 'retry_storm' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Retry Amplification:</span>
                <span className="font-mono font-bold">{retryMultiplier}x request amplification</span>
              </div>
              <input
                type="range"
                min="2"
                max="6"
                step="1"
                value={retryMultiplier}
                onChange={e => setRetryMultiplier(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {selectedScenarioId === 'queue_backlog' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Event Arrival Rate:</span>
                <span className="font-mono font-bold">{queueArrivalQps} msg/sec</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={queueArrivalQps}
                onChange={e => setQueueArrivalQps(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* Universal Workload Intensity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)' }}>Base Mutation Intensity</span>
              <span className="font-mono font-bold">{intensity}%</span>
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

          {/* Universal Duration with Safety Cap */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)' }}>Bounded Duration (Safety Limit: 300s)</span>
              <span className="font-mono font-bold">{duration} seconds</span>
            </div>
            <input
              type="range"
              min="10"
              max="300"
              step="5"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Expected Ground Truth Impact Chain Callout */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 6 }}>
              Expected Ground Truth Blast Chain (Isolated from RCA)
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
              {currentScenario.expectedChain.map((svc, i) => (
                <React.Fragment key={svc}>
                  <span
                    className={`badge ${i === 0 ? 'badge-rose' : 'badge-amber'}`}
                    style={{ fontSize: 10, fontFamily: 'monospace' }}
                  >
                    {svc}
                  </span>
                  {i < currentScenario.expectedChain.length - 1 && (
                    <span style={{ color: '#94a3b8', fontSize: 10 }}>→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Trigger Button */}
          <div style={{ marginTop: 4 }}>
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
                  <th>Scenario</th>
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
                <th>Scenario</th>
                <th>Status</th>
                <th>Outcome / Logs</th>
              </tr>
            </thead>
            <tbody>
              {(faultHistory || []).slice(0, 8).map(f => (
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
                    {f.logs?.[0] || 'Completed normally. Auto-recovered.'}
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
              You are about to execute scenario <strong>{currentScenario.name}</strong> against target microservice <strong>{targetService}</strong> for <strong>{duration}s</strong>.
              {systemStatus?.docker_available
                ? ' This will apply real container load and degrade service performance.'
                : ' This will simulate the causal cascade, update FSM lifecycles, and generate time-indexed evidence.'}
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
