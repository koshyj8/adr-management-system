import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', role: 'developer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
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
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join the team to manage architectural decisions</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" id="register-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="reg-fullname">Full Name</label>
            <input id="reg-fullname" type="text" className="form-input" name="full_name" placeholder="John Doe" value={form.full_name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username</label>
            <input id="reg-username" type="text" className="form-input" name="username" placeholder="john.doe" value={form.username} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" className="form-input" name="email" placeholder="john@example.com" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input id="reg-password" type="password" className="form-input" name="password" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-role">Role</label>
            <select id="reg-role" className="form-select" name="role" value={form.role} onChange={handleChange}>
              <option value="developer">Developer</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} id="register-submit">
            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
