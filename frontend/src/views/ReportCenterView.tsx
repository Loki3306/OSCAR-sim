import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  Database,
  Layers,
  ChevronRight,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import {
  RichIncidentReport,
  InvestigationFlowContext
} from '../types';

interface ReportCenterViewProps {
  investigationContext?: InvestigationFlowContext | null;
  onNavigate?: (view: any, context?: any) => void;
}

export const ReportCenterView: React.FC<ReportCenterViewProps> = ({
  investigationContext,
  onNavigate
}) => {
  const [reportData, setReportData] = useState<RichIncidentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual_postmortem' | 'raw_markdown'>('visual_postmortem');
  const [rawMarkdown, setRawMarkdown] = useState<string>('');

  useEffect(() => {
    loadReport();
  }, [investigationContext?.incidentId, investigationContext?.scenarioId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const incId = investigationContext?.incidentId;
      const scenId = investigationContext?.scenarioId;
      const data = await api.getIncidentReportDetail(incId, scenId);
      setReportData(data);

      // Pre-fetch raw markdown in case user toggles view
      const md = await api.getReport('incident', 'markdown', incId, scenId);
      setRawMarkdown(md);
    } catch (err) {
      console.error('Failed to load incident report', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = async () => {
    try {
      const htmlText = await api.getReport(
        'incident',
        'html',
        investigationContext?.incidentId,
        investigationContext?.scenarioId
      );
      const blob = new Blob([htmlText], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OSCAR_SRE_PostMortem_${reportData?.incident_metadata.incident_id || 'INC'}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const handleCopyJson = () => {
    if (!reportData) return;
    navigator.clipboard.writeText(JSON.stringify(reportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !reportData) {
    return (
      <div className="panel-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <Activity size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
        <div>Synthesizing Publication-Grade SRE Post-Mortem Report from experiment telemetry...</div>
      </div>
    );
  }

  const meta = reportData.incident_metadata;
  const summary = reportData.executive_summary;
  const proofs = reportData.telemetry_proofs;
  const stats = reportData.statistical_verification;
  const prop = reportData.propagation_summary;
  const consensus = reportData.algorithm_consensus;
  const playbook = reportData.remediation_playbook;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Investigation Flow Stage 3 Banner */}
      {investigationContext && (
        <div
          style={{
            padding: '10px 16px',
            background: '#ecfdf3',
            border: '1px solid #abefc6',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#027a48',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 800
              }}
            >
              3
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#027a48' }}>
                End-to-End Investigation Complete: Executive SRE Post-Mortem Report Ready
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Traveling cascade tracked • Multi-model diagnosis verified • Telemetric proofs & playbooks synthesized.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onNavigate && (
              <button
                className="action-btn"
                style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700 }}
                onClick={() => onNavigate('fault_lab')}
              >
                <RotateCcw size={12} />
                <span>Start New Experiment</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Controls Toolbar */}
      <div className="panel-card" style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#f0fdf4', padding: 6, borderRadius: 6, border: '1px solid #bbf7d0' }}>
              <FileText size={18} color="#15803d" />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Executive SRE Post-Mortem Report Center
              </h2>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Production-grade diagnostic document with quantitative metrics, changepoints, architecture blast paths, and consensus matrix.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 6, padding: 2, border: '1px solid var(--border-subtle)', marginRight: 6 }}>
              <button
                className="action-btn"
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: activeTab === 'visual_postmortem' ? 800 : 500,
                  background: activeTab === 'visual_postmortem' ? '#ffffff' : 'transparent',
                  color: activeTab === 'visual_postmortem' ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'visual_postmortem' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
                onClick={() => setActiveTab('visual_postmortem')}
              >
                Executive Layout
              </button>
              <button
                className="action-btn"
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: activeTab === 'raw_markdown' ? 800 : 500,
                  background: activeTab === 'raw_markdown' ? '#ffffff' : 'transparent',
                  color: activeTab === 'raw_markdown' ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'raw_markdown' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
                onClick={() => setActiveTab('raw_markdown')}
              >
                Raw Text / Markdown
              </button>
            </div>

            <button
              className="action-btn"
              style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={handleCopyJson}
            >
              {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
              <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
            </button>

            <button
              className="action-btn"
              style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={handlePrint}
            >
              <Printer size={13} />
              <span>Print / Save PDF</span>
            </button>

            <button
              className="action-btn primary"
              style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={handleDownloadHtml}
            >
              <Download size={13} />
              <span>Download HTML Report</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'raw_markdown' ? (
        <div className="panel-card" style={{ padding: 20 }}>
          <pre style={{ margin: 0, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {rawMarkdown}
          </pre>
        </div>
      ) : (
        /* Executive Document Layout */
        <div
          className="panel-card"
          style={{
            padding: 32,
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)'
          }}
        >
          {/* Document Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f2f4f7', paddingBottom: 20, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                OSCAR 2.0 • SRE Distributed Systems Laboratory
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-main)', margin: '4px 0 6px 0' }}>
                Incident Post-Mortem & Diagnostic Synthesis Report
              </h1>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Incident ID: <code style={{ fontWeight: 800 }}>{meta.incident_id}</code> | Category: <strong>{meta.scenario_name}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  background: meta.severity === 'CRITICAL' ? '#fee4e2' : '#fef0c7',
                  color: meta.severity === 'CRITICAL' ? '#b42318' : '#b54708',
                  border: `1px solid ${meta.severity === 'CRITICAL' ? '#fda29b' : '#fedf89'}`
                }}
              >
                {meta.severity} SEVERITY
              </span>
              <div style={{ marginTop: 6 }}>
                <span className="badge badge-emerald">{meta.status}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'monospace' }}>
                {meta.created_at}
              </div>
            </div>
          </div>

          {/* Key Metrics Overview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Microservice</div>
              <div className="font-mono" style={{ fontSize: 16, fontWeight: 900, color: '#b42318', marginTop: 4 }}>
                {meta.target_service}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{meta.target_label}</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Blast Radius Scope</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-main)', marginTop: 4 }}>
                {meta.impact_scope}
              </div>
              <div style={{ fontSize: 11, color: '#027a48', marginTop: 2 }}>Confined propagation</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Propagation Latency</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-main)', marginTop: 4 }}>
                {prop.total_propagation_ms} ms
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Hop 0 to Ingress Edge</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Detection Confidence</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#027a48', marginTop: 4 }}>
                {stats.confidence_level}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>z-score = +{stats.z_score}</div>
            </div>
          </div>

          {/* Executive Summary Callout */}
          <div
            style={{
              background: '#eff8ff',
              border: '1px solid #b2ddff',
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: 28,
              fontSize: 13,
              color: '#175cd3',
              lineHeight: 1.5
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Executive Summary & Impact Scope</div>
            <div style={{ fontWeight: 600 }}>{summary.headline}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#1e40af' }}>{summary.problem_description}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#1e40af' }}>{summary.impact_assessment}</div>
          </div>

          {/* Section 1: Telemetric Proofs of Fault Detection */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 14 }}>
              1. Telemetric Proofs & Anomaly Verification (Baseline vs Incident Peak)
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Empirical measurements comparing 300-second pre-fault baseline distribution against peak incident telemetry across affected services.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
              {proofs.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    background: p.severity === 'critical' ? '#fffbfa' : '#fffdf5',
                    border: `1px solid ${p.severity === 'critical' ? '#fda29b' : '#fedf89'}`,
                    borderRadius: 8,
                    padding: 14
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                    {p.metric}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                    Service: <code style={{ fontWeight: 700 }}>{p.service}</code>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Baseline: {p.baseline}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: p.severity === 'critical' ? '#b42318' : '#b54708', marginTop: 2 }}>
                        {p.incident_peak}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 800,
                        background: p.severity === 'critical' ? '#fee4e2' : '#fef0c7',
                        color: p.severity === 'critical' ? '#b42318' : '#b54708'
                      }}
                    >
                      {p.delta}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: 6 }}>
                    SLA Threshold: <code>{p.threshold}</code> (Breached)
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: 14,
                fontSize: 12,
                color: 'var(--text-main)',
                lineHeight: 1.5
              }}
            >
              <strong>Statistical Anomaly Proof:</strong> Change-point detected at <code>{stats.anomaly_changepoint_time}</code> with critical severity score <code>z = +{stats.z_score}</code> (Mann-Whitney U <code>p = {stats.p_value}</code>). {stats.unaffected_branch_proof}
            </div>
          </div>

          {/* Section 2: Causal Traceability & Propagation Diagram */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 14 }}>
              2. Cascading Propagation & Causal Blast Traceability
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Hop-by-hop shockwave wavefront traveling across dependency edges from the target microservice to ingress gateway.
            </p>

            {/* Visual Blast Pipeline */}
            <div
              style={{
                background: '#fafbfc',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '18px 24px',
                marginBottom: 16
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>
                Wavefront Propagation Sequence (Left ➔ Right):
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                {prop.hops.map((h, i) => (
                  <React.Fragment key={h.hop_index}>
                    <div
                      style={{
                        padding: '8px 12px',
                        background: h.role === 'root_cause' ? '#fee4e2' : (h.role.includes('caller') ? '#fef0c7' : '#f1f5f9'),
                        border: `1px solid ${h.role === 'root_cause' ? '#fda29b' : (h.role.includes('caller') ? '#fedf89' : '#cbd5e1')}`,
                        borderRadius: 6,
                        textAlign: 'center',
                        minWidth: 110
                      }}
                    >
                      <div className="font-mono" style={{ fontSize: 12, fontWeight: 800, color: h.role === 'root_cause' ? '#b42318' : '#1e293b' }}>
                        {h.service}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        T+{h.offset_ms}ms
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: h.role === 'root_cause' ? '#b42318' : '#64748b', marginTop: 2 }}>
                        {h.role.replace('_', ' ')}
                      </div>
                    </div>
                    {i < prop.hops.length - 1 && (
                      <ArrowRight size={16} color="#94a3b8" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Hop Ledger Table */}
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ width: 85 }}>Timing</th>
                  <th style={{ width: 140 }}>Service</th>
                  <th style={{ width: 140 }}>Causal Role</th>
                  <th>Causal Propagation Mechanism & Observed Telemetry</th>
                </tr>
              </thead>
              <tbody>
                {prop.hops.map(h => (
                  <tr key={h.hop_index}>
                    <td className="font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                      T+{h.offset_ms}ms
                    </td>
                    <td>
                      <code style={{ fontWeight: 700, fontSize: 12 }}>{h.service}</code>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{h.display_name}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: h.role === 'root_cause' ? '#fee4e2' : '#fef0c7',
                          color: h.role === 'root_cause' ? '#b42318' : '#b54708'
                        }}
                      >
                        {h.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-main)', lineHeight: 1.4 }}>
                      {h.causal_mechanism}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Multi-Algorithm RCA Consensus */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 14 }}>
              3. Multi-Algorithm RCA Consensus & Root Cause Attribution Matrix
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Comparison of candidate localization across counterfactual reasoning (OSCAR-CTRCL) and baseline causal/correlation methods.
            </p>

            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Rank-1 Predicted Service</th>
                  <th style={{ textAlign: 'right', width: 85 }}>Confidence</th>
                  <th style={{ width: 180 }}>Ground-Truth Verdict</th>
                  <th>Attribution Rationale & Error Analysis</th>
                </tr>
              </thead>
              <tbody>
                {consensus.map((a, idx) => (
                  <tr key={idx} style={{ background: a.algorithm.includes('OSCAR') ? '#faf8f5' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: 800, color: a.algorithm.includes('OSCAR') ? '#0f172a' : 'var(--text-main)' }}>
                        {a.algorithm}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>v{a.version} • {a.runtime_ms}ms</div>
                    </td>
                    <td>
                      <code style={{ fontSize: 13, fontWeight: 800, color: a.is_match ? '#027a48' : '#b42318' }}>
                        {a.predicted_service}
                      </code>
                    </td>
                    <td className="font-mono font-bold" style={{ textAlign: 'right' }}>
                      {(a.confidence_score * 100).toFixed(1)}%
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 800,
                          background: a.is_match ? '#ecfdf3' : '#fee4e2',
                          color: a.is_match ? '#027a48' : '#b42318',
                          border: `1px solid ${a.is_match ? '#abefc6' : '#fda29b'}`
                        }}
                      >
                        {a.verdict}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-main)', lineHeight: 1.4 }}>
                      {a.attribution_rationale}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4: Remediation Playbook */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 14 }}>
              4. Actionable SRE Remediation & Prevention Playbook
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#fffbfa', border: '1px solid #fda29b', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#b42318', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={14} />
                  <span>Immediate Operational Mitigations</span>
                </div>
                <ul style={{ fontSize: 12, color: 'var(--text-main)', paddingLeft: 18, margin: 0, lineHeight: 1.6 }}>
                  {playbook.immediate_mitigations.map((m, idx) => (
                    <li key={idx} style={{ marginBottom: 6 }}>{m}</li>
                  ))}
                </ul>
              </div>

              <div style={{ background: '#f6fef9', border: '1px solid #abefc6', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#027a48', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={14} />
                  <span>Long-Term Architectural Safeguards</span>
                </div>
                <ul style={{ fontSize: 12, color: 'var(--text-main)', paddingLeft: 18, margin: 0, lineHeight: 1.6 }}>
                  {playbook.architectural_recommendations.map((a, idx) => (
                    <li key={idx} style={{ marginBottom: 6 }}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
