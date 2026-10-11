import React, { useEffect, useState } from 'react';
import { Network, Server, ArrowDown, ArrowUp, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { api } from '../services/api';
import { TopologyData, ServiceNode } from '../types';

export const TopologyView: React.FC = () => {
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopology();
  }, []);

  const loadTopology = async () => {
    try {
      setLoading(false);
      const data = await api.getTopology();
      setTopology(data);
      if (data.services.length > 0 && !selectedService) {
        setSelectedService(data.services[0]);
      }
    } catch (err) {
      console.error('Failed to load topology', err);
    }
  };

  // Node positions in the SVG graph: (Client -> Nginx -> API -> Postgres / Redis)
  const nodePositions: Record<string, { x: number; y: number }> = {
    client: { x: 100, y: 220 },
    nginx: { x: 300, y: 220 },
    api: { x: 500, y: 220 },
    postgres: { x: 720, y: 130 },
    redis: { x: 720, y: 310 }
  };

  const getInbound = (svcName: string) => {
    if (!topology) return [];
    return topology.edges.filter(e => e.to_service === svcName).map(e => e.from_service);
  };

  const getOutbound = (svcName: string) => {
    if (!topology) return [];
    return topology.edges.filter(e => e.from_service === svcName).map(e => e.to_service);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, height: 'calc(100vh - 120px)' }}>
      {/* SVG Canvas */}
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
        <div className="panel-title" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Network size={16} color="var(--text-main)" />
            <span>Service Call Graph & Dependency Topology</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Select node to inspect telemetry & downstream blast radius
          </span>
        </div>

        <div style={{ flex: 1, position: 'relative', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          <svg width="100%" height="100%" viewBox="0 0 850 450" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="28"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
              </marker>
              <marker
                id="arrowhead-active"
                markerWidth="8"
                markerHeight="6"
                refX="28"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#b42318" />
              </marker>
            </defs>

            {/* Subtle Grid Lines */}
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e8e4db" strokeWidth="0.8" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Dependency Edges */}
            {topology?.edges.map((edge, idx) => {
              const from = nodePositions[edge.from_service] || { x: 100, y: 100 };
              const to = nodePositions[edge.to_service] || { x: 200, y: 200 };
              const isActive = edge.is_active_path;

              return (
                <g key={`edge-${idx}`}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isActive ? '#b42318' : '#64748b'}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    strokeDasharray={isActive ? '5,4' : undefined}
                    markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                  />
                  {/* Midpoint Label */}
                  <text
                    x={(from.x + to.x) / 2}
                    y={(from.y + to.y) / 2 - 8}
                    fill="#535862"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {edge.relationship}
                  </text>
                </g>
              );
            })}

            {/* Service Nodes */}
            {topology?.services.map(svc => {
              const pos = nodePositions[svc.name] || { x: 400, y: 200 };
              const isSelected = selectedService?.name === svc.name;
              const isUnhealthy = svc.status === 'unhealthy' || svc.status === 'degraded' || svc.is_root_cause;

              return (
                <g
                  key={svc.name}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedService(svc)}
                >
                  <rect
                    x="-65"
                    y="-36"
                    width="130"
                    height="72"
                    rx="8"
                    fill={isSelected ? '#faf8f5' : '#ffffff'}
                    stroke={
                      svc.is_root_cause
                        ? '#b42318'
                        : isUnhealthy
                        ? '#b54708'
                        : isSelected
                        ? '#181d27'
                        : '#d3ccc0'
                    }
                    strokeWidth={isSelected || svc.is_root_cause ? 2 : 1}
                  />

                  {/* Status Indicator Dot */}
                  <circle
                    cx="-48"
                    cy="-18"
                    r="4"
                    fill={svc.is_root_cause ? '#b42318' : isUnhealthy ? '#b54708' : '#027a48'}
                  />

                  {/* Service Title */}
                  <text
                    x="-36"
                    y="-14"
                    fill="#181d27"
                    fontSize="13"
                    fontWeight="700"
                    fontFamily="inherit"
                  >
                    {svc.name.toUpperCase()}
                  </text>

                  {/* Telemetry Snapshot inside Node */}
                  <text x="-48" y="8" fill="#535862" fontSize="10" fontFamily="monospace">
                    CPU: {svc.cpu_percent?.toFixed(1) ?? '--'}%
                  </text>
                  <text x="-48" y="24" fill="#535862" fontSize="10" fontFamily="monospace">
                    LAT: {svc.latency_ms?.toFixed(0) ?? '--'}ms
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Selected Node Inspector Sidebar */}
      <div className="panel-card" style={{ height: '100%', overflowY: 'auto' }}>
        <div className="panel-title">
          <span>Service Inspector</span>
          {selectedService && (
            <span className={`badge ${selectedService.status === 'unhealthy' ? 'badge-rose' : 'badge-green'}`}>
              {selectedService.status.toUpperCase()}
            </span>
          )}
        </div>

        {selectedService ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, color: 'var(--text-main)', fontWeight: 700 }}>{selectedService.display_name}</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                Service ID: {selectedService.name}
              </p>
            </div>

            {selectedService.is_root_cause && (
              <div
                style={{
                  background: 'var(--rose-bg)',
                  border: '1px solid var(--rose-border)',
                  padding: 12,
                  borderRadius: 6,
                  marginBottom: 16,
                  color: 'var(--rose-text)',
                  fontSize: 12
                }}
              >
                <strong>Identified Root Cause:</strong> Severe hardware saturation on this node triggers upstream caller latency cascades.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div className="status-chip">
                <span style={{ color: 'var(--text-muted)' }}>CPU Utilization:</span>
                <span className="font-mono font-bold" style={{ color: (selectedService.cpu_percent || 0) > 75 ? 'var(--rose-text)' : 'inherit' }}>
                  {selectedService.cpu_percent?.toFixed(1) ?? 'N/A'}%
                </span>
              </div>

              <div className="status-chip">
                <span style={{ color: 'var(--text-muted)' }}>Memory Working Set:</span>
                <span className="font-mono font-bold">
                  {selectedService.memory_mb?.toFixed(0) ?? 'N/A'} MB
                </span>
              </div>

              <div className="status-chip">
                <span style={{ color: 'var(--text-muted)' }}>Avg Request Latency:</span>
                <span className="font-mono font-bold" style={{ color: (selectedService.latency_ms || 0) > 100 ? 'var(--rose-text)' : 'inherit' }}>
                  {selectedService.latency_ms?.toFixed(1) ?? 'N/A'} ms
                </span>
              </div>

              <div className="status-chip">
                <span style={{ color: 'var(--text-muted)' }}>HTTP Error Rate:</span>
                <span className="font-mono font-bold">
                  {((selectedService.error_rate || 0) * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
                Inbound Upstream Callers
              </h4>
              {getInbound(selectedService.name).length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>None (Edge Entrypoint)</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {getInbound(selectedService.name).map(s => (
                    <span key={s} className="badge badge-indigo">
                      <ArrowDown size={10} style={{ marginRight: 4 }} />
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
                Outbound Downstream Callees
              </h4>
              {getOutbound(selectedService.name).length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>None (Leaf Storage Service)</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {getOutbound(selectedService.name).map(s => (
                    <span key={s} className="badge badge-cyan">
                      <ArrowUp size={10} style={{ marginRight: 4 }} />
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            Select a service node in the graph to inspect its telemetry profile.
          </div>
        )}
      </div>
    </div>
  );
};
