import React, { useEffect, useState } from 'react';
import {
  Network,
  Server,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Flame,
  Layers,
  Eye,
  Activity
} from 'lucide-react';
import { api } from '../services/api';
import {
  TopologyData,
  ServiceNode,
  DependencyEdge,
  TimelineSliceData,
  FSMStatusResponse
} from '../types';
import { TimelineScrubber } from '../components/TimelineScrubber';
import { FSMViewer } from '../components/FSMViewer';

export const TopologyView: React.FC = () => {
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceNode | null>(null);
  const [timelineSlices, setTimelineSlices] = useState<TimelineSliceData[]>([]);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fsmData, setFsmData] = useState<FSMStatusResponse | null>(null);
  const [showInferredCausal, setShowInferredCausal] = useState<boolean>(true);
  const [showGroundTruth, setShowGroundTruth] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'fsm'>('graph');

  useEffect(() => {
    loadInitialData();
  }, []);

  // Timer loop for timeline scrubber playback
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && timelineSlices.length > 0) {
      timer = setInterval(() => {
        setCurrentOffset(prev => {
          const currentIdx = timelineSlices.findIndex(s => s.offset_seconds === prev);
          if (currentIdx === -1 || currentIdx >= timelineSlices.length - 1) {
            setIsPlaying(false);
            return timelineSlices[0].offset_seconds;
          }
          return timelineSlices[currentIdx + 1].offset_seconds;
        });
      }, 1400);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timelineSlices]);

  const loadInitialData = async () => {
    try {
      const [topData, scrubData, fsmRes] = await Promise.all([
        api.getTopology(),
        api.getTimelineScrub(),
        api.getFSMStatus()
      ]);
      setTopology(topData);
      setTimelineSlices(scrubData.slices || []);
      setFsmData(fsmRes);

      if (topData.services.length > 0) {
        setSelectedService(topData.services[0]);
      }
    } catch (err) {
      console.error('Failed to load topology data', err);
    }
  };

  // View mode: Application services (default) vs Infrastructure containers
  const [viewScope, setViewScope] = useState<'application' | 'infrastructure'>('application');

  // Node positions in the SVG graph: 11-service realistic distributed topology across 6 clear columns
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

  // Infrastructure containers positions (visible when viewScope === 'infrastructure')
  const infraPositions: Record<string, { x: number; y: number; label: string; desc: string }> = {
    prometheus: { x: 215, y: 440, label: 'Prometheus TSDB', desc: 'PromQL Telemetry (:9090)' },
    cadvisor: { x: 360, y: 440, label: 'cAdvisor Daemon', desc: 'Container Cgroups Exporter' },
    loki: { x: 530, y: 440, label: 'Grafana Loki', desc: 'Structured Trace & Log Index' },
    controller: { x: 885, y: 220, label: 'OSCAR Control Plane', desc: 'Fault Engine & FSM Manager' }
  };

  // Current active slice based on slider position
  const activeSlice = timelineSlices.find(s => s.offset_seconds === currentOffset);

  // Nodes to display: derived from active slice if available, else live topology
  const displayNodes: ServiceNode[] = activeSlice
    ? activeSlice.nodes
    : (topology?.services || []);

  // Edges to display: derived from active slice if available, else live topology
  const displayEdges: DependencyEdge[] = activeSlice
    ? activeSlice.edges
    : (topology?.edges || []);

  const getInbound = (svcName: string) => {
    return displayEdges.filter(e => e.to_service === svcName).map(e => e.from_service);
  };

  const getOutbound = (svcName: string) => {
    return displayEdges.filter(e => e.from_service === svcName).map(e => e.to_service);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Interactive Timeline Scrubber Bar */}
      <TimelineScrubber
        slices={timelineSlices}
        currentOffset={currentOffset}
        onOffsetChange={setCurrentOffset}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />

      {/* Main Workspace: Topology Canvas & Inspector Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, height: 'calc(100vh - 210px)' }}>
        {/* Topology Graph Panel */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 14 }}>
          {/* Header & Layer Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Network size={16} color="var(--text-main)" />
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>
                  Distributed System Causal Propagation Graph ({displayNodes.length} Services)
                </span>
              </div>

              {/* View Switcher: Graph vs FSM */}
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 6, padding: 2 }}>
                <button
                  className="action-btn"
                  style={{
                    padding: '3px 8px',
                    fontSize: 11,
                    background: activeTab === 'graph' ? '#ffffff' : 'transparent',
                    border: 'none',
                    fontWeight: activeTab === 'graph' ? 700 : 500
                  }}
                  onClick={() => setActiveTab('graph')}
                >
                  Graph Topology
                </button>
                <button
                  className="action-btn"
                  style={{
                    padding: '3px 8px',
                    fontSize: 11,
                    background: activeTab === 'fsm' ? '#ffffff' : 'transparent',
                    border: 'none',
                    fontWeight: activeTab === 'fsm' ? 700 : 500
                  }}
                  onClick={() => setActiveTab('fsm')}
                >
                  State Machines
                </button>
              </div>

              {/* View Scope: Application Services vs Infrastructure View */}
              {activeTab === 'graph' && (
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 6, padding: 2 }}>
                  <button
                    className="action-btn"
                    style={{
                      padding: '3px 8px',
                      fontSize: 11,
                      background: viewScope === 'application' ? '#ffffff' : 'transparent',
                      border: 'none',
                      fontWeight: viewScope === 'application' ? 700 : 500
                    }}
                    onClick={() => setViewScope('application')}
                  >
                    Application View
                  </button>
                  <button
                    className="action-btn"
                    style={{
                      padding: '3px 8px',
                      fontSize: 11,
                      background: viewScope === 'infrastructure' ? '#ffffff' : 'transparent',
                      border: 'none',
                      fontWeight: viewScope === 'infrastructure' ? 700 : 500
                    }}
                    onClick={() => setViewScope('infrastructure')}
                  >
                    Infrastructure View
                  </button>
                </div>
              )}
            </div>

            {/* Layer Visibility Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="action-btn"
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  background: showInferredCausal ? '#f9f5ff' : '#ffffff',
                  borderColor: showInferredCausal ? '#7f56d9' : 'var(--border-subtle)',
                  color: showInferredCausal ? '#6941c6' : 'var(--text-muted)'
                }}
                onClick={() => setShowInferredCausal(!showInferredCausal)}
                title="Toggle RCA Algorithm Inferred Causal Hypothesis Overlay"
              >
                Inferred Blast Overlay
              </button>

              <button
                className="action-btn"
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  background: showGroundTruth ? '#fef0c7' : '#ffffff',
                  borderColor: showGroundTruth ? '#f79009' : 'var(--border-subtle)',
                  color: showGroundTruth ? '#b54708' : 'var(--text-muted)'
                }}
                onClick={() => setShowGroundTruth(!showGroundTruth)}
                title="Toggle Isolated Ground-Truth Expected Propagation Path"
              >
                Ground Truth Overlay
              </button>
            </div>
          </div>

          {activeTab === 'graph' ? (
            <div style={{ flex: 1, position: 'relative', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              <svg width="100%" height="100%" viewBox="0 0 980 500" preserveAspectRatio="xMidYMid meet">
                <defs>
                  {/* Arrow markers */}
                  <marker id="arrow-normal" markerWidth="8" markerHeight="6" refX="28" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
                  </marker>
                  <marker id="arrow-impacted" markerWidth="8" markerHeight="6" refX="28" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#b42318" />
                  </marker>
                  <marker id="arrow-inferred" markerWidth="8" markerHeight="6" refX="28" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#7f56d9" />
                  </marker>
                  <marker id="arrow-groundtruth" markerWidth="8" markerHeight="6" refX="28" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#b54708" />
                  </marker>
                </defs>

                {/* Subtle Grid Pattern */}
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e8e4db" strokeWidth="0.8" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Layer 3: Physical Request Call Path Edges */}
                {displayEdges.map((edge, idx) => {
                  const from = nodePositions[edge.from_service] || { x: 100, y: 100 };
                  const to = nodePositions[edge.to_service] || { x: 200, y: 200 };
                  const isImpacted = edge.is_impacted;

                  return (
                    <g key={`edge-${idx}`}>
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={isImpacted ? '#b42318' : '#64748b'}
                        strokeWidth={isImpacted ? 2.5 : 1.5}
                        strokeDasharray={isImpacted ? '5,4' : undefined}
                        markerEnd={isImpacted ? 'url(#arrow-impacted)' : 'url(#arrow-normal)'}
                      />
                      {/* Edge Latency & Protocol Pill */}
                      <rect
                        x={(from.x + to.x) / 2 - 24}
                        y={(from.y + to.y) / 2 - 14}
                        width="48"
                        height="15"
                        rx="3"
                        fill="#ffffff"
                        stroke={isImpacted ? '#fda29b' : '#d0d5dd'}
                        strokeWidth="1"
                      />
                      <text
                        x={(from.x + to.x) / 2}
                        y={(from.y + to.y) / 2 - 3}
                        fill={isImpacted ? '#b42318' : '#344054'}
                        fontSize="8.5"
                        fontWeight="700"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {edge.latency_ms?.toFixed(0) ?? '--'}ms
                      </text>
                    </g>
                  );
                })}

                {/* Layer 4: Algorithm-Inferred Causal Paths (Purple Overlays) */}
                {showInferredCausal && (
                  <g>
                    {displayEdges
                      .filter(e => e.is_inferred_causal || e.is_impacted)
                      .map((e, i) => {
                        const from = nodePositions[e.from_service] || { x: 0, y: 0 };
                        const to = nodePositions[e.to_service] || { x: 0, y: 0 };
                        // Reverse path overlay from suspected cause to affected caller
                        return (
                          <line
                            key={`inferred-${i}`}
                            x1={to.x}
                            y1={to.y}
                            x2={from.x}
                            y2={from.y}
                            stroke="#7f56d9"
                            strokeWidth="2.5"
                            strokeDasharray="4,4"
                            markerEnd="url(#arrow-inferred)"
                          />
                        );
                      })}
                  </g>
                )}

                {/* Layer 5: Ground-Truth Expected Path (Golden Overlays) */}
                {showGroundTruth && (
                  <g>
                    {displayEdges
                      .filter(e => e.is_expected_propagation || e.is_impacted)
                      .map((e, i) => {
                        const from = nodePositions[e.from_service] || { x: 0, y: 0 };
                        const to = nodePositions[e.to_service] || { x: 0, y: 0 };
                        return (
                          <line
                            key={`gt-${i}`}
                            x1={to.x}
                            y1={to.y}
                            x2={from.x}
                            y2={from.y}
                            stroke="#f79009"
                            strokeWidth="3"
                            strokeDasharray="2,6"
                            markerEnd="url(#arrow-groundtruth)"
                          />
                        );
                      })}
                  </g>
                )}

                {/* Infrastructure View Nodes (rendered only in Infrastructure View mode) */}
                {viewScope === 'infrastructure' && Object.entries(infraPositions).map(([key, infra]) => (
                  <g key={key} transform={`translate(${infra.x}, ${infra.y})`}>
                    <rect
                      x="-60"
                      y="-22"
                      width="120"
                      height="44"
                      rx="6"
                      fill="#f8fafc"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                    />
                    <circle cx="-46" cy="0" r="4" fill="#0284c7" />
                    <text x="-36" y="-3" fill="#0f172a" fontSize="10" fontWeight="700" fontFamily="inherit">
                      {infra.label}
                    </text>
                    <text x="-36" y="10" fill="#64748b" fontSize="8" fontFamily="monospace">
                      {infra.desc}
                    </text>
                  </g>
                ))}

                {/* Microservice Nodes */}
                {displayNodes.map(svc => {
                  const svcName = svc.name || (svc as any).id || '';
                  const displayName = svc.display_name || (svc as any).label || svcName;
                  const pos = nodePositions[svcName] || { x: 400, y: 200 };
                  const isSelected = selectedService
                    ? (selectedService.name === svcName || (selectedService as any).id === svcName)
                    : false;
                  const isInjected = svc.is_injected_target || svc.status === 'fault';
                  const isAbnormal = svc.is_observed_abnormal || (svc.latency_ms || 0) > 100;

                  let strokeColor = '#d3ccc0';
                  let strokeWidth = 1;
                  let fillBg = '#ffffff';

                  if (isInjected) {
                    strokeColor = '#b42318';
                    strokeWidth = 3;
                    fillBg = '#fef3f2';
                  } else if (isAbnormal) {
                    strokeColor = '#b54708';
                    strokeWidth = 2.5;
                    fillBg = '#fffaeb';
                  } else if (isSelected) {
                    strokeColor = '#181d27';
                    strokeWidth = 2;
                    fillBg = '#faf8f5';
                  }

                  return (
                    <g
                      key={svcName || Math.random().toString()}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedService(svc)}
                    >
                      {/* Pulsing Halo for Injected Target */}
                      {isInjected && (
                        <circle cx="0" cy="0" r="48" fill="none" stroke="#f04438" strokeWidth="2" opacity="0.4" />
                      )}

                      {/* Main Node Box */}
                      <rect
                        x="-70"
                        y="-38"
                        width="140"
                        height="76"
                        rx="8"
                        fill={fillBg}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={isAbnormal && !isInjected ? '4,3' : undefined}
                      />

                      {/* Status Indicator Dot */}
                      <circle
                        cx="-52"
                        cy="-20"
                        r="5"
                        fill={isInjected ? '#b42318' : isAbnormal ? '#b54708' : '#027a48'}
                      />

                      {/* Service Name */}
                      <text
                        x="-40"
                        y="-16"
                        fill="#181d27"
                        fontSize={svcName.length > 12 ? "10" : "11.5"}
                        fontWeight="800"
                        fontFamily="inherit"
                      >
                        {svcName ? svcName.replace('-service', '').toUpperCase() : 'UNKNOWN'}
                      </text>

                      {/* Visual Role Pill */}
                      {isInjected ? (
                        <text x="-52" y="2" fill="#b42318" fontSize="9" fontWeight="800" fontFamily="monospace">
                          [INJECTED FAULT]
                        </text>
                      ) : isAbnormal ? (
                        <text x="-52" y="2" fill="#b54708" fontSize="9" fontWeight="800" fontFamily="monospace">
                          [DOWNSTREAM VICTIM]
                        </text>
                      ) : (
                        <text x="-52" y="2" fill="#027a48" fontSize="9" fontWeight="700" fontFamily="monospace">
                          [HEALTHY SERVICE]
                        </text>
                      )}

                      {/* Telemetry Metrics Inside Node */}
                      <text x="-52" y="18" fill="#535862" fontSize="10" fontFamily="monospace">
                        CPU: {svc.cpu_percent?.toFixed(1) ?? '--'}%
                      </text>
                      <text x="-52" y="30" fill="#535862" fontSize="10" fontFamily="monospace">
                        LAT: {svc.latency_ms?.toFixed(0) ?? '--'}ms
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Graphical Legend Overlay */}
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
                  color: 'var(--text-main)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#fee4e2', border: '1px solid #b42318' }} />
                  <span>Injected Fault</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#fef0c7', border: '1px dashed #b54708' }} />
                  <span>Downstream Victim</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ecfdf3', border: '1px solid #027a48' }} />
                  <span>Baseline Healthy</span>
                </div>
                {showInferredCausal && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 12, height: 2, background: '#7f56d9' }} />
                    <span style={{ color: '#6941c6', fontWeight: 600 }}>RCA Inferred Blast Path</span>
                  </div>
                )}
                {showGroundTruth && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 12, height: 2, background: '#f79009' }} />
                    <span style={{ color: '#b54708', fontWeight: 600 }}>Ground Truth Chain</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <FSMViewer fsmData={fsmData} />
            </div>
          )}
        </div>

        {/* Selected Node Inspector Sidebar */}
        <div className="panel-card" style={{ height: '100%', overflowY: 'auto', padding: 14 }}>
          <div className="panel-title" style={{ marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Telemetry Inspector</span>
            {selectedService && (
              <span
                className={`badge ${
                  selectedService.is_injected_target || selectedService.status === 'fault'
                    ? 'badge-rose'
                    : selectedService.is_observed_abnormal || (selectedService.latency_ms || 0) > 100
                    ? 'badge-amber'
                    : 'badge-green'
                }`}
              >
                {selectedService.is_injected_target
                  ? 'INJECTED TARGET'
                  : selectedService.is_observed_abnormal || (selectedService.latency_ms || 0) > 100
                  ? 'DEGRADED VICTIM'
                  : 'HEALTHY'}
              </span>
            )}
          </div>

          {selectedService ? (() => {
            const selName = selectedService.name || (selectedService as any).id || '';
            const selDisplay = selectedService.display_name || (selectedService as any).label || (selName ? selName.toUpperCase() : 'UNKNOWN');
            return (
            <div>
              <div style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, color: 'var(--text-main)', fontWeight: 800 }}>
                  {selDisplay}
                </h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Node ID: {selName} | Timeline: T{currentOffset >= 0 ? `+${currentOffset}` : currentOffset}s
                </p>
              </div>

              {selectedService.is_injected_target && (
                <div
                  style={{
                    background: '#fef3f2',
                    border: '1px solid #fda29b',
                    padding: 10,
                    borderRadius: 6,
                    marginBottom: 14,
                    color: '#b42318',
                    fontSize: 11
                  }}
                >
                  <strong>Direct Fault Injection Point:</strong> Controlled synthetic latency / query delay applied to this node.
                </div>
              )}

              {selectedService.is_observed_abnormal && !selectedService.is_injected_target && (
                <div
                  style={{
                    background: '#fffaeb',
                    border: '1px solid #fedf89',
                    padding: 10,
                    borderRadius: 6,
                    marginBottom: 14,
                    color: '#b54708',
                    fontSize: 11
                  }}
                >
                  <strong>Downstream Victim Anomaly:</strong> Caller connection pool queuing. High latency induced by slow downstream database.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <div className="status-chip">
                  <span style={{ color: 'var(--text-muted)' }}>CPU Utilization:</span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: (selectedService.cpu_percent || 0) > 60 ? 'var(--rose-text)' : 'inherit' }}
                  >
                    {selectedService.cpu_percent?.toFixed(1) ?? '--'}%
                  </span>
                </div>

                <div className="status-chip">
                  <span style={{ color: 'var(--text-muted)' }}>Memory Working Set:</span>
                  <span className="font-mono font-bold">
                    {selectedService.memory_mb?.toFixed(0) ?? '--'} MB
                  </span>
                </div>

                <div className="status-chip">
                  <span style={{ color: 'var(--text-muted)' }}>Observed Latency:</span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: (selectedService.latency_ms || 0) > 100 ? 'var(--rose-text)' : 'inherit' }}
                  >
                    {selectedService.latency_ms?.toFixed(1) ?? '--'} ms
                  </span>
                </div>

                <div className="status-chip">
                  <span style={{ color: 'var(--text-muted)' }}>Error Rate:</span>
                  <span className="font-mono font-bold">
                    {((selectedService.error_rate || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Upstream Callers */}
              <div style={{ marginBottom: 14 }}>
                <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
                  Inbound Upstream Callers
                </h4>
                {getInbound(selName).length === 0 ? (
                  <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>None (Traffic Ingress)</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {getInbound(selName).map(s => (
                      <span
                        key={s}
                        className="badge badge-indigo"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const target = displayNodes.find(n => (n.name === s || (n as any).id === s));
                          if (target) setSelectedService(target);
                        }}
                        title={`Select caller ${s}`}
                      >
                        <ArrowDown size={10} style={{ marginRight: 4 }} />
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Downstream Callees */}
              <div>
                <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
                  Outbound Downstream Callees
                </h4>
                {getOutbound(selName).length === 0 ? (
                  <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>None (Leaf Node)</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {getOutbound(selName).map(s => (
                      <span
                        key={s}
                        className="badge badge-cyan"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const target = displayNodes.find(n => (n.name === s || (n as any).id === s));
                          if (target) setSelectedService(target);
                        }}
                        title={`Select callee ${s}`}
                      >
                        <ArrowUp size={10} style={{ marginRight: 4 }} />
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            );
          })() : (
            <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
              Select a microservice in the topology to inspect its time-indexed metrics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
