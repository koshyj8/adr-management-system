import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CommentSection from '../Comments/CommentSection';
import ImpactReport from './ImpactReport';
import './ADR.css';

export default function ADRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isArchitect } = useAuth();
  const [adr, setAdr] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('decision');
  const [showVersions, setShowVersions] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ decision: 'approved', comment: '' });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchAdr();
  }, [id]);

  const fetchAdr = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/adrs/${id}`);
      setAdr(res.data.adr);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const res = await api.get(`/adrs/${id}/versions`);
      setVersions(res.data.versions);
      setShowVersions(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/adrs/${id}/status`, { status: newStatus });
      showToast(`Status changed to ${newStatus}`, 'success');
      fetchAdr();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update status', 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/adrs/${id}/reviews`, reviewForm);
      showToast('Review submitted successfully', 'success');
      setShowReviewModal(false);
      setReviewForm({ decision: 'approved', comment: '' });
      fetchAdr();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit review', 'error');
    }
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const renderMarkdown = (text) => {
    if (!text) return '<p class="text-muted">No content yet.</p>';
    return marked(text, { breaks: true, gfm: true });
  };

  const tabs = [
    { key: 'decision', label: 'Decision', icon: '📝' },
    { key: 'context', label: 'Context', icon: '📖' },
    { key: 'consequences', label: 'Consequences', icon: '⚡' },
    { key: 'alternatives', label: 'Alternatives', icon: '🔄' },
  ];

  const statusColors = {
    Proposed: 'var(--status-proposed)',
    Accepted: 'var(--status-accepted)',
    Deprecated: 'var(--status-deprecated)',
    Superseded: 'var(--status-superseded)',
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
  if (!adr) return <div className="empty-state"><div className="empty-state-title">ADR not found</div></div>;

  return (
    <div className="adr-detail-page animate-fade-in" id="adr-detail-page">
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      {/* Header */}
      <div className="adr-detail-nav">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/adrs')}>← Back to List</button>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/adrs/${id}/edit`)}>✏️ Edit</button>
          {isArchitect && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowReviewModal(true)}>📝 Review</button>
          )}
        </div>
      </div>

      <div className="adr-detail-content">
        {/* Main Content */}
        <div className="adr-detail-main">
          <div className="glass-card adr-detail-header-card">
            <div className="adr-detail-head">
              <span className="adr-number-lg">ADR-{String(adr.adr_number).padStart(3, '0')}</span>
              <span className={`badge badge-${adr.status.toLowerCase()}`}>{adr.status}</span>
            </div>
            <h1 className="adr-detail-title">{adr.title}</h1>

            <div className="adr-detail-meta">
              <div className="adr-meta-item">
                <div className="avatar avatar-sm" style={{ background: adr.author_color }}>{adr.author_full_name?.charAt(0)}</div>
                <span>{adr.author_full_name}</span>
              </div>
              <span className="meta-sep">·</span>
              <span>Created {new Date(adr.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="meta-sep">·</span>
              <span>Updated {new Date(adr.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            {adr.tags?.length > 0 && (
              <div className="adr-detail-tags">
                {adr.tags.map(t => (
                  <span key={t.id} className="tag">
                    <span className="tag-dot" style={{ background: t.color }}></span>
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Content Tabs */}
          <div className="glass-card adr-content-card">
            <div className="adr-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  className={`adr-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="adr-tab-content">
              <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(adr[activeTab]) }}></div>
            </div>
          </div>

          {/* Comments */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h2 className="section-title">💬 Discussion ({adr.comment_count})</h2>
            <CommentSection adrId={id} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="adr-detail-sidebar">
          {/* Status Change */}
          {isArchitect && (
            <div className="glass-card sidebar-card">
              <h3 className="sidebar-card-title">Change Status</h3>
              <div className="status-actions">
                {['Proposed', 'Accepted', 'Deprecated', 'Superseded'].map(s => (
                  <button
                    key={s}
                    className={`status-action-btn ${adr.status === s ? 'current' : ''}`}
                    onClick={() => adr.status !== s && handleStatusChange(s)}
                    disabled={adr.status === s}
                    style={{ '--status-color': statusColors[s] }}
                  >
                    <span className="status-dot" style={{ background: statusColors[s] }}></span>
                    {s}
                    {adr.status === s && <span className="text-xs">(current)</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Relations */}
          {adr.relations?.length > 0 && (
            <div className="glass-card sidebar-card">
              <h3 className="sidebar-card-title">Related Decisions</h3>
              <div className="relations-list">
                {adr.relations.map(r => {
                  const isSource = r.source_adr_id === adr.id;
                  const relatedNum = isSource ? r.target_number : r.source_number;
                  const relatedTitle = isSource ? r.target_title : r.source_title;
                  const relatedStatus = isSource ? r.target_status : r.source_status;
                  const relatedId = isSource ? r.target_adr_id : r.source_adr_id;

                  return (
                    <div key={r.id} className="relation-item" onClick={() => navigate(`/adrs/${relatedId}`)}>
                      <span className="relation-type">{r.relation_type}</span>
                      <div className="relation-adr">
                        <span className="relation-number">ADR-{String(relatedNum).padStart(3, '0')}</span>
                        <span className="relation-title">{relatedTitle}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews */}
          {adr.reviews?.length > 0 && (
            <div className="glass-card sidebar-card">
              <h3 className="sidebar-card-title">Reviews</h3>
              <div className="reviews-list">
                {adr.reviews.map(r => (
                  <div key={r.id} className="review-item">
                    <div className="review-header">
                      <div className="avatar avatar-sm" style={{ background: r.avatar_color }}>{r.full_name?.charAt(0)}</div>
                      <span className="review-name">{r.full_name}</span>
                      <span className={`review-decision review-${r.decision}`}>
                        {r.decision === 'approved' ? '✅' : r.decision === 'rejected' ? '❌' : '🔄'}
                        {r.decision}
                      </span>
                    </div>
                    {r.comment && <p className="review-comment">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Version History */}
          <div className="glass-card sidebar-card">
            <div className="sidebar-card-header">
              <h3 className="sidebar-card-title">Version History</h3>
              <span className="version-count">{adr.version_count} versions</span>
            </div>
            <button className="btn btn-secondary btn-sm w-full" onClick={fetchVersions}>
              {showVersions ? 'Refresh' : 'View History'}
            </button>
            {showVersions && versions.length > 0 && (
              <div className="versions-list">
                {versions.map(v => (
                  <div key={v.id} className="version-item">
                    <div className="version-dot"></div>
                    <div className="version-content">
                      <span className="version-label">v{v.version_number}</span>
                      <span className="version-summary">{v.change_summary}</span>
                      <span className="version-meta">{v.full_name} · {new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI-03: Impact Prediction */}
          <div className="glass-card sidebar-card" style={{ borderColor: 'rgba(99, 102, 241, 0.25)' }}>
            <h3 className="sidebar-card-title" style={{ color: 'var(--accent-primary-light)' }}>🤖 ⚡ Impact Prediction</h3>
            <ImpactReport adrId={parseInt(id)} />
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Submit Review</h2>
              <button className="modal-close" onClick={() => setShowReviewModal(false)}>×</button>
            </div>
            <form onSubmit={handleReviewSubmit}>
              <div className="form-group">
                <label className="form-label">Decision</label>
                <select className="form-select" value={reviewForm.decision} onChange={(e) => setReviewForm({ ...reviewForm, decision: e.target.value })}>
                  <option value="approved">✅ Approve</option>
                  <option value="rejected">❌ Reject</option>
                  <option value="needs-changes">🔄 Needs Changes</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Comment</label>
                <textarea className="form-textarea" placeholder="Add your review comments..." value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} rows={3}></textarea>
              </div>
              <button type="submit" className="btn btn-primary w-full">Submit Review</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
