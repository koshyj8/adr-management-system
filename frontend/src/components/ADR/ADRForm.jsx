import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import api from '../../services/api';
import AISuggestions from './AISuggestions';
import './ADR.css';

export default function ADRForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState({
    title: '',
    context: '',
    decision: '',
    consequences: '',
    alternatives: '',
    tags: [],
    change_summary: '',
  });
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewTab, setPreviewTab] = useState(null);

  useEffect(() => {
    fetchTags();
    if (isEditing) fetchAdr();
  }, [id]);

  const fetchAdr = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/adrs/${id}`);
      const adr = res.data.adr;
      setForm({
        title: adr.title,
        context: adr.context || '',
        decision: adr.decision || '',
        consequences: adr.consequences || '',
        alternatives: adr.alternatives || '',
        tags: adr.tags?.map(t => t.id) || [],
        change_summary: '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags');
      setAllTags(res.data.tags);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleTag = (tagId) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId) ? prev.tags.filter(id => id !== tagId) : [...prev.tags, tagId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (isEditing) {
        await api.put(`/adrs/${id}`, form);
        navigate(`/adrs/${id}`);
      } else {
        const res = await api.post('/adrs', form);
        navigate(`/adrs/${res.data.adr.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save ADR');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { key: 'context', label: 'Context', placeholder: '## Context\n\nDescribe the situation and why this decision needs to be made.\n\n- What is the current state?\n- What problem are we solving?\n- What constraints exist?', icon: '📖' },
    { key: 'decision', label: 'Decision', placeholder: '## Decision\n\nDescribe what was decided and how it will be implemented.\n\n- What approach are we taking?\n- Key implementation details', icon: '📝' },
    { key: 'consequences', label: 'Consequences', placeholder: '## Consequences\n\n### Positive\n- Benefit 1\n\n### Negative\n- Tradeoff 1\n\n### Risks\n- Risk 1', icon: '⚡' },
    { key: 'alternatives', label: 'Alternatives', placeholder: '## Alternatives Considered\n\n### Option 1\n- Description\n- **Rejected**: Reason\n\n### Option 2\n- Description\n- **Rejected**: Reason', icon: '🔄' },
  ];

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div className="adr-form-page animate-fade-in" id="adr-form-page">
      <div className="adr-form-header">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(isEditing ? `/adrs/${id}` : '/adrs')}>← Back</button>
        <h1 className="page-title">{isEditing ? 'Edit ADR' : 'Create New ADR'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="adr-form">
        {error && <div className="auth-error">{error}</div>}

        {/* Title */}
        <div className="glass-card form-section">
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input adr-title-input"
              name="title"
              placeholder="e.g., Use PostgreSQL as Primary Database"
              value={form.title}
              onChange={handleChange}
              required
              id="adr-form-title"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="glass-card form-section">
          <label className="form-label">Tags</label>
          <div className="tag-selector">
            {allTags.map(t => (
              <button
                key={t.id}
                type="button"
                className={`tag-select-btn ${form.tags.includes(t.id) ? 'selected' : ''}`}
                onClick={() => toggleTag(t.id)}
              >
                <span className="tag-dot" style={{ background: t.color }}></span>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* AI Suggestions Panel (AI-01 + AI-02) */}
        <AISuggestions
          formData={form}
          selectedTags={form.tags}
          onToggleTag={toggleTag}
          excludeId={isEditing ? parseInt(id) : null}
        />

        {/* Markdown Sections */}
        {sections.map(section => (
          <div key={section.key} className="glass-card form-section">
            <div className="form-section-header">
              <label className="form-label">{section.icon} {section.label}</label>
              <button
                type="button"
                className={`btn btn-sm ${previewTab === section.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPreviewTab(previewTab === section.key ? null : section.key)}
              >
                {previewTab === section.key ? 'Edit' : 'Preview'}
              </button>
            </div>
            {previewTab === section.key ? (
              <div className="markdown-body markdown-preview-box" dangerouslySetInnerHTML={{ __html: marked(form[section.key] || '_No content_', { breaks: true, gfm: true }) }}></div>
            ) : (
              <textarea
                className="form-textarea"
                name={section.key}
                placeholder={section.placeholder}
                value={form[section.key]}
                onChange={handleChange}
                rows={8}
              ></textarea>
            )}
          </div>
        ))}

        {/* Change Summary (for edits) */}
        {isEditing && (
          <div className="glass-card form-section">
            <div className="form-group">
              <label className="form-label">Change Summary</label>
              <input
                type="text"
                className="form-input"
                name="change_summary"
                placeholder="Brief description of what changed"
                value={form.change_summary}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(isEditing ? `/adrs/${id}` : '/adrs')}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving} id="adr-form-submit">
            {saving ? 'Saving...' : isEditing ? 'Update ADR' : 'Create ADR'}
          </button>
        </div>
      </form>
    </div>
  );
}
