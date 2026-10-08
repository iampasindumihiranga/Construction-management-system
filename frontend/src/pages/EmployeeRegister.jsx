import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getNextEmployeeId, registerEmployee } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ROLES_LIST = [
  'Site Engineer',
  'Civil Engineer',
  'Project Architect',
  'Electrician',
  'Plumber',
  'Mason / Bricklayer',
  'Carpenter',
  'HVAC Specialist',
  'Safety Officer',
  'Quality Inspector',
  'Site Supervisor',
  'General Staff',
];

const DEPARTMENTS = [
  'Engineering',
  'Electrical & Utilities',
  'Plumbing & Sanitation',
  'Architecture & Design',
  'Structural Construction',
  'Site Safety & Quality',
  'Operations & Logistics',
];

const initialForm = {
  name: '',
  email: '',
  phone: '',
  role: 'Site Engineer',
  department: 'Engineering',
  qualifications: '',
  address: '',
  password: '',
  confirmPassword: '',
};

export default function EmployeeRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [message, setMessage] = useState('');
  const [generatedEmployeeId, setGeneratedEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getNextEmployeeId()
      .then((id) => setGeneratedEmployeeId(id))
      .catch(() => setGeneratedEmployeeId('Generated automatically'));
  }, []);

  const validateField = (field, value) => {
    let err = '';
    const trimmed = typeof value === 'string' ? value.trim() : '';

    switch (field) {
      case 'name':
        if (!trimmed) {
          err = 'Full name is required.';
        } else if (trimmed.length < 2) {
          err = 'Full name must be at least 2 characters.';
        } else if (!/^[a-zA-Z\s.\-']+$/.test(trimmed)) {
          err = 'Name must contain only letters, dots, or hyphens.';
        }
        break;

      case 'email':
        if (!trimmed) {
          err = 'Email address is required.';
        } else if (!/^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})$/.test(trimmed)) {
          err = 'Please enter a valid email address (e.g. employee@odiliya.com).';
        }
        break;

      case 'phone':
        if (!trimmed) {
          err = 'Contact phone number is required.';
        } else if (!/^\+?[0-9\s()\-]{7,20}$/.test(trimmed)) {
          err = 'Please enter a valid phone number (7 to 20 digits).';
        }
        break;

      case 'role':
        if (!trimmed) {
          err = 'Please select a trade or role.';
        }
        break;

      case 'department':
        if (!trimmed) {
          err = 'Please select a department.';
        }
        break;

      case 'password':
        if (!value) {
          err = 'Password is required.';
        } else if (value.length < 8) {
          err = 'Password must be at least 8 characters long.';
        } else if (!(/[a-zA-Z]/.test(value) && /\d/.test(value))) {
          err = 'Password must contain both letters and numbers.';
        }
        break;

      case 'confirmPassword':
        if (!value) {
          err = 'Please confirm your password.';
        } else if (value !== form.password) {
          err = 'Passwords do not match.';
        }
        break;

      default:
        break;
    }

    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    return err;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      validateField(field, value);
    }
  };

  const validateAll = () => {
    const errors = {};
    const nameErr = validateField('name', form.name);
    if (nameErr) errors.name = nameErr;

    const emailErr = validateField('email', form.email);
    if (emailErr) errors.email = emailErr;

    const phoneErr = validateField('phone', form.phone);
    if (phoneErr) errors.phone = phoneErr;

    const roleErr = validateField('role', form.role);
    if (roleErr) errors.role = roleErr;

    const deptErr = validateField('department', form.department);
    if (deptErr) errors.department = deptErr;

    const passErr = validateField('password', form.password);
    if (passErr) errors.password = passErr;

    const confErr = validateField('confirmPassword', form.confirmPassword);
    if (confErr) errors.confirmPassword = confErr;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setGeneralError('');
    setMessage('');

    if (!validateAll()) {
      setGeneralError('Please resolve the highlighted validation errors below.');
      return;
    }

    setLoading(true);
    try {
      const created = await registerEmployee({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        position: form.role,
        department: form.department,
        qualifications: form.qualifications.trim(),
        address: form.address.trim(),
        status: 'ACTIVE',
        passwordHash: form.password,
      });

      const assignedId = created.employeeId || generatedEmployeeId;
      setMessage(
        `Employee registration successful for ${created.name}! Your Employee ID is ${assignedId}. You can sign in using ${assignedId} or your email.`
      );
      setForm(initialForm);
      setFieldErrors({});

      setTimeout(() => {
        navigate('/login', { state: { portal: 'employee' } });
      }, 3000);
    } catch (err) {
      setGeneralError(err.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="light-site-wrapper">
      <Navbar />

      <main className="light-dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '3rem 1rem' }}>
        <div
          className="light-panel-card"
          style={{ width: '680px', maxWidth: '100%', padding: '2.5rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' }}
        >
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <img
              src="/odiliya-logo.png"
              alt="Odiliya Logo"
              style={{ width: '64px', height: '64px', objectFit: 'contain', margin: '0 auto 0.75rem', display: 'block' }}
            />
            <span className="brand-green-subtitle">WORKFORCE REGISTRATION</span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0 0.5rem' }}>
              Create Employee Profile
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5 }}>
              Register your employee credentials to access assigned construction projects, daily attendance, and team communications.
            </p>
          </div>

          {message && (
            <div className="light-alert alert-success" style={{ marginBottom: '1.25rem' }}>
              
              <div>
                <div style={{ fontWeight: 700 }}>{message}</div>
                <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Redirecting you to the Employee Portal sign-in...</div>
              </div>
            </div>
          )}

          {generalError && (
            <div className="light-alert alert-danger" style={{ marginBottom: '1.25rem' }}>
              
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Employee ID Preview */}
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                  Assigned Employee ID
                </label>
                <input
                  type="text"
                  value={generatedEmployeeId || 'Generating...'}
                  readOnly
                  disabled
                  className="light-input"
                  style={{ background: '#f1f5f9', color: '#047857', fontWeight: 700, cursor: 'not-allowed' }}
                />
              </div>

              {/* Full Name */}
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kasun Perera"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={(e) => validateField('name', e.target.value)}
                  required
                  className="light-input"
                  style={{ borderColor: fieldErrors.name ? '#ef4444' : undefined }}
                />
                {fieldErrors.name && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              {/* Email */}
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                  Email Address (Login) *
                </label>
                <input
                  type="email"
                  placeholder="e.g. kasun@odiliya.com"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={(e) => validateField('email', e.target.value)}
                  required
                  className="light-input"
                  style={{ borderColor: fieldErrors.email ? '#ef4444' : undefined }}
                />
                {fieldErrors.email && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* Phone */}
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +94 77 123 4567"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  onBlur={(e) => validateField('phone', e.target.value)}
                  required
                  className="light-input"
                  style={{ borderColor: fieldErrors.phone ? '#ef4444' : undefined }}
                />
                {fieldErrors.phone && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {fieldErrors.phone}
                  </span>
                )}
              </div>

              {/* Trade / Role */}
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                  Role / Trade Assignment *
                </label>
                <select
                  value={form.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  onBlur={(e) => validateField('role', e.target.value)}
                  required
                  className="light-input"
                  style={{ borderColor: fieldErrors.role ? '#ef4444' : undefined }}
                >
                  {ROLES_LIST.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {fieldErrors.role && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {fieldErrors.role}
                  </span>
                )}
              </div>

              {/* Department */}
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                  Department *
                </label>
                <select
                  value={form.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  onBlur={(e) => validateField('department', e.target.value)}
                  required
                  className="light-input"
                  style={{ borderColor: fieldErrors.department ? '#ef4444' : undefined }}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {fieldErrors.department && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {fieldErrors.department}
                  </span>
                )}
              </div>

              {/* Qualifications */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                  Qualifications &amp; Certifications
                </label>
                <textarea
                  placeholder="e.g. B.Sc. in Civil Engineering, NVQ Level 4 Electrician, Certified Site Supervisor"
                  value={form.qualifications}
                  onChange={(e) => handleChange('qualifications', e.target.value)}
                  rows="2"
                  className="light-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Residential Address */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                  Residential Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. No. 45, Galle Road, Colombo 03"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="light-input"
                />
              </div>

              {/* Password */}
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                  Password * (min. 8 chars, letters &amp; numbers)
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={(e) => validateField('password', e.target.value)}
                  required
                  className="light-input"
                  style={{ borderColor: fieldErrors.password ? '#ef4444' : undefined }}
                  autoComplete="new-password"
                />
                {fieldErrors.password && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {fieldErrors.password}
                  </span>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                  Confirm Password *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  onBlur={(e) => validateField('confirmPassword', e.target.value)}
                  required
                  className="light-input"
                  style={{ borderColor: fieldErrors.confirmPassword ? '#ef4444' : undefined }}
                  autoComplete="new-password"
                />
                {fieldErrors.confirmPassword && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {fieldErrors.confirmPassword}
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1.75rem' }}>
              <button
                type="submit"
                className="portal-login-submit"
                disabled={loading}
              >
                {loading ? 'Registering Employee Profile...' : 'Complete Employee Registration →'}
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
              Already registered as an employee?{' '}
              <Link to="/login" state={{ portal: 'employee' }} style={{ color: '#047857', fontWeight: 700 }}>
                Sign in to Employee Portal
              </Link>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
