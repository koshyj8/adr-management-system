import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Comments.css';

export default function CommentSection({ adrId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchComments();
  }, [adrId]);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/adrs/${adrId}/comments`);
      setComments(res.data.comments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await api.post(`/adrs/${adrId}/comments`, { content: newComment });
      setComments([...comments, res.data.comment]);
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await api.delete(`/adrs/${adrId}/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loading-container" style={{ padding: 20 }}><div className="spinner"></div></div>;

  return (
    <div className="comments-section" id="comments-section">
      {comments.length === 0 ? (
        <p className="text-muted text-sm" style={{ marginBottom: 16 }}>No comments yet. Start the discussion!</p>
      ) : (
        <div className="comments-list">
          {comments.map(c => (
            <div key={c.id} className="comment-item stagger-item">
              <div className="avatar" style={{ background: c.avatar_color }}>{c.full_name?.charAt(0)}</div>
              <div className="comment-body">
                <div className="comment-header">
                  <span className="comment-author">{c.full_name}</span>
                  <span className="comment-role">{c.role}</span>
                  <span className="comment-time">{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  {(c.user_id === user?.id || user?.role === 'admin') && (
                    <button className="comment-delete" onClick={() => handleDelete(c.id)} title="Delete comment">×</button>
                  )}
                </div>
                <p className="comment-content">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="comment-form">
        <div className="avatar" style={{ background: user?.avatar_color || '#6366f1' }}>{user?.full_name?.charAt(0)}</div>
        <div className="comment-input-wrapper">
          <textarea
            className="form-textarea comment-textarea"
            placeholder="Add your thoughts to the discussion..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            id="comment-input"
          ></textarea>
          <button type="submit" className="btn btn-primary btn-sm" disabled={posting || !newComment.trim()} id="comment-submit">
            {posting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  );
}
