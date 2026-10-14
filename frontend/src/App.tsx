import React, { useState, useEffect } from 'react';
import { Navigation, ViewType } from './components/Navigation';
import { Header } from './components/Header';
import { OverviewView } from './views/OverviewView';
import { TopologyView } from './views/TopologyView';
import { PropagationTraceView } from './views/PropagationTraceView';
import { ObservabilityView } from './views/ObservabilityView';
import { FaultLabView } from './views/FaultLabView';
import { IncidentTimelineView } from './views/IncidentTimelineView';
import { RCAWorkbenchView } from './views/RCAWorkbenchView';
import { BenchmarkExplorerView } from './views/BenchmarkExplorerView';
import { ResearchResultsView } from './views/ResearchResultsView';
import { ReportCenterView } from './views/ReportCenterView';
import { api } from './services/api';
import { SystemStatus, InvestigationFlowContext } from './types';
import { PlayCircle, CheckCircle2, ArrowRight, Zap } from 'lucide-react';

import { ResearchGuideModal } from './components/ResearchGuideModal';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // Guided Investigation Flow State
  const [investigationContext, setInvestigationContext] = useState<InvestigationFlowContext | null>(null);

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

  const handleNavigateWithContext = (view: ViewType, context?: Partial<InvestigationFlowContext>) => {
    if (context) {
      setInvestigationContext(prev => ({
        incidentId: context.incidentId || prev?.incidentId || '',
        scenarioId: context.scenarioId || prev?.scenarioId || 'slow_database',
        targetService: context.targetService || prev?.targetService || 'postgres',
        stage: context.stage || 'propagating',
        autoAdvance: context.autoAdvance !== undefined ? context.autoAdvance : true
      }));
    }
    setCurrentView(view);
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
      setCurrentView('fault_trace');
      setDemoBanner('Step 3 of 5: Fault Propagation Trace. Traveling shockwave cascading hop-by-hop across services.');
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
      case 'overview': return <OverviewView onNavigate={handleNavigateWithContext} onOpenGuide={() => setIsGuideOpen(true)} />;
      case 'topology': return <TopologyView />;
      case 'fault_trace': return <PropagationTraceView investigationContext={investigationContext} onNavigate={handleNavigateWithContext} />;
      case 'observability': return <ObservabilityView />;
      case 'fault_lab': return <FaultLabView onNavigate={handleNavigateWithContext} />;
      case 'timeline': return <IncidentTimelineView />;
      case 'rca_workbench': return <RCAWorkbenchView investigationContext={investigationContext} onNavigate={handleNavigateWithContext} />;
      case 'benchmark': return <BenchmarkExplorerView />;
      case 'research': return <ResearchResultsView />;
      case 'reports': return <ReportCenterView investigationContext={investigationContext} onNavigate={handleNavigateWithContext} />;
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

        {/* Guided Investigation Stepper Banner */}
        {investigationContext && (
          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '8px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              fontWeight: 600,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8' }}>
                <Zap size={14} />
                <span>ACTIVE INCIDENT: {investigationContext.scenarioId.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    color: currentView === 'fault_trace' ? '#38bdf8' : '#94a3b8'
                  }}
                  onClick={() => handleNavigateWithContext('fault_trace')}
                >
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: currentView === 'fault_trace' ? '#38bdf8' : '#334155', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>1</span>
                  <span>1. Traveling Cascade</span>
                </div>
                <ArrowRight size={12} color="#64748b" />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    color: currentView === 'rca_workbench' ? '#38bdf8' : '#94a3b8'
                  }}
                  onClick={() => handleNavigateWithContext('rca_workbench')}
                >
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: currentView === 'rca_workbench' ? '#38bdf8' : '#334155', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>2</span>
                  <span>2. Multi-Algorithm RCA</span>
                </div>
                <ArrowRight size={12} color="#64748b" />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    color: currentView === 'reports' ? '#38bdf8' : '#94a3b8'
                  }}
                  onClick={() => handleNavigateWithContext('reports')}
                >
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: currentView === 'reports' ? '#38bdf8' : '#334155', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>3</span>
                  <span>3. SRE Post-Mortem Report</span>
                </div>
              </div>
            </div>

            <button
              className="action-btn"
              style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '3px 8px', fontSize: 10 }}
              onClick={() => setInvestigationContext(null)}
            >
              ✕ Close Flow
            </button>
          </div>
        )}

        {/* Guided Demo Progression Banner */}
        {demoBanner && !investigationContext && (
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
