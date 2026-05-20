import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './AISuggestions.css';

/**
 * AI Suggestions Panel
 * Shows similarity detection results and auto-tag suggestions
 * while user is creating/editing an ADR
 */
export default function AISuggestions({ formData, selectedTags, onToggleTag, excludeId }) {
  const [similar, setSimilar] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(new Set());
  const [lastAnalyzed, setLastAnalyzed] = useState('');
  const [showPanel, setShowPanel] = useState(true);
  const navigate = useNavigate();

  // Debounced analysis - triggers 800ms after user stops typing
  const analyze = useCallback(() => {
    const text = [formData.title, formData.context, formData.decision, formData.consequences, formData.alternatives]
      .filter(Boolean).join(' ');

    // Don't re-analyze if text hasn't changed significantly
    if (text.length < 15 || text === lastAnalyzed) return;

    setLoading(true);
    setLastAnalyzed(text);

    const payload = { ...formData, excludeId };

    // Run both AI requests in parallel
    Promise.all([
      api.post('/adrs/ai/similar', payload).catch(() => ({ data: { similar: [] } })),
      api.post('/adrs/ai/autotag', payload).catch(() => ({ data: { tags: [] } })),
    ]).then(([simRes, tagRes]) => {
      setSimilar(simRes.data.similar.filter(s => !dismissed.has(s.id)));
      setSuggestedTags(tagRes.data.tags);
    }).finally(() => {
      setLoading(false);
    });
  }, [formData, excludeId, dismissed, lastAnalyzed]);

  useEffect(() => {
    const timer = setTimeout(analyze, 800);
    return () => clearTimeout(timer);
  }, [formData.title, formData.context, formData.decision]);

  const dismissSimilar = (id) => {
    setDismissed(prev => new Set([...prev, id]));
    setSimilar(prev => prev.filter(s => s.id !== id));
  };

  const hasContent = similar.length > 0 || suggestedTags.length > 0 || loading;

  if (!hasContent || !showPanel) {
    return (
      <button
        type="button"
        className="ai-toggle-btn"
        onClick={() => { setShowPanel(true); analyze(); }}
        title="Show AI Suggestions"
      >
        🤖 AI Assist
      </button>
    );
  }

  return (
    <div className="ai-panel glass-card animate-fade-in" id="ai-suggestions-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <span className="ai-icon">🤖</span>
          <span>AI Suggestions</span>
          {loading && <span className="ai-loading-dot"></span>}
        </div>
        <button type="button" className="ai-close-btn" onClick={() => setShowPanel(false)}>×</button>
      </div>

      {/* Similarity Detection - AI-01 */}
      {similar.length > 0 && (
        <div className="ai-section">
          <div className="ai-section-header">
            <span className="ai-section-icon">🔍</span>
            <span className="ai-section-title">Similar ADRs Found</span>
            <span className="ai-section-badge">{similar.length}</span>
          </div>
          <p className="ai-section-desc">These existing ADRs may address the same concern:</p>
          <div className="ai-similar-list">
            {similar.map(s => (
              <div key={s.id} className="ai-similar-item">
                <div className="ai-similar-header">
                  <div className="ai-similar-info">
                    <span className="ai-similar-number">ADR-{String(s.adr_number).padStart(3, '0')}</span>
                    <span className={`badge badge-${s.status.toLowerCase()}`} style={{ fontSize: '0.625rem', padding: '1px 6px' }}>{s.status}</span>
                  </div>
                  <div className="ai-similar-actions">
                    <span className="ai-confidence" data-level={s.confidence >= 60 ? 'high' : s.confidence >= 30 ? 'medium' : 'low'}>
                      {s.confidence}%
                    </span>
                    <button type="button" className="ai-dismiss-btn" onClick={() => dismissSimilar(s.id)} title="Dismiss">×</button>
                  </div>
                </div>
                <div className="ai-similar-title" onClick={() => window.open(`/adrs/${s.id}`, '_blank')}>
                  {s.title}
                </div>
                {s.matchedTerms.length > 0 && (
                  <div className="ai-matched-terms">
                    <span className="ai-terms-label">Matched:</span>
                    {s.matchedTerms.map((t, i) => (
                      <span key={i} className="ai-term">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-Tagging - AI-02 */}
      {suggestedTags.length > 0 && (
        <div className="ai-section">
          <div className="ai-section-header">
            <span className="ai-section-icon">🏷️</span>
            <span className="ai-section-title">Suggested Tags</span>
          </div>
          <p className="ai-section-desc">Click to add these AI-suggested tags:</p>
          <div className="ai-tag-suggestions">
            {suggestedTags.map(tag => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`ai-tag-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => onToggleTag(tag.id)}
                  title={tag.description}
                >
                  <span className="ai-tag-dot" style={{ background: tag.color }}></span>
                  <span className="ai-tag-name">{tag.name}</span>
                  <span className="ai-tag-confidence">{tag.confidence}%</span>
                  {isSelected && <span className="ai-tag-check">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && similar.length === 0 && suggestedTags.length === 0 && (
        <div className="ai-loading">
          <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
          <span>Analyzing content...</span>
        </div>
      )}

      <div className="ai-disclaimer">
        ℹ️ AI suggestions are advisory only. Review and confirm before accepting.
      </div>
    </div>
  );
}
