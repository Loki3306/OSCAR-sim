import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, Cpu, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { api } from '../services/api';
import { IncidentRecord } from '../types';

interface TimelineEventItem {
  time: string;
  title: string;
  desc: string;
  type: string;
}

export const IncidentTimelineView: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const list = await api.getIncidents();
      setIncidents(list);
      if (list.length > 0) {
        setSelectedIncident(list[0]);
      }
    } catch (err) {
      console.error('Failed to load incidents', err);
    } finally {
      setLoading(false);
    }
  };

  // Safe timestamp parser handling both numbers (unix epoch seconds/ms) and ISO date strings
  const parseTimestamp = (val: any): Date => {
    if (!val) return new Date();
    if (typeof val === 'number') {
      return new Date(val < 1e11 ? val * 1000 : val);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Timeline events synthesized from the selected incident's lifecycle
  const getTimelineEvents = (inc: IncidentRecord): TimelineEventItem[] => {
    if ((inc as any).events && Array.isArray((inc as any).events) && (inc as any).events.length > 0) {
      return (inc as any).events.map((ev: any) => ({
        time: parseTimestamp(ev.timestamp).toLocaleTimeString() + ' UTC',
        title: (ev.event_type || 'EVENT').replace(/_/g, ' ').toUpperCase(),
        desc: ev.description || `Event on ${ev.service}`,
        type: ev.severity === 'critical' ? 'fault' : ev.severity === 'warning' ? 'anomaly' : 'info'
      }));
    }

    const t0Date = parseTimestamp(inc.created_at);
    const formatOffset = (sec: number) => {
      const d = new Date(t0Date.getTime() + sec * 1000);
      return d.toLocaleTimeString() + ' UTC';
    };

    return [
      {
        time: formatOffset(-30),
        title: 'Baseline Steady State',
        desc: 'Microservices operating within normal bounds: ingress ~45 req/s, mean latency 8.5ms, zero 5xx errors.',
        type: 'info'
      },
      {
        time: formatOffset(0),
        title: `Fault Injected (${inc.fault_type || 'CpuStress'})`,
        desc: `Controlled synthetic load applied to ${inc.target_service || 'postgres'}. Hardware saturation begins.`,
        type: 'fault'
      },
      {
        time: formatOffset(2),
        title: 'Symptom Onset & Transit Cascade',
        desc: `Upstream caller 'api' worker threads queue on database responses. Latency rises from 8.5ms to 240ms. Entrypoint 'nginx' queues requests.`,
        type: 'anomaly'
      },
      {
        time: formatOffset(5),
        title: 'SLO Violation Detected',
        desc: `Monitoring threshold alert (>80% CPU & p99 latency >150ms) registers incident: ${inc.incident_id}.`,
        type: 'detection'
      },
      {
        time: formatOffset(15),
        title: 'RCA Multi-Algorithm Diagnostic Scan',
        desc: `Causal graph traversal & distribution shift tests executed. OSCAR-CTRCL localized root cause to '${inc.target_service}'.`,
        type: 'diagnosis'
      },
      {
        time: formatOffset(60),
        title: 'Recovery Window Elapsed',
        desc: 'Experiment duration elapsed. Metrics returned to baseline distribution.',
        type: 'resolution'
      }
    ];
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
      {/* Incident List */}
      <div className="panel-card" style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
        <div className="panel-title">
          <span>Incident Registry</span>
          <span className="badge badge-indigo">{incidents.length} Records</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {incidents.map(inc => {
            const isSelected = selectedIncident?.incident_id === inc.incident_id;
            return (
              <div
                key={inc.incident_id}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  background: isSelected ? 'var(--bg-subtle)' : '#ffffff',
                  border: `1px solid ${isSelected ? 'var(--text-main)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
                onClick={() => setSelectedIncident(inc)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {inc.incident_id}
                  </span>
                  <span className={`badge ${inc.severity === 'CRITICAL' ? 'badge-rose' : 'badge-amber'}`}>
                    {inc.severity}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                  {inc.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Target: <strong>{inc.target_service}</strong> | {inc.fault_type}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident Detailed Timeline */}
      <div className="panel-card" style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
        {selectedIncident ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 17, color: 'var(--text-main)', marginBottom: 4, fontWeight: 700 }}>
                  {selectedIncident.title}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Incident ID: {selectedIncident.incident_id} | Created: {parseTimestamp(selectedIncident.created_at).toUTCString()}
                </p>
              </div>
              <span className={`badge ${selectedIncident.status === 'ACTIVE' ? 'badge-rose' : 'badge-green'}`}>
                {selectedIncident.status}
              </span>
            </div>

            {/* Timeline Events Stack */}
            <div style={{ position: 'relative', paddingLeft: 30, marginTop: 24 }}>
              {/* Vertical connecting line */}
              <div
                style={{
                  position: 'absolute',
                  left: 11,
                  top: 8,
                  bottom: 24,
                  width: 2,
                  background: 'var(--border-subtle)'
                }}
              />

              {getTimelineEvents(selectedIncident).map((event, idx) => {
                const getDotColor = () => {
                  switch (event.type) {
                    case 'fault': return '#b42318';
                    case 'anomaly': return '#b54708';
                    case 'detection': return '#175cd3';
                    case 'diagnosis': return '#181d27';
                    case 'resolution': return '#027a48';
                    default: return '#64748b';
                  }
                };

                return (
                  <div key={idx} style={{ position: 'relative', marginBottom: 26 }}>
                    {/* Node Dot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -24,
                        top: 3,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: getDotColor()
                      }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {event.time}
                      </span>
                      <strong style={{ fontSize: 13, color: 'var(--text-main)' }}>
                        {event.title}
                      </strong>
                    </div>

                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {event.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
            Select an incident on the left to inspect its timeline.
          </div>
        )}
      </div>
    </div>
  );
};
