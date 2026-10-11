import React, { useState, useEffect } from 'react';
import { FileText, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

export const ReportCenterView: React.FC = () => {
  const [reportType, setReportType] = useState<'incident' | 'comparison' | 'benchmark_audit'>('incident');
  const [reportFormat, setReportFormat] = useState<'markdown' | 'html'>('markdown');
  const [reportContent, setReportContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [reportType, reportFormat]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const text = await api.getReport(reportType, reportFormat);
      setReportContent(text);
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportContent], {
      type: reportFormat === 'html' ? 'text/html' : 'text/markdown'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OSCAR_${reportType}_report.${reportFormat === 'html' ? 'html' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
      {/* Report Generator Controls */}
      <div className="panel-card">
        <div className="panel-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="var(--accent-primary)" />
            <span>Report Configuration</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Report Category
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className={`action-btn ${reportType === 'incident' ? 'primary' : ''}`}
                style={{ justifyContent: 'flex-start', padding: 10 }}
                onClick={() => setReportType('incident')}
              >
                SRE Incident Diagnostic Post-Mortem
              </button>
              <button
                className={`action-btn ${reportType === 'comparison' ? 'primary' : ''}`}
                style={{ justifyContent: 'flex-start', padding: 10 }}
                onClick={() => setReportType('comparison')}
              >
                Algorithm Comparison & Stat Audit
              </button>
              <button
                className={`action-btn ${reportType === 'benchmark_audit' ? 'primary' : ''}`}
                style={{ justifyContent: 'flex-start', padding: 10 }}
                onClick={() => setReportType('benchmark_audit')}
              >
                RCAEval Benchmark Suite Audit
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Export Format
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className={`action-btn ${reportFormat === 'markdown' ? 'primary' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setReportFormat('markdown')}
              >
                Markdown (.md)
              </button>
              <button
                className={`action-btn ${reportFormat === 'html' ? 'primary' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setReportFormat('html')}
              >
                HTML (.html)
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="action-btn" style={{ justifyContent: 'center' }} onClick={handleCopy}>
              {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
              {copied ? 'Copied to Clipboard' : 'Copy Text'}
            </button>
            <button className="action-btn primary" style={{ justifyContent: 'center' }} onClick={handleDownload}>
              <Download size={14} /> Download Export File
            </button>
          </div>
        </div>
      </div>

      {/* Report Document Preview */}
      <div className="panel-card" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
        <div className="panel-title">
          <span>Live Document Preview</span>
          <span className="badge badge-indigo">{reportFormat.toUpperCase()}</span>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: reportFormat === 'html' ? '#ffffff' : 'var(--bg-secondary)',
            color: 'var(--text-main)',
            padding: 24,
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            fontFamily: reportFormat === 'markdown' ? 'var(--font-mono)' : 'var(--font-sans)',
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: reportFormat === 'markdown' ? 'pre-wrap' : 'normal'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
              Generating report from persisted experiment records...
            </div>
          ) : reportFormat === 'html' ? (
            <iframe
              srcDoc={reportContent}
              title="HTML Report Preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            reportContent
          )}
        </div>
      </div>
    </div>
  );
};
