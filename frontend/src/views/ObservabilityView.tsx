import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { api } from '../services/api';
import { MetricQueryResponse, MetricSeries, SystemStatus } from '../types';

export const ObservabilityView: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string>('all');
  const [metricsData, setMetricsData] = useState<MetricQueryResponse | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const services = ['all', 'client', 'nginx', 'api', 'postgres', 'redis'];

  useEffect(() => {
    fetchMetrics();
  }, [selectedService]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const [res, status] = await Promise.all([
        api.queryMetrics(selectedService === 'all' ? undefined : { services: [selectedService] }),
        api.getSystemStatus()
      ]);
      setMetricsData(res);
      setSystemStatus(status);
    } catch (err) {
      console.error('Failed to query metrics', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render a clean SVG chart for a series
  const renderChart = (series: MetricSeries, color: string) => {
    const pts = series.points || series.values || [];
    if (!pts || pts.length === 0) return <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>No points</div>;

    const values = pts.map(p => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values, minVal + 1);
    const width = 500;
    const height = 120;
    const padding = 15;

    const coordPoints = pts.map((p, idx) => {
      const x = padding + (idx / (pts.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((p.value - minVal) / (maxVal - minVal)) * (height - 2 * padding);
      return `${x},${y}`;
    });

    const polylineStr = coordPoints.join(' ');
    const firstX = padding;
    const lastX = width - padding;
    const baselineY = height - padding;
    const areaStr = `${polylineStr} ${lastX},${baselineY} ${firstX},${baselineY}`;

    const latestVal = values[values.length - 1];

    return (
      <div style={{ background: '#ffffff', borderRadius: 8, padding: 16, border: '1px solid var(--border-subtle)', marginBottom: 16, boxShadow: '0 1px 2px rgba(16, 24, 40, 0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
              {series.metric_name}
            </span>
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace' }}>
              [{series.service}]
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: 16, fontWeight: 700, color }}>
            {latestVal.toFixed(1)} {series.unit}
          </div>
        </div>

        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ background: 'var(--bg-secondary)', borderRadius: 6 }}>
          <defs>
            <linearGradient id={`grad-${series.service}-${series.metric_name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Guide lines */}
          <line x1={padding} y1={baselineY} x2={lastX} y2={baselineY} stroke="#e8e4db" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={lastX} y2={padding} stroke="#e8e4db" strokeWidth="1" strokeDasharray="3,3" />
          
          {/* Metric Area and Polyline */}
          <polygon points={areaStr} fill={`url(#grad-${series.service}-${series.metric_name})`} />
          <polyline points={polylineStr} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'monospace', marginTop: 6 }}>
          <span>T-300s (Baseline Normal)</span>
          <span>T=0s (Injection Point)</span>
          <span>T+300s (Active Anomaly)</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Controls & Telemetry Source Information */}
      <div className="panel-card" style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Activity size={16} color="var(--text-main)" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Filter Service:</span>
          <select value={selectedService} onChange={e => setSelectedService(e.target.value)}>
            {services.map(s => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Resolution: <strong>10s step</strong></span>
          <span>Window: <strong>[-300s, +300s]</strong></span>
          <span className={`badge ${systemStatus?.docker_available ? 'badge-green' : 'badge-amber'}`}>
            {systemStatus?.docker_available ? 'Prometheus Live (9090)' : 'Replay Cache (EXP-postgres_cpu_stress_001)'}
          </span>
        </div>
      </div>

      {/* Metric Panels Grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>Loading metric streams...</div>
      ) : !metricsData || metricsData.series.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>No active metrics found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {metricsData.series.map((s, idx) => {
            const isCpu = s.metric_name.toLowerCase().includes('cpu');
            const isLat = s.metric_name.toLowerCase().includes('duration') || s.metric_name.toLowerCase().includes('lat');
            const color = isCpu ? '#b42318' : isLat ? '#b54708' : '#175cd3';
            return (
              <div key={`${s.service}-${s.metric_name}-${idx}`}>
                {renderChart(s, color)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
