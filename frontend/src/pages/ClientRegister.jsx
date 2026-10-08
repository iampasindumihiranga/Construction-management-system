import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getNextEmployeeNumber, registerClient } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export default function ClientRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [generatedEmployeeNumber, setGeneratedEmployeeNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getNextEmployeeNumber()
      .then(setGeneratedEmployeeNumber)
      .catch(() => setGeneratedEmployeeNumber('Generated automatically'));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }
    if (form.name.trim().length < 2) {
      setError('Please enter your full name.');
      setLoading(false);
      return;
    }
    if (!/^\+?[\d\s()-]{7,20}$/.test(form.phone.trim())) {
      setError('Please enter a valid phone number.');
      setLoading(false);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const client = await registerClient({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      setMessage(
        `Account created for ${client.name}! Your Client OD Number is ${client.employeeNumber}. You can now sign in to the Client Portal.`
      );
      setGeneratedEmployeeNumber(client.employeeNumber);
      setForm(initialForm);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="light-site-wrapper">
      <Navbar />

      <main className="light-dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', padding: '3rem 1rem' }}>
        <div
          className="light-panel-card"
          style={{ width: '560px', maxWidth: '100%', padding: '2.5rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' }}
        >
          {/* Brand Header with Official Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img
              src="/odiliya-logo.png"
              alt="Odiliya Logo"
              style={{ width: '64px', height: '64px', objectFit: 'contain', margin: '0 auto 0.75rem', display: 'block' }}
            />
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0 0.5rem' }}>
              Create Your Client Portal Account
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5 }}>
              Access project blueprints, milestones, contracts, and direct communications.
            </p>
          </div>

          {message && (
            <div className="light-alert alert-success" style={{ marginBottom: '1.25rem' }}>
              
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="light-alert alert-danger" style={{ marginBottom: '1.25rem' }}>
              
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>Full name *</label>
                <input
                  type="text"
                  placeholder="e.g. Pasindu Dilshan"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="light-input"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>Email Address (Login) *</label>
                <input
                  type="email"
                  placeholder="you@domain.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="light-input"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>Phone Number *</label>
                <input
                  type="tel"
                  placeholder="+94 7X XXX XXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  pattern="[+0-9() -]{7,20}"
                  title="Enter a valid phone number."
                  required
                  className="light-input"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>Password (min 8 chars) *</label>
                <input
                  type="password"
                  minLength={8}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="light-input"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>Confirm Password *</label>
                <input
                  type="password"
                  minLength={8}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  className="light-input"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>Assigned Unique Client ID</label>
              <input
                type="text"
                value={generatedEmployeeNumber || 'Generating OD ID...'}
                readOnly
                className="light-input"
                style={{ opacity: 0.75, background: '#f1f5f9' }}
              />
            </div>

            <button
              type="submit"
              className="light-btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Creating Client Account...' : 'Register Secure Client Account →'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
              Already registered?{' '}
              <Link to="/login" style={{ color: '#09543b', fontWeight: 700, textDecoration: 'none' }}>
                Sign In to Portal
              </Link>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
