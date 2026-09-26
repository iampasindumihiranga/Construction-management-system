import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  getProjectRequests,
  createProjectRequest,
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

  // Dedicated inquiry state for company designs (sent directly to Client Manager)
  const [designInquiryModalOpen, setDesignInquiryModalOpen] = useState(false);
  const [designInquiryTarget, setDesignInquiryTarget] = useState(null);
  const [designInquiryMessage, setDesignInquiryMessage] = useState('');
  const [sendingDesignInquiry, setSendingDesignInquiry] = useState(false);

  // Request Project feature states (Browse designs, Custom design, Request history)
  const [searchParams] = useSearchParams();
  const [projectRequests, setProjectRequests] = useState([]);
  const [requestProjectMode, setRequestProjectMode] = useState('browse'); // 'browse' | 'custom' | 'history'
  const [requestCategoryFilter, setRequestCategoryFilter] = useState('ALL');

  const [customRequestForm, setCustomRequestForm] = useState({
    title: '',
    category: 'RESIDENCIES',
    location: '',
    expectedBudget: '',
    targetStartDate: '',
    specifications: '',
    description: '',
  });
  const [customRequestImages, setCustomRequestImages] = useState([]);
  const [submittingCustomRequest, setSubmittingCustomRequest] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);

  const [designRequestModal, setDesignRequestModal] = useState(null);
  const [designRequestForm, setDesignRequestForm] = useState({
    location: '',
    targetStartDate: '',
    customNotes: '',
    expectedBudget: '',
  });
  const [submittingDesignRequest, setSubmittingDesignRequest] = useState(false);

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
      const [allClients, showcaseProjects] = await Promise.all([
        getClients(),
        getProjects({ marketingOnly: true }),
      ]);

      setAllShowcaseProjects(showcaseProjects || []);

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

        // Load ONLY real construction projects assigned to this client added by Project Manager
        try {
          const pmProjects = await getProjects({ clientId: currentClient.id, realOnly: true });
          setProjects(pmProjects || []);
        } catch (projErr) {
          console.warn('Projects fetch failed:', projErr);
          setProjects([]);
        }

        const results = await Promise.allSettled([
          getInquiries(currentClient.id),
          getDocuments({ clientId: currentClient.id }),
          getNotifications(currentClient.id),
          getFeedback(currentClient.id),
          getDownPayments({ clientId: currentClient.id }),
          getPaymentSummary(currentClient.id),
          getProjectRequests(currentClient.id),
        ]);

        const [inqRes, docRes, notifRes, fbRes, dpRes, summaryRes, reqRes] = results;
        setInquiries(inqRes.status === 'fulfilled' ? inqRes.value || [] : []);
        setDocuments(docRes.status === 'fulfilled' ? docRes.value || [] : []);
        setNotifications(notifRes.status === 'fulfilled' ? notifRes.value || [] : []);
        setFeedbacks(fbRes.status === 'fulfilled' ? fbRes.value || [] : []);
        setDownPayments(dpRes.status === 'fulfilled' ? dpRes.value || [] : []);
        setPaymentSummary(summaryRes.status === 'fulfilled' ? summaryRes.value : null);
        setProjectRequests(reqRes.status === 'fulfilled' ? reqRes.value || [] : []);
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
      if (tabParam === 'request-project') {
        const modeParam = searchParams.get('mode');
        if (modeParam) setRequestProjectMode(modeParam);
      }
    }
  }, [searchParams]);

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

  const handleOpenDesignInquiry = (design) => {
    setDesignInquiryTarget(design);
    setDesignInquiryMessage(`I would like to receive official details and consultation regarding ${design.name} (${design.category}). Please provide the complete architectural plan, pricing, and next steps.`);
    setDesignInquiryModalOpen(true);
  };

  const handleSubmitDesignInquiry = async (e) => {
    e.preventDefault();
    if (!clientProfile || !designInquiryTarget || !designInquiryMessage.trim()) return;
    setSendingDesignInquiry(true);
    setError('');
    try {
      await createInquiry({
        client: { id: clientProfile.id },
        project: { id: designInquiryTarget.id },
        subject: `Company Design Inquiry: ${designInquiryTarget.name}`,
        message: designInquiryMessage.trim(),
      });
      setSuccessMsg(`Your inquiry for "${designInquiryTarget.name}" has been sent directly to the Client Manager!`);
      setDesignInquiryModalOpen(false);
      setDesignInquiryTarget(null);
      setDesignInquiryMessage('');
      const inqData = await getInquiries(clientProfile.id);
      setInquiries(inqData);
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err) {
      setError(err.message || 'Failed to submit inquiry to Client Manager');
    } finally {
      setSendingDesignInquiry(false);
    }
  };

  const handleAddRequestImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (customRequestImages.length + files.length > 5) {
      setError('You can attach up to 5 photos / drawings per project request.');
      return;
    }
    setError('');
    try {
      const dataUrls = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
      setCustomRequestImages((prev) => [...prev, ...dataUrls].slice(0, 5));
    } catch (err) {
      setError('Failed to read image files: ' + err.message);
    }
  };

  const handleRemoveRequestImage = (idx) => {
    setCustomRequestImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitCustomRequest = async (e) => {
    e.preventDefault();
    if (!clientProfile) {
      setError('Client profile not loaded.');
      return;
    }
    if (!customRequestForm.title.trim() || !customRequestForm.location.trim() || !customRequestForm.description.trim()) {
      setError('Please provide project title, location, and description.');
      return;
    }
    setSubmittingCustomRequest(true);
    setError('');
    try {
      const payload = {
        client: { id: clientProfile.id },
        title: customRequestForm.title.trim(),
        category: customRequestForm.category,
        location: customRequestForm.location.trim(),
        expectedBudget: customRequestForm.expectedBudget ? Number(customRequestForm.expectedBudget) : null,
        targetStartDate: customRequestForm.targetStartDate || null,
        specifications: customRequestForm.specifications.trim() || null,
        description: customRequestForm.description.trim(),
        imageUrls: customRequestImages,
      };

      await createProjectRequest(payload);
      setSuccessMsg('Your custom project request has been submitted to the Client Manager! Our team will review and consult with Project Engineering.');
      setCustomRequestForm({
        title: '',
        category: 'RESIDENCIES',
        location: '',
        expectedBudget: '',
        targetStartDate: '',
        specifications: '',
        description: '',
      });
      setCustomRequestImages([]);
      setRequestProjectMode('history');
      const reqData = await getProjectRequests(clientProfile.id);
      setProjectRequests(reqData || []);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to submit custom project request');
    } finally {
      setSubmittingCustomRequest(false);
    }
  };

  const handleOpenDesignRequest = (design) => {
    setDesignRequestModal(design);
    setDesignRequestForm({
      location: design.location || '',
      targetStartDate: '',
      customNotes: `We would like to request this project based on the "${design.name}" company design. Please provide site suitability review, engineering assessment, and quotation.`,
      expectedBudget: design.budget ? String(design.budget) : '',
    });
  };

  const handleSubmitDesignRequest = async (e) => {
    e.preventDefault();
    if (!clientProfile || !designRequestModal) return;
    setSubmittingDesignRequest(true);
    setError('');
    try {
      const payload = {
        client: { id: clientProfile.id },
        selectedDesign: { id: designRequestModal.id },
        title: `Project Request: ${designRequestModal.name}`,
        category: designRequestModal.category || 'RESIDENCIES',
        location: designRequestForm.location.trim() || designRequestModal.location || 'Location to be confirmed',
        expectedBudget: designRequestForm.expectedBudget ? Number(designRequestForm.expectedBudget) : (designRequestModal.budget ? Number(designRequestModal.budget) : null),
        targetStartDate: designRequestForm.targetStartDate || null,
        specifications: designRequestModal.specifications || null,
        description: designRequestForm.customNotes.trim() || `Request based on ${designRequestModal.name}`,
        imageUrls: designRequestModal.imageUrls && designRequestModal.imageUrls.length > 0 ? designRequestModal.imageUrls : (designRequestModal.imageUrl ? [designRequestModal.imageUrl] : []),
      };

      await createProjectRequest(payload);
      setSuccessMsg(`Your project request for "${designRequestModal.name}" has been submitted to the Client Manager!`);
      setDesignRequestModal(null);
      setRequestProjectMode('history');
      const reqData = await getProjectRequests(clientProfile.id);
      setProjectRequests(reqData || []);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to submit project request');
    } finally {
      setSubmittingDesignRequest(false);
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
            className={`tab-btn-item ${activeTab === 'request-project' ? 'active' : ''}`}
            onClick={() => setActiveTab('request-project')}
          >
            <span>Request Project {projectRequests.length > 0 ? `(${projectRequests.length})` : ''}</span>
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
            onInquire={(proj) => handleOpenDesignInquiry(proj)}
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
            onInquire={(project) => handleOpenDesignInquiry(project)}
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
              </div>
            </div>
          </section>
        )}

        {/* TAB: REQUEST PROJECT (Choose design type or submit custom design) */}
        {activeTab === 'request-project' && (
          <div>
            {/* Top Mode Switcher Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={requestProjectMode === 'browse' ? 'btn-solid-green' : 'btn-outline-green'}
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.92rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={() => setRequestProjectMode('browse')}
              >
                <span>🏛️</span> Browse Company Designs by Type
              </button>

              <button
                type="button"
                className={requestProjectMode === 'custom' ? 'btn-solid-green' : 'btn-outline-green'}
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.92rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={() => setRequestProjectMode('custom')}
              >
                <span>✏️</span> Request Your Own Custom Design
              </button>

              <button
                type="button"
                className={requestProjectMode === 'history' ? 'btn-solid-green' : 'btn-outline-green'}
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.92rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={() => setRequestProjectMode('history')}
              >
                <span>📋</span> My Project Requests ({projectRequests.length})
              </button>
            </div>

            {/* Sub-view 1: Browse Designs by Type */}
            {requestProjectMode === 'browse' && (
              <div>
                <div className="light-panel-card" style={{ marginBottom: '1.5rem' }}>
                  <div className="panel-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <span className="brand-green-subtitle">SELECT DESIGN TYPE</span>
                      <h3 className="panel-title" style={{ margin: '0.2rem 0' }}>Choose Project Type &amp; Explore Architectural Designs</h3>
                      <p className="panel-meta" style={{ margin: 0 }}>Select a category below to see ready-to-build company designs, or request your custom design.</p>
                    </div>
                    <button
                      type="button"
                      className="btn-solid-green"
                      onClick={() => setRequestProjectMode('custom')}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      + Request Custom Design
                    </button>
                  </div>

                  {/* Category Filter Pills */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                    {[
                      { key: 'ALL', label: 'All Designs' },
                      { key: 'RESIDENCIES', label: 'Residencies' },
                      { key: 'APARTMENTS', label: 'Luxury Apartments' },
                      { key: 'LANDS', label: 'Lands & Plots' },
                      { key: 'HOMES', label: 'Homes' },
                    ].map((cat) => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setRequestCategoryFilter(cat.key)}
                        style={{
                          padding: '0.45rem 1.1rem',
                          borderRadius: '20px',
                          border: requestCategoryFilter === cat.key ? '2px solid var(--brand-green)' : '1px solid #cbd5e1',
                          background: requestCategoryFilter === cat.key ? 'var(--brand-green)' : '#ffffff',
                          color: requestCategoryFilter === cat.key ? '#ffffff' : '#334155',
                          fontWeight: 600,
                          fontSize: '0.86rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtered Designs Grid */}
                {(() => {
                  const filteredDesigns = allShowcaseProjects.filter((p) => {
                    if (requestCategoryFilter === 'ALL') return true;
                    return p.category === requestCategoryFilter;
                  });

                  if (filteredDesigns.length === 0) {
                    return (
                      <div className="light-panel-card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <h3>No company designs in this category yet</h3>
                        <p className="text-muted">You can submit your own custom design with your drawings, site photos, and expected budget.</p>
                        <button
                          type="button"
                          className="btn-solid-green"
                          style={{ marginTop: '1rem' }}
                          onClick={() => setRequestProjectMode('custom')}
                        >
                          Request Your Own Custom Design
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="light-property-grid">
                      {filteredDesigns.map((p) => (
                        <article className="light-property-card" key={p.id}>
                          <div className="card-media-wrap">
                            <img
                              src={p.imageUrl || (p.imageUrls && p.imageUrls[0]) || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'}
                              alt={p.name}
                              className="card-media-img"
                            />
                            <span className="media-tag-badge">{p.category}</span>
                            {p.imageUrls && p.imageUrls.length > 1 && (
                              <span style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px' }}>
                                📸 {p.imageUrls.length} Photos
                              </span>
                            )}
                          </div>
                          <div className="card-content-body">
                            <span className="card-location">📍 {p.location || 'Sri Lanka'}</span>
                            <h3 className="card-title">{p.name}</h3>
                            <p className="card-description">{p.description}</p>
                            {p.specifications && (
                              <div style={{ margin: '0.5rem 0', fontSize: '0.82rem', color: '#475569', background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                                <strong>Specs:</strong> {p.specifications}
                              </div>
                            )}
                            <div className="card-footer-strip">
                              <div className="card-price-block">
                                <small>Starting Budget</small>
                                <strong>{p.priceRange || (p.budget ? formatMoney(p.budget) : 'Custom Quote')}</strong>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  className="btn-outline-green"
                                  style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
                                  onClick={() => {
                                    setSelectedDesign(p);
                                    setActiveTab('design-details');
                                  }}
                                >
                                  Details
                                </button>
                                <button
                                  type="button"
                                  className="btn-solid-green"
                                  style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
                                  onClick={() => handleOpenDesignRequest(p)}
                                >
                                  Request Project →
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Sub-view 2: Submit Custom Design Request */}
            {requestProjectMode === 'custom' && (
              <div className="light-panel-card">
                <div className="panel-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span className="brand-green-subtitle">CUSTOM CONSTRUCTION REQUEST</span>
                    <h3 className="panel-title" style={{ margin: '0.2rem 0' }}>Request Your Own Custom Design Project</h3>
                    <p className="panel-meta" style={{ margin: 0 }}>
                      Provide your requirements, site photos, blueprints, and expected budget. Your request will go to the Client Manager and Project Engineering team.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-outline-green"
                    onClick={() => setRequestProjectMode('browse')}
                  >
                    ← Browse Company Designs
                  </button>
                </div>

                <form onSubmit={handleSubmitCustomRequest} style={{ marginTop: '1.5rem' }}>
                  <div className="form-grid-2">
                    <div className="form-input-box">
                      <label>Project Title / Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Modern 2-Story Villa in Negombo"
                        value={customRequestForm.title}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-input-box">
                      <label>Project Type / Category *</label>
                      <select
                        value={customRequestForm.category}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, category: e.target.value })}
                        required
                      >
                        <option value="RESIDENCIES">Residencies &amp; Private Villas</option>
                        <option value="APARTMENTS">Luxury Apartments</option>
                        <option value="LANDS">Lands &amp; Plot Developments</option>
                        <option value="HOMES">Residential Homes</option>
                      </select>
                    </div>

                    <div className="form-input-box">
                      <label>Project Location (City / District) *</label>
                      <input
                        type="text"
                        placeholder="e.g. Kadawatha Road, Ragama"
                        value={customRequestForm.location}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, location: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-input-box">
                      <label>Expected Budget (LKR) *</label>
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        placeholder="e.g. 25000000"
                        value={customRequestForm.expectedBudget}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, expectedBudget: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-input-box">
                      <label>Target Construction Start Date (Optional)</label>
                      <input
                        type="date"
                        value={customRequestForm.targetStartDate}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, targetStartDate: e.target.value })}
                      />
                    </div>

                    <div className="form-input-box">
                      <label>Desired Specifications / Key Metrics</label>
                      <input
                        type="text"
                        placeholder="e.g. 4 Bedrooms, 3 Bathrooms, 3200 sq ft, 2-vehicle port"
                        value={customRequestForm.specifications}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, specifications: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-input-box" style={{ marginTop: '1.25rem' }}>
                    <label>Detailed Requirements &amp; Architectural Vision *</label>
                    <textarea
                      rows={4}
                      placeholder="Describe your design expectations, site conditions, preferred materials, style (modern, colonial, tropical), etc..."
                      value={customRequestForm.description}
                      onChange={(e) => setCustomRequestForm({ ...customRequestForm, description: e.target.value })}
                      required
                    />
                  </div>

                  {/* Photos and Blueprints Upload Section (Max 5) */}
                  <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Upload Photos / Drawings / Sketches (Maximum 5)</strong>
                        <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          Add land photos, sketch designs, reference architectural images, or floor plans.
                        </p>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: customRequestImages.length === 5 ? '#e11d48' : 'var(--brand-green)' }}>
                        {customRequestImages.length} / 5 Images Uploaded
                      </span>
                    </div>

                    {customRequestImages.length < 5 && (
                      <div style={{ margin: '0.75rem 0' }}>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          multiple
                          onChange={handleAddRequestImages}
                          style={{ fontSize: '0.9rem' }}
                        />
                      </div>
                    )}

                    {/* Previews Strip */}
                    {customRequestImages.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                        {customRequestImages.map((img, idx) => (
                          <div
                            key={idx}
                            style={{
                              position: 'relative',
                              width: '110px',
                              height: '90px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              border: '2px solid #cbd5e1',
                              background: '#fff',
                            }}
                          >
                            <img src={img} alt={`Upload ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => handleRemoveRequestImage(idx)}
                              style={{
                                position: 'absolute',
                                top: '3px',
                                right: '3px',
                                background: '#e11d48',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Remove image"
                            >
                              ✕
                            </button>
                            <span style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '9px', padding: '1px 4px', borderRadius: '4px' }}>
                              Photo {idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '1.75rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn-outline-green"
                      onClick={() => setRequestProjectMode('browse')}
                      disabled={submittingCustomRequest}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-solid-green"
                      disabled={submittingCustomRequest}
                      style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                    >
                      {submittingCustomRequest ? 'Submitting to Client Manager...' : 'Submit Request to Client Manager'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sub-view 3: My Project Requests History & Official Responses */}
            {requestProjectMode === 'history' && (
              <div className="light-panel-card">
                <div className="panel-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span className="brand-green-subtitle">STATUS TRACKER</span>
                    <h3 className="panel-title" style={{ margin: '0.2rem 0' }}>My Project Requests &amp; Official Engineering Proposals</h3>
                    <p className="panel-meta" style={{ margin: 0 }}>Track your submitted project requests, technical engineering assessments, and official responses from our team.</p>
                  </div>
                  <button
                    type="button"
                    className="btn-solid-green"
                    onClick={() => setRequestProjectMode('custom')}
                  >
                    + New Custom Request
                  </button>
                </div>

                {projectRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>📋</span>
                    <h4>No Project Requests Submitted Yet</h4>
                    <p className="text-muted">Browse our company designs or submit your own custom design to get started.</p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
                      <button type="button" className="btn-solid-green" onClick={() => setRequestProjectMode('browse')}>
                        Browse Designs
                      </button>
                      <button type="button" className="btn-outline-green" onClick={() => setRequestProjectMode('custom')}>
                        Submit Custom Request
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                    {projectRequests.map((req) => {
                      const isPendingCm = req.status === 'PENDING_CM_REVIEW';
                      const isForwardedPm = req.status === 'FORWARDED_TO_PM';
                      const isPmReviewed = req.status === 'PM_REVIEWED';
                      const isClientNotified = req.status === 'CLIENT_NOTIFIED';
                      const isApproved = req.status === 'APPROVED';
                      const isRejected = req.status === 'REJECTED';
                      const isStarted = req.status === 'PROJECT_STARTED';

                      return (
                        <div
                          key={req.id}
                          style={{
                            background: '#f8fafc',
                            border: isStarted ? '2px solid #10b981' : (isApproved ? '2px solid #16a34a' : (isRejected ? '1px solid #ef4444' : (isClientNotified ? '2px solid var(--brand-green)' : '1px solid var(--border-color)'))),
                            borderRadius: '12px',
                            padding: '1.5rem',
                          }}
                        >
                          {/* Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>{req.category}</span>
                              <h4 style={{ margin: '0.2rem 0', fontSize: '1.25rem', color: '#0f172a' }}>{req.title}</h4>
                              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                📍 {req.location || 'Location not specified'} &nbsp;|&nbsp; Submitted on {formatDate(req.createdAt)}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {isPendingCm && <span className="pill-badge warning">⏳ Pending Client Manager</span>}
                              {isForwardedPm && <span className="pill-badge active">🏗️ Engineering Review (PM)</span>}
                              {isPmReviewed && <span className="pill-badge active" style={{ background: '#dbeafe', color: '#1e40af' }}>🔍 Assessment Completed</span>}
                              {isClientNotified && <span className="pill-badge completed" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>✉️ Proposal Ready</span>}
                              {isApproved && <span className="pill-badge completed" style={{ background: '#dcfce7', color: '#166534', fontWeight: 700 }}>✓ Request Approved</span>}
                              {isStarted && <span className="pill-badge completed" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #10b981', fontWeight: 700 }}>🚀 Project Started</span>}
                              {isRejected && <span className="pill-badge error" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>✗ Not Approved</span>}
                            </div>
                          </div>

                          {/* Quick Specs & Budget Strip */}
                          <div style={{ display: 'flex', gap: '1.5rem', margin: '1rem 0', flexWrap: 'wrap', background: '#ffffff', padding: '0.85rem 1.15rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div>
                              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Your Expected Budget</small>
                              <strong style={{ color: 'var(--brand-green)', fontSize: '1.05rem' }}>{req.expectedBudget ? formatMoney(req.expectedBudget) : 'Custom Quote'}</strong>
                            </div>
                            {req.targetStartDate && (
                              <div>
                                <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Target Start Date</small>
                                <strong style={{ color: '#0f172a' }}>{formatDate(req.targetStartDate)}</strong>
                              </div>
                            )}
                            {req.specifications && (
                              <div style={{ flex: 1, minWidth: '200px' }}>
                                <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Specifications</small>
                                <span style={{ color: '#334155', fontSize: '0.9rem' }}>{req.specifications}</span>
                              </div>
                            )}
                          </div>

                          <p style={{ color: '#334155', fontSize: '0.92rem', margin: '0.75rem 0' }}>{req.description}</p>

                          {/* Uploaded Photos Thumbnails */}
                          {req.imageUrls && req.imageUrls.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <small style={{ color: 'var(--text-muted)', marginRight: '0.25rem' }}>Attached Photos ({req.imageUrls.length}):</small>
                              {req.imageUrls.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt={`Attachment ${i + 1}`}
                                  style={{ width: '60px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                                  onClick={() => setSelectedRequestDetails(req)}
                                />
                              ))}
                            </div>
                          )}

                          {/* Step Progress Tracker */}
                          <div style={{ margin: '1.25rem 0 0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, color: 'var(--brand-green)' }}>✓ 1. Request Submitted</span>
                            <span>→</span>
                            <span style={{ fontWeight: isForwardedPm || isPmReviewed || isClientNotified ? 600 : 400, color: isForwardedPm || isPmReviewed || isClientNotified ? 'var(--brand-green)' : '#94a3b8' }}>
                              {isForwardedPm || isPmReviewed || isClientNotified ? '✓ 2. Forwarded to PM' : '2. Forwarded to PM'}
                            </span>
                            <span>→</span>
                            <span style={{ fontWeight: isPmReviewed || isClientNotified ? 600 : 400, color: isPmReviewed || isClientNotified ? 'var(--brand-green)' : '#94a3b8' }}>
                              {isPmReviewed || isClientNotified ? '✓ 3. PM Reviewed' : '3. PM Review'}
                            </span>
                            <span>→</span>
                            <span style={{ fontWeight: isClientNotified ? 700 : 400, color: isClientNotified ? '#15803d' : '#94a3b8' }}>
                              {isClientNotified ? '✓ 4. Proposal Delivered' : '4. Client Proposal'}
                            </span>
                          </div>

                          {/* Official Response from Client Manager */}
                          {req.clientMessage && (
                            <div style={{ marginTop: '1rem', padding: '1.25rem', background: '#f0fdf4', borderLeft: '4px solid var(--brand-green)', borderRadius: '0 8px 8px 0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <strong style={{ color: 'var(--brand-green)', fontSize: '0.95rem' }}>
                                  ✉️ Official Proposal &amp; Response from {req.clientNotifiedBy || 'Client Manager'}:
                                </strong>
                                <small style={{ color: 'var(--text-muted)' }}>{formatDate(req.clientNotifiedAt)}</small>
                              </div>
                              <p style={{ color: '#0f172a', fontSize: '0.95rem', margin: '0.4rem 0 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {req.clientMessage}
                              </p>
                              {req.pmEstimatedBudget && (
                                <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', background: '#ffffff', borderRadius: '6px', display: 'flex', gap: '1.5rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                                  <span><strong>Estimated Cost:</strong> {formatMoney(req.pmEstimatedBudget)}</span>
                                  {req.pmEstimatedDuration && <span><strong>Estimated Timeline:</strong> {req.pmEstimatedDuration}</span>}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Rejection notice */}
                          {req.rejectionReason && (
                            <div style={{ marginTop: '0.85rem', padding: '0.85rem 1rem', background: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '0 8px 8px 0', fontSize: '0.9rem' }}>
                              <strong style={{ color: '#b91c1c' }}>Rejection Reason:</strong>
                              <p style={{ margin: '0.2rem 0 0', color: '#7f1d1d' }}>{req.rejectionReason}</p>
                            </div>
                          )}

                          {/* Started project banner */}
                          {isStarted && (
                            <div style={{ marginTop: '0.85rem', padding: '0.85rem 1rem', background: '#ecfdf5', borderLeft: '4px solid #10b981', borderRadius: '0 8px 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div>
                                <strong style={{ color: '#047857' }}>🚀 Construction Project Initialized &amp; Assigned!</strong>
                                <p style={{ margin: '0.2rem 0 0', color: '#065f46', fontSize: '0.88rem' }}>The Project Manager has officially started your construction project. Check live milestones and updates under My Projects.</p>
                              </div>
                              <button
                                type="button"
                                className="btn-solid-green"
                                style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                                onClick={() => setActiveTab('projects')}
                              >
                                View My Projects →
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
          </div>
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
                    <label>Related Construction Project (Added by Project Manager)</label>
                    <select
                      value={inquiryProjectId}
                      onChange={(e) => setInquiryProjectId(e.target.value)}
                    >
                      <option value="">-- Choose Assigned Project (Optional) --</option>
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
                        Sent on {formatDate(inq.createdAt)} {inq.project ? `| ${inq.project.marketingDesign ? 'Company Design' : 'Project'}: ${inq.project.name}` : ''}
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

        {/* ===== COMPANY DESIGN INQUIRY MODAL (DIRECT TO CLIENT MANAGER) ===== */}
        {designInquiryModalOpen && designInquiryTarget && (
          <div className="light-modal-overlay" style={{ zIndex: 10000, padding: '1rem' }}>
            <div className="light-modal-box" style={{ maxWidth: '620px', width: '95%', padding: '1.75rem', borderRadius: '14px' }}>
              <div className="modal-head-row">
                <div>
                  <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>OFFICIAL INQUIRY TO CLIENT MANAGER</span>
                  <h3 style={{ margin: '0.2rem 0 0', color: '#0f172a' }}>Inquire: {designInquiryTarget.name}</h3>
                </div>
                <button type="button" onClick={() => { setDesignInquiryModalOpen(false); setDesignInquiryTarget(null); }}>✕</button>
              </div>

              <form onSubmit={handleSubmitDesignInquiry} style={{ marginTop: '1.25rem' }}>
                <div className="form-input-box">
                  <label>Client</label>
                  <input type="text" value={`${clientProfile?.name || user?.name || ''} (${clientProfile?.email || user?.email || user?.username || ''})`} disabled style={{ background: '#f1f5f9' }} />
                </div>

                <div className="form-input-box" style={{ marginTop: '1rem' }}>
                  <label>Selected Design</label>
                  <input type="text" value={`${designInquiryTarget.name} — Starting at ${designInquiryTarget.priceRange || formatMoney(designInquiryTarget.budget)}`} disabled style={{ background: '#f1f5f9' }} />
                </div>

                <div className="form-input-box" style={{ marginTop: '1rem' }}>
                  <label>Inquiry Message *</label>
                  <textarea
                    rows={4}
                    value={designInquiryMessage}
                    onChange={(e) => setDesignInquiryMessage(e.target.value)}
                    placeholder="Describe your questions or requirements regarding this design..."
                    required
                  />
                </div>

                <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.6rem', fontSize: '0.8rem' }}>
                  Your inquiry will be sent directly to the Client Manager and logged into your inquiry history with today's date.
                </small>

                <div className="modal-actions-row" style={{ marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn-outline-green"
                    onClick={() => { setDesignInquiryModalOpen(false); setDesignInquiryTarget(null); }}
                    disabled={sendingDesignInquiry}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-solid-green"
                    disabled={sendingDesignInquiry}
                  >
                    {sendingDesignInquiry ? 'Sending to Client Manager...' : 'Submit Inquiry to Client Manager'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== PROJECT REQUEST MODAL FOR EXISTING DESIGN ===== */}
        {designRequestModal && (
          <div className="light-modal-overlay" style={{ zIndex: 10000, padding: '1rem' }}>
            <div className="light-modal-box" style={{ maxWidth: '640px', width: '95%', padding: '1.75rem', borderRadius: '14px' }}>
              <div className="modal-head-row">
                <div>
                  <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>OFFICIAL PROJECT REQUEST</span>
                  <h3 style={{ margin: '0.2rem 0 0', color: '#0f172a' }}>Request Project: {designRequestModal.name}</h3>
                </div>
                <button type="button" onClick={() => setDesignRequestModal(null)}>✕</button>
              </div>

              <form onSubmit={handleSubmitDesignRequest} style={{ marginTop: '1.25rem' }}>
                <div className="form-input-box">
                  <label>Selected Company Design</label>
                  <input
                    type="text"
                    value={`${designRequestModal.name} (${designRequestModal.category}) — ${designRequestModal.priceRange || (designRequestModal.budget ? formatMoney(designRequestModal.budget) : 'Starting Price')}`}
                    disabled
                    style={{ background: '#f1f5f9' }}
                  />
                </div>

                <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                  <div className="form-input-box">
                    <label>Your Land / Project Location *</label>
                    <input
                      type="text"
                      placeholder="e.g. Negombo Road, Ja-Ela"
                      value={designRequestForm.location}
                      onChange={(e) => setDesignRequestForm({ ...designRequestForm, location: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-input-box">
                    <label>Expected Budget (LKR)</label>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      placeholder="e.g. 28000000"
                      value={designRequestForm.expectedBudget}
                      onChange={(e) => setDesignRequestForm({ ...designRequestForm, expectedBudget: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-input-box" style={{ marginTop: '1rem' }}>
                  <label>Target Construction Start Date (Optional)</label>
                  <input
                    type="date"
                    value={designRequestForm.targetStartDate}
                    onChange={(e) => setDesignRequestForm({ ...designRequestForm, targetStartDate: e.target.value })}
                  />
                </div>

                <div className="form-input-box" style={{ marginTop: '1rem' }}>
                  <label>Specific Customization Notes / Requirements</label>
                  <textarea
                    rows={4}
                    value={designRequestForm.customNotes}
                    onChange={(e) => setDesignRequestForm({ ...designRequestForm, customNotes: e.target.value })}
                    placeholder="Enter any modifications or land dimensions you want incorporated..."
                  />
                </div>

                <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.6rem', fontSize: '0.8rem' }}>
                  Your request will be submitted to the Client Manager and forwarded to our Project Manager for site feasibility and quotation.
                </small>

                <div className="modal-actions-row" style={{ marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn-outline-green"
                    onClick={() => setDesignRequestModal(null)}
                    disabled={submittingDesignRequest}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-solid-green"
                    disabled={submittingDesignRequest}
                  >
                    {submittingDesignRequest ? 'Submitting Request...' : 'Submit Project Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== PROJECT REQUEST DETAILS MODAL ===== */}
        {selectedRequestDetails && (
          <div className="light-modal-overlay" style={{ zIndex: 10000, padding: '1rem' }}>
            <div className="light-modal-box" style={{ maxWidth: '700px', width: '95%', padding: '1.75rem', borderRadius: '14px' }}>
              <div className="modal-head-row">
                <div>
                  <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>PROJECT REQUEST DETAILS</span>
                  <h3 style={{ margin: '0.2rem 0 0', color: '#0f172a' }}>{selectedRequestDetails.title}</h3>
                </div>
                <button type="button" onClick={() => setSelectedRequestDetails(null)}>✕</button>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div>
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Category</small>
                    <strong>{selectedRequestDetails.category}</strong>
                  </div>
                  <div>
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Location</small>
                    <strong>{selectedRequestDetails.location || 'N/A'}</strong>
                  </div>
                  <div>
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Expected Budget</small>
                    <strong style={{ color: 'var(--brand-green)' }}>{selectedRequestDetails.expectedBudget ? formatMoney(selectedRequestDetails.expectedBudget) : 'N/A'}</strong>
                  </div>
                  <div>
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Status</small>
                    <strong>{selectedRequestDetails.status}</strong>
                  </div>
                </div>

                {selectedRequestDetails.specifications && (
                  <p style={{ margin: '0.5rem 0' }}><strong>Specifications:</strong> {selectedRequestDetails.specifications}</p>
                )}
                <p style={{ margin: '0.5rem 0', color: '#334155' }}><strong>Description:</strong> {selectedRequestDetails.description}</p>

                {selectedRequestDetails.imageUrls && selectedRequestDetails.imageUrls.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Attached Photos &amp; Drawings:</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                      {selectedRequestDetails.imageUrls.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                          <img src={img} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                  <button type="button" className="btn-solid-green" onClick={() => setSelectedRequestDetails(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
