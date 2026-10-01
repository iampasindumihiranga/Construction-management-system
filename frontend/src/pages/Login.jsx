import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_PATHS } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [portal, setPortal] = useState(() => location.state?.portal || 'client');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // When logging to the system, default logout from all credentials
    logout();
  }, [logout]);

  const selectPortal = (nextPortal) => {
    setPortal(nextPortal);
    setForm({ username: '', password: '' });
    setError('');
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const trimmedUsername = form.username.trim();
    if (!trimmedUsername) {
      setError(portal === 'employee'
        ? 'Please enter your Employee ID or registered email.'
        : portal === 'client'
        ? 'Please enter your client username or email.'
        : 'Please enter your staff username.');
      return;
    }

    if (!form.password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const response = await login(trimmedUsername, form.password, portal);
      if (portal === 'client' && (response.role === 'CLIENT_MANAGER' || response.role === 'ADMIN')) {
        navigate('/client', { replace: true });
      } else {
        navigate(ROLE_PATHS[response.role] ?? '/', { replace: true });
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('invalid')) {
        setError(portal === 'employee'
          ? 'Invalid Employee ID/Email or password. Please verify your credentials.'
          : 'Invalid username or password.');
      } else {
        setError(msg || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const getIntroText = () => {
    switch (portal) {
      case 'client':
        return 'Access your luxury residences, agreements, blueprints, and communications.';
      case 'employee':
        return 'Access your assigned construction projects, daily attendance, and employment profile.';
      case 'staff':
      default:
        return 'Access executive tools for client relations, engineering, workforce, and materials.';
    }
  };

  const getUsernameLabel = () => {
    switch (portal) {
      case 'client':
        return 'Client Username or Email';
      case 'employee':
        return 'Employee ID or Registered Email';
      case 'staff':
      default:
        return 'Staff Username';
    }
  };

  const getUsernamePlaceholder = () => {
    switch (portal) {
      case 'client':
        return 'e.g. client@odiliya.com or OD-2026-001';
      case 'employee':
        return 'e.g. EMP001 or kasun@odiliya.com';
      case 'staff':
      default:
        return 'e.g. admin, clientmanager, employeemanager';
    }
  };

  return (
    <div className="light-site-wrapper">
      <Navbar />

      <main className="portal-login-page">
        <div className="portal-login-card">
          <div className="portal-login-header">
            <img
              src="/odiliya-logo.png"
              alt="Odiliya Logo"
              className="portal-login-logo"
            />
            <span className="brand-green-subtitle">SECURE ACCESS</span>
            <h1 className="portal-login-title">
              {portal === 'client'
                ? 'Odiliya Client Portal'
                : portal === 'employee'
                ? 'Odiliya Employee Portal'
                : 'Odiliya Staff Portal'}
            </h1>
            <p className="portal-login-intro">
              {getIntroText()}
            </p>
          </div>

          <div className="portal-switcher" role="tablist" aria-label="Choose sign-in portal">
            <button
              type="button"
              className={`portal-switcher__button ${portal === 'client' ? 'active' : ''}`}
              onClick={() => selectPortal('client')}
              role="tab"
              aria-selected={portal === 'client'}
            >
              Clients
            </button>
            <button
              type="button"
              className={`portal-switcher__button ${portal === 'staff' ? 'active' : ''}`}
              onClick={() => selectPortal('staff')}
              role="tab"
              aria-selected={portal === 'staff'}
            >
              Staff
            </button>
            <button
              type="button"
              className={`portal-switcher__button ${portal === 'employee' ? 'active' : ''}`}
              onClick={() => selectPortal('employee')}
              role="tab"
              aria-selected={portal === 'employee'}
            >
              Employee
            </button>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="form-group">
              <label>
                {getUsernameLabel()}
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder={getUsernamePlaceholder()}
                required
                className="light-input"
                autoComplete="off"
              />
            </div>

            <div className="form-group portal-login-password">
              <label>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password"
                required
                className="light-input"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="light-alert alert-danger portal-login-error">
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="portal-login-submit"
              disabled={loading}
            >
              {loading
                ? 'Validating Credentials...'
                : `Sign in to ${portal === 'client' ? 'Client' : portal === 'employee' ? 'Employee' : 'Staff'} Portal →`}
            </button>

            {portal === 'client' && (
              <div className="portal-login-register">
                Don't have an account yet? <Link to="/register">Register as a Client</Link>
              </div>
            )}

            {portal === 'employee' && (
              <div className="portal-login-register">
                Don't have an employee profile yet? <Link to="/employee-register">Register as an Employee</Link>
              </div>
            )}
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
