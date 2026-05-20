import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './AISuggestions.css';

/**
 * AI-03: Impact Report Component
 * Shows predicted impact of an ADR on other decisions
 */
export default function ImpactReport({ adrId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const generateReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/adrs/${adrId}/ai/impact`);
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate impact report');
    } finally {
      setLoading(false);
    }
  };

  const severityConfig = {
    High: { icon: '🔴', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
    Medium: { icon: '🟡', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
    Low: { icon: '🟢', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
  };

  return (
    <div className="impact-report" id="impact-report">
      {!report ? (
        <div>
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
            Predict which ADRs may be affected by changes to this decision.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm w-full"
            onClick={generateReport}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                Analyzing...
              </>
            ) : (
              '⚡ Generate Impact Report'
            )}
          </button>
          {error && <p className="form-error mt-2">{error}</p>}
        </div>
      ) : (
        <div className="impact-results animate-fade-in">
          {/* Summary */}
          <div className="impact-summary">
            <div className="impact-summary-item">
              <span className="impact-count">{report.summary.total_impacted}</span>
              <span className="impact-label">Total</span>
            </div>
            <div className="impact-summary-item" style={{ color: '#ef4444' }}>
              <span className="impact-count">{report.summary.high}</span>
              <span className="impact-label">High</span>
            </div>
            <div className="impact-summary-item" style={{ color: '#f59e0b' }}>
              <span className="impact-count">{report.summary.medium}</span>
              <span className="impact-label">Medium</span>
            </div>
            <div className="impact-summary-item" style={{ color: '#10b981' }}>
              <span className="impact-count">{report.summary.low}</span>
              <span className="impact-label">Low</span>
            </div>
          </div>

          {/* Impacted ADRs */}
          {report.impacts.length === 0 ? (
            <p className="text-sm text-muted text-center" style={{ padding: 16 }}>
              No significant impact predicted.
            </p>
          ) : (
            <div className="impact-list">
              {report.impacts.map(impact => {
                const cfg = severityConfig[impact.severity];
                return (
                  <div
                    key={impact.id}
                    className="impact-item"
                    style={{ borderLeftColor: cfg.color, background: cfg.bg }}
                    onClick={() => navigate(`/adrs/${impact.id}`)}
                  >
                    <div className="impact-item-header">
                      <div className="impact-item-info">
                        <span className="impact-severity-badge" style={{ color: cfg.color }}>
                          {cfg.icon} {impact.severity}
                        </span>
                        <span className="impact-score">{impact.score}%</span>
                      </div>
                      <span className="impact-adr-number">
                        ADR-{String(impact.adr_number).padStart(3, '0')}
                      </span>
                    </div>
                    <div className="impact-item-title">{impact.title}</div>

                    {/* Reasons */}
                    <div className="impact-reasons">
                      {impact.reasons.map((reason, i) => (
                        <span key={i} className="impact-reason">{reason}</span>
                      ))}
                    </div>

                    {/* Score Breakdown Bar */}
                    <div className="impact-breakdown">
                      {impact.breakdown.relationship > 0 && (
                        <div className="breakdown-bar" style={{ width: `${impact.breakdown.relationship}%`, background: '#6366f1' }} title={`Relationship: ${impact.breakdown.relationship}%`}></div>
                      )}
                      {impact.breakdown.sharedTags > 0 && (
                        <div className="breakdown-bar" style={{ width: `${impact.breakdown.sharedTags}%`, background: '#f59e0b' }} title={`Tags: ${impact.breakdown.sharedTags}%`}></div>
                      )}
                      {impact.breakdown.contentSimilarity > 0 && (
                        <div className="breakdown-bar" style={{ width: `${impact.breakdown.contentSimilarity}%`, background: '#10b981' }} title={`Content: ${impact.breakdown.contentSimilarity}%`}></div>
                      )}
                    </div>
                    <div className="impact-breakdown-legend">
                      <span style={{ color: '#6366f1' }}>■ Relations</span>
                      <span style={{ color: '#f59e0b' }}>■ Tags</span>
                      <span style={{ color: '#10b981' }}>■ Content</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Algorithm Info */}
          <div className="impact-algo-info">
            <span className="text-xs text-muted">Algorithm: {report.algorithm}</span>
          </div>

          <button type="button" className="btn btn-secondary btn-sm w-full mt-2" onClick={generateReport}>
            🔄 Refresh Report
          </button>
        </div>
      )}
    </div>
  );
}
