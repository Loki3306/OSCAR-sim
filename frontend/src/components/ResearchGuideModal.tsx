import React from 'react';
import { X, BookOpen, Cpu, Network, ShieldCheck, ArrowRight, Activity, Database } from 'lucide-react';

interface ResearchGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResearchGuideModal: React.FC<ResearchGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 780, maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} color="var(--text-main)" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
              About OSCAR: System Architecture & Research Program
            </h2>
          </div>
          <button className="action-btn" style={{ padding: 4 }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontSize: 13, lineHeight: 1.6, color: 'var(--text-main)' }}>
          {/* Section 1 */}
          <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--text-main)' }}>
              1. What is OSCAR & The Root Cause Problem?
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Modern cloud applications are composed of dozens of microservices communicating over HTTP and RPC calls:
            </p>
            <div style={{ margin: '8px 0', padding: '6px 12px', background: '#ffffff', borderRadius: 6, border: '1px solid var(--border-subtle)', fontFamily: 'monospace', fontSize: 12 }}>
              Client → Nginx Proxy → Rust Axum API → PostgreSQL Storage / Redis Cache
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              When a leaf service (like <strong>PostgreSQL</strong>) suffers severe <strong>CPU saturation</strong>, its query response times spike. The upstream <strong>API gateway</strong> waits on database connection pools, causing its own request queues to fill up and its latency to skyrocket.
            </p>
            <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>
              <strong>The Cascading Victim Trap:</strong> Naive monitoring tools alert on the API gateway or Nginx because they observe high latency. An engineer or automated system might mistakenly restart the API gateway, leaving the real culprit (database CPU exhaustion) unaddressed. <strong>Root Cause Analysis (RCA)</strong> algorithms solve this by mathematically localizing the true source.
            </p>
          </div>

          {/* Section 2 */}
          <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--text-main)' }}>
              2. Our Proposed Method: OSCAR-CTRCL
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              <strong>OSCAR-CTRCL (Causal-Temporal Root Cause Localizer)</strong> resolves the victim trap using four complementary principles:
            </p>
            <ul style={{ paddingLeft: 18, marginTop: 6, color: 'var(--text-muted)' }}>
              <li><strong>Distribution Shift Invariance (DSI):</strong> Quantifies pre- vs. post-failure metric divergence using normalized pooled standard deviations.</li>
              <li><strong>Physical Resource Prioritization (PRP):</strong> Weights hardware metrics (CPU, memory, disk) higher than transit symptoms (latency, queue time).</li>
              <li><strong>Topological Invariance Propagation (TIP):</strong> Propagates anomaly scores across the microservice call graph.</li>
              <li><strong>The Callee Dominance Rule:</strong> When a downstream callee (e.g. PostgreSQL) exhibits hardware exhaustion, the upstream caller's (API) suspicion score is automatically dampened ($\times 0.7$). This prevents the victim from being ranked #1!</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--text-main)' }}>
              3. The RCAEval Benchmark & Phase II Findings
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              We benchmarked OSCAR against 6 established baseline algorithms (<strong>RCD</strong>, <strong>Multi-Source BARO</strong>, <strong>BARO</strong>, <strong>$\epsilon$-Diagnosis</strong>, <strong>MicroCause</strong>, and <strong>CIRCA</strong>) on the official <strong>RCAEval dataset (735 cases)</strong> across Online Boutique, Sock Shop, and Train Ticket.
            </p>
            <div style={{ marginTop: 10, overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Algorithm</th>
                    <th>Hit @ 1</th>
                    <th>Hit @ 3</th>
                    <th>MRR</th>
                    <th>Runtime</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ fontWeight: 700 }}>
                    <td>OSCAR-CTRCL (Proposed)</td>
                    <td><span className="badge badge-green">92.5%</span> (111/120)</td>
                    <td>97.5%</td>
                    <td>0.943</td>
                    <td>0.08s</td>
                  </tr>
                  <tr>
                    <td>RCD (PC Causal Discovery)</td>
                    <td><span className="badge badge-indigo">83.3%</span> (100/120)</td>
                    <td>91.7%</td>
                    <td>0.908</td>
                    <td>1.84s</td>
                  </tr>
                  <tr>
                    <td>Multi-Source BARO</td>
                    <td>75.8% (91/120)</td>
                    <td>87.5%</td>
                    <td>0.845</td>
                    <td>0.12s</td>
                  </tr>
                  <tr>
                    <td>$\epsilon$-Diagnosis</td>
                    <td>70.8% (85/120)</td>
                    <td>82.5%</td>
                    <td>0.799</td>
                    <td>0.05s</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
              <strong>Statistical Significance:</strong> An exact McNemar test on discordance (n10 = 18, n01 = 7) confirmed p = 0.0433, establishing statistically defensible superiority over the leading baseline RCD.
            </p>
          </div>

          {/* Section 4 */}
          <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--text-main)' }}>
              4. How to Use the Two Operating Modes
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>
              <strong>Mode A (Simulation Lab):</strong> When Docker is running, you can inject live faults and observe real container metrics. When Docker is offline, the platform transparently operates in <strong>Replay Demonstration Mode</strong>, loading the recorded experiment <code>EXP-postgres_cpu_stress_001</code> and running real RCA algorithms on that telemetry.
            </p>
            <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>
              <strong>Mode B (Research Benchmark Lab):</strong> Explore all 735 RCAEval cases, inspect raw time series, run multi-algorithm diagnostics, review Phase II figures, and export publication-ready reports.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="action-btn primary" onClick={onClose}>
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
