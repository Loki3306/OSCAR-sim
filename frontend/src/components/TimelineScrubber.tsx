import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, ShieldCheck, Flame, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TimelineSliceData } from '../types';

interface TimelineScrubberProps {
  slices: TimelineSliceData[];
  currentOffset: number;
  onOffsetChange: (offset: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  slices,
  currentOffset,
  onOffsetChange,
  isPlaying,
  onTogglePlay
}) => {
  if (!slices || slices.length === 0) return null;

  const currentSlice = slices.find(s => s.offset_seconds === currentOffset) || slices[0];
  const currentIndex = slices.findIndex(s => s.offset_seconds === currentOffset);

  const handleStepBack = () => {
    if (currentIndex > 0) {
      onOffsetChange(slices[currentIndex - 1].offset_seconds);
    }
  };

  const handleStepForward = () => {
    if (currentIndex < slices.length - 1) {
      onOffsetChange(slices[currentIndex + 1].offset_seconds);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'BASELINING':
        return '#027a48'; // green
      case 'INJECTING':
        return '#b42318'; // red
      case 'OBSERVING':
        return '#b54708'; // amber
      case 'ANALYZING':
        return '#6941c6'; // purple
      case 'COMPLETED':
        return '#027a48'; // green
      default:
        return '#535862';
    }
  };

  const getPhaseDescription = (offset: number) => {
    if (offset < 0) {
      return 'Normal Steady-State: All services healthy, baseline ingress ~45 QPS, mean latency < 10ms.';
    } else if (offset === 0) {
      return 'T=0s Fault Injection: Query delay injected on PostgreSQL. Database latency jumps from 6ms to 280ms.';
    } else if (offset <= 10) {
      return 'T+5s Transit Cascade: Rust API connection pool exhausts waiting for DB replies. Caller latency climbs to 190ms.';
    } else if (offset < 60) {
      return 'T+15s Upstream Blast Radius: Nginx gateway waits on API; ingress latency spikes to 255ms. Redis unaffected.';
    } else if (offset < 75) {
      return 'T+60s Recovery Sequence: Injected delay released. Worker connections drain and queues normalize.';
    } else {
      return 'T+75s Restored Steady-State: Telemetry distributions return to baseline distribution.';
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={16} color="var(--text-main)" />
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>
            Synchronized Incident Timeline Scrubber
          </span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'monospace',
              background: `${getStateColor(currentSlice.experiment_state)}15`,
              color: getStateColor(currentSlice.experiment_state),
              border: `1px solid ${getStateColor(currentSlice.experiment_state)}40`
            }}
          >
            {currentSlice.experiment_state} ({currentSlice.timestamp})
          </span>
        </div>

        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="action-btn"
            style={{ padding: '4px 8px', fontSize: 11 }}
            onClick={handleStepBack}
            disabled={currentIndex <= 0}
            title="Step Back 1 interval"
          >
            <SkipBack size={12} />
          </button>
          <button
            className="action-btn primary"
            style={{ padding: '4px 12px', fontSize: 11 }}
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause replay scrubber' : 'Play real-time propagation playback'}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span style={{ marginLeft: 4 }}>{isPlaying ? 'Pause' : 'Play Replay'}</span>
          </button>
          <button
            className="action-btn"
            style={{ padding: '4px 8px', fontSize: 11 }}
            onClick={handleStepForward}
            disabled={currentIndex >= slices.length - 1}
            title="Step Forward 1 interval"
          >
            <SkipForward size={12} />
          </button>
        </div>
      </div>

      {/* Interactive Slider Track */}
      <div style={{ position: 'relative', width: '100%', margin: '4px 0' }}>
        <input
          type="range"
          min={0}
          max={slices.length - 1}
          value={currentIndex}
          onChange={e => {
            const idx = parseInt(e.target.value, 10);
            if (slices[idx]) onOffsetChange(slices[idx].offset_seconds);
          }}
          style={{
            width: '100%',
            cursor: 'pointer',
            accentColor: getStateColor(currentSlice.experiment_state)
          }}
        />

        {/* Timeline markers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'monospace', marginTop: 2 }}>
          {slices.map((s, idx) => (
            <span
              key={s.offset_seconds}
              style={{
                cursor: 'pointer',
                fontWeight: s.offset_seconds === currentOffset ? 800 : 400,
                color: s.offset_seconds === currentOffset ? getStateColor(s.experiment_state) : 'inherit'
              }}
              onClick={() => onOffsetChange(s.offset_seconds)}
            >
              {s.offset_seconds}s
            </span>
          ))}
        </div>
      </div>

      {/* Time-Indexed Phase Insight */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 12,
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        {currentOffset < 0 ? (
          <ShieldCheck size={14} color="#027a48" />
        ) : currentOffset === 0 ? (
          <Flame size={14} color="#b42318" />
        ) : currentOffset < 60 ? (
          <AlertTriangle size={14} color="#b54708" />
        ) : (
          <CheckCircle2 size={14} color="#027a48" />
        )}
        <span>{getPhaseDescription(currentOffset)}</span>
      </div>
    </div>
  );
};
