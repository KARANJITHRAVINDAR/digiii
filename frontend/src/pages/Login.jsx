import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(email.trim(), password);
      const roleRoutes = {
        STUDENT: '/student',
        TEACHER: '/teacher',
        HOD: '/hod',
        ADMIN: '/admin',
      };
      navigate(roleRoutes[loggedUser.role] || '/login');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.response?.status === 403) {
        setError('Your account is currently inactive. Please contact administrator.');
      } else {
        setError(err.response?.data?.detail || 'Unable to connect to authentication service.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '400px',
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.75rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              margin: '0 auto 0.75rem',
              borderRadius: '8px',
              background: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.25rem',
              color: '#ffffff',
            }}
          >
            D
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            DigiCampus
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem', marginBottom: 0 }}>
            Attendance Dispute & SLA Escalation System
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '0.5rem 0.75rem' }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Campus Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. student.cse@digiicampus.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ padding: '0.55rem', fontSize: '0.875rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign in'}
          </button>
        </form>

        {/* Quick Demo Fill Buttons */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.45rem' }}>
            Demo Accounts:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickFill('student.cse@digiicampus.com', 'student123')}
            >
              Student
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickFill('teacher.math@digiicampus.com', 'teacher123')}
            >
              Teacher (Math)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickFill('hod.sh@digiicampus.com', 'hod123')}
            >
              HOD (S&H)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickFill('admin@digiicampus.com', 'admin123')}
            >
              Administrator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
