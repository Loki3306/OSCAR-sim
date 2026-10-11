import React from 'react';
import { RefreshCw, PlayCircle, AlertTriangle, BookOpen, Layers } from 'lucide-react';
import { ViewType } from './Navigation';
import { SystemStatus } from '../types';

interface HeaderProps {
  currentView: ViewType;
  systemStatus: SystemStatus | null;
  onRefresh: () => void;
  onStartGuidedDemo: () => void;
  onOpenGuide: () => void;
  isDemoRunning?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  systemStatus,
  onRefresh,
  onStartGuidedDemo,
  onOpenGuide,
  isDemoRunning
}) => {
  const isModeB = ['benchmark', 'research', 'reports'].includes(currentView);

  const getTitle = () => {
    switch (currentView) {
      case 'overview': return 'Executive System Health & Incidents';
      case 'topology': return 'Microservice Call Graph & Dependency Topology';
      case 'observability': return 'Telemetry Observability & Metric Streams';
      case 'fault_lab': return 'Controlled Fault Injection Laboratory';
      case 'timeline': return 'Synchronized Incident & Anomaly Timeline';
      case 'rca_workbench': return 'Multi-Model RCA Engine & Candidate Consensus';
      case 'benchmark': return 'RCAEval Benchmark Explorer (735 Incidents)';
      case 'research': return 'Phase II Empirical Results & Statistical Matrix';
      case 'reports': return 'Incident Post-Mortem & Scientific Report Center';
    }
  };

  return (
    <header className="top-header">
      <div className="header-left">
        <h2 className="view-title">{getTitle()}</h2>
        <span className={`mode-badge ${isModeB ? 'mode-b' : 'mode-a'}`}>
          {isModeB ? 'Mode B: Research Benchmark Lab' : 'Mode A: Simulation Lab'}
        </span>
        {systemStatus && (
          <span className={`badge ${systemStatus.docker_available ? 'badge-green' : 'badge-amber'}`}>
            {systemStatus.docker_available ? 'Docker Cluster Live' : 'Replay Archive Mode'}
          </span>
        )}
        {systemStatus && systemStatus.active_faults_count > 0 && (
          <span className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={12} />
            {systemStatus.active_faults_count} Active Fault(s)
          </span>
        )}
      </div>

      <div className="header-right">
        <button
          className="action-btn"
          onClick={onOpenGuide}
          title="Learn how OSCAR works and review research findings"
        >
          <BookOpen size={13} />
          About & Research Guide
        </button>

        <button
          className="action-btn"
          onClick={onRefresh}
          title="Refresh Current Telemetry"
        >
          <RefreshCw size={13} />
          Refresh
        </button>

        <button
          className={`action-btn ${isDemoRunning ? 'danger' : 'primary'}`}
          onClick={onStartGuidedDemo}
        >
          <PlayCircle size={14} />
          {isDemoRunning ? 'Demo Running...' : 'Guided 5-Min Demo'}
        </button>
      </div>
    </header>
  );
};
