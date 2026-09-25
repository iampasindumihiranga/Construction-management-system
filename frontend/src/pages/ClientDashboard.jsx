import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PropertyExplorer from '../components/PropertyExplorer';
import SwipeableDesignGallery from '../components/SwipeableDesignGallery';
import { useAuth } from '../context/AuthContext';
import {
  getClients,
  getProjects,
  getInquiries,
  createInquiry,
  getDocuments,
  uploadDocument,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateClientProfile,
  getFeedback,
  submitFeedback,
  getDownPayments,
  createDownPayment,
  getPaymentSummary,
  formatDate,
  formatMoney,
} from '../services/api';

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read the selected file.'));
  reader.readAsDataURL(file);
});
const formatFileSize = (bytes) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const calculateValidityDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + 60);
  return d.toISOString().slice(0, 10);
};

const computeStatusFromDates = (paymentDate, validUntil) => {
  const expiry = validUntil ? new Date(validUntil) : (paymentDate ? new Date(new Date(paymentDate).getTime() + 60 * 86400000) : null);
  if (!expiry || isNaN(expiry.getTime())) return 'Valid';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Expired';
  if (diffDays <= 15) return 'Expiring Soon';
  return 'Valid';
};

export default function ClientDashboard() {
  const { user } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCategory, setSelectedCategory] = useState('RESIDENCIES');

  // Data states
  const [clientProfile, setClientProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [allShowcaseProjects, setAllShowcaseProjects] = useState([]);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [selectedDesignImgIdx, setSelectedDesignImgIdx] = useState(0);
  const [inquiries, setInquiries] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [downPayments, setDownPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [receiptViewModal, setReceiptViewModal] = useState(null);
  const [payForm, setPayForm] = useState({
    projectId: '',
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    notes: '',
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Forms
  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    phone: '',
    address: '',
    emergencyContact: '',
    preferredCategory: 'RESIDENCIES',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [inquirySubject, setInquirySubject] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryProjectId, setInquiryProjectId] = useState('');
  const [inquiryAttachment, setInquiryAttachment] = useState(null);
  const [sendingInquiry, setSendingInquiry] = useState(false);

  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('KYC_DOCUMENT');
  const [docDesc, setDocDesc] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Feedback form state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackCategory, setFeedbackCategory] = useState('GENERAL');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackProjectId, setFeedbackProjectId] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);


  async function loadDashboardData() {
    setLoading(true);
    try {
      const [allClients, allProjects] = await Promise.all([
        getClients(),
        getProjects({ marketingOnly: true }),
      ]);

      setAllShowcaseProjects(allProjects);

      let currentClient = null;
      if (user?.clientId) {
        currentClient = allClients.find((c) => c.id === user.clientId);
      }
      if (!currentClient && user?.username) {
        currentClient = allClients.find((c) => c.email?.toLowerCase() === user.username.toLowerCase());
      }
      setClientProfile(currentClient);

      if (currentClient) {
        setEditProfileForm({
          name: currentClient.name || '',
          phone: currentClient.phone || '',
          address: currentClient.address || '',
          emergencyContact: currentClient.emergencyContact || '',
          preferredCategory: currentClient.preferredCategory || 'RESIDENCIES',
        });

        const myProjects = allProjects.filter((p) => p.client?.id === currentClient.id);
        setProjects(myProjects);

        const [inqData, docData, notifData, fbData, dpData, summaryData] = await Promise.all([
          getInquiries(currentClient.id),
          getDocuments({ clientId: currentClient.id }),
          getNotifications(currentClient.id),
          getFeedback(currentClient.id),
          getDownPayments({ clientId: currentClient.id }),
          getPaymentSummary(currentClient.id),
        ]);

        setInquiries(inqData);
        setDocuments(docData);
        setNotifications(notifData);
        setFeedbacks(fbData);
        setDownPayments(dpData || []);
        setPaymentSummary(summaryData);
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const handleOpenPayModal = (presetProjectId = '') => {
    setReceiptFile(null);
    const chosenProject = projects.find(p => p.id === Number(presetProjectId)) || projects[0];
    const defaultAmount = chosenProject?.budget ? (chosenProject.budget * 0.2).toFixed(2) : '500000';
    setPayForm({
      projectId: chosenProject ? String(chosenProject.id) : (projects[0]?.id ? String(projects[0].id) : ''),
      amount: defaultAmount,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: '',
      notes: '',
    });
    setPayModalOpen(true);
  };

  const handleClientSubmitPayment = async (e) => {
    e.preventDefault();
    if (!clientProfile || !payForm.amount || Number(payForm.amount) <= 0) {
      setError('Please provide a valid payment amount.');
      return;
    }
    setSubmittingPayment(true);
    setError('');
    try {
      let receiptData = null;
      let receiptFileName = null;
      let receiptFileType = null;

      if (receiptFile) {
        receiptData = await readFileAsDataUrl(receiptFile);
        receiptFileName = receiptFile.name;
        receiptFileType = receiptFile.type || 'application/octet-stream';
      }

      const chosenProj = projects.find(p => p.id === Number(payForm.projectId));

      await createDownPayment({
        client: { id: clientProfile.id },
        project: payForm.projectId ? { id: Number(payForm.projectId) } : null,
        amount: Number(payForm.amount),
        paymentDate: payForm.paymentDate,
        paymentMethod: payForm.paymentMethod,
        referenceNumber: payForm.referenceNumber.trim() || null,
        notes: payForm.notes.trim() || null,
        totalProjectAmount: chosenProj?.budget ? Number(chosenProj.budget) : null,
        requiredDownPayment: chosenProj?.budget ? Number((chosenProj.budget * 0.2).toFixed(2)) : null,
        receipt: receiptData,
        receiptFileName,
        receiptFileType,
      });

      setSuccessMsg('Your down payment has been recorded with 60-day validity! Thank you.');
      setPayModalOpen(false);
      setReceiptFile(null);
      const [dpData, summaryData] = await Promise.all([
        getDownPayments({ clientId: clientProfile.id }),
        getPaymentSummary(clientProfile.id),
      ]);
      setDownPayments(dpData || []);
      setPaymentSummary(summaryData);
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err) {
      setError(err.message || 'Failed to submit down payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!clientProfile) return;
    setSavingProfile(true);
    setError('');
    try {
      const updated = await updateClientProfile(clientProfile.id, editProfileForm);
      setClientProfile(updated);
      setSuccessMsg('Profile details successfully updated!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendInquiry = async (e) => {
    e.preventDefault();
    if (!clientProfile || !inquirySubject.trim() || !inquiryMessage.trim()) return;
    setSendingInquiry(true);
    setError('');
    try {
      await createInquiry({
        client: { id: clientProfile.id },
        project: inquiryProjectId ? { id: Number(inquiryProjectId) } : null,
        subject: inquirySubject.trim(),
        message: inquiryMessage.trim(),
        attachmentName: inquiryAttachment?.name || null,
        attachmentType: inquiryAttachment?.type || null,
        attachmentData: inquiryAttachment ? await readFileAsDataUrl(inquiryAttachment) : null,
      });
      setInquirySubject('');
      setInquiryMessage('');
      setInquiryProjectId('');
      setInquiryAttachment(null);
      setSuccessMsg('Your inquiry has been submitted! Our project team will respond promptly.');
      const inqData = await getInquiries(clientProfile.id);
      setInquiries(inqData);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to submit inquiry');
    } finally {
      setSendingInquiry(false);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!clientProfile || !docTitle.trim()) return;
    setUploadingDoc(true);
    setError('');
    try {
      const file = documentFile;
      await uploadDocument({
        title: docTitle.trim(),
        documentType: docType,
        description: docDesc.trim(),
        fileName: file?.name || `${docTitle.trim().replace(/\s+/g, '_')}.pdf`,
        fileType: file?.type || 'application/pdf',
        fileSize: file ? formatFileSize(file.size) : '1.2 MB',
        fileData: file ? await readFileAsDataUrl(file) : null,
        uploadedByRole: 'CLIENT',
        client: { id: clientProfile.id },
        project: projects[0] ? { id: projects[0].id } : null,
      });
      setDocTitle('');
      setDocDesc('');
      setDocumentFile(null);
      setSuccessMsg('Document successfully uploaded to your vault!');
      const docData = await getDocuments({ clientId: clientProfile.id });
      setDocuments(docData);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleMarkNotifRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!clientProfile || !feedbackComments.trim()) return;
    setSubmittingFeedback(true);
    setError('');
    try {
      await submitFeedback({
        client: { id: clientProfile.id },
        project: feedbackProjectId ? { id: Number(feedbackProjectId) } : null,
        rating: Number(feedbackRating),
        category: feedbackCategory,
        comments: feedbackComments.trim(),
      });
      setFeedbackRating(5);
      setFeedbackCategory('GENERAL');
      setFeedbackComments('');
      setFeedbackProjectId('');
      setSuccessMsg('Thank you! Your review has been submitted.');
      const fbData = await getFeedback(clientProfile.id);
      setFeedbacks(fbData);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="light-site-wrapper">
      {/* Top Navbar with Logo, Home, About Us, Contact Us, and Account Name at top right */}
      <Navbar onSelectCategory={(cat) => {
        setSelectedCategory(cat);
        setActiveTab('explorer');
      }} />

      <main className="light-dashboard-container dashboard-workspace">
        {error && (
          <div className="light-alert alert-danger">
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="light-alert alert-success">
            <span>{successMsg}</span>
          </div>
        )}

        {/* Client Hero Header */}
        <section className="light-hero-card">
          <div className="hero-info-col">
            <span className="brand-green-subtitle">CLIENT PORTAL</span>
            <h1 className="hero-title">Welcome Back, {clientProfile?.name || user?.displayName}!</h1>
            <p className="hero-subtitle">
              Client OD ID: <b>{clientProfile?.employeeNumber || 'OD-000101'}</b> &nbsp;|&nbsp;
              Track your assigned properties, milestone updates, and direct communications.
            </p>
          </div>

          <div className="hero-metric-badges">
            <div className="metric-badge-box">
              <span className="badge-big-number">{projects.length}</span>
              <span className="badge-small-label">My Projects</span>
            </div>
            <div className="metric-badge-box highlight">
              <span className="badge-big-number">{unreadCount}</span>
              <span className="badge-small-label">New Alerts</span>
            </div>
          </div>
        </section>

        {/* Client Dashboard Navigation Bar */}
        <nav className="light-tab-bar">
          <button
            type="button"
            className={`tab-btn-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span>Overview &amp; Milestones</span>
          </button>

          <button
            type="button"
            className={`tab-btn-item ${activeTab === 'explorer' ? 'active' : ''}`}
            onClick={() => setActiveTab('explorer')}
          >
            <span>Browse Properties</span>
          </button>

          <button
            type="button"
            className={`tab-btn-item ${activeTab === 'designs' ? 'active' : ''}`}
            onClick={() => setActiveTab('designs')}
          >
            <span>Company Designs ({allShowcaseProjects.length})</span>
          </button>

          <button
            type="button"
            className={`tab-btn-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <span>My Projects ({projects.length})</span>
          </button>

          <button
            type="button"
            className={`tab-btn-item ${activeTab === 'inquiries' ? 'active' : ''}`}
            onClick={() => setActiveTab('inquiries')}
          >
            <span>Inquiries ({inquiries.length})</span>
          </button>

          <button
            type="button"
            className={`tab-btn-item ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <span>Documents Vault ({documents.length})</span>
          </button>

          <button
            type="button"
            className={`tab-btn-item ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            <span>Feedback & Reviews ({feedbacks.length})</span>
          </button>

          <button
            type="button"
            className={`tab-btn-item ${activeTab === 'downpayments' ? 'active' : ''}`}
            onClick={() => setActiveTab('downpayments')}
          >
            <span>Down Payments ({downPayments.length})</span>
          </button>

          <button
            type="button"
            className={`tab-btn-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span>My Profile</span>
          </button>
        </nav>

        {/* TAB 1: OVERVIEW & MILESTONES */}
        {activeTab === 'overview' && (
          <div>
            <div className="light-kpi-row">
              <div className="light-kpi-card">
                <div>
                  <small>Active Construction</small>
                  <strong>{projects[0]?.name || 'No active project'}</strong>
                  <span className="kpi-status-text">{projects[0]?.status || 'Planning'}</span>
                </div>
              </div>

              <div className="light-kpi-card">
                <div>
                  <small>Overall Progress</small>
                  <strong style={{ color: 'var(--brand-green)' }}>{projects[0]?.progressPercentage || 0}%</strong>
                  <span className="kpi-status-text">On Schedule</span>
                </div>
              </div>

              <div className="light-kpi-card">
                <div>
                  <small>Notifications</small>
                  <strong>{unreadCount} Unread</strong>
                  <span className="kpi-status-text">Recent updates</span>
                </div>
              </div>
            </div>

            {projects.length > 0 ? (
              <div className="light-panel-card">
                <div className="panel-card-head">
                  <div>
                    <span className="brand-green-subtitle">CURRENT CONSTRUCTION STATUS</span>
                    <h3 className="panel-title">{projects[0].name}</h3>
                    <p className="panel-meta">{projects[0].location} | Category: {projects[0].category}</p>
                  </div>
                  <div className="panel-price-tag">
                    <small>Investment Value</small>
                    <strong>{projects[0].priceRange || formatMoney(projects[0].budget)}</strong>
                  </div>
                </div>

                <div className="card-construction-box" style={{ padding: '1.25rem', margin: '1.5rem 0' }}>
                  <small style={{ fontSize: '0.82rem', fontWeight: 700 }}>Construction Status:</small>
                  <p style={{ fontSize: '1.05rem', margin: '0.4rem 0 0.85rem', color: '#0f172a', fontWeight: 500 }}>
                    {projects[0].constructionStatus || 'Site mobilization and structural works in progress.'}
                  </p>
                  <div className="construction-progress-track" style={{ height: '8px' }}>
                    <div
                      className="construction-progress-fill"
                      style={{ width: `${projects[0].progressPercentage || 0}%` }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>Commenced: {formatDate(projects[0].startDate)}</span>
                    <strong style={{ color: 'var(--brand-green)' }}>{projects[0].progressPercentage || 0}% Completed</strong>
                    <span>Handover: {formatDate(projects[0].endDate)}</span>
                  </div>
                </div>

                {/* Key Milestones */}
                <h4 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '1rem' }}>
                  Project Milestones
                </h4>
                {projects[0].milestones && projects[0].milestones.length > 0 ? (
                  <div className="table-responsive-box">
                    <table className="light-table">
                      <thead>
                        <tr>
                          <th>Stage</th>
                          <th>Description</th>
                          <th>Target Date</th>
                          <th>Completion Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects[0].milestones.map((m) => (
                          <tr key={m.id}>
                            <td><strong>{m.title}</strong></td>
                            <td>{m.description || '-'}</td>
                            <td>{formatDate(m.targetDate)}</td>
                            <td>{formatDate(m.completionDate)}</td>
                            <td>
                              <span className={`pill-badge ${m.status?.toLowerCase()}`}>
                                {m.status === 'COMPLETED' ? 'Completed' : (m.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted">No specific milestones scheduled yet.</p>
                )}
              </div>
            ) : (
              <div className="light-panel-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <h3>No Project Currently Assigned</h3>
                <p className="text-muted">Explore available properties and contact your manager to get started.</p>
                <button type="button" className="btn-solid-green" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('explorer')}>
                  Browse Developments
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="light-panel-card">
              <div className="panel-card-head">
                <div>
                  <span className="brand-green-subtitle">ALERTS &amp; UPDATES</span>
                  <h3 className="panel-title">Notifications ({notifications.length})</h3>
                </div>
                {unreadCount > 0 && clientProfile && (
                  <button
                    type="button"
                    className="btn-outline-green"
                    onClick={async () => {
                      await markAllNotificationsRead(clientProfile.id);
                      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                    }}
                  >
                    Mark All As Read
                  </button>
                )}
              </div>

              {notifications.length > 0 ? (
                <div className="notification-stack">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${n.read ? 'read' : 'unread'}`}
                    >
                      <div className="notif-content">
                        <strong>{n.title}</strong>
                        <p>{n.message}</p>
                        <small>{formatDate(n.createdAt)}</small>
                      </div>
                      {!n.read && (
                        <button
                          type="button"
                          className="btn-outline-green"
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                          onClick={() => handleMarkNotifRead(n.id)}
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No notifications right now.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: EXPLORER */}
        {activeTab === 'explorer' && (
          <PropertyExplorer
            projects={allShowcaseProjects}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
            onInquire={(proj) => {
              setInquirySubject(`Inquiry regarding ${proj.name}`);
              setInquiryProjectId(String(proj.id));
              setActiveTab('inquiries');
            }}
            onSelectProject={(project) => {
              setSelectedDesign(project);
              setActiveTab('design-details');
            }}
          />
        )}

        {activeTab === 'designs' && (
          <PropertyExplorer
            projects={allShowcaseProjects}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
            onInquire={(project) => {
              setInquirySubject(`Inquiry regarding ${project.name}`);
              setInquiryProjectId(String(project.id));
              setActiveTab('inquiries');
            }}
            onSelectProject={(project) => {
              setSelectedDesign(project);
              setSelectedDesignImgIdx(0);
              setActiveTab('design-details');
            }}
          />
        )}

        {activeTab === 'design-details' && selectedDesign && (
          <section className="light-panel-card company-design-details">
            <button type="button" className="btn-outline-green" onClick={() => setActiveTab('designs')}>Back to Company Designs</button>
            <div className="company-design-details__grid">
              <div>
                <SwipeableDesignGallery
                  images={
                    selectedDesign.imageUrls && selectedDesign.imageUrls.length > 0
                      ? selectedDesign.imageUrls
                      : selectedDesign.imageUrl
                      ? [selectedDesign.imageUrl]
                      : []
                  }
                  title={selectedDesign.name}
                />
              </div>
              <div>
                <span className="brand-green-subtitle">ODILIYA COMPANY DESIGN</span>
                <h2 className="panel-title">{selectedDesign.name}</h2>
                <p className="panel-meta">{selectedDesign.location || 'Location to be confirmed'} &nbsp; • &nbsp; {selectedDesign.category}</p>
                <p className="company-design-details__description">{selectedDesign.description || 'Contact our Client Manager for the full design specification and availability.'}</p>
                {selectedDesign.specifications && <p><strong>Specifications:</strong> {selectedDesign.specifications}</p>}
                <p><strong>Starting from:</strong> {selectedDesign.priceRange || formatMoney(selectedDesign.budget)}</p>
                <button type="button" className="btn-solid-green" onClick={() => {
                  setInquirySubject(`Design inquiry: ${selectedDesign.name}`);
                  setInquiryProjectId(String(selectedDesign.id));
                  setActiveTab('inquiries');
                }}>Ask About This Design</button>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: MY PROJECTS */}
        {activeTab === 'projects' && (
          <div className="light-panel-card">
            <div className="panel-card-head">
              <div>
                <span className="brand-green-subtitle">PORTFOLIO</span>
                <h3 className="panel-title">My Assigned Construction Projects</h3>
              </div>
            </div>

            {projects.length > 0 ? (
              <div className="light-property-grid">
                {projects.map((p) => (
                  <article className="light-property-card" key={p.id}>
                    <div className="card-media-wrap">
                      <img src={p.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'} alt={p.name} className="card-media-img" />
                      <span className="media-tag-badge">{p.category}</span>
                      <span className="media-status-pill">{p.progressPercentage || 0}% Built</span>
                    </div>
                    <div className="card-content-body">
                      <span className="card-location">{p.location}</span>
                      <h3 className="card-title">{p.name}</h3>
                      <p className="card-description">{p.description}</p>
                      <div className="card-construction-box">
                        <small>Status:</small>
                        <p>{p.constructionStatus}</p>
                      </div>
                      <div className="card-footer-strip">
                        <div className="card-price-block">
                          <small>Budget</small>
                          <strong>{formatMoney(p.budget)}</strong>
                        </div>
                        <button
                          type="button"
                          className="btn-solid-green"
                          onClick={() => {
                            setInquirySubject(`Project Inquiry: ${p.name}`);
                            setInquiryProjectId(String(p.id));
                            setActiveTab('inquiries');
                          }}
                        >
                          Send Inquiry
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-muted">No projects assigned yet.</p>
            )}
          </div>
        )}

        {/* TAB 5: INQUIRIES */}
        {activeTab === 'inquiries' && (
          <div>
            <div className="light-panel-card">
              <div className="panel-card-head">
                <div>
                  <span className="brand-green-subtitle">PROJECT SUPPORT</span>
                  <h3 className="panel-title">Send Inquiry to Project Team</h3>
                </div>
              </div>

              <form onSubmit={handleSendInquiry}>
                <div className="form-grid-2">
                  <div className="form-input-box">
                    <label>Related Project</label>
                    <select
                      value={inquiryProjectId}
                      onChange={(e) => setInquiryProjectId(e.target.value)}
                    >
                      <option value="">-- Choose Project (Optional) --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-input-box">
                    <label>Subject *</label>
                    <input
                      type="text"
                      placeholder="e.g. Tile finishes query"
                      value={inquirySubject}
                      onChange={(e) => setInquirySubject(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-input-box" style={{ marginTop: '1.25rem' }}>
                  <label>Message *</label>
                  <textarea
                    rows={4}
                    placeholder="Describe your inquiry..."
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    required
                  />
                </div>

                <div className="form-input-box" style={{ marginTop: '1rem' }}>
                  <label>Attach your design or reference photo (optional)</label>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setInquiryAttachment(e.target.files?.[0] || null)} />
                  {inquiryAttachment && <small className="text-muted">Attached: {inquiryAttachment.name}</small>}
                </div>

                <button
                  type="submit"
                  className="btn-solid-green"
                  style={{ marginTop: '1.25rem' }}
                  disabled={sendingInquiry}
                >
                  {sendingInquiry ? 'Sending...' : 'Submit Inquiry'}
                </button>
              </form>
            </div>

            {/* Inquiries History */}
            <div className="light-panel-card">
              <div className="panel-card-head">
                <div>
                  <span className="brand-green-subtitle">ARCHIVE</span>
                  <h3 className="panel-title">Inquiry History &amp; Official Responses</h3>
                </div>
              </div>

              {inquiries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {inquiries.map((inq) => (
                    <div
                      key={inq.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{inq.subject}</strong>
                        <span className={`pill-badge ${inq.status?.toLowerCase()}`}>
                          {inq.status === 'ANSWERED' ? 'Answered' : 'Pending'}
                        </span>
                      </div>
                      <p style={{ color: '#334155', fontSize: '0.95rem', margin: '0.75rem 0' }}>{inq.message}</p>
                      {inq.attachmentData && (
                        <a href={inq.attachmentData} download={inq.attachmentName || 'inquiry-attachment'} className="btn-outline-green" style={{ display: 'inline-flex', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                          View attached design: {inq.attachmentName || 'attachment'}
                        </a>
                      )}
                      <small style={{ color: 'var(--text-muted)' }}>
                        Sent on {formatDate(inq.createdAt)} {inq.project ? `| Project: ${inq.project.name}` : ''}
                      </small>

                      {inq.response && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(9, 84, 59, 0.06)', borderLeft: '4px solid var(--brand-green)', borderRadius: '0 8px 8px 0' }}>
                          <small style={{ color: 'var(--brand-green)', fontWeight: 700 }}>
                            Response from {inq.respondedBy || 'Client Manager'} ({formatDate(inq.respondedAt)}):
                          </small>
                          <p style={{ color: '#0f172a', fontSize: '0.92rem', marginTop: '0.25rem' }}>{inq.response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No inquiries submitted yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div>
            <div className="light-panel-card">
              <div className="panel-card-head">
                <div>
                  <span className="brand-green-subtitle">VAULT</span>
                  <h3 className="panel-title">Upload Project Documents</h3>
                </div>
              </div>

              <form onSubmit={handleUploadDocument}>
                <div className="form-grid-2">
                  <div className="form-input-box">
                    <label>Document Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. NIC Copy / Bank Remittance"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-input-box">
                    <label>Category</label>
                    <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                      <option value="KYC_DOCUMENT">KYC Verification</option>
                      <option value="PAYMENT_RECEIPT">Payment Remittance Receipt</option>
                      <option value="PERMIT">Permit / Legal Letter</option>
                      <option value="OTHER">Other Documentation</option>
                    </select>
                  </div>
                </div>

                <div className="form-input-box" style={{ marginTop: '1rem' }}>
                  <label>Notes / Description</label>
                  <input
                    type="text"
                    placeholder="Brief description..."
                    value={docDesc}
                    onChange={(e) => setDocDesc(e.target.value)}
                  />
                </div>

                <div className="form-input-box" style={{ marginTop: '1rem' }}>
                  <label>Document or photo</label>
                  <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} />
                  {documentFile && <small className="text-muted">Selected: {documentFile.name}</small>}
                </div>

                <button type="submit" className="btn-solid-green" style={{ marginTop: '1.25rem' }} disabled={uploadingDoc}>
                  {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                </button>
              </form>
            </div>

            <div className="light-panel-card">
              <div className="panel-card-head">
                <div>
                  <span className="brand-green-subtitle">FILES</span>
                  <h3 className="panel-title">Shared Documents &amp; Blueprints</h3>
                </div>
              </div>

              {documents.length > 0 ? (
                <div className="table-responsive-box">
                  <table className="light-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>File Name</th>
                        <th>Size</th>
                        <th>Uploaded By</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((d) => (
                        <tr key={d.id}>
                          <td><strong>{d.title}</strong></td>
                          <td><span className="pill-badge active">{d.documentType}</span></td>
                          <td>{d.fileName || 'document.pdf'}</td>
                          <td>{d.fileSize || '1.5 MB'}</td>
                          <td>{d.uploadedByRole === 'CLIENT' ? 'You' : 'Client Manager'}</td>
                          <td>{formatDate(d.uploadedAt)}</td>
                          <td>
                            {d.fileData ? <a href={d.fileData} download={d.fileName || d.title} className="btn-outline-green" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>Download</a> : <span className="text-muted">No file</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No documents uploaded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: FEEDBACK & REVIEWS */}
        {activeTab === 'feedback' && (
          <div>
            {/* Submit feedback form */}
            <div className="light-panel-card">
              <div className="panel-card-head">
                <div>
                  <span className="brand-green-subtitle">RATE YOUR EXPERIENCE</span>
                  <h3 className="panel-title">Submit Feedback & Review</h3>
                  <p className="panel-meta">Your feedback helps us improve. Share your experience with us.</p>
                </div>
              </div>

              <form onSubmit={handleSubmitFeedback}>
                <div className="form-grid-2">
                  <div className="form-input-box">
                    <label>Star Rating *</label>
                    <select value={feedbackRating} onChange={(e) => setFeedbackRating(e.target.value)} required>
                      <option value={5}>⭐⭐⭐⭐⭐ — Excellent (5)</option>
                      <option value={4}>⭐⭐⭐⭐ — Very Good (4)</option>
                      <option value={3}>⭐⭐⭐ — Average (3)</option>
                      <option value={2}>⭐⭐ — Below Average (2)</option>
                      <option value={1}>⭐ — Poor (1)</option>
                    </select>
                  </div>

                  <div className="form-input-box">
                    <label>Category</label>
                    <select value={feedbackCategory} onChange={(e) => setFeedbackCategory(e.target.value)}>
                      <option value="GENERAL">General Experience</option>
                      <option value="CONSTRUCTION_QUALITY">Construction Quality</option>
                      <option value="COMMUNICATION">Communication</option>
                      <option value="TIMELINESS">Timeliness & Delivery</option>
                    </select>
                  </div>

                  <div className="form-input-box">
                    <label>Related Project (optional)</label>
                    <select value={feedbackProjectId} onChange={(e) => setFeedbackProjectId(e.target.value)}>
                      <option value="">— Not project-specific —</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-input-box" style={{ marginTop: '1rem' }}>
                  <label>Your Comments *</label>
                  <textarea
                    rows={4}
                    placeholder="Share your honest experience about our construction quality, communication, timeliness, or overall service..."
                    value={feedbackComments}
                    onChange={(e) => setFeedbackComments(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-solid-green"
                  style={{ marginTop: '1.25rem' }}
                  disabled={submittingFeedback}
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>

            {/* Previous feedback list */}
            <div className="light-panel-card">
              <div className="panel-card-head">
                <div>
                  <span className="brand-green-subtitle">HISTORY</span>
                  <h3 className="panel-title">My Previous Reviews</h3>
                </div>
              </div>

              {feedbacks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {feedbacks.map((fb) => (
                    <div
                      key={fb.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '1.25rem' }}>
                            {'⭐'.repeat(fb.rating || 0)}
                          </span>
                          <span style={{ marginLeft: '0.5rem', fontWeight: 600, color: 'var(--brand-green)' }}>
                            {fb.rating}/5
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="pill-badge active" style={{ fontSize: '0.72rem' }}>{fb.category?.replace('_', ' ')}</span>
                          <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{formatDate(fb.submittedAt)}</small>
                        </div>
                      </div>
                      {fb.project && (
                        <small style={{ display: 'block', color: 'var(--brand-green)', marginBottom: '0.5rem' }}>
                          Project: {fb.project.name}
                        </small>
                      )}
                      <p style={{ color: '#334155', fontSize: '0.95rem', margin: 0 }}>{fb.comments}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No reviews submitted yet. Share your experience above!</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: PROFILE */}
        {activeTab === 'profile' && (
          <div className="light-panel-card">
            <div className="panel-card-head">
              <div>
                <span className="brand-green-subtitle">ACCOUNT INFORMATION</span>
                <h3 className="panel-title">My Client Profile</h3>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div className="form-grid-2">
                <div className="form-input-box">
                  <label>Full Legal Name *</label>
                  <input
                    type="text"
                    value={editProfileForm.name}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-input-box">
                  <label>Email (Locked)</label>
                  <input
                    type="email"
                    value={clientProfile?.email || user?.username}
                    disabled
                    style={{ opacity: 0.7, background: '#f1f5f9' }}
                  />
                </div>

                <div className="form-input-box">
                  <label>Direct Phone *</label>
                  <input
                    type="text"
                    value={editProfileForm.phone}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-input-box">
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    value={editProfileForm.emergencyContact}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, emergencyContact: e.target.value })}
                  />
                </div>

                <div className="form-input-box">
                  <label>Client OD Number</label>
                  <input
                    type="text"
                    value={clientProfile?.employeeNumber || 'OD-000101'}
                    disabled
                    style={{ opacity: 0.7, background: '#f1f5f9' }}
                  />
                </div>
              </div>

              <div className="form-input-box" style={{ marginTop: '1.25rem' }}>
                <label>Postal Address</label>
                <textarea
                  rows={3}
                  value={editProfileForm.address}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, address: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-solid-green" style={{ marginTop: '1.5rem' }} disabled={savingProfile}>
                {savingProfile ? 'Saving Details...' : 'Save Permitted Details'}
              </button>
            </form>
          </div>
        )}

        {/* TAB: DOWN PAYMENTS */}
        {activeTab === 'downpayments' && (
          <div>
            {/* KPI summary */}
            <div className="light-kpi-row" style={{ marginBottom: '1.5rem' }}>
              <div className="light-kpi-card">
                <div>
                  <small>Total Payments</small>
                  <strong>{downPayments.length}</strong>
                  <span className="kpi-status-text">recorded</span>
                </div>
              </div>
              <div className="light-kpi-card">
                <div>
                  <small>Valid Payments</small>
                  <strong style={{ color: '#16a34a' }}>{downPayments.filter(p => p.status === 'Valid').length}</strong>
                  <span className="kpi-status-text">active</span>
                </div>
              </div>
              <div className="light-kpi-card">
                <div>
                  <small>Expiring Soon</small>
                  <strong style={{ color: '#d97706' }}>{downPayments.filter(p => p.status === 'Expiring Soon').length}</strong>
                  <span className="kpi-status-text">within 15 days</span>
                </div>
              </div>
              <div className="light-kpi-card">
                <div>
                  <small>Total Confirmed</small>
                  <strong>
                    {paymentSummary?.totalConfirmedAmount != null
                      ? `Rs. ${Number(paymentSummary.totalConfirmedAmount).toLocaleString()}`
                      : 'Rs. 0'}
                  </strong>
                  <span className="kpi-status-text">paid</span>
                </div>
              </div>
            </div>

            {/* Expiry alerts */}
            {downPayments.filter(p => p.status === 'Expiring Soon').length > 0 && (
              <div style={{
                background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8,
                padding: '0.75rem 1.25rem', marginBottom: '1.25rem', color: '#92400e', fontSize: '0.9rem'
              }}>
                ⚠️ You have {downPayments.filter(p => p.status === 'Expiring Soon').length} downpayment(s) expiring within 15 days. Contact your Client Manager to renew.
              </div>
            )}

            {/* Section header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>My Down Payments</h3>
              <button className="btn-solid-green" onClick={handleOpenPayModal}>
                + Submit Down Payment
              </button>
            </div>

            {/* Payment list */}
            {downPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💳</div>
                <p style={{ margin: 0, fontWeight: 600 }}>No down payments recorded yet.</p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>Click "Submit Down Payment" to record your first payment.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {downPayments.map((pay) => {
                  const badgeStyle = pay.status === 'Valid'
                    ? { background: '#dcfce7', color: '#16a34a', padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }
                    : pay.status === 'Expiring Soon'
                    ? { background: '#fef3c7', color: '#b45309', padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }
                    : { background: '#fee2e2', color: '#dc2626', padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 };

                  return (
                    <div key={pay.id} style={{
                      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                      padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
                            {pay.project?.name || pay.projectName || 'General Payment'}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            Ref: <strong>{pay.referenceNumber || '—'}</strong> &nbsp;|&nbsp; Method: {pay.paymentMethod || '—'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={badgeStyle}>{pay.status || 'Unknown'}</span>
                          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>
                            Rs. {Number(pay.amount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.83rem', color: '#475569' }}>
                        <span>📅 Paid: <strong>{pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : '—'}</strong></span>
                        <span>🗓 Valid Until: <strong>{pay.validUntil ? new Date(pay.validUntil).toLocaleDateString() : '—'}</strong></span>
                        {pay.daysRemaining != null && (
                          <span style={{ color: pay.daysRemaining <= 15 ? '#d97706' : '#16a34a' }}>
                            ⏳ {pay.daysRemaining > 0 ? `${pay.daysRemaining} days remaining` : 'Expired'}
                          </span>
                        )}
                        {pay.notes && <span>📝 {pay.notes}</span>}
                      </div>

                      {(pay.receipt || pay.receiptFileName) && (
                        <div style={{ marginTop: '0.65rem' }}>
                          <button
                            type="button"
                            style={{ fontSize: '0.8rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
                            onClick={() => setReceiptViewModal({ open: true, receipt: pay.receipt, fileName: pay.receiptFileName, fileType: pay.receiptFileType })}
                          >
                            📎 View Receipt
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== PAY MODAL ===== */}
        {payModalOpen && (
          <div className="modal-overlay" onClick={() => setPayModalOpen(false)}>
            <div className="modal-box" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Submit Down Payment</h3>
                <button className="modal-close-btn" onClick={() => setPayModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleClientSubmitPayment} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

                {/* Project selector */}
                <div className="form-input-box">
                  <label>Project</label>
                  <select
                    value={payForm.projectId}
                    onChange={(e) => setPayForm({ ...payForm, projectId: e.target.value })}
                    required
                  >
                    <option value="">-- Select a Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="form-input-box">
                  <label>Amount (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter payment amount"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    required
                  />
                </div>

                {/* Payment Date */}
                <div className="form-input-box">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    value={payForm.paymentDate}
                    onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                    required
                  />
                  {payForm.paymentDate && (
                    <small style={{ color: '#64748b', marginTop: 4, display: 'block' }}>
                      ✅ Valid until: <strong>{calculateValidityDate(payForm.paymentDate)}</strong> (60 days)
                    </small>
                  )}
                </div>

                {/* Payment Method */}
                <div className="form-input-box">
                  <label>Payment Method</label>
                  <select
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    required
                  >
                    <option value="">-- Select Method --</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online Payment">Online Payment</option>
                    <option value="Credit Card">Credit Card</option>
                  </select>
                </div>

                {/* Reference Number */}
                <div className="form-input-box">
                  <label>Reference Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-2025-001"
                    value={payForm.referenceNumber}
                    onChange={(e) => setPayForm({ ...payForm, referenceNumber: e.target.value })}
                  />
                </div>

                {/* Receipt Upload */}
                <div className="form-input-box">
                  <label>Receipt (Image / PDF)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setReceiptFile({ data: ev.target.result, name: file.name, type: file.type });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  {receiptFile && (
                    <small style={{ color: '#16a34a', marginTop: 4, display: 'block' }}>
                      ✅ {receiptFile.name} selected
                    </small>
                  )}
                </div>

                {/* Notes */}
                <div className="form-input-box">
                  <label>Notes (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Any additional information..."
                    value={payForm.notes}
                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                  <button type="button" className="btn-outline" onClick={() => setPayModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-solid-green" disabled={submittingPayment}>
                    {submittingPayment ? 'Submitting...' : 'Submit Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== RECEIPT VIEW MODAL ===== */}
        {receiptViewModal?.open && (
          <div className="modal-overlay" onClick={() => setReceiptViewModal(null)}>
            <div className="modal-box" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Receipt Preview</h3>
                <button className="modal-close-btn" onClick={() => setReceiptViewModal(null)}>✕</button>
              </div>
              <div style={{ padding: '1rem 0' }}>
                {receiptViewModal.receipt ? (
                  receiptViewModal.fileType?.startsWith('image/') || receiptViewModal.receipt.startsWith('data:image') ? (
                    <img
                      src={receiptViewModal.receipt}
                      alt="Receipt"
                      style={{ maxWidth: '100%', maxHeight: 480, borderRadius: 8, objectFit: 'contain', display: 'block', margin: '0 auto' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                      <p>{receiptViewModal.fileName || 'Receipt file'}</p>
                      <a href={receiptViewModal.receipt} download={receiptViewModal.fileName || 'receipt'} className="btn-solid-green">
                        Download Receipt
                      </a>
                    </div>
                  )
                ) : (
                  <p style={{ textAlign: 'center', color: '#64748b' }}>No receipt available.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
