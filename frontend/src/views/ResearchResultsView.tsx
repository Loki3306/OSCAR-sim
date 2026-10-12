import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, ShieldCheck, Image, Award, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { ResearchSummary } from '../types';

export const ResearchResultsView: React.FC = () => {
  const [summary, setSummary] = useState<ResearchSummary | null>(null);
  const [figures, setFigures] = useState<any[]>([]);
  const [selectedFigure, setSelectedFigure] = useState<string>('fig1_cpu_hit1_comparison');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResearchData();
  }, []);

  const loadResearchData = async () => {
    try {
      setLoading(true);
      const [sum, figRes] = await Promise.all([
        api.getResearchSummary(),
        api.getFigures()
      ]);
      setSummary(sum);
      setFigures(figRes.figures);
    } catch (err) {
      console.error('Failed to load research results', err);
    } finally {
      setLoading(false);
    }
  };

  const currentFig = figures.find(f => f.id === selectedFigure) || figures[0];

  return (
    <div>
      {/* Header Banner */}
      <div
        className="panel-card"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-primary)', marginBottom: 4 }}>
              <Award size={20} />
              <h2 style={{ fontSize: 16 }}>Phase II Verified Empirical Benchmark Campaign</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Rigorous comparative evaluation across <strong>120 Ground-Truth CPU Failure Cases</strong> in RCAEval (Online Boutique, Sock Shop, Train Ticket).
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-green" style={{ fontSize: 12, padding: '6px 12px' }}>
              McNemar p = 0.0433 vs RCD (Significant)
            </span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Table */}
      <div className="panel-card" style={{ marginBottom: 20 }}>
        <div className="panel-title">
          <span>Confirmatory Primary Localization Metrics (N=120 Incidents)</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace' }}>Standard 300s Pre / 300s Post Anomaly Windows</span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>RCA Algorithm</th>
              <th>Hit @ 1</th>
              <th>95% Bootstrap CI</th>
              <th>Hit @ 3</th>
              <th>Hit @ 5</th>
              <th>MRR</th>
              <th>Mean Runtime</th>
            </tr>
          </thead>
          <tbody>
            {summary?.algorithms.map(alg => {
              const isOscar = alg.algorithm.includes('OSCAR');
              return (
                <tr
                  key={alg.algorithm}
                  style={{
                    background: isOscar ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    fontWeight: isOscar ? 600 : 'normal'
                  }}
                >
                  <td>
                    <span style={{ color: isOscar ? 'var(--accent-primary)' : 'var(--text-main)' }}>
                      {alg.algorithm}
                    </span>
                    {isOscar && <span className="badge badge-indigo" style={{ marginLeft: 8 }}>PROPOSED</span>}
                  </td>
                  <td className="font-mono font-bold" style={{ color: isOscar ? 'var(--accent-emerald)' : 'inherit' }}>
                    {(alg.hit_1 * 100).toFixed(1)}%
                  </td>
                  <td className="font-mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    [{alg.ci_lower.toFixed(3)}, {alg.ci_upper.toFixed(3)}]
                  </td>
                  <td className="font-mono">{(alg.hit_3 * 100).toFixed(1)}%</td>
                  <td className="font-mono">{(alg.hit_5 * 100).toFixed(1)}%</td>
                  <td className="font-mono font-bold">{(alg.mrr).toFixed(3)}</td>
                  <td className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {alg.avg_runtime_sec.toFixed(2)}s
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Verified Publication Figures Gallery */}
      <div className="panel-card">
        <div className="panel-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image size={16} color="var(--accent-cyan)" />
            <span>Empirical Evidence & Publication Figure Viewer</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Rendered from reproducible experiments</span>
        </div>

        {/* Figure Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {figures.map(fig => (
            <button
              key={fig.id}
              className={`action-btn ${selectedFigure === fig.id ? 'primary' : ''}`}
              style={{ fontSize: 11 }}
              onClick={() => setSelectedFigure(fig.id)}
            >
              {fig.title}
            </button>
          ))}
        </div>

        {/* Selected Figure Display */}
        {currentFig && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 20, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 15, color: 'var(--text-main)' }}>{currentFig.title}</h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{currentFig.description}</p>
            </div>
            <img
              src={currentFig.url}
              alt={currentFig.title}
              style={{
                maxWidth: '100%',
                maxHeight: '480px',
                objectFit: 'contain',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
