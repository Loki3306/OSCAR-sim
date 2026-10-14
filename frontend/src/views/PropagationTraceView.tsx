import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Zap,
  Flame,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Layers,
  Clock,
  Cpu,
  Radio
} from 'lucide-react';
import { api } from '../services/api';
import { ScenarioTraceData, PropagationHopData } from '../types';

export const PropagationTraceView: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('slow_database');
  const [traceData, setTraceData] = useState<ScenarioTraceData | null>(null);
  const [currentHopIndex, setCurrentHopIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // 11-Service layout coordinates organized in 6 clean columns
  const nodePositions: Record<string, { x: number; y: number }> = {
    client: { x: 75, y: 220 },
    nginx: { x: 215, y: 220 },
    api: { x: 360, y: 220 },
    'auth-service': { x: 530, y: 95 },
    'catalog-service': { x: 530, y: 220 },
    'order-service': { x: 530, y: 350 },
    redis: { x: 710, y: 80 },
    postgres: { x: 710, y: 195 },
    'payment-service': { x: 710, y: 310 },
    queue: { x: 710, y: 420 },
    'notification-service': { x: 885, y: 420 }
  };

  const baseEdges = [
    { from: 'client', to: 'nginx', protocol: 'HTTP' },
    { from: 'nginx', to: 'api', protocol: 'HTTP' },
    { from: 'api', to: 'auth-service', protocol: 'gRPC' },
    { from: 'api', to: 'catalog-service', protocol: 'HTTP' },
    { from: 'api', to: 'order-service', protocol: 'HTTP' },
    { from: 'catalog-service', to: 'redis', protocol: 'RESP' },
    { from: 'catalog-service', to: 'postgres', protocol: 'PostgreSQL' },
    { from: 'order-service', to: 'payment-service', protocol: 'HTTPS' },
    { from: 'order-service', to: 'postgres', protocol: 'PostgreSQL' },
    { from: 'order-service', to: 'queue', protocol: 'AMQP' },
    { from: 'queue', to: 'notification-service', protocol: 'AMQP' }
  ];

  const availableScenarios = [
    { id: 'slow_database', name: 'Slow Database Query Cascade (PostgreSQL Stall)' },
    { id: 'cpu_saturation', name: 'CPU Core Saturation (Order Service)' },
    { id: 'cache_failure', name: 'Redis Cache Eviction Storm & Miss Spike' },
    { id: 'network_latency', name: 'External Gateway Network Latency (Payment)' }
  ];

  useEffect(() => {
    loadTrace(selectedScenario);
  }, [selectedScenario]);

  // Animation loop for playback
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && traceData && traceData.hops.length > 0) {
      const intervalMs = Math.max(400, 1400 / playSpeed);
      timer = setInterval(() => {
        setCurrentHopIndex(prev => {
          if (prev >= traceData.hops.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, traceData, playSpeed]);

  const loadTrace = async (scenId: string) => {
    setLoading(true);
    try {
      const data = await api.getPropagationTrace(scenId);
      setTraceData(data);
      setCurrentHopIndex(0);
      setIsPlaying(false);
    } catch (err) {
      console.error('Failed to load propagation trace', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setCurrentHopIndex(0);
    setIsPlaying(true);
  };

  const activeHop = traceData && traceData.hops[currentHopIndex] ? traceData.hops[currentHopIndex] : null;

  // Set of services affected up to the current hop
  const affectedServicesUpToNow = new Set<string>();
  if (traceData) {
    for (let i = 0; i <= currentHopIndex && i < traceData.hops.length; i++) {
      affectedServicesUpToNow.add(traceData.hops[i].service);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top Banner & Scenario Selector */}
      <div className="panel-card" style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#fef3f2', padding: 6, borderRadius: 6, border: '1px solid #fda29b' }}>
              <Zap size={18} color="#b42318" />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Fault Propagation Trace Laboratory
              </h2>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Millisecond-resolution causal cascade player tracking the traveling wave of failure across microservice boundaries.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              Scenario:
            </label>
            <select
              style={{ fontSize: 12, padding: '5px 10px', minWidth: 260 }}
              value={selectedScenario}
              onChange={e => setSelectedScenario(e.target.value)}
            >
              {availableScenarios.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Propagation Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: 'calc(100vh - 215px)' }}>
        {/* Cascade Visual Canvas Panel */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 14 }}>
          {/* Wave Playback Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="action-btn"
                style={{ padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={() => setIsPlaying(!isPlaying)}
                title={isPlaying ? 'Pause Cascade Wave' : 'Play Cascade Wave'}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                <span style={{ fontWeight: 700 }}>{isPlaying ? 'PAUSE WAVE' : 'PLAY WAVE'}</span>
              </button>

              <button
                className="action-btn"
                style={{ padding: '5px 8px' }}
                onClick={() => setCurrentHopIndex(Math.max(0, currentHopIndex - 1))}
                disabled={currentHopIndex === 0}
                title="Step Backward"
              >
                <SkipBack size={13} />
              </button>

              <button
                className="action-btn"
                style={{ padding: '5px 8px' }}
                onClick={() => setCurrentHopIndex(Math.min((traceData?.hops.length || 1) - 1, currentHopIndex + 1))}
                disabled={!traceData || currentHopIndex >= traceData.hops.length - 1}
                title="Step Forward (Next Hop)"
              >
                <SkipForward size={13} />
              </button>

              <button
                className="action-btn"
                style={{ padding: '5px 8px' }}
                onClick={handleRestart}
                title="Restart Cascade from T0"
              >
                <RotateCcw size={13} />
              </button>
            </div>

            {/* Current Hop Pill & Timing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} color="#64748b" />
                <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                  CASCADE OFFSET: +{activeHop?.offset_ms ?? 0} ms
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>SPEED:</span>
                {[0.5, 1, 2].map(s => (
                  <button
                    key={s}
                    className="action-btn"
                    style={{
                      padding: '2px 6px',
                      fontSize: 10,
                      fontWeight: playSpeed === s ? 800 : 500,
                      background: playSpeed === s ? '#f1f5f9' : 'transparent',
                      border: playSpeed === s ? '1px solid #94a3b8' : 'none'
                    }}
                    onClick={() => setPlaySpeed(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SVG Topology & Wave Canvas */}
          <div style={{ flex: 1, position: 'relative', background: '#faf9f6', borderRadius: 8, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox="0 0 980 480" preserveAspectRatio="xMidYMid meet">
              <defs>
                <marker id="arrow-normal" markerWidth="8" markerHeight="6" refX="28" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                </marker>
                <marker id="arrow-cascade" markerWidth="8" markerHeight="6" refX="28" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#b42318" />
                </marker>
                <marker id="arrow-pulse" markerWidth="8" markerHeight="6" refX="28" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#f04438" />
                </marker>

                {/* Pulsing Gradient for active traveling shockwave */}
                <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f04438" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#b42318" stopOpacity="1" />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Background */}
              <pattern id="trace-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e8e4db" strokeWidth="0.8" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#trace-grid)" />

              {/* Edges */}
              {baseEdges.map((e, idx) => {
                const from = nodePositions[e.from] || { x: 100, y: 100 };
                const to = nodePositions[e.to] || { x: 200, y: 200 };

                // Edge is part of active shockwave if both source and target have been reached
                const isTraversed = affectedServicesUpToNow.has(e.from) && affectedServicesUpToNow.has(e.to);
                const isCurrentlyActiveHopEdge = activeHop?.edge && (
                  (activeHop.edge.from === e.from && activeHop.edge.to === e.to) ||
                  (activeHop.edge.from === e.to && activeHop.edge.to === e.from)
                );

                return (
                  <g key={`edge-${idx}`}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={isCurrentlyActiveHopEdge ? '#f04438' : isTraversed ? '#fda29b' : '#cbd5e1'}
                      strokeWidth={isCurrentlyActiveHopEdge ? 3.5 : isTraversed ? 2.5 : 1.5}
                      strokeDasharray={isCurrentlyActiveHopEdge ? '6,4' : isTraversed ? '4,3' : undefined}
                      markerEnd={isCurrentlyActiveHopEdge || isTraversed ? 'url(#arrow-cascade)' : 'url(#arrow-normal)'}
                      filter={isCurrentlyActiveHopEdge ? 'url(#glow)' : undefined}
                    />

                    {/* Edge Protocol Badge */}
                    <rect
                      x={(from.x + to.x) / 2 - 24}
                      y={(from.y + to.y) / 2 - 12}
                      width="48"
                      height="15"
                      rx="3"
                      fill="#ffffff"
                      stroke={isCurrentlyActiveHopEdge ? '#f04438' : isTraversed ? '#fda29b' : '#e2e8f0'}
                      strokeWidth="1"
                    />
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 1}
                      fill={isCurrentlyActiveHopEdge ? '#b42318' : isTraversed ? '#b54708' : '#64748b'}
                      fontSize="8"
                      fontWeight="700"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {e.protocol}
                    </text>
                  </g>
                );
              })}

              {/* Microservice Nodes */}
              {Object.keys(nodePositions).map(svcKey => {
                const pos = nodePositions[svcKey];
                const isRootTarget = traceData?.target_service === svcKey;
                const isCurrentlyActiveHopNode = activeHop?.service === svcKey;
                const isAffected = affectedServicesUpToNow.has(svcKey);
                const isUnaffected = traceData?.unaffected_services.includes(svcKey);

                let fillBg = '#ffffff';
                let strokeColor = '#d3ccc0';
                let strokeWidth = 1.2;

                if (isRootTarget) {
                  fillBg = '#fef3f2';
                  strokeColor = '#b42318';
                  strokeWidth = 3;
                } else if (isCurrentlyActiveHopNode) {
                  fillBg = '#fffaeb';
                  strokeColor = '#f79009';
                  strokeWidth = 3;
                } else if (isAffected) {
                  fillBg = '#fffaf0';
                  strokeColor = '#b54708';
                  strokeWidth = 2;
                } else if (isUnaffected) {
                  fillBg = '#f8fafc';
                  strokeColor = '#cbd5e1';
                }

                return (
                  <g
                    key={svcKey}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    style={{ opacity: isUnaffected && affectedServicesUpToNow.size > 0 ? 0.6 : 1, transition: 'all 0.3s ease' }}
                  >
                    {/* Shockwave Halo around current active traveling hop */}
                    {isCurrentlyActiveHopNode && (
                      <circle cx="0" cy="0" r="50" fill="none" stroke="#f04438" strokeWidth="3" opacity="0.6">
                        <animate attributeName="r" values="36;54;36" dur="1.2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Node Box */}
                    <rect
                      x="-65"
                      y="-34"
                      width="130"
                      height="68"
                      rx="7"
                      fill={fillBg}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={isAffected && !isRootTarget ? '4,3' : undefined}
                    />

                    {/* Status Circle */}
                    <circle
                      cx="-48"
                      cy="-18"
                      r="5"
                      fill={isRootTarget ? '#b42318' : isAffected ? '#b54708' : isUnaffected ? '#94a3b8' : '#027a48'}
                    />

                    {/* Service Name */}
                    <text
                      x="-38"
                      y="-14"
                      fill="#181d27"
                      fontSize={svcKey.length > 12 ? '9.5' : '11'}
                      fontWeight="800"
                      fontFamily="inherit"
                    >
                      {svcKey.replace('-service', '').toUpperCase()}
                    </text>

                    {/* Role / Cascade State Pill */}
                    {isRootTarget ? (
                      <text x="-48" y="2" fill="#b42318" fontSize="8.5" fontWeight="800" fontFamily="monospace">
                        [ROOT FAULT POINT]
                      </text>
                    ) : isCurrentlyActiveHopNode ? (
                      <text x="-48" y="2" fill="#b54708" fontSize="8.5" fontWeight="800" fontFamily="monospace">
                        [IMPACT ARRIVING]
                      </text>
                    ) : isAffected ? (
                      <text x="-48" y="2" fill="#b54708" fontSize="8" fontWeight="700" fontFamily="monospace">
                        [DOWNSTREAM VICTIM]
                      </text>
                    ) : isUnaffected ? (
                      <text x="-48" y="2" fill="#64748b" fontSize="7.5" fontWeight="600" fontFamily="monospace">
                        [UNAFFECTED BRANCH]
                      </text>
                    ) : (
                      <text x="-48" y="2" fill="#027a48" fontSize="8" fontWeight="600" fontFamily="monospace">
                        [HEALTHY STANDBY]
                      </text>
                    )}

                    {/* Telemetry Metric inside node */}
                    <text x="-48" y="16" fill="#475467" fontSize="9" fontFamily="monospace">
                      LAT: {isRootTarget ? '280ms' : isAffected ? '220ms' : '6ms'}
                    </text>
                    <text x="-48" y="26" fill="#475467" fontSize="9" fontFamily="monospace">
                      CPU: {isRootTarget ? '68%' : isAffected ? '24%' : '3%'}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Bottom Visual Legend */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(4px)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                padding: '6px 12px',
                display: 'flex',
                gap: 14,
                fontSize: 10,
                color: 'var(--text-main)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#fee4e2', border: '1px solid #b42318' }} />
                <span>Origin (Hop 0)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#fef0c7', border: '1px dashed #b54708' }} />
                <span>Propagated Victim</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f8fafc', border: '1px solid #cbd5e1' }} />
                <span>Unaffected Branch</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 12, height: 2, background: '#f04438' }} />
                <span style={{ color: '#b42318', fontWeight: 700 }}>Active Shockwave Wavefront</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hop-by-Hop Telemetry Ledger (Sidebar) */}
        <div className="panel-card" style={{ height: '100%', overflowY: 'auto', padding: 14 }}>
          <div className="panel-title" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={14} />
              <span style={{ fontWeight: 800, fontSize: 13 }}>Causal Propagation Ledger</span>
            </div>
            <span className="badge badge-rose">
              {traceData?.hops.length ?? 0} Total Hops
            </span>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
            Click any hop below to scrub the traveling wave directly to that causal milestone:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {traceData?.hops.map((hop, idx) => {
              const isActive = currentHopIndex === idx;
              const isPast = currentHopIndex > idx;

              return (
                <div
                  key={hop.hop_index}
                  style={{
                    background: isActive ? '#fef3f2' : isPast ? '#ffffff' : '#f8fafc',
                    border: `1px solid ${isActive ? '#fda29b' : isPast ? '#e2e8f0' : '#f1f5f9'}`,
                    borderRadius: 6,
                    padding: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isPast || isActive ? 1 : 0.6
                  }}
                  onClick={() => setCurrentHopIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        className="badge"
                        style={{
                          background: idx === 0 ? '#b42318' : isActive ? '#b54708' : '#475467',
                          color: '#ffffff',
                          fontFamily: 'monospace',
                          fontSize: 9
                        }}
                      >
                        HOP {hop.hop_index}
                      </span>
                      <strong style={{ fontSize: 12, color: 'var(--text-main)' }}>
                        {hop.service.toUpperCase()}
                      </strong>
                    </div>

                    <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 800, color: '#b42318' }}>
                      +{hop.offset_ms}ms
                    </span>
                  </div>

                  <p style={{ fontSize: 11, color: '#475467', margin: '4px 0 6px 0', lineHeight: 1.3 }}>
                    {hop.causal_mechanism}
                  </p>

                  {/* Telemetry Shift Pill */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 5px', fontFamily: 'monospace' }}>
                      Lat: {hop.telemetry_delta.latency_before_ms}ms → <strong>{hop.telemetry_delta.latency_after_ms}ms</strong>
                    </span>
                    {hop.telemetry_delta.error_rate > 0 && (
                      <span style={{ fontSize: 9, background: '#fef3f2', border: '1px solid #fda29b', color: '#b42318', borderRadius: 4, padding: '2px 5px', fontFamily: 'monospace' }}>
                        Err: {(hop.telemetry_delta.error_rate * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unaffected Isolation Proof */}
          <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <ShieldCheck size={12} color="#027a48" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
                Unaffected Microservice Isolation
              </span>
            </div>
            <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 6px 0', lineHeight: 1.3 }}>
              Telemetry verifies zero degradation along independent paths (true negative precision):
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {traceData?.unaffected_services.map(s => (
                <span key={s} className="badge badge-green" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
