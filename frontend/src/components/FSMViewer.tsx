import React from 'react';
import { Activity, GitCommit, ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { FSMStatusResponse } from '../types';

interface FSMViewerProps {
  fsmData: FSMStatusResponse | null;
}

export const FSMViewer: React.FC<FSMViewerProps> = ({ fsmData }) => {
  if (!fsmData) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
        Loading Finite State Machine status...
      </div>
    );
  }

  const experimentStatesOrder = [
    'CREATED',
    'VALIDATING',
    'BASELINING',
    'INJECTING',
    'OBSERVING',
    'ANALYZING',
    'EVALUATING',
    'COMPLETED'
  ];

  const currentExpState = fsmData.experiment_state;
  const currentExpIndex = experimentStatesOrder.indexOf(currentExpState);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Experiment Lifecycle FSM Sequence */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={15} color="var(--text-main)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
              Experiment Lifecycle Finite State Machine
            </span>
          </div>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            Exp ID: {fsmData.experiment_id}
          </span>
        </div>

        {/* State Pipeline Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', paddingBottom: 6 }}>
          {experimentStatesOrder.map((state, idx) => {
            const isCurrent = state === currentExpState;
            const isPast = idx < currentExpIndex;

            let bgColor = '#f2f4f7';
            let textColor = '#667085';
            let borderColor = '#eaecf0';

            if (isCurrent) {
              bgColor = state === 'INJECTING' ? '#fee4e2' : state === 'OBSERVING' ? '#fef0c7' : '#e0eaff';
              textColor = state === 'INJECTING' ? '#b42318' : state === 'OBSERVING' ? '#b54708' : '#2e90fa';
              borderColor = textColor;
            } else if (isPast) {
              bgColor = '#ecfdf3';
              textColor = '#027a48';
              borderColor = '#abefc6';
            }

            return (
              <React.Fragment key={state}>
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: isCurrent ? 800 : 600,
                    fontFamily: 'monospace',
                    background: bgColor,
                    color: textColor,
                    border: `1px solid ${borderColor}`,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  {isPast ? <CheckCircle2 size={10} /> : <GitCommit size={10} />}
                  <span>{state}</span>
                </div>
                {idx < experimentStatesOrder.length - 1 && (
                  <ArrowRight size={10} color={isPast ? '#027a48' : '#98a2b3'} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Service Health FSM Matrix */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ShieldCheck size={15} color="var(--text-main)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
            Microservice Health State Machines
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {Object.entries(fsmData.service_states).map(([svcName, svcData]) => {
            const isHealthy = svcData.current_state === 'HEALTHY';
            const isDegraded = svcData.current_state === 'DEGRADED';
            const isUnavailable = svcData.current_state === 'UNAVAILABLE';

            const badgeBg = isHealthy ? '#ecfdf3' : isUnavailable ? '#fee4e2' : '#fef0c7';
            const badgeColor = isHealthy ? '#027a48' : isUnavailable ? '#b42318' : '#b54708';

            const latestTransition = svcData.history.length > 0 ? svcData.history[svcData.history.length - 1] : null;

            return (
              <div
                key={svcName}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>
                    {svcName}
                  </span>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 700,
                      background: badgeBg,
                      color: badgeColor
                    }}
                  >
                    {svcData.current_state}
                  </span>
                </div>
                {latestTransition && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Trigger: <span style={{ fontFamily: 'monospace' }}>{latestTransition.trigger_event}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
