import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setData(res.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="text-muted">Loading dashboard...</p>
      </div>
    );
  }

  if (!data) return null;

  const { stats, recent_adrs, contributors, tag_usage, recent_activity } = data;

  const statusEntries = [
    { label: 'Proposed', count: 0, color: 'var(--status-proposed)', bg: 'var(--status-proposed-bg)' },
    { label: 'Accepted', count: 0, color: 'var(--status-accepted)', bg: 'var(--status-accepted-bg)' },
    { label: 'Deprecated', count: 0, color: 'var(--status-deprecated)', bg: 'var(--status-deprecated-bg)' },
    { label: 'Superseded', count: 0, color: 'var(--status-superseded)', bg: 'var(--status-superseded-bg)' },
  ];

  stats.status_counts.forEach(sc => {
    const entry = statusEntries.find(e => e.label === sc.status);
    if (entry) entry.count = sc.count;
  });

  return (
    <div className="dashboard animate-fade-in" id="dashboard-page">
      {/* Welcome Section */}
      <div className="dashboard-welcome">
        <div>
          <h1 className="dashboard-title">Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p className="dashboard-subtitle">Here's what's happening with your architecture decisions</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/adrs/new')} id="dashboard-new-adr">
          ✏️ New ADR
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card glass-card stagger-item">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>📋</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total_adrs}</div>
            <div className="stat-label">Total ADRs</div>
          </div>
        </div>
        <div className="stat-card glass-card stagger-item">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>👥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total_users}</div>
            <div className="stat-label">Team Members</div>
          </div>
        </div>
        <div className="stat-card glass-card stagger-item">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>💬</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total_comments}</div>
            <div className="stat-label">Comments</div>
          </div>
        </div>
        <div className="stat-card glass-card stagger-item">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total_reviews}</div>
            <div className="stat-label">Reviews</div>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="dashboard-grid">
        <div className="glass-card dashboard-section">
          <h2 className="section-title">Status Distribution</h2>
          <div className="status-bars">
            {statusEntries.map(s => (
              <div key={s.label} className="status-bar-item">
                <div className="status-bar-header">
                  <span className="status-bar-label">{s.label}</span>
                  <span className="status-bar-count" style={{ color: s.color }}>{s.count}</span>
                </div>
                <div className="status-bar-track">
                  <div
                    className="status-bar-fill"
                    style={{
                      width: `${stats.total_adrs > 0 ? (s.count / stats.total_adrs) * 100 : 0}%`,
                      background: s.color,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card dashboard-section">
          <h2 className="section-title">Popular Tags</h2>
          <div className="tag-cloud">
            {tag_usage.map(t => (
              <div key={t.name} className="tag-stat" onClick={() => navigate(`/adrs?tag=${t.name}`)}>
                <span className="tag-dot" style={{ background: t.color }}></span>
                <span className="tag-stat-name">{t.name}</span>
                <span className="tag-stat-count">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent ADRs & Activity */}
      <div className="dashboard-grid">
        <div className="glass-card dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Recent ADRs</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/adrs')}>View All</button>
          </div>
          <div className="recent-list">
            {recent_adrs.map(adr => (
              <div key={adr.id} className="recent-item" onClick={() => navigate(`/adrs/${adr.id}`)}>
                <div className="recent-item-header">
                  <span className="recent-adr-number">ADR-{String(adr.adr_number).padStart(3, '0')}</span>
                  <span className={`badge badge-${adr.status.toLowerCase()}`}>{adr.status}</span>
                </div>
                <div className="recent-item-title">{adr.title}</div>
                <div className="recent-item-meta">
                  <div className="avatar avatar-sm" style={{ background: adr.author_color }}>{adr.author_full_name?.charAt(0)}</div>
                  <span>{adr.author_full_name}</span>
                  <span>·</span>
                  <span>{new Date(adr.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card dashboard-section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-feed">
            {recent_activity.map((item, i) => (
              <div key={i} className="activity-item stagger-item">
                <div className="avatar avatar-sm" style={{ background: item.avatar_color }}>{item.full_name?.charAt(0)}</div>
                <div className="activity-content">
                  <div className="activity-text">
                    <strong>{item.full_name}</strong>
                    {item.type === 'comment' ? ' commented on ' : ' reviewed '}
                    <span className="activity-adr" onClick={() => navigate(`/adrs/${item.adr_id}`)}>
                      ADR-{String(item.adr_number).padStart(3, '0')}
                    </span>
                  </div>
                  <div className="activity-preview">{item.description.substring(0, 80)}{item.description.length > 80 ? '...' : ''}</div>
                  <div className="activity-time">{new Date(item.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contributors */}
      <div className="glass-card dashboard-section">
        <h2 className="section-title">Top Contributors</h2>
        <div className="contributors-grid">
          {contributors.map(c => (
            <div key={c.id} className="contributor-card stagger-item">
              <div className="avatar avatar-lg" style={{ background: c.avatar_color }}>{c.full_name?.charAt(0)}</div>
              <div className="contributor-name">{c.full_name}</div>
              <div className="contributor-role">{c.role}</div>
              <div className="contributor-stats">
                <div className="contributor-stat">
                  <span className="contributor-stat-value">{c.adrs_created}</span>
                  <span className="contributor-stat-label">ADRs</span>
                </div>
                <div className="contributor-stat">
                  <span className="contributor-stat-value">{c.comments_made}</span>
                  <span className="contributor-stat-label">Comments</span>
                </div>
                <div className="contributor-stat">
                  <span className="contributor-stat-value">{c.reviews_given}</span>
                  <span className="contributor-stat-label">Reviews</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
