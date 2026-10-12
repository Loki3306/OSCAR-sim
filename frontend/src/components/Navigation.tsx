import React from 'react';
import {
  LayoutDashboard,
  Network,
  Activity,
  Flame,
  Clock,
  Cpu,
  Database,
  BarChart3,
  FileText,
  Radio,
  Server
} from 'lucide-react';
import { SystemStatus } from '../types';

export type ViewType =
  | 'overview'
  | 'topology'
  | 'observability'
  | 'fault_lab'
  | 'timeline'
  | 'rca_workbench'
  | 'benchmark'
  | 'research'
  | 'reports';

interface NavigationProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  systemStatus: SystemStatus | null;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onSelectView,
  systemStatus
}) => {
  return (
    <aside className="sidebar">
      <div className="brand-section">
        <div className="brand-badge">OSCAR</div>
        <div className="brand-text">
          <h1>RCA Platform</h1>
          <p>Microservice Diagnostics</p>
        </div>
      </div>

      <nav className="nav-menu">
        <div className="nav-section-title">Mode A: Simulation Lab</div>
        
        <button
          className={`nav-item ${currentView === 'overview' ? 'active' : ''}`}
          onClick={() => onSelectView('overview')}
        >
          <LayoutDashboard className="icon" />
          <span>System Overview</span>
        </button>

        <button
          className={`nav-item ${currentView === 'topology' ? 'active' : ''}`}
          onClick={() => onSelectView('topology')}
        >
          <Network className="icon" />
          <span>Service Topology</span>
        </button>

        <button
          className={`nav-item ${currentView === 'observability' ? 'active' : ''}`}
          onClick={() => onSelectView('observability')}
        >
          <Activity className="icon" />
          <span>Live Observability</span>
        </button>

        <button
          className={`nav-item ${currentView === 'fault_lab' ? 'active' : ''}`}
          onClick={() => onSelectView('fault_lab')}
        >
          <Flame className="icon" />
          <span>Fault Laboratory</span>
        </button>

        <button
          className={`nav-item ${currentView === 'timeline' ? 'active' : ''}`}
          onClick={() => onSelectView('timeline')}
        >
          <Clock className="icon" />
          <span>Incident Timeline</span>
        </button>

        <button
          className={`nav-item ${currentView === 'rca_workbench' ? 'active' : ''}`}
          onClick={() => onSelectView('rca_workbench')}
        >
          <Cpu className="icon" />
          <span>RCA Workbench</span>
        </button>

        <div className="nav-section-title">Mode B: Research Benchmark</div>

        <button
          className={`nav-item ${currentView === 'benchmark' ? 'active' : ''}`}
          onClick={() => onSelectView('benchmark')}
        >
          <Database className="icon" />
          <span>Benchmark Explorer</span>
        </button>

        <button
          className={`nav-item ${currentView === 'research' ? 'active' : ''}`}
          onClick={() => onSelectView('research')}
        >
          <BarChart3 className="icon" />
          <span>Research Results</span>
        </button>

        <button
          className={`nav-item ${currentView === 'reports' ? 'active' : ''}`}
          onClick={() => onSelectView('reports')}
        >
          <FileText className="icon" />
          <span>Report Center</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="status-chip">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              className={`status-dot ${
                systemStatus?.docker_available
                  ? 'healthy'
                  : systemStatus?.mode === 'REPLAY_DEMO'
                  ? 'replay'
                  : 'unhealthy'
              }`}
            />
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {systemStatus?.mode || 'CONNECTING...'}
            </span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {systemStatus?.docker_available ? 'Docker Live' : 'Replay Fallback'}
          </span>
        </div>
      </div>
    </aside>
  );
};
