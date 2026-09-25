import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import {
  getFeedback,
  getFeedbackSummary,
  submitFeedback,
  getClients,
  getProjects,
  formatDate,
  ROLE_LABELS,
} from '../services/api';

export default function PublicFeedbackDashboard() {
  const { user } = useAuth();

  const [feedbacks, setFeedbacks] = useState([]);
  const [summary, setSummary] = useState({ averageRating: 5.0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Client user state & submission
  const [clientProfile, setClientProfile] = useState(null);
  const [clientProjects, setClientProjects] = useState([]);
  const [checkingClient, setCheckingClient] = useState(false);

  // Form state
  const [formRating, setFormRating] = useState(5);
  const [formCategory, setFormCategory] = useState('GENERAL');
  const [formProjectId, setFormProjectId] = useState('');
  const [formComments, setFormComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const isClient = user?.role === 'CLIENT';

  const loadFeedbacksAndSummary = async () => {
    try {
      setLoading(true);
      const [list, sum] = await Promise.all([
        getFeedback().catch(() => []),
        getFeedbackSummary().catch(() => ({ averageRating: 5.0, totalReviews: 0 })),
      ]);
      setFeedbacks(Array.isArray(list) ? list : []);
      if (sum) setSummary(sum);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load client feedbacks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacksAndSummary();
  }, []);

  // If logged in as client, load client profile & projects for submission verification
  useEffect(() => {
    if (!isClient) {
      setClientProfile(null);
      setClientProjects([]);
      return;
    }

    let isMounted = true;
    async function fetchClientData() {
      setCheckingClient(true);
      try {
        const [allClients, allProjects] = await Promise.all([
          getClients().catch(() => []),
          getProjects().catch(() => []),
        ]);

        if (!isMounted) return;

        let foundClient = null;
        if (user.clientId) {
          foundClient = allClients.find((c) => c.id === user.clientId);
        }
        if (!foundClient && user.username) {
          foundClient = allClients.find((c) => c.email?.toLowerCase() === user.username.toLowerCase());
        }

        setClientProfile(foundClient);

        if (foundClient) {
          const projs = allProjects.filter((p) => p.client?.id === foundClient.id);
          setClientProjects(projs);
        }
      } catch (err) {
        console.error('Error fetching client details:', err);
      } finally {
        if (isMounted) setCheckingClient(false);
      }
    }

    fetchClientData();
    return () => { isMounted = false; };
  }, [user, isClient]);

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setFormSuccess('');
    setFormError('');

    if (!isClient || !clientProfile) {
      setFormError('Only verified clients with valid accounts can submit feedback.');
      return;
    }

    if (clientProfile.status && clientProfile.status.toUpperCase() !== 'ACTIVE') {
      setFormError(`Your client account is ${clientProfile.status.toLowerCase()}. Only active accounts can submit feedback.`);
      return;
    }

    if (!formComments.trim()) {
      setFormError('Please enter your feedback comments.');
      return;
    }

    try {
      setSubmitting(true);
      await submitFeedback({
        client: { id: clientProfile.id },
        project: formProjectId ? { id: Number(formProjectId) } : null,
        rating: Number(formRating),
        category: formCategory,
        comments: formComments.trim(),
      });

      setFormSuccess('Thank you! Your feedback has been successfully submitted and is now published.');
      setFormComments('');
      setFormRating(5);
      setFormCategory('GENERAL');
      setFormProjectId('');

      // Refresh public feedback list
      await loadFeedbacksAndSummary();

      setTimeout(() => setFormSuccess(''), 6000);
    } catch (err) {
      setFormError(err.message || 'Failed to submit feedback. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (categoryFilter !== 'ALL' && fb.category !== categoryFilter) return false;
    if (ratingFilter !== 'ALL' && fb.rating !== Number(ratingFilter)) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const clientName = fb.client?.name?.toLowerCase() || '';
      const projectName = fb.project?.name?.toLowerCase() || '';
      const comments = fb.comments?.toLowerCase() || '';
      const category = fb.category?.toLowerCase() || '';
      if (!clientName.includes(q) && !projectName.includes(q) && !comments.includes(q) && !category.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Calculate rating distribution
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  feedbacks.forEach((fb) => {
    if (ratingCounts[fb.rating] !== undefined) {
      ratingCounts[fb.rating] += 1;
    }
  });

  const renderStars = (rating) => {
    const full = Math.max(0, Math.min(5, Math.round(rating)));
    return (
      <span className="star-rating-display" title={`${rating} out of 5 stars`}>
        {'★'.repeat(full)}
        {'☆'.repeat(5 - full)}
      </span>
    );
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'CONSTRUCTION_QUALITY': return 'Construction Quality';
      case 'COMMUNICATION': return 'Communication';
      case 'TIMELINESS': return 'Timeliness';
      case 'GENERAL':
      default: return 'General Experience';
    }
  };

  return (
    <div className="light-site-wrapper">
      <Navbar />

      <main className="client-portal-main" style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        {/* Hero Section */}
        <section className="light-hero-card" style={{ marginBottom: '2rem' }}>
          <div className="hero-info-col">
            <span className="brand-green-subtitle">PUBLIC CLIENT TESTIMONIALS &amp; REVIEWS</span>
            <h1 className="hero-title">Client Satisfaction &amp; Feedback</h1>
            <p className="hero-subtitle">
              Browse genuine feedback, ratings, and experiences shared by Odiliya homeowners, investors, and clients.
              Transparency and excellence across every milestone.
            </p>
          </div>

          <div className="hero-metric-badges">
            <div className="metric-badge-box highlight">
              <span className="badge-big-number">
                {summary.averageRating ? Number(summary.averageRating).toFixed(1) : '5.0'} ★
              </span>
              <span className="badge-small-label">Average Client Rating</span>
            </div>
            <div className="metric-badge-box">
              <span className="badge-big-number">{summary.totalReviews ?? feedbacks.length}</span>
              <span className="badge-small-label">Verified Reviews</span>
            </div>
          </div>
        </section>

        {/* FEEDBACK SUBMISSION SECTION */}
        <section className="light-panel-card" style={{ marginBottom: '2.5rem' }}>
          <div className="panel-card-head">
            <div>
              <span className="brand-green-subtitle">SHARE YOUR EXPERIENCE</span>
              <h2 className="panel-title" style={{ fontSize: '1.4rem' }}>Submit Client Feedback</h2>
            </div>
            {isClient && clientProfile && (
              <span className="pill-badge active" style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem' }}>
                ✓ Verified Client: {clientProfile.name} ({clientProfile.employeeNumber || `ID #${clientProfile.id}`})
              </span>
            )}
          </div>

          {!user ? (
            /* Guest (Not Logged In) */
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}>
              <div>
                <strong style={{ fontSize: '1.05rem', color: '#0f172a', display: 'block', marginBottom: '0.35rem' }}>
                  Only clients with valid accounts can submit feedbacks
                </strong>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
                  Please sign in to your verified Odiliya Client account to rate your project and share your review with the community.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link to="/login" state={{ portal: 'client' }} className="btn-solid-green" style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
                  Sign In as Client
                </Link>
                <Link to="/register" className="btn-outline-green" style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
                  Register Client Account
                </Link>
              </div>
            </div>
          ) : !isClient ? (
            /* Logged in as Staff/Employee */
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '1.5rem',
              color: '#92400e',
            }}>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                Feedback Submission Restricted
              </strong>
              <p style={{ margin: 0, fontSize: '0.92rem' }}>
                You are currently signed in as <strong>{user.displayName || user.username}</strong> ({ROLE_LABELS[user.role] || user.role}).
                Only verified clients with valid client accounts are permitted to submit client reviews.
              </p>
            </div>
          ) : checkingClient ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
              Verifying client credentials...
            </div>
          ) : !clientProfile ? (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '1.5rem',
              color: '#991b1b',
            }}>
              <strong>Client Record Not Found</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.92rem' }}>
                We could not locate an active client profile matching your login. Please contact customer support.
              </p>
            </div>
          ) : clientProfile.status && clientProfile.status.toUpperCase() !== 'ACTIVE' ? (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '1.5rem',
              color: '#991b1b',
            }}>
              <strong>Account Inactive</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.92rem' }}>
                Your client account status is currently <strong>{clientProfile.status}</strong>. Only active verified client accounts can publish reviews.
              </p>
            </div>
          ) : (
            /* Valid Client Feedback Form */
            <form onSubmit={handleSubmitFeedback}>
              {formSuccess && (
                <div className="light-alert alert-success" style={{ marginBottom: '1.25rem' }}>
                  <span>✓ {formSuccess}</span>
                </div>
              )}
              {formError && (
                <div className="light-alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                  <span>⚠️ {formError}</span>
                </div>
              )}

              <div className="form-grid-2">
                <div className="form-input-box">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#1e293b' }}>
                    Overall Rating *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '1.8rem',
                          cursor: 'pointer',
                          color: star <= formRating ? '#f59e0b' : '#cbd5e1',
                          padding: '0 0.15rem',
                          transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                    <span style={{ marginLeft: '0.5rem', fontWeight: 700, color: '#f59e0b', fontSize: '1.1rem' }}>
                      {formRating} / 5 Stars
                    </span>
                  </div>
                </div>

                <div className="form-input-box">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#1e293b' }}>
                    Feedback Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="light-input"
                    style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                  >
                    <option value="GENERAL">General Experience</option>
                    <option value="CONSTRUCTION_QUALITY">Construction & Architectural Quality</option>
                    <option value="COMMUNICATION">Staff Communication & Support</option>
                    <option value="TIMELINESS">Milestone Timeliness & Handover</option>
                  </select>
                </div>
              </div>

              {clientProjects.length > 0 && (
                <div className="form-input-box" style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#1e293b' }}>
                    Assigned Property / Project (Optional)
                  </label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="light-input"
                    style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                  >
                    <option value="">-- General Review (Not Tied to a Specific Property) --</option>
                    {clientProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category || 'Residency'}) - {p.location || 'Sri Lanka'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-input-box" style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#1e293b' }}>
                  Review Comments *
                </label>
                <textarea
                  rows={3}
                  value={formComments}
                  onChange={(e) => setFormComments(e.target.value)}
                  placeholder="Share details of your experience with Odiliya Homes, construction milestones, and team support..."
                  required
                  className="light-input"
                  style={{ width: '100%', padding: '0.75rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-solid-green"
                  style={{ padding: '0.75rem 1.8rem', fontSize: '0.95rem' }}
                >
                  {submitting ? 'Publishing Review...' : 'Publish Feedback to Public Dashboard →'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* FEEDBACK STATS & FILTERS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Rating Breakdown Card */}
          <div className="light-panel-card" style={{ height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: '0 0 1rem' }}>Rating Summary</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                {summary.averageRating ? Number(summary.averageRating).toFixed(1) : '5.0'}
              </span>
              <div>
                <div style={{ fontSize: '1.25rem', color: '#f59e0b' }}>
                  {renderStars(summary.averageRating || 5)}
                </div>
                <small style={{ color: '#64748b' }}>Based on {summary.totalReviews ?? feedbacks.length} verified reviews</small>
              </div>
            </div>

            {/* Stars Bar breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingCounts[star] || 0;
                const total = feedbacks.length || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingFilter(ratingFilter === String(star) ? 'ALL' : String(star))}
                    style={{
                      background: ratingFilter === String(star) ? '#f1f5f9' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', width: '45px', fontWeight: 600, color: '#334155' }}>
                      {star} ★
                    </span>
                    <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: star >= 4 ? 'var(--brand-green, #047857)' : star === 3 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', width: '35px', textAlign: 'right' }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {ratingFilter !== 'ALL' && (
              <button
                type="button"
                className="btn-outline-green"
                onClick={() => setRatingFilter('ALL')}
                style={{ marginTop: '1rem', width: '100%', padding: '0.45rem', fontSize: '0.82rem' }}
              >
                Clear Rating Filter
              </button>
            )}
          </div>

          {/* Feedbacks Directory & Search */}
          <div>
            {/* Filter toolbar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem',
            }}>
              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'ALL', label: 'All Reviews' },
                  { key: 'CONSTRUCTION_QUALITY', label: 'Construction Quality' },
                  { key: 'TIMELINESS', label: 'Timeliness' },
                  { key: 'COMMUNICATION', label: 'Communication' },
                  { key: 'GENERAL', label: 'General' },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategoryFilter(cat.key)}
                    className={`portal-switcher__button ${categoryFilter === cat.key ? 'active' : ''}`}
                    style={{
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.85rem',
                      borderRadius: '20px',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="search-input-pill" style={{ width: '280px' }}>
                <input
                  type="text"
                  placeholder="Search reviews or projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button type="button" className="clear-btn" onClick={() => setSearchTerm('')}>
                    ×
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="light-alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                {error}
              </div>
            )}

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                Loading verified feedbacks...
              </div>
            ) : filteredFeedbacks.length === 0 ? (
              <div className="light-panel-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>💬</span>
                <h3 style={{ color: '#0f172a', margin: '0 0 0.5rem' }}>No Feedbacks Found</h3>
                <p style={{ color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
                  {searchTerm || categoryFilter !== 'ALL' || ratingFilter !== 'ALL'
                    ? 'No reviews match your selected filter criteria. Try resetting the filters.'
                    : 'Be the first client to leave a review! Verified clients can share their feedback above.'}
                </p>
                {(searchTerm || categoryFilter !== 'ALL' || ratingFilter !== 'ALL') && (
                  <button
                    type="button"
                    className="btn-outline-green"
                    style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter('ALL');
                      setRatingFilter('ALL');
                    }}
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredFeedbacks.map((fb) => (
                  <article
                    key={fb.id}
                    className="light-panel-card"
                    style={{
                      padding: '1.4rem 1.6rem',
                      borderLeft: '4px solid var(--brand-green, #047857)',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                            {fb.client?.name || 'Verified Client'}
                          </strong>
                          <span className="pill-badge active" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                            ✓ Verified Client
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '12px',
                            background: '#f1f5f9',
                            color: '#475569',
                          }}>
                            {getCategoryLabel(fb.category)}
                          </span>
                        </div>
                        {fb.project?.name && (
                          <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 600, marginTop: '0.2rem' }}>
                            Property: {fb.project.name}
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.15rem', color: '#f59e0b', letterSpacing: '1px' }}>
                          {renderStars(fb.rating)}
                        </div>
                        <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                          {formatDate(fb.submittedAt)}
                        </small>
                      </div>
                    </div>

                    <p style={{
                      color: '#334155',
                      fontSize: '0.96rem',
                      lineHeight: 1.6,
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                    }}>
                      "{fb.comments}"
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
