import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, AlertCircle, Database, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { MetricQueryResponse, MetricSeries, SystemStatus } from '../types';

export const ObservabilityView: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<string>('cpu');
  const [metricsData, setMetricsData] = useState<MetricQueryResponse | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const services = ['all', 'client', 'nginx', 'api', 'postgres', 'redis'];
  const metricTypes = [
    { id: 'cpu', label: 'CPU Utilization (%)' },
    { id: 'memory', label: 'Memory RSS (MB)' },
    { id: 'latency', label: 'Response Latency (ms)' }
  ];

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const timer = setInterval(fetchMetrics, 5000);
    return () => clearInterval(timer);
  }, [selectedService, selectedMetric, autoRefresh]);

  const fetchMetrics = async () => {
    try {
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

  // Helper to render an enterprise smooth SVG curve chart (Catmull-Rom Spline)
  const renderChart = (series: MetricSeries, color: string) => {
    const pts = series.points || series.values || [];
    if (!pts || pts.length === 0) {
      return <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: 30, textAlign: 'center' }}>No telemetry points received</div>;
    }

    const values = pts.map(p => p.value);
    const isCpu = series.metric_name.toLowerCase().includes('cpu');
    const isMem = series.metric_name.toLowerCase().includes('mem');
    const isLat = series.metric_name.toLowerCase().includes('lat') || series.metric_name.toLowerCase().includes('dur');

    const maxDataVal = Math.max(...values, 0.1);
    const minVal = 0; // Natural zero baseline for physical metrics
    let maxVal: number;
    if (isCpu) {
      maxVal = maxDataVal > 20 ? Math.min(100, Math.ceil(maxDataVal * 1.15)) : 25;
    } else if (isMem) {
      maxVal = Math.max(256, Math.ceil(maxDataVal * 1.2));
    } else if (isLat) {
      maxVal = Math.max(30, Math.ceil(maxDataVal * 1.25));
    } else {
      maxVal = Math.max(10, Math.ceil(maxDataVal * 1.2));
    }

    const width = 540;
    const height = 135;
    const paddingLeft = 35;
    const paddingRight = 20;
    const paddingTop = 15;
    const paddingBottom = 22;

    const plotW = width - paddingLeft - paddingRight;
    const plotH = height - paddingTop - paddingBottom;
    const baselineY = height - paddingBottom;

    // Map data to coordinates
    const points = pts.map((p, idx) => {
      const x = paddingLeft + (idx / Math.max(1, pts.length - 1)) * plotW;
      const normalizedY = Math.min(1, Math.max(0, (p.value - minVal) / (maxVal - minVal)));
      const y = baselineY - (normalizedY * plotH);
      return { x, y, val: p.value };
    });

    // Construct smooth cubic bezier path
    let pathD = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pathD += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const areaD = `${pathD} L ${lastX.toFixed(1)},${baselineY} L ${firstX.toFixed(1)},${baselineY} Z`;

    const latestVal = values[values.length - 1];
    const avgVal = values.reduce((a, b) => a + b, 0) / values.length;
    const lastPoint = points[points.length - 1];

    return (
      <div style={{ background: '#ffffff', borderRadius: 8, padding: '16px 18px', border: '1px solid var(--border-subtle)', marginBottom: 16, boxShadow: '0 1px 3px rgba(16, 24, 40, 0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {series.metric_name}
            </span>
            <span style={{ fontSize: 12, padding: '2px 7px', background: 'var(--bg-secondary)', borderRadius: 4, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              service: {series.service}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace' }}>
              avg: {avgVal.toFixed(1)}{series.unit}
            </span>
            <span className="font-mono" style={{ fontSize: 17, fontWeight: 700, color }}>
              {latestVal.toFixed(1)} {series.unit}
            </span>
          </div>
        </div>

        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ background: 'var(--bg-secondary)', borderRadius: 6, overflow: 'visible' }}>
          <defs>
            <linearGradient id={`grad-${series.service}-${series.metric_name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Y-axis grid guidelines */}
          <line x1={paddingLeft} y1={baselineY} x2={width - paddingRight} y2={baselineY} stroke="#e2ddd2" strokeWidth="1" />
          <line x1={paddingLeft} y1={baselineY - plotH * 0.5} x2={width - paddingRight} y2={baselineY - plotH * 0.5} stroke="#eae6dd" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#eae6dd" strokeWidth="1" strokeDasharray="3,3" />

          {/* Y-axis text labels */}
          <text x={paddingLeft - 6} y={baselineY + 3} textAnchor="end" fontSize="9" fill="#98a2b3" fontFamily="monospace">0</text>
          <text x={paddingLeft - 6} y={baselineY - plotH * 0.5 + 3} textAnchor="end" fontSize="9" fill="#98a2b3" fontFamily="monospace">{(maxVal * 0.5).toFixed(0)}</text>
          <text x={paddingLeft - 6} y={paddingTop + 4} textAnchor="end" fontSize="9" fill="#98a2b3" fontFamily="monospace">{maxVal.toFixed(0)}</text>

          {/* Smooth area fill and curve */}
          <path d={areaD} fill={`url(#grad-${series.service}-${series.metric_name})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Pulse marker at latest data point */}
          <circle cx={lastPoint.x} cy={lastPoint.y} r="3.5" fill={color} />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="7" fill={color} opacity="0.25" />
        </svg>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'monospace', marginTop: 8 }}>
          <span>T - 15m (Baseline Window)</span>
          <span style={{ color: 'var(--text-muted)' }}>Continuous Telemetry Scrape</span>
          <span>T = Now</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Controls & Telemetry Source Information */}
      <div className="panel-card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} color="var(--text-main)" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Filter:</span>
            <select value={selectedService} onChange={e => setSelectedService(e.target.value)} style={{ padding: '4px 10px', fontSize: 12 }}>
              {services.map(s => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Metric:</span>
            <select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)} style={{ padding: '4px 10px', fontSize: 12 }}>
              {metricTypes.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-Refresh (5s)</span>
          </label>

          <button
            className="action-btn"
            style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={fetchMetrics}
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            <span>Poll Now</span>
          </button>

          <span className={`badge ${systemStatus?.docker_available ? 'badge-green' : 'badge-amber'}`}>
            {metricsData?.source || (systemStatus?.docker_available ? 'Prometheus Live (9090)' : 'Replay Telemetry')}
          </span>
        </div>
      </div>

      {/* Metric Panels Grid */}
      {loading && (!metricsData || metricsData.series.length === 0) ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>Loading metric streams...</div>
      ) : !metricsData || metricsData.series.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>No active metrics found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {metricsData.series.map((s, idx) => {
            const isCpu = s.metric_name.toLowerCase().includes('cpu');
            const isLat = s.metric_name.toLowerCase().includes('duration') || s.metric_name.toLowerCase().includes('lat');
            const color = isCpu ? '#b42318' : isLat ? '#b54708' : '#1570ef';
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
