import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, ROLE_PATHS } from '../services/api';

export default function Navbar({ onSelectCategory }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [propDropdown, setPropDropdown] = useState(false);

  const handleCategory = (cat) => {
    setPropDropdown(false);
    if (onSelectCategory) {
      onSelectCategory(cat);
    } else {
      navigate(`/?category=${cat}`);
    }
  };

  const isClient = user?.role === 'CLIENT';
  const isEmployee = user?.role === 'EMPLOYEE';
  const isEmployeeManager = user?.role === 'EMPLOYEE_MANAGER';
  const isProjectManager = user?.role === 'PROJECT_MANAGER';
  const isInventoryManager = user?.role === 'INVENTORY_MANAGER';
  const isSiteManager = user?.role === 'SITE_MANAGER';
  const isClientManager = user?.role === 'CLIENT_MANAGER' || user?.role === 'ADMIN';

  return (
    <header className="odiliya-navbar">
      <div className="navbar-inner-wrap">
        {/* Brand Logo (Item 1: 1st Screenshot Logo) */}
        <Link to="/" className="navbar-brand-logo">
          <img
            src="/odiliya-logo.png"
            alt="Odiliya Homes & Real Estate"
            className="brand-logo-img"
          />
          <div className="brand-logo-text">
            <span className="brand-name">ODILIYA</span>
            <span className="brand-tagline">HOMES &amp; REAL ESTATE</span>
          </div>
        </Link>

        {/* Navigation Links (Item 7: Home, About Us, Contact Us) */}
        <nav className="navbar-links-menu">
          <Link to="/" className="nav-link-item">
            Home
          </Link>

          <div className="nav-dropdown-item">
            <button
              type="button"
              className="nav-link-item dropdown-btn"
              onClick={() => setPropDropdown(!propDropdown)}
            >
              Properties <span className="arrow-down">▾</span>
            </button>
            {propDropdown && (
              <div className="nav-dropdown-flyout">
                <button type="button" onClick={() => handleCategory('RESIDENCIES')}>
                  Residencies
                </button>
                <button type="button" onClick={() => handleCategory('LANDS')}>
                  Lands &amp; Plots
                </button>
                <button type="button" onClick={() => handleCategory('APARTMENTS')}>
                  Luxury Apartments
                </button>
              </div>
            )}
          </div>

          <a href="#about" className="nav-link-item">
            About Us
          </a>

          <a href="#contact" className="nav-link-item">
            Contact Us
          </a>

          {!isEmployee && !isEmployeeManager && (
            <Link to="/feedbacks" className="nav-link-item">
              Feedbacks
            </Link>
          )}

          {/* Quick Dashboard link if logged in */}
          {isClient && (
            <>
              <Link to="/client" className="nav-link-item highlight">
                My Client Portal
              </Link>
            </>
          )}

          {isEmployee && (
            <Link to="/employee" className="nav-link-item highlight">
              My Projects Portal
            </Link>
          )}

          {isEmployeeManager && (
            <Link to="/employee-manager" className="nav-link-item highlight">
              Employee Manager Workspace
            </Link>
          )}

          {isProjectManager && (
            <Link to="/project-manager" className="nav-link-item highlight">
              Project Manager Portal
            </Link>
          )}

          {isInventoryManager && (
            <Link to="/inventory-manager" className="nav-link-item highlight">
              Inventory Portal
            </Link>
          )}

          {isSiteManager && (
            <Link to="/site-manager" className="nav-link-item highlight">
              Site Manager Portal
            </Link>
          )}

          {isClientManager && (
            <Link to="/client-manager" className="nav-link-item highlight">
              Client Manager Portal
            </Link>
          )}
        </nav>

        {/* Right Top Corner: Account Name (Item 7) */}
        <div className="navbar-account-corner">
          {user ? (
            <div className="account-profile-badge">
              <div className="account-avatar-circle">
                {user.displayName?.charAt(0) || 'U'}
              </div>
              <div className="account-details-col">
                {/* Account Name Displayed Prominently */}
                <span className="account-full-name">{user.displayName || user.username}</span>
                <span className="account-role-label">
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
              <button
                type="button"
                className="btn-account-logout"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                title="Sign Out"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="guest-auth-actions">
              <Link to="/login" className="btn-nav-login">
                Sign In
              </Link>
              <Link to="/register" className="btn-nav-register">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
