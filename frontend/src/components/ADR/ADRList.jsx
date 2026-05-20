import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import './ADR.css';

export default function ADRList() {
  const [adrs, setAdrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tags, setTags] = useState([]);
  const navigate = useNavigate();

  const status = searchParams.get('status') || '';
  const tag = searchParams.get('tag') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'newest';

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    fetchAdrs();
    fetchTags();
  }, [status, tag, search, sort]);

  const fetchAdrs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (tag) params.tag = tag;
      if (search) params.search = search;
      params.sort = sort;
      params.limit = 50;

      const res = await api.get('/adrs', { params });
      setAdrs(res.data.adrs);
    } catch (err) {
      console.error('Fetch ADRs error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags');
      setTags(res.data.tags);
    } catch (err) {
      console.error(err);
    }
  };

  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilter('search', searchInput);
  };

  const statusBadgeClass = (s) => `badge badge-${s.toLowerCase()}`;

  return (
    <div className="adr-list-page animate-fade-in" id="adr-list-page">
      <div className="adr-list-header">
        <div>
          <h1 className="page-title">Architecture Decision Records</h1>
          <p className="page-subtitle">{adrs.length} decisions documented</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/adrs/new')} id="btn-new-adr">
          ✏️ New ADR
        </button>
      </div>

      {/* Filters */}
      <div className="adr-filters glass-card">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            className="form-input search-input"
            placeholder="🔍 Search decisions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            id="adr-search-input"
          />
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>

        <div className="filter-row">
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <div className="filter-buttons">
              <button className={`filter-btn ${!status ? 'active' : ''}`} onClick={() => updateFilter('status', '')}>All</button>
              <button className={`filter-btn ${status === 'Proposed' ? 'active' : ''}`} onClick={() => updateFilter('status', 'Proposed')}>Proposed</button>
              <button className={`filter-btn ${status === 'Accepted' ? 'active' : ''}`} onClick={() => updateFilter('status', 'Accepted')}>Accepted</button>
              <button className={`filter-btn ${status === 'Deprecated' ? 'active' : ''}`} onClick={() => updateFilter('status', 'Deprecated')}>Deprecated</button>
              <button className={`filter-btn ${status === 'Superseded' ? 'active' : ''}`} onClick={() => updateFilter('status', 'Superseded')}>Superseded</button>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Sort</label>
            <select className="form-select filter-select" value={sort} onChange={(e) => updateFilter('sort', e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="number">By Number</option>
              <option value="updated">Recently Updated</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>

        {tag && (
          <div className="active-filters">
            <span className="text-sm text-muted">Filtered by tag:</span>
            <span className="tag">
              {tag}
              <button className="tag-remove" onClick={() => updateFilter('tag', '')}>×</button>
            </span>
          </div>
        )}
      </div>

      {/* ADR Cards */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : adrs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No ADRs found</div>
          <div className="empty-state-text">
            {search || status || tag
              ? 'Try adjusting your filters or search query.'
              : 'Create your first Architecture Decision Record to get started.'}
          </div>
          {!search && !status && !tag && (
            <button className="btn btn-primary mt-4" onClick={() => navigate('/adrs/new')}>Create First ADR</button>
          )}
        </div>
      ) : (
        <div className="adr-cards">
          {adrs.map((adr, idx) => (
            <div
              key={adr.id}
              className="adr-card glass-card stagger-item"
              onClick={() => navigate(`/adrs/${adr.id}`)}
              id={`adr-card-${adr.id}`}
            >
              <div className="adr-card-header">
                <span className="adr-number">ADR-{String(adr.adr_number).padStart(3, '0')}</span>
                <span className={statusBadgeClass(adr.status)}>{adr.status}</span>
              </div>

              <h3 className="adr-card-title">{adr.title}</h3>

              <div className="adr-card-tags">
                {adr.tags?.map(t => (
                  <span key={t.id} className="tag" onClick={(e) => { e.stopPropagation(); updateFilter('tag', t.name); }}>
                    <span className="tag-dot" style={{ background: t.color }}></span>
                    {t.name}
                  </span>
                ))}
              </div>

              <div className="adr-card-footer">
                <div className="adr-card-author">
                  <div className="avatar avatar-sm" style={{ background: adr.author_color }}>{adr.author_full_name?.charAt(0)}</div>
                  <span>{adr.author_full_name}</span>
                </div>
                <div className="adr-card-meta">
                  {adr.comment_count > 0 && <span className="meta-item">💬 {adr.comment_count}</span>}
                  {adr.review_count > 0 && <span className="meta-item">✅ {adr.review_count}</span>}
                  <span className="meta-item">{new Date(adr.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
