import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PropertyExplorer from '../components/PropertyExplorer';
import SwipeableDesignGallery from '../components/SwipeableDesignGallery';
import { getProjects, getDesigns, formatMoney, createInquiry } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('RESIDENCIES');
  const [selectedProject, setSelectedProject] = useState(null);

  const [inquiryTargetProject, setInquiryTargetProject] = useState(null);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccessMsg, setInquirySuccessMsg] = useState('');
  const [inquiryErrorMsg, setInquiryErrorMsg] = useState('');
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const openInquiryModal = (proj) => {
    setInquiryTargetProject(proj);
    setInquiryForm({
      name: user?.name || '',
      email: user?.email || (user?.username?.includes('@') ? user.username : ''),
      phone: user?.phone || '',
      subject: `Official Inquiry: ${proj.name}`,
      message: '',
    });
    setInquiryErrorMsg('');
    setInquirySuccessMsg('');
    setInquiryModalOpen(true);
  };

  const handleSendOfficialInquiry = async (e) => {
    e.preventDefault();
    if (!inquiryTargetProject) return;
    if (!inquiryForm.name.trim() || !inquiryForm.email.trim() || !inquiryForm.message.trim()) {
      setInquiryErrorMsg('Please fill in your name, email address, and inquiry message.');
      return;
    }
    setInquirySubmitting(true);
    setInquiryErrorMsg('');
    try {
      const payload = {
        client: user?.role === 'CLIENT'
          ? { id: user.clientId || user.id, name: inquiryForm.name.trim(), email: inquiryForm.email.trim(), phone: inquiryForm.phone.trim() }
          : { name: inquiryForm.name.trim(), email: inquiryForm.email.trim(), phone: inquiryForm.phone.trim() },
        design: { id: inquiryTargetProject.id },
        subject: inquiryForm.subject.trim() || `Official Inquiry: ${inquiryTargetProject.name}`,
        message: inquiryForm.message.trim(),
        initiatedBy: 'CLIENT',
      };
      await createInquiry(payload);
      setInquirySuccessMsg('Your official inquiry has been sent successfully to the Client Manager!');
      setTimeout(() => {
        setInquiryModalOpen(false);
        setInquirySuccessMsg('');
        setInquiryTargetProject(null);
      }, 2500);
    } catch (err) {
      setInquiryErrorMsg(err.message || 'Failed to send official inquiry. Please try again.');
    } finally {
      setInquirySubmitting(false);
    }
  };

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      const normalized = categoryParam.toUpperCase();
      if (['RESIDENCIES', 'LANDS', 'APARTMENTS'].includes(normalized)) {
        setSelectedCategory(normalized);
        setTimeout(() => {
          const el = document.getElementById('properties');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // Load designs from dedicated designs table
    getDesigns()
      .then((data) => {
        const clientManagerDesigns = (data || []);
        setProjects(clientManagerDesigns);

        // Check if a specific design is requested in URL
        const designParam = searchParams.get('design');
        if (designParam) {
          const matched = clientManagerDesigns.find((p) => String(p.id) === String(designParam));
          if (matched) setSelectedProject(matched);
        }
      })
      .catch(() => {
        getProjects({ marketingOnly: true })
          .then((data) => setProjects(data || []))
          .catch((err) => console.error('Failed to load public designs', err));
      });
  }, [searchParams]);

  return (
    <div className="light-site-wrapper">
      {/* Top Navbar with Home, About Us, Contact Us, Account Name (Screenshot 3 & Item 7) */}
      <Navbar
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          const el = document.getElementById('properties');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Hero Section matching Screenshot 3 */}
      <section className="screenshot3-hero-section">
        <div className="hero-backdrop-image" />
        <div className="hero-dark-overlay" />

        <div className="hero-content-inner">
          <h1 className="hero-main-title">Find Your Dream Property</h1>
          <p className="hero-main-subtitle">
            Everyone aspires to own a great piece of property. We, at Odiliya Homes,
            made it our aim to make this dream a reality.
          </p>
        </div>

        {/* Emerald / Forest Green Stats Strip (Screenshot 3) */}
        <div className="screenshot3-stats-strip">
          <div className="stats-strip-inner">
            <div className="stat-item-box">
              <div className="stat-icon-circle">
                
              </div>
              <div className="stat-text-col">
                <strong className="stat-number">45+</strong>
                <span className="stat-label">Completed Residencies</span>
              </div>
            </div>

            <div className="stat-item-box">
              <div className="stat-icon-circle">
                
              </div>
              <div className="stat-text-col">
                <strong className="stat-number">6,500+</strong>
                <span className="stat-label">Happy Investors</span>
              </div>
            </div>

            <div className="stat-item-box">
              <div className="stat-icon-circle">
                
              </div>
              <div className="stat-text-col">
                <strong className="stat-number">16%</strong>
                <span className="stat-label">Avg. Value Growth</span>
              </div>
            </div>

            <div className="stat-item-box">
              <div className="stat-icon-circle">
                
              </div>
              <div className="stat-text-col">
                <strong className="stat-number">22+</strong>
                <span className="stat-label">Years Trust &amp; Excellence</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Property Explorer matching Screenshot 3 Pill Tabs */}
      {/* Property Explorer matching Screenshot 3 Pill Tabs */}
      <PropertyExplorer
        projects={projects}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
        onInquire={(proj) => {
          openInquiryModal(proj);
        }}
        onSelectProject={(proj) => {
          setSelectedProject(proj);
        }}
      />

      {/* Design Details View / Modal matching Screenshot 2 */}
      {selectedProject && (
        <div className="light-modal-overlay" style={{ zIndex: 9990, padding: '1.25rem', overflowY: 'auto' }}>
          <div
            className="light-modal-box"
            style={{
              maxWidth: '1080px',
              width: '96%',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '2rem',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button
                type="button"
                className="btn-outline-green"
                onClick={() => setSelectedProject(null)}
                style={{ padding: '0.45rem 1rem', fontSize: '0.88rem' }}
              >
                Back to Company Designs
              </button>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                ×
              </button>
            </div>

            <div className="company-design-details__grid" style={{ marginTop: '0', alignItems: 'start' }}>
              {/* Left Column: Swipeable Image Gallery with up to 5 images */}
              <div>
                <SwipeableDesignGallery
                  images={
                    selectedProject.imageUrls && selectedProject.imageUrls.length > 0
                      ? selectedProject.imageUrls
                      : selectedProject.imageUrl
                      ? [selectedProject.imageUrl]
                      : []
                  }
                  title={selectedProject.name}
                />
              </div>

              {/* Right Column: Details matching Screenshot 2 */}
              <div style={{ minWidth: 0 }}>
                <span className="brand-green-subtitle" style={{ fontSize: '0.85rem', letterSpacing: '0.08em', fontWeight: 800 }}>
                  ODILIYA COMPANY DESIGN
                </span>
                <h2 className="panel-title" style={{ fontSize: '2rem', fontWeight: 800, margin: '0.35rem 0 0.2rem', color: '#0f172a' }}>
                  {selectedProject.name}
                </h2>
                <p className="panel-meta" style={{ color: '#64748b', fontSize: '1rem', marginBottom: '1.25rem' }}>
                  {selectedProject.category === 'RESIDENCIES' ? 'Residences' : selectedProject.category === 'LANDS' ? 'Lands & Plots' : selectedProject.category}
                </p>

                <p className="company-design-details__description" style={{ color: '#334155', lineHeight: 1.7, fontSize: '0.98rem', marginBottom: '1.25rem' }}>
                  {selectedProject.description || 'Modern luxury property designed for comfortable living with contemporary architecture and convenient access to essential facilities.'}
                </p>

                {selectedProject.specifications && (
                  <p style={{ color: '#0f172a', fontSize: '0.96rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    <strong>Design Specifications:</strong> {selectedProject.specifications}
                  </p>
                )}

                {/* Status Remarks Box matching Screenshot 2 */}
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '1rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    margin: '1.25rem 0',
                  }}
                >
                  <small
                    style={{
                      color: '#475569',
                      fontWeight: 750,
                      fontSize: '0.78rem',
                      letterSpacing: '0.04em',
                      display: 'block',
                      marginBottom: '0.4rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    STATUS REMARKS (NOTIFIED TO CLIENT):
                  </small>
                  <p style={{ margin: 0, color: '#334155', fontSize: '0.93rem', lineHeight: 1.65 }}>
                    {selectedProject.constructionStatus || 'New design is now available for client review. Please contact the project team for further details, pricing, and viewing arrangements.'}
                  </p>
                </div>

                <p style={{ fontSize: '1.15rem', margin: '1.5rem 0' }}>
                  <strong style={{ color: '#0f172a' }}>Starting Price / Budget:</strong>{' '}
                  <span style={{ color: 'var(--brand-green)', fontWeight: 800 }}>
                    {selectedProject.priceRange || (selectedProject.budget ? formatMoney(selectedProject.budget) : 'Inquire for Price')}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Inquiry Submission Modal */}
      {inquiryModalOpen && inquiryTargetProject && (
        <div className="light-modal-overlay" style={{ zIndex: 10000, padding: '1rem' }}>
          <div
            className="light-modal-box"
            style={{
              maxWidth: '620px',
              width: '95%',
              padding: '1.75rem',
              borderRadius: '14px',
            }}
          >
            <div className="modal-head-row">
              <div>
                <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>OFFICIAL INQUIRY TO CLIENT MANAGER</span>
                <h3 style={{ margin: '0.2rem 0 0', color: '#0f172a' }}>Inquire: {inquiryTargetProject.name}</h3>
              </div>
              <button type="button" onClick={() => { setInquiryModalOpen(false); setInquiryTargetProject(null); }}>×</button>
            </div>

            {inquirySuccessMsg && (
              <div className="pm-alert success" style={{ margin: '1rem 0' }}>
                {inquirySuccessMsg}
              </div>
            )}
            {inquiryErrorMsg && (
              <div className="pm-alert error" style={{ margin: '1rem 0' }}>
                {inquiryErrorMsg}
              </div>
            )}

            <form onSubmit={handleSendOfficialInquiry} style={{ marginTop: '1rem' }}>
              <div className="modal-body-content">
                <div className="form-grid-2">
                  <div className="form-input-box">
                    <label>Your Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. John Silva"
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-input-box">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      placeholder="e.g. john@example.com"
                      value={inquiryForm.email}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                  <div className="form-input-box">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="e.g. 077 123 4567"
                      value={inquiryForm.phone}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-input-box">
                    <label>Inquiry Subject *</label>
                    <input
                      type="text"
                      value={inquiryForm.subject}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, subject: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-input-box" style={{ marginTop: '1rem' }}>
                  <label>Message / Inquired Details *</label>
                  <textarea
                    rows={4}
                    placeholder="Describe your questions or requirements regarding this design..."
                    value={inquiryForm.message}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                    required
                  />
                </div>

                <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.6rem', fontSize: '0.78rem' }}>
                  Your inquiry will be logged directly into the Client Management Portal with your contact information and today's date.
                </small>
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-outline-green"
                  onClick={() => { setInquiryModalOpen(false); setInquiryTargetProject(null); }}
                  disabled={inquirySubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-solid-green"
                  disabled={inquirySubmitting}
                >
                  {inquirySubmitting ? 'Sending to Client Manager...' : 'Submit Official Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* About Us Section */}
      <section className="about-us-section" id="about">
        <div className="about-container">
          <div className="about-grid">
            <div className="about-copy-col">
              <span className="brand-green-subtitle">ABOUT ODILIYA HOMES</span>
              <h2 className="about-heading">Creating Lasting Value in Real Estate</h2>
              <p className="about-paragraph">
                With a strong foundation built over two decades, Odiliya Homes &amp; Real Estate brings
                unmatched craftsmanship, legal clarity, and customer-first service to property developments
                across Sri Lanka.
              </p>
              <p className="about-paragraph">
                Whether you seek a master-planned gated plot in the Colombo suburbs, a bespoke private residence,
                or high-yield architectural apartments, our team is dedicated to exceeding expectations.
              </p>

              <div className="about-features-row">
                <div className="feature-card">
                  
                  <h4>100% Clear Deeds</h4>
                  <p>Certified legal documentation and bank-approved titles.</p>
                </div>
                <div className="feature-card">
                  
                  <h4>Superior Engineering</h4>
                  <p>Highest structural integrity and modern architectural finishes.</p>
                </div>
              </div>
            </div>

            <div className="about-image-col">
              <img
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80"
                alt="Odiliya Luxury Living"
                className="about-showcase-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
