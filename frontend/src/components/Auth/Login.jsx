import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="auth-logo-icon">📐</span>
            <span className="auth-logo-text">ADR System</span>
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to manage your Architecture Decision Records</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" id="login-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              className="form-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} id="login-submit">
            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span> : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Create one</Link></p>
        </div>

        <div className="auth-demo-creds">
          <p className="text-xs text-muted font-medium" style={{ marginBottom: 8 }}>Demo Credentials</p>
          <div className="demo-creds-grid">
            <button type="button" className="demo-cred-btn" onClick={() => { setUsername('admin'); setPassword('admin123'); }}>
              <span className="demo-role">Admin</span>
              <span className="demo-user">admin</span>
            </button>
            <button type="button" className="demo-cred-btn" onClick={() => { setUsername('arjun.gaikwad'); setPassword('password123'); }}>
              <span className="demo-role">Architect</span>
              <span className="demo-user">arjun.gaikwad</span>
            </button>
            <button type="button" className="demo-cred-btn" onClick={() => { setUsername('pushpal.mahajan'); setPassword('password123'); }}>
              <span className="demo-role">Developer</span>
              <span className="demo-user">pushpal.mahajan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
