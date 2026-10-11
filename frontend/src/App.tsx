import React, { useState, useEffect } from 'react';
import { Navigation, ViewType } from './components/Navigation';
import { Header } from './components/Header';
import { OverviewView } from './views/OverviewView';
import { TopologyView } from './views/TopologyView';
import { ObservabilityView } from './views/ObservabilityView';
import { FaultLabView } from './views/FaultLabView';
import { IncidentTimelineView } from './views/IncidentTimelineView';
import { RCAWorkbenchView } from './views/RCAWorkbenchView';
import { BenchmarkExplorerView } from './views/BenchmarkExplorerView';
import { ResearchResultsView } from './views/ResearchResultsView';
import { ReportCenterView } from './views/ReportCenterView';
import { api } from './services/api';
import { SystemStatus } from './types';
import { PlayCircle, CheckCircle2, ArrowRight } from 'lucide-react';

import { ResearchGuideModal } from './components/ResearchGuideModal';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // Guided Demo Mode State
  const [demoStep, setDemoStep] = useState<number | null>(null);
  const [demoBanner, setDemoBanner] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const status = await api.getSystemStatus();
      setSystemStatus(status);
    } catch (err) {
      console.error('Failed to poll system status', err);
    }
  };

  const startGuidedDemo = () => {
    setDemoStep(1);
    setCurrentView('topology');
    setDemoBanner('Step 1 of 5: Microservice Topology. Baseline state active across 5 services.');
  };

  const nextDemoStep = async () => {
    if (demoStep === 1) {
      setDemoStep(2);
      setCurrentView('fault_lab');
      setDemoBanner('Step 2 of 5: Fault Laboratory. Triggering CPU stress experiment on postgres...');
      try {
        await api.injectFault({
          target_service: 'postgres',
          fault_type: 'cpu_stress',
          intensity: 85,
          duration_seconds: 60
        });
      } catch (e) {}
    } else if (demoStep === 2) {
      setDemoStep(3);
      setCurrentView('observability');
      setDemoBanner('Step 3 of 5: Telemetry Streams. PostgreSQL CPU spikes while API gateway experiences latency queueing.');
    } else if (demoStep === 3) {
      setDemoStep(4);
      setCurrentView('rca_workbench');
      setDemoBanner('Step 4 of 5: RCA Workbench. Executing multi-model diagnosis (OSCAR-CTRCL, RCD, BARO).');
    } else if (demoStep === 4) {
      setDemoStep(5);
      setCurrentView('reports');
      setDemoBanner('Step 5 of 5: Report Center. Exportable SRE post-mortem report synthesized from experiment data.');
    } else {
      // Finish demo
      setDemoStep(null);
      setDemoBanner(null);
      setCurrentView('overview');
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'overview': return <OverviewView onNavigate={setCurrentView} onOpenGuide={() => setIsGuideOpen(true)} />;
      case 'topology': return <TopologyView />;
      case 'observability': return <ObservabilityView />;
      case 'fault_lab': return <FaultLabView />;
      case 'timeline': return <IncidentTimelineView />;
      case 'rca_workbench': return <RCAWorkbenchView />;
      case 'benchmark': return <BenchmarkExplorerView />;
      case 'research': return <ResearchResultsView />;
      case 'reports': return <ReportCenterView />;
    }
  };

  return (
    <div className="app-container">
      <Navigation
        currentView={currentView}
        onSelectView={setCurrentView}
        systemStatus={systemStatus}
      />

      <div className="main-wrapper">
        <Header
          currentView={currentView}
          systemStatus={systemStatus}
          onRefresh={fetchStatus}
          onStartGuidedDemo={startGuidedDemo}
          onOpenGuide={() => setIsGuideOpen(true)}
          isDemoRunning={demoStep !== null}
        />

        {/* Guided Demo Progression Banner */}
        {demoBanner && (
          <div
            style={{
              background: 'var(--text-main)',
              color: '#ffffff',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 13,
              fontWeight: 500,
              boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <PlayCircle size={17} />
              <span>{demoBanner}</span>
            </div>
            <button
              className="action-btn"
              style={{ background: '#ffffff', color: 'var(--text-main)', border: 'none', fontWeight: 600, padding: '5px 12px' }}
              onClick={nextDemoStep}
            >
              {demoStep === 5 ? 'Finish Demo' : 'Proceed to Next Step'}
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        <main className="content-scroll">
          {renderView()}
        </main>
      </div>

      <ResearchGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};
export default App;
