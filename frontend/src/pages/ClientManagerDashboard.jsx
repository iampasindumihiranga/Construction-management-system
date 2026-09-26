import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getDashboardSummary,
  getContracts,
  getExpiringContracts,
  createContract,
  updateContract,
  deleteContract,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  addMilestone,
  getInquiries,
  respondToInquiry,
  getProjectRequests,
  forwardProjectRequestToPm,
  sendProjectRequestResponseToClient,
  approveProjectRequest,
  rejectProjectRequest,
  deleteProjectRequest,
  getDocuments,
  uploadDocument,
  getFeedback,
  getDownPayments,
  createDownPayment,
  updateDownPayment,
  updateDownPaymentStatus,
  deleteDownPayment,
  formatDate,
  formatMoney,
} from '../services/api';

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read the selected file.'));
  reader.readAsDataURL(file);
});
const readImageAsDataUrl = readFileAsDataUrl;

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

export default function ClientManagerDashboard() {
  const [activeTab, setActiveTab] = useState('summary'); // summary, clients, contracts, expiring, projects, inquiries, documents, feedbacks, payments

  // Data states
  const [summary, setSummary] = useState(null);
  const [clients, setClients] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [downPayments, setDownPayments] = useState([]);
  const [projectRequests, setProjectRequests] = useState([]);
  const [projectRequestFilter, setProjectRequestFilter] = useState('ALL');
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardTarget, setForwardTarget] = useState(null);
  const [forwardCmNotes, setForwardCmNotes] = useState('');
  const [submittingForward, setSubmittingForward] = useState(false);
  const [clientNotifyModalOpen, setClientNotifyModalOpen] = useState(false);
  const [clientNotifyTarget, setClientNotifyTarget] = useState(null);
  const [clientNotifyMessage, setClientNotifyMessage] = useState('');
  const [submittingClientNotify, setSubmittingClientNotify] = useState(false);
  const [previewRequestPhotosModal, setPreviewRequestPhotosModal] = useState(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [submittingApprove, setSubmittingApprove] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search
  const [clientSearch, setClientSearch] = useState('');

  // Payment search/filter
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [paymentClientFilter, setPaymentClientFilter] = useState('');
  const [receiptPreviewModal, setReceiptPreviewModal] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);

  // Modals
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    address: '',
    emergencyContact: '',
    status: 'ACTIVE',
    preferredCategory: 'RESIDENCIES',
  });

  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [contractForm, setContractForm] = useState({
    contractNumber: '',
    title: '',
    amount: '',
    signedDate: '',
    endDate: '',
    status: 'ACTIVE',
    terms: '',
    clientId: '',
  });

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    category: 'APARTMENTS',
    location: '',
    startDate: '',
    endDate: '',
    budget: '',
    imageUrl: '',
    imageUrls: [],
    clientId: '',
    status: 'IN_PROGRESS',
    progressPercentage: 0,
    constructionStatus: '',
    priceRange: '',
    specifications: '',
  });

  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [milestoneProjectId, setMilestoneProjectId] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    targetDate: '',
    status: 'IN_PROGRESS',
    progressPercentage: 0,
  });

  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [activeInquiry, setActiveInquiry] = useState(null);
  const [responseText, setResponseText] = useState('');

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    title: '',
    documentType: 'CONTRACT_DEED',
    description: '',
    clientId: '',
    projectId: '',
    file: null,
  });

  // Payment modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    clientId: '',
    projectId: '',
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    status: 'Valid',
    notes: '',
    totalProjectAmount: '',
    requiredDownPayment: '',
    receipt: '',
    receiptFileName: '',
    receiptFileType: '',
  });

  async function loadAllData() {
    setLoading(true);
    try {
      const [
        dashSummary,
        clientsData,
        contractsData,
        expiringData,
        projectsData,
        inquiriesData,
        docsData,
        feedbacksData,
        paymentsData,
        requestsData,
      ] = await Promise.all([
        getDashboardSummary(),
        getClients(clientSearch),
        getContracts(),
        getExpiringContracts(60),
        getProjects({ marketingOnly: true }),
        getInquiries(),
        getDocuments(),
        getFeedback(),
        getDownPayments({
          search: paymentSearch,
          status: paymentStatusFilter,
          clientId: paymentClientFilter || undefined,
        }),
        getProjectRequests(),
      ]);

      setSummary(dashSummary);
      setClients(clientsData);
      setContracts(contractsData);
      setExpiringContracts(expiringData);
      setProjects(projectsData);
      setInquiries(inquiriesData);
      setDocuments(docsData);
      setFeedbacks(feedbacksData);
      setDownPayments(paymentsData);
      setProjectRequests(requestsData || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load manager dashboard data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, [clientSearch, paymentSearch, paymentStatusFilter, paymentClientFilter]);

  const handleSaveClient = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateClient(editingClient.id, clientForm);
        setSuccessMsg('Client profile updated!');
      } else {
        await createClient(clientForm);
        setSuccessMsg('Client profile created!');
      }
      setClientModalOpen(false);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error saving client');
    }
  };

  const handleDeleteClient = async (client) => {
    if (!window.confirm(`Delete client "${client.name}" (${client.email})?`)) return;
    try {
      await deleteClient(client.id);
      setSuccessMsg('Client account deleted.');
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error deleting client');
    }
  };

  const handleClientApproval = async (client, status) => {
    try {
      await updateClient(client.id, { ...client, status });
      setSuccessMsg(status === 'ACTIVE' ? `${client.name} has been approved and can now log in.` : `${client.name}'s registration was rejected and login remains blocked.`);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Unable to update client approval.');
    }
  };

  const handleSaveContract = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        contractNumber: contractForm.contractNumber.trim(),
        title: contractForm.title.trim(),
        amount: Number(contractForm.amount),
        signedDate: contractForm.signedDate,
        endDate: contractForm.endDate || null,
        status: contractForm.status,
        terms: contractForm.terms,
        client: { id: Number(contractForm.clientId) },
      };
      if (editingContract) {
        await updateContract(editingContract.id, payload);
        setSuccessMsg('Contract updated!');
      } else {
        await createContract(payload);
        setSuccessMsg('New contract recorded!');
      }
      setContractModalOpen(false);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error saving contract');
    }
  };

  const handleDeleteContract = async (contract) => {
    if (!window.confirm(`Delete contract "${contract.title}"?`)) return;
    try {
      await deleteContract(contract.id);
      setSuccessMsg('Contract removed.');
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error deleting contract');
    }
  };

  const handleDesignImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentCount = projectForm.imageUrls?.length || 0;
    const availableSlots = 5 - currentCount;
    if (availableSlots <= 0) {
      setError('Maximum of 5 images per design reached.');
      e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      setError(`Only ${availableSlots} more image(s) allowed (maximum 5 images per design).`);
    }

    try {
      const loadedDataUrls = [];
      for (const file of filesToProcess) {
        if (file.size > 1500000) {
          setError(`File "${file.name}" is larger than 1.5 MB. Please choose smaller images.`);
          continue;
        }
        const dataUrl = await readImageAsDataUrl(file);
        loadedDataUrls.push(dataUrl);
      }
      if (loadedDataUrls.length > 0) {
        setProjectForm((prev) => {
          const updated = [...(prev.imageUrls || []), ...loadedDataUrls].slice(0, 5);
          return {
            ...prev,
            imageUrls: updated,
            imageUrl: updated[0] || '',
          };
        });
        setError('');
      }
    } catch (err) {
      setError(err.message || 'Error processing selected images.');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveDesignImage = (indexToRemove) => {
    setProjectForm((prev) => {
      const updated = (prev.imageUrls || []).filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        imageUrls: updated,
        imageUrl: updated[0] || '',
      };
    });
  };

  const handleSetCoverImage = (indexToCover) => {
    setProjectForm((prev) => {
      const current = [...(prev.imageUrls || [])];
      const [selected] = current.splice(indexToCover, 1);
      const updated = [selected, ...current];
      return {
        ...prev,
        imageUrls: updated,
        imageUrl: updated[0] || '',
      };
    });
  };

  const handleAddImageUrl = (e) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;
    if ((projectForm.imageUrls?.length || 0) >= 5) {
      setError('Maximum of 5 images per design reached.');
      return;
    }
    setProjectForm((prev) => {
      const updated = [...(prev.imageUrls || []), newImageUrl.trim()].slice(0, 5);
      return {
        ...prev,
        imageUrls: updated,
        imageUrl: updated[0] || '',
      };
    });
    setNewImageUrl('');
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    setSavingProject(true);
    setError('');
    try {
      const cleanedImages = (projectForm.imageUrls || [])
        .filter((img) => Boolean(img && img.trim()))
        .slice(0, 5);

      const primaryImage = cleanedImages[0] || projectForm.imageUrl || null;

      const payload = {
        ...(editingProject || {}),
        name: projectForm.name.trim(),
        description: projectForm.description.trim(),
        category: projectForm.category,
        location: projectForm.location.trim(),
        startDate: projectForm.startDate,
        endDate: projectForm.endDate || null,
        budget: Number(projectForm.budget),
        imageUrl: primaryImage,
        imageUrls: cleanedImages,
        status: projectForm.status,
        progressPercentage: Number(projectForm.progressPercentage),
        constructionStatus: projectForm.constructionStatus,
        priceRange: projectForm.priceRange.trim(),
        specifications: projectForm.specifications.trim(),
        marketingDesign: true,
        addedBy: 'CLIENT_MANAGER',
        client: projectForm.clientId ? { id: Number(projectForm.clientId) } : null,
      };
      if (editingProject) {
        await updateProject(editingProject.id, payload);
      } else {
        await createProject(payload);
      }
      setSuccessMsg(editingProject ? 'Property updated and shared with the assigned client!' : 'Sample property added to Browse Properties!');
      setProjectModalOpen(false);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error updating project');
    } finally {
      setSavingProject(false);
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneProjectId) return;
    try {
      await addMilestone(milestoneProjectId, {
        title: milestoneForm.title.trim(),
        description: milestoneForm.description.trim(),
        targetDate: milestoneForm.targetDate,
        status: milestoneForm.status,
        progressPercentage: Number(milestoneForm.progressPercentage),
      });
      setSuccessMsg('Milestone created & notified to client!');
      setMilestoneModalOpen(false);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error creating milestone');
    }
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Remove "${project.name}" from the client design catalog?`)) return;
    try {
      await deleteProject(project.id);
      setSuccessMsg('Design removed from the client catalog.');
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Unable to remove this design.');
    }
  };

  const handleRespondInquiry = async (e) => {
    e.preventDefault();
    if (!activeInquiry || !responseText.trim()) return;
    try {
      await respondToInquiry(activeInquiry.id, responseText.trim(), 'Client Manager');
      setSuccessMsg('Response sent and client notified!');
      setResponseModalOpen(false);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error responding to inquiry');
    }
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!docForm.title.trim() || !docForm.clientId || !docForm.file) return;
    try {
      await uploadDocument({
        title: docForm.title.trim(),
        documentType: docForm.documentType,
        description: docForm.description.trim(),
        fileName: docForm.file.name,
        fileType: docForm.file.type || 'application/octet-stream',
        fileSize: formatFileSize(docForm.file.size),
        fileData: await readFileAsDataUrl(docForm.file),
        uploadedByRole: 'CLIENT_MANAGER',
        client: { id: Number(docForm.clientId) },
        project: docForm.projectId ? { id: Number(docForm.projectId) } : null,
      });
      setSuccessMsg('Document uploaded to client vault!');
      setDocModalOpen(false);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error uploading document');
    }
  };

  const openAddPayment = (presetProject = null) => {
    setEditingPayment(null);
    setReceiptFile(null);
    const today = new Date().toISOString().slice(0, 10);
    setPaymentForm({
      clientId: presetProject?.client?.id ? String(presetProject.client.id) : (clients[0]?.id ? String(clients[0].id) : ''),
      projectId: presetProject?.id ? String(presetProject.id) : '',
      amount: '',
      paymentDate: today,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: '',
      status: 'Valid',
      notes: '',
      totalProjectAmount: presetProject?.budget ? String(presetProject.budget) : '',
      requiredDownPayment: '',
      receipt: '',
      receiptFileName: '',
      receiptFileType: '',
    });
    setPaymentModalOpen(true);
  };

  const openEditPayment = (payment) => {
    setEditingPayment(payment);
    setReceiptFile(null);
    setPaymentForm({
      clientId: payment.client?.id ? String(payment.client.id) : '',
      projectId: payment.project?.id ? String(payment.project.id) : '',
      amount: String(payment.amount || ''),
      paymentDate: payment.paymentDate ? formatDate(payment.paymentDate) : new Date().toISOString().slice(0, 10),
      paymentMethod: payment.paymentMethod || 'BANK_TRANSFER',
      referenceNumber: payment.referenceNumber || '',
      status: payment.status || 'Valid',
      notes: payment.notes || '',
      totalProjectAmount: payment.totalProjectAmount ? String(payment.totalProjectAmount) : '',
      requiredDownPayment: payment.requiredDownPayment ? String(payment.requiredDownPayment) : '',
      receipt: payment.receipt || '',
      receiptFileName: payment.receiptFileName || '',
      receiptFileType: payment.receiptFileType || '',
    });
    setPaymentModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    try {
      let receiptData = paymentForm.receipt;
      let receiptFileName = paymentForm.receiptFileName;
      let receiptFileType = paymentForm.receiptFileType;

      if (receiptFile) {
        receiptData = await readFileAsDataUrl(receiptFile);
        receiptFileName = receiptFile.name;
        receiptFileType = receiptFile.type || 'application/octet-stream';
      }

      const payload = {
        client: { id: Number(paymentForm.clientId) },
        project: paymentForm.projectId ? { id: Number(paymentForm.projectId) } : null,
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber.trim() || null,
        status: paymentForm.status ? paymentForm.status : computeStatusFromDates(paymentForm.paymentDate),
        notes: paymentForm.notes.trim() || null,
        totalProjectAmount: paymentForm.totalProjectAmount ? Number(paymentForm.totalProjectAmount) : null,
        requiredDownPayment: paymentForm.requiredDownPayment ? Number(paymentForm.requiredDownPayment) : null,
        receipt: receiptData || null,
        receiptFileName: receiptFileName || null,
        receiptFileType: receiptFileType || null,
      };
      if (editingPayment) {
        await updateDownPayment(editingPayment.id, payload);
        setSuccessMsg('Payment record updated successfully!');
      } else {
        await createDownPayment(payload);
        setSuccessMsg('Down payment recorded successfully with 60-day validity!');
      }
      setPaymentModalOpen(false);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error saving payment');
    }
  };

  const handleQuickStatusPayment = async (payment, status) => {
    try {
      await updateDownPaymentStatus(payment.id, status);
      setSuccessMsg(`Payment status updated to ${status}!`);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error updating status');
    }
  };

  const handleDeletePayment = async (payment) => {
    if (!window.confirm(`Delete payment record (Ref: ${payment.referenceNumber || payment.id})?`)) return;
    try {
      await deleteDownPayment(payment.id);
      setSuccessMsg('Payment record deleted.');
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error deleting payment');
    }
  };

  const handleOpenForwardModal = (request) => {
    setForwardTarget(request);
    setForwardCmNotes(`Please review the client's custom project requirements, evaluate structural & architectural feasibility, and provide estimated construction budget and timeline.`);
    setForwardModalOpen(true);
  };

  const handleSubmitForward = async (e) => {
    e.preventDefault();
    if (!forwardTarget) return;
    setSubmittingForward(true);
    setError('');
    try {
      await forwardProjectRequestToPm(forwardTarget.id, forwardCmNotes.trim(), 'Client Manager');
      setSuccessMsg(`Project request "${forwardTarget.title}" forwarded to Project Manager successfully!`);
      setForwardModalOpen(false);
      setForwardTarget(null);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to forward project request to PM');
    } finally {
      setSubmittingForward(false);
    }
  };

  const handleOpenClientNotifyModal = (request) => {
    setClientNotifyTarget(request);
    let defaultMsg = `Dear ${request.client?.name || 'Valued Client'},\n\nOur Project Management & Engineering team has evaluated your custom project request for "${request.title}".`;
    if (request.pmEstimatedBudget) {
      defaultMsg += `\n\n• Estimated Construction Cost: ${formatMoney(request.pmEstimatedBudget)}`;
    }
    if (request.pmEstimatedDuration) {
      defaultMsg += `\n• Estimated Project Duration: ${request.pmEstimatedDuration}`;
    }
    if (request.pmReply) {
      defaultMsg += `\n\nEngineering Assessment & Notes:\n${request.pmReply}`;
    }
    defaultMsg += `\n\nPlease reply or contact our office if you would like to proceed with formal site inspection and initial drawings.\n\nWarm regards,\nClient Relations Management\nOdiliya Homes & Real Estate`;
    setClientNotifyMessage(defaultMsg);
    setClientNotifyModalOpen(true);
  };

  const handleSubmitClientNotify = async (e) => {
    e.preventDefault();
    if (!clientNotifyTarget || !clientNotifyMessage.trim()) return;
    setSubmittingClientNotify(true);
    setError('');
    try {
      await sendProjectRequestResponseToClient(clientNotifyTarget.id, clientNotifyMessage.trim(), 'Client Manager');
      setSuccessMsg(`Official response delivered to ${clientNotifyTarget.client?.name || 'client'}!`);
      setClientNotifyModalOpen(false);
      setClientNotifyTarget(null);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to send response to client');
    } finally {
      setSubmittingClientNotify(false);
    }
  };

  const handleOpenApproveModal = (request) => {
    setApproveTarget(request);
    setApproveNotes(`Your project request for "${request.title}" has been approved! The Project Manager will now proceed to initialize your project.`);
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async (e) => {
    if (e) e.preventDefault();
    if (!approveTarget) return;
    setSubmittingApprove(true);
    setError('');
    try {
      await approveProjectRequest(approveTarget.id, {
        cmNotes: approveNotes.trim(),
        clientMessage: approveNotes.trim(),
        approvedBy: 'Client Manager',
      });
      setSuccessMsg(`Project request "${approveTarget.title}" approved! Project Manager can now initialize and start the project.`);
      setApproveModalOpen(false);
      setApproveTarget(null);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to approve project request');
    } finally {
      setSubmittingApprove(false);
    }
  };

  const handleOpenRejectModal = (request) => {
    setRejectTarget(request);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    if (e) e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejecting the request.');
      return;
    }
    setSubmittingReject(true);
    setError('');
    try {
      await rejectProjectRequest(rejectTarget.id, {
        reason: rejectReason.trim(),
        rejectedBy: 'Client Manager',
      });
      setSuccessMsg(`Project request "${rejectTarget.title}" was rejected.`);
      setRejectModalOpen(false);
      setRejectTarget(null);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to reject project request');
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleUpdateDownPaymentStatus = async (paymentId, newStatus) => {
    try {
      await updateDownPaymentStatus(paymentId, newStatus);
      setSuccessMsg(`Down payment status updated to "${newStatus}".`);
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update down payment status');
    }
  };

  const handleDeleteProjectRequest = async (request) => {
    if (!window.confirm(`Are you sure you want to delete the project request "${request.title}"?`)) return;
    try {
      await deleteProjectRequest(request.id);
      setSuccessMsg('Project request deleted.');
      await loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete project request');
    }
  };

  return (
    <div className="light-site-wrapper">
      <Navbar />

      <main className="pm-page client-manager-page">
        {/* Workspace Hero Header */}
        <section className="pm-hero">
          <div>
            <span className="brand-green-subtitle">CLIENT RELATIONSHIP MANAGEMENT</span>
            <h1>Client Manager Workspace</h1>
            <p>
              Centrally manage client records, contract start/end dates, expiry alerts, property design catalog,
              inquiries, and document exchanges.
            </p>
          </div>
        </section>

        {/* Workspace Sidebar Tabs */}
        <nav className="pm-tabs">
          <button
            type="button"
            className={activeTab === 'summary' ? 'active' : ''}
            onClick={() => setActiveTab('summary')}
          >
            Overview
          </button>

          <button
            type="button"
            className={activeTab === 'clients' ? 'active' : ''}
            onClick={() => setActiveTab('clients')}
          >
            Clients ({clients.length})
          </button>

          <button
            type="button"
            className={activeTab === 'contracts' ? 'active' : ''}
            onClick={() => setActiveTab('contracts')}
          >
            Contracts ({contracts.length})
          </button>

          <button
            type="button"
            className={activeTab === 'expiring' ? 'active' : ''}
            onClick={() => setActiveTab('expiring')}
          >
            Expiring Alerts ({expiringContracts.length})
          </button>

          <button
            type="button"
            className={activeTab === 'projects' ? 'active' : ''}
            onClick={() => setActiveTab('projects')}
          >
            Property Catalog ({projects.length})
          </button>

          <button
            type="button"
            className={activeTab === 'inquiries' ? 'active' : ''}
            onClick={() => setActiveTab('inquiries')}
          >
            Client Inquiries ({inquiries.filter((i) => i.status === 'PENDING').length > 0 ? `${inquiries.length} (${inquiries.filter((i) => i.status === 'PENDING').length} Pending)` : inquiries.length})
          </button>

          <button
            type="button"
            className={activeTab === 'project-requests' ? 'active' : ''}
            onClick={() => setActiveTab('project-requests')}
          >
            Project Requests ({projectRequests.filter((r) => r.status === 'PENDING_CM_REVIEW' || r.status === 'PM_REVIEWED').length > 0 ? `${projectRequests.length} (${projectRequests.filter((r) => r.status === 'PENDING_CM_REVIEW' || r.status === 'PM_REVIEWED').length} Action)` : projectRequests.length})
          </button>

          <button
            type="button"
            className={activeTab === 'documents' ? 'active' : ''}
            onClick={() => setActiveTab('documents')}
          >
            Document Vault ({documents.length})
          </button>

          <button
            type="button"
            className={activeTab === 'payments' ? 'active' : ''}
            onClick={() => setActiveTab('payments')}
          >
            Down Payments ({downPayments.length})
          </button>
        </nav>

        {error && (
          <div className="pm-alert error">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="pm-alert success">
            {successMsg}
          </div>
        )}

        {/* TAB 1: OVERVIEW / SUMMARY */}
        {activeTab === 'summary' && (
          <div>
            <section className="pm-metrics">
              <div className="pm-metric">
                <span>Total Active Clients</span>
                <strong>{summary?.totalClients ?? clients.length}</strong>
              </div>

              <div className="pm-metric">
                <span>Active Contracts</span>
                <strong>{summary?.totalContracts ?? contracts.length}</strong>
              </div>

              <div className="pm-metric">
                <span>Expiring Contracts (60 Days)</span>
                <strong style={{ color: expiringContracts.length > 0 ? '#ea580c' : undefined }}>
                  {summary?.expiringContractsCount ?? expiringContracts.length}
                </strong>
              </div>

              <div className="pm-metric">
                <span>Total Contract Value</span>
                <strong>
                  {formatMoney(contracts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0))}
                </strong>
              </div>
            </section>

            {expiringContracts.length > 0 && (
              <div className="pm-alert error" style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '1rem' }}>
                    Action Required: {expiringContracts.length} Contract(s) Expiring Within 60 Days!
                  </strong>
                  <p style={{ fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
                    {expiringContracts.map((c) => `${c.title} (Expires: ${formatDate(c.endDate)})`).join(' • ')}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-solid-green"
                  style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  onClick={() => setActiveTab('expiring')}
                >
                  Review Alerts
                </button>
              </div>
            )}

            <div className="light-panel-card">
              <div className="panel-card-head">
                <div>
                  <span className="brand-green-subtitle">QUICK ACTIONS</span>
                  <h3 className="panel-title">Operations Shortcuts</h3>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-solid-green"
                  onClick={() => {
                    setEditingClient(null);
                    setClientForm({ name: '', email: '', phone: '', companyName: '', address: '', emergencyContact: '', status: 'ACTIVE', preferredCategory: 'RESIDENCIES' });
                    setClientModalOpen(true);
                  }}
                >
                  + Add Client Profile
                </button>

                <button
                  type="button"
                  className="btn-outline-green"
                  onClick={() => {
                    setEditingContract(null);
                    setContractForm({ contractNumber: `OD-CON-2026-${String(contracts.length + 1).padStart(3, '0')}`, title: '', amount: '', signedDate: new Date().toISOString().slice(0, 10), endDate: '', status: 'ACTIVE', terms: '', clientId: clients[0]?.id ? String(clients[0].id) : '' });
                    setContractModalOpen(true);
                  }}
                >
                  + Record Contract
                </button>

                <button
                  type="button"
                  className="btn-outline-green"
                  onClick={() => {
                    setDocForm({ title: '', documentType: 'CONTRACT_DEED', description: '', clientId: clients[0]?.id ? String(clients[0].id) : '', projectId: projects[0]?.id ? String(projects[0].id) : '', file: null });
                    setDocModalOpen(true);
                  }}
                >
                  + Upload Document for Client
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLIENTS (US-CM-02, 04, 05, 08) */}
        {activeTab === 'clients' && (
          <div className="light-panel-card">
            <div className="panel-card-head">
              <div>
                <span className="brand-green-subtitle">PROFILES (US-CM-02)</span>
                <h3 className="panel-title">Client Directory &amp; Records</h3>
              </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="search-input-pill" style={{ width: '420px' }}>
                <input
                  type="text"
                  placeholder="Search clients by name, email, phone, company, or OD ID..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
                {clientSearch && <button type="button" className="clear-btn" onClick={() => setClientSearch('')}>×</button>}
              </div>
              <small className="text-muted">Showing {clients.length} profiles</small>
            </div>

            <div className="table-responsive-box">
              <table className="light-table">
                <thead>
                  <tr>
                    <th>Client ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Category</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.employeeNumber || `OD-${String(c.id).padStart(6, '0')}`}</strong></td>
                      <td>{c.name}</td>
                      <td>{c.email}</td>
                      <td>{c.phone || '-'}</td>
                      <td>{c.companyName || '-'}</td>
                      <td><span className={`pill-badge ${c.status?.toLowerCase()}`}>{c.status}</span></td>
                      <td><small>{c.preferredCategory || 'Residencies'}</small></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-outline-green"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              setEditingClient(c);
                              setClientForm({
                                name: c.name || '',
                                email: c.email || '',
                                phone: c.phone || '',
                                companyName: c.companyName || '',
                                address: c.address || '',
                                emergencyContact: c.emergencyContact || '',
                                status: c.status || 'ACTIVE',
                                preferredCategory: c.preferredCategory || 'RESIDENCIES',
                              });
                              setClientModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-outline-green"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderColor: '#ef4444', color: '#ef4444' }}
                            onClick={() => handleDeleteClient(c)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CONTRACTS */}
        {activeTab === 'contracts' && (
          <div className="light-panel-card">
            <div className="panel-card-head">
              <div>
                <span className="brand-green-subtitle">LEGAL</span>
                <h3 className="panel-title">Client Contracts &amp; Validity Dates</h3>
              </div>
              <button
                type="button"
                className="btn-solid-green"
                onClick={() => {
                  setEditingContract(null);
                  setContractForm({ contractNumber: `OD-CON-2026-${String(contracts.length + 1).padStart(3, '0')}`, title: '', amount: '', signedDate: new Date().toISOString().slice(0, 10), endDate: '', status: 'ACTIVE', terms: '', clientId: clients[0]?.id ? String(clients[0].id) : '' });
                  setContractModalOpen(true);
                }}
              >
                + Record Contract
              </button>
            </div>

            <div className="table-responsive-box">
              <table className="light-table">
                <thead>
                  <tr>
                    <th>Contract #</th>
                    <th>Title</th>
                    <th>Client Name</th>
                    <th>Amount</th>
                    <th>Signed Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.contractNumber}</strong></td>
                      <td>{c.title}</td>
                      <td>{c.client?.name || '-'}</td>
                      <td><strong style={{ color: 'var(--brand-green)' }}>{formatMoney(c.amount)}</strong></td>
                      <td>{formatDate(c.signedDate)}</td>
                      <td>{formatDate(c.endDate)}</td>
                      <td><span className={`pill-badge ${c.status?.toLowerCase()}`}>{c.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn-outline-green"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              setEditingContract(c);
                              setContractForm({
                                contractNumber: c.contractNumber || '',
                                title: c.title || '',
                                amount: String(c.amount || ''),
                                signedDate: formatDate(c.signedDate),
                                endDate: formatDate(c.endDate),
                                status: c.status || 'ACTIVE',
                                terms: c.terms || '',
                                clientId: c.client?.id ? String(c.client.id) : '',
                              });
                              setContractModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-outline-green"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderColor: '#ef4444', color: '#ef4444' }}
                            onClick={() => handleDeleteContract(c)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: EXPIRY ALERTS */}
        {activeTab === 'expiring' && (
          <div className="light-panel-card">
            <div className="panel-card-head">
              <div>
                <span className="brand-green-subtitle">EXPIRY ALERTS</span>
                <h3 className="panel-title">Agreements Approaching Expiry Within 60 Days</h3>
              </div>
            </div>

            {expiringContracts.length > 0 ? (
              <div className="table-responsive-box">
                <table className="light-table">
                  <thead>
                    <tr>
                      <th>Contract #</th>
                      <th>Title</th>
                      <th>Client Name &amp; Contact</th>
                      <th>Amount</th>
                      <th>Signed Date</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringContracts.map((c) => (
                      <tr key={c.id} style={{ background: 'rgba(234, 88, 12, 0.05)' }}>
                        <td><strong>{c.contractNumber}</strong></td>
                        <td>{c.title}</td>
                        <td>
                          <strong>{c.client?.name}</strong>
                          <small style={{ display: 'block', color: 'var(--text-muted)' }}>{c.client?.phone || c.client?.email}</small>
                        </td>
                        <td><strong style={{ color: 'var(--brand-green)' }}>{formatMoney(c.amount)}</strong></td>
                        <td>{formatDate(c.signedDate)}</td>
                        <td><strong style={{ color: '#ea580c' }}>{formatDate(c.endDate)}</strong></td>
                        <td><span className="pill-badge expiring_soon">Approaching Expiry</span></td>
                        <td>
                          <button
                            type="button"
                            className="btn-solid-green"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              setEditingContract(c);
                              setContractForm({
                                contractNumber: c.contractNumber || '',
                                title: c.title || '',
                                amount: String(c.amount || ''),
                                signedDate: formatDate(c.signedDate),
                                endDate: formatDate(c.endDate),
                                status: 'ACTIVE',
                                terms: c.terms || '',
                                clientId: c.client?.id ? String(c.client.id) : '',
                              });
                              setContractModalOpen(true);
                            }}
                          >
                            Extend / Renew
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No contracts currently expiring within 60 days.</p>
            )}
          </div>
        )}

        {/* TAB 5: CLIENT DESIGN CATALOG & PROJECTS */}
        {activeTab === 'projects' && (
          <div className="light-panel-card">
            <div className="panel-card-head">
              <div>
                <span className="brand-green-subtitle">CLIENT-VISIBLE DESIGN CATALOG</span>
                <h3 className="panel-title">Designs, Projects &amp; Milestones</h3>
                <p className="panel-meta">Every design saved here is immediately available to clients in Browse Properties and Company Designs.</p>
              </div>
              <button type="button" className="btn-solid-green" onClick={() => {
                setEditingProject(null);
                setNewImageUrl('');
                setProjectForm({
                  name: '',
                  description: '',
                  category: 'APARTMENTS',
                  location: '',
                  startDate: new Date().toISOString().slice(0, 10),
                  endDate: '',
                  budget: '',
                  imageUrl: '',
                  imageUrls: [],
                  clientId: '',
                  status: 'PLANNING',
                  progressPercentage: 0,
                  constructionStatus: '',
                  priceRange: '',
                  specifications: '',
                });
                setProjectModalOpen(true);
              }}>+ Add Client-Visible Design</button>
            </div>

            <div className="table-responsive-box">
              <table className="light-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Category</th>
                    <th>Price (Client-Visible)</th>
                    <th>Assigned Client</th>
                    <th>Progress</th>
                    <th>Downpayment</th>
                    <th>Construction Status</th>
                    <th>Milestones</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => {
                    const pPayment = downPayments.find((dp) => dp.project?.id === p.id);
                    return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        <small style={{ display: 'block', color: 'var(--text-muted)' }}>{p.location}</small>
                        <small style={{ display: 'inline-block', marginTop: '3px', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>
                          📷 {(p.imageUrls && p.imageUrls.length > 0) ? p.imageUrls.length : (p.imageUrl ? 1 : 0)} / 5 images
                        </small>
                      </td>
                      <td><span className="pill-badge active">{p.category}</span></td>
                      <td>
                        <strong style={{ color: 'var(--brand-green)' }}>
                          {p.priceRange || (p.budget ? formatMoney(p.budget) : '—')}
                        </strong>
                      </td>
                      <td>
                        <strong>{p.client?.name || 'Unassigned'}</strong>
                        <small style={{ display: 'block', color: 'var(--text-muted)' }}>{p.client?.email}</small>
                      </td>
                      <td>
                        <div style={{ minWidth: '90px' }}>
                          <span>{p.progressPercentage || 0}%</span>
                          <div className="construction-progress-track" style={{ height: '4px' }}>
                            <div className="construction-progress-fill" style={{ width: `${p.progressPercentage || 0}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        {pPayment ? (
                          <div>
                            <span className={
                              pPayment.status === 'Valid' ? 'dp-badge-valid' :
                              pPayment.status === 'Expiring Soon' ? 'dp-badge-expiring' : 'dp-badge-expired'
                            }>
                              {pPayment.status}
                            </span>
                            <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              {formatMoney(pPayment.amount)} (Valid: {formatDate(pPayment.validUntil)})
                            </small>
                          </div>
                        ) : (
                          <div>
                            <span style={{ color: '#ea580c', fontSize: '0.78rem', fontWeight: 700, background: '#fff7ed', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #fed7aa' }}>
                              Required
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ maxWidth: '240px' }}><small>{p.constructionStatus || 'In Progress'}</small></td>
                      <td><small><b>{p.milestones?.length || 0}</b> stages</small></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {pPayment ? (
                            <button
                              type="button"
                              className="btn-outline-green"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                              onClick={() => {
                                setActiveTab('payments');
                                setPaymentSearch(pPayment.referenceNumber || p.name);
                              }}
                            >
                              View DP
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-solid-green"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', background: '#09543b' }}
                              onClick={() => openAddPayment(p)}
                            >
                              + Downpayment
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-solid-green"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                            onClick={() => {
                              setEditingProject(p);
                              setNewImageUrl('');
                              const existingImages = (p.imageUrls && p.imageUrls.length > 0)
                                ? [...p.imageUrls]
                                : (p.imageUrl ? [p.imageUrl] : []);
                              setProjectForm({
                                name: p.name || '',
                                description: p.description || '',
                                category: p.category || 'APARTMENTS',
                                location: p.location || '',
                                startDate: formatDate(p.startDate),
                                endDate: formatDate(p.endDate),
                                budget: p.budget || '',
                                imageUrl: existingImages[0] || '',
                                imageUrls: existingImages,
                                clientId: p.client?.id ? String(p.client.id) : '',
                                status: p.status || 'IN_PROGRESS',
                                progressPercentage: p.progressPercentage || 0,
                                constructionStatus: p.constructionStatus || '',
                                priceRange: p.priceRange || '',
                                specifications: p.specifications || '',
                              });
                              setProjectModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-outline-green"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                            onClick={() => {
                              setMilestoneProjectId(p.id);
                              setMilestoneForm({ title: '', description: '', targetDate: '', status: 'IN_PROGRESS', progressPercentage: 0 });
                              setMilestoneModalOpen(true);
                            }}
                          >
                            + Milestone
                          </button>
                          <button
                            type="button"
                            className="btn-outline-green"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', borderColor: '#ef4444', color: '#ef4444' }}
                            onClick={() => handleDeleteProject(p)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: INQUIRIES */}
        {activeTab === 'inquiries' && (
          <div className="light-panel-card">
            <div className="panel-card-head">
              <div>
                <span className="brand-green-subtitle">SUPPORT</span>
                <h3 className="panel-title">Client Inquiries Inbox</h3>
              </div>
            </div>

            {inquiries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {inquiries.map((inq) => (
                  <div
                    key={inq.id}
                    style={{
                      background: '#f8fafc',
                      border: inq.status === 'PENDING' ? '1px solid var(--brand-green)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{inq.subject}</strong>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.35rem', fontSize: '0.88rem' }}>
                          <span style={{ color: 'var(--brand-green)', fontWeight: 700 }}>
                            👤 Client Name: {inq.client?.name || 'Unknown'}
                          </span>
                          <span style={{ color: '#475569' }}>
                            ✉️ {inq.client?.email || 'No email'}
                          </span>
                          {inq.client?.phone && (
                            <span style={{ color: '#475569' }}>
                              📞 {inq.client.phone}
                            </span>
                          )}
                          {inq.project && (
                            <span style={{ color: '#0369a1', fontWeight: 600 }}>
                              🏠 Design: {inq.project.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                        <span className={`pill-badge ${inq.status?.toLowerCase()}`}>
                          {inq.status === 'ANSWERED' ? 'Answered' : 'Action Required'}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                          📅 Date: {inq.createdAt ? formatDate(inq.createdAt) : '-'}
                        </span>
                      </div>
                    </div>

                    <p style={{ color: '#334155', fontSize: '0.95rem', margin: '0.75rem 0' }}>{inq.message}</p>
                    {inq.attachmentData && (
                      <a href={inq.attachmentData} download={inq.attachmentName || 'client-design'} className="btn-outline-green" style={{ display: 'inline-flex', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                        View client design: {inq.attachmentName || 'attachment'}
                      </a>
                    )}

                    {inq.response ? (
                      <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(9, 84, 59, 0.08)', borderLeft: '4px solid var(--brand-green)', borderRadius: '0 6px 6px 0' }}>
                        <small style={{ color: 'var(--brand-green)', fontWeight: 700 }}>Your Reply ({formatDate(inq.respondedAt)}):</small>
                        <p style={{ color: '#0f172a', fontSize: '0.9rem', marginTop: '0.2rem' }}>{inq.response}</p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-solid-green"
                        style={{ marginTop: '0.5rem' }}
                        onClick={() => {
                          setActiveInquiry(inq);
                          setResponseText('');
                          setResponseModalOpen(true);
                        }}
                      >
                        Reply to Client Inquiry
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No inquiries received.</p>
            )}
          </div>
        )}

        {/* TAB 7: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="light-panel-card">
            <div className="panel-card-head">
              <div>
                <span className="brand-green-subtitle">VAULT</span>
                <h3 className="panel-title">Project Documents Repository</h3>
              </div>
              <button
                type="button"
                className="btn-solid-green"
                onClick={() => {
                  setDocForm({ title: '', documentType: 'CONTRACT_DEED', description: '', clientId: clients[0]?.id ? String(clients[0].id) : '', projectId: projects[0]?.id ? String(projects[0].id) : '', file: null });
                  setDocModalOpen(true);
                }}
              >
                + Upload Document for Client
              </button>
            </div>

            <div className="table-responsive-box">
              <table className="light-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Target Client</th>
                    <th>Uploaded By</th>
                    <th>File Name</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.title}</strong></td>
                      <td><span className="pill-badge active">{d.documentType}</span></td>
                      <td>{d.client?.name || '-'}</td>
                      <td>{d.uploadedByRole === 'CLIENT' ? 'Client Upload' : 'Client Manager'}</td>
                      <td>{d.fileName}</td>
                      <td>{formatDate(d.uploadedAt)}</td>
                      <td>
                        {d.fileData ? (
                          <a
                            href={d.fileData}
                            download={d.fileName || d.title || 'document'}
                            className="btn-outline-green"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Download
                          </a>
                        ) : <span className="text-muted">No file attached</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: CLIENT FEEDBACKS */}
        {activeTab === 'feedbacks' && (
          <div className="light-panel-card">
            <div className="panel-card-head">
              <div>
                <span className="brand-green-subtitle">CLIENT REVIEWS</span>
                <h3 className="panel-title">Client Feedback & Ratings</h3>
              </div>
            </div>
            {feedbacks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {feedbacks.map((f) => (
                  <div key={f.id} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>{f.client?.name || 'Client'} ({f.category?.replace('_', ' ')})</strong>
                      <span style={{ color: '#f59e0b', fontSize: '1.1rem' }}>{'★'.repeat(f.rating || 5)}{'☆'.repeat(5 - (f.rating || 5))}</span>
                    </div>
                    <p style={{ margin: 0, color: '#334155' }}>{f.comments}</p>
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>{formatDate(f.createdAt)}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No client feedbacks received yet.</p>
            )}
          </div>
        )}

        {/* TAB 9: DOWN PAYMENTS */}
        {activeTab === 'payments' && (
          <div>
            {/* KPI Summary Cards */}
            <section className="pm-metrics" style={{ marginBottom: '1.5rem' }}>
              <div className="pm-metric">
                <span>Total Downpayments Collected</span>
                <strong style={{ color: 'var(--brand-green)' }}>
                  {formatMoney(downPayments.filter(p => p.status !== 'Expired').reduce((acc, p) => acc + (Number(p.amount) || 0), 0))}
                </strong>
              </div>
              <div className="pm-metric">
                <span>Valid Downpayments</span>
                <strong style={{ color: '#15803d' }}>
                  {downPayments.filter(p => p.status === 'Valid').length}
                </strong>
              </div>
              <div className="pm-metric">
                <span>Expiring Soon (60-Day Limit)</span>
                <strong style={{ color: '#b45309' }}>
                  {downPayments.filter(p => p.status === 'Expiring Soon').length}
                </strong>
              </div>
              <div className="pm-metric">
                <span>Expired Downpayments</span>
                <strong style={{ color: '#b91c1c' }}>
                  {downPayments.filter(p => p.status === 'Expired').length}
                </strong>
              </div>
            </section>

            {/* Expiry alerts */}
            {downPayments.filter(p => p.status === 'Expiring Soon').length > 0 && (
              <div className="pm-alert error" style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ display: 'block' }}>
                    Alert: {downPayments.filter(p => p.status === 'Expiring Soon').length} Downpayment(s) are Expiring Soon!
                  </strong>
                  <p style={{ fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                    Validity is within 15 days of the 60-day limit. Follow up with clients to proceed with construction stages.
                  </p>
                </div>
              </div>
            )}

            {/* Main Table Panel */}
            <div className="light-panel-card">
              <div className="panel-card-head">
                <div>
                  <span className="brand-green-subtitle">DOWNPAYMENT MANAGEMENT</span>
                  <h3 className="panel-title">Project Downpayment Records</h3>
                  <p className="panel-meta">All downpayments are automatically valid for 60 days from payment date.</p>
                </div>
                <button
                  type="button"
                  className="btn-solid-green"
                  onClick={() => openAddPayment()}
                >
                  + Record Down Payment
                </button>
              </div>

              {/* Filter and Search Bar */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div style={{ flex: '1 1 250px' }}>
                  <input
                    type="text"
                    placeholder="Search by client, project, or reference #..."
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.85rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ width: '180px' }}>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.85rem', fontSize: '0.9rem' }}
                  >
                    <option value="">All Statuses</option>
                    <option value="Valid">Valid</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>

                <div style={{ width: '200px' }}>
                  <select
                    value={paymentClientFilter}
                    onChange={(e) => setPaymentClientFilter(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.85rem', fontSize: '0.9rem' }}
                  >
                    <option value="">All Clients</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {(paymentSearch || paymentStatusFilter || paymentClientFilter) && (
                  <button
                    type="button"
                    className="btn-outline-green"
                    style={{ padding: '0.55rem 0.85rem', fontSize: '0.85rem' }}
                    onClick={() => {
                      setPaymentSearch('');
                      setPaymentStatusFilter('');
                      setPaymentClientFilter('');
                    }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Table */}
              {downPayments.length > 0 ? (
                <div className="table-responsive-box">
                  <table className="light-table">
                    <thead>
                      <tr>
                        <th>Reference #</th>
                        <th>Client</th>
                        <th>Project</th>
                        <th>Amount</th>
                        <th>Payment Date</th>
                        <th>Valid Until (60 Days)</th>
                        <th>Method</th>
                        <th>Receipt</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {downPayments.map((p) => {
                        const isExpiring = p.status === 'Expiring Soon';
                        const isExpired = p.status === 'Expired';
                        return (
                          <tr key={p.id} style={{ background: isExpired ? 'rgba(239, 68, 68, 0.04)' : (isExpiring ? 'rgba(245, 158, 11, 0.05)' : undefined) }}>
                            <td>
                              <strong>{p.referenceNumber || `DP-${p.id}`}</strong>
                              <small style={{ display: 'block', color: 'var(--text-muted)' }}>ID #{p.id}</small>
                            </td>
                            <td>
                              <strong>{p.client?.name}</strong>
                              <small style={{ display: 'block', color: 'var(--text-muted)' }}>{p.client?.phone || p.client?.email}</small>
                            </td>
                            <td>
                              {p.project ? (
                                <div>
                                  <strong>{p.project.name}</strong>
                                  <small style={{ display: 'block', color: 'var(--brand-green)' }}>{p.project.location || p.project.category}</small>
                                </div>
                              ) : (
                                <span className="text-muted">Unassigned</span>
                              )}
                            </td>
                            <td>
                              <strong style={{ color: 'var(--brand-green)', fontSize: '1rem' }}>
                                {formatMoney(p.amount)}
                              </strong>
                            </td>
                            <td>{formatDate(p.paymentDate)}</td>
                            <td>
                              <strong>{formatDate(p.validUntil)}</strong>
                              {p.daysRemaining !== null && p.daysRemaining !== undefined && (
                                <small style={{ display: 'block', color: isExpired ? '#b91c1c' : (isExpiring ? '#b45309' : '#15803d'), fontWeight: 600 }}>
                                  {p.daysRemaining < 0 ? `${Math.abs(p.daysRemaining)} days ago` : `${p.daysRemaining} days left`}
                                </small>
                              )}
                            </td>
                            <td>
                              <span className="pill-badge active" style={{ fontSize: '0.72rem' }}>
                                {p.paymentMethod?.replace('_', ' ')}
                              </span>
                            </td>
                            <td>
                              {p.receipt ? (
                                <button
                                  type="button"
                                  className="btn-outline-green"
                                  style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                                  onClick={() => setReceiptPreviewModal(p)}
                                >
                                  View Receipt
                                </button>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>None</span>
                              )}
                            </td>
                            <td>
                              <select
                                value={p.status || 'Valid'}
                                onChange={(e) => handleUpdateDownPaymentStatus(p.id, e.target.value)}
                                style={{
                                  padding: '0.3rem 0.5rem',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontWeight: 600,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  background:
                                    p.status === 'Verified' || p.status === 'Approved' || p.status === 'Valid' ? '#dcfce7' :
                                    p.status === 'Expiring Soon' || p.status === 'Pending' ? '#fef3c7' : '#fee2e2',
                                  color:
                                    p.status === 'Verified' || p.status === 'Approved' || p.status === 'Valid' ? '#15803d' :
                                    p.status === 'Expiring Soon' || p.status === 'Pending' ? '#b45309' : '#b91c1c',
                                }}
                                title="Change down payment status"
                              >
                                <option value="Valid">Valid</option>
                                <option value="Verified">Verified</option>
                                <option value="Approved">Approved</option>
                                <option value="Pending">Pending</option>
                                <option value="Expiring Soon">Expiring Soon</option>
                                <option value="Expired">Expired</option>
                                <option value="Refunded">Refunded</option>
                              </select>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button
                                  type="button"
                                  className="btn-outline-green"
                                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                                  onClick={() => openEditPayment(p)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn-outline-green"
                                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', borderColor: '#ef4444', color: '#ef4444' }}
                                  onClick={() => handleDeletePayment(p)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No downpayments found matching the criteria.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB: PROJECT REQUESTS */}
        {activeTab === 'project-requests' && (
          <div>
            <div className="light-panel-card" style={{ marginBottom: '1.5rem' }}>
              <div className="panel-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span className="brand-green-subtitle">CLIENT REQUEST INBOX</span>
                  <h3 className="panel-title" style={{ margin: '0.2rem 0' }}>Client Custom Project Requests &amp; PM Workflows</h3>
                  <p className="panel-meta" style={{ margin: 0 }}>Review custom project requests, forward to Project Manager for technical feasibility and estimates, and dispatch official proposals to clients.</p>
                </div>
              </div>

              {/* KPI Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <small style={{ color: 'var(--text-muted)' }}>Total Requests</small>
                  <strong style={{ fontSize: '1.4rem', display: 'block', color: '#0f172a' }}>{projectRequests.length}</strong>
                </div>
                <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                  <small style={{ color: '#b45309' }}>Pending CM Review</small>
                  <strong style={{ fontSize: '1.4rem', display: 'block', color: '#d97706' }}>
                    {projectRequests.filter((r) => r.status === 'PENDING_CM_REVIEW').length}
                  </strong>
                </div>
                <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                  <small style={{ color: '#1e40af' }}>Forwarded to PM</small>
                  <strong style={{ fontSize: '1.4rem', display: 'block', color: '#2563eb' }}>
                    {projectRequests.filter((r) => r.status === 'FORWARDED_TO_PM').length}
                  </strong>
                </div>
                <div style={{ background: '#f5f3ff', padding: '1rem', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                  <small style={{ color: '#6d28d9' }}>PM Replied</small>
                  <strong style={{ fontSize: '1.4rem', display: 'block', color: '#7c3aed' }}>
                    {projectRequests.filter((r) => r.status === 'PM_REVIEWED').length}
                  </strong>
                </div>
                <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <small style={{ color: '#15803d' }}>Approved</small>
                  <strong style={{ fontSize: '1.4rem', display: 'block', color: '#16a34a' }}>
                    {projectRequests.filter((r) => r.status === 'APPROVED' || r.status === 'PROJECT_STARTED').length}
                  </strong>
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                {[
                  { key: 'ALL', label: 'All Requests' },
                  { key: 'PENDING_CM_REVIEW', label: 'Pending CM Review' },
                  { key: 'FORWARDED_TO_PM', label: 'Forwarded to PM' },
                  { key: 'PM_REVIEWED', label: 'PM Replied' },
                  { key: 'APPROVED', label: 'Approved' },
                  { key: 'PROJECT_STARTED', label: 'Project Started' },
                  { key: 'REJECTED', label: 'Rejected' },
                  { key: 'CLIENT_NOTIFIED', label: 'Client Notified' },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setProjectRequestFilter(f.key)}
                    style={{
                      padding: '0.4rem 0.9rem',
                      borderRadius: '16px',
                      border: projectRequestFilter === f.key ? '2px solid var(--brand-green)' : '1px solid #cbd5e1',
                      background: projectRequestFilter === f.key ? 'var(--brand-green)' : '#ffffff',
                      color: projectRequestFilter === f.key ? '#ffffff' : '#334155',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Requests List */}
            {(() => {
              const filteredList = projectRequests.filter((r) => {
                if (projectRequestFilter === 'ALL') return true;
                return r.status === projectRequestFilter;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="light-panel-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📭</span>
                    <h4>No Project Requests found in this filter</h4>
                    <p className="text-muted">Requests submitted by clients from their portal will show up here.</p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {filteredList.map((req) => {
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
                        className="light-panel-card"
                        style={{
                          borderLeft: isStarted
                            ? '5px solid #10b981'
                            : isApproved
                            ? '5px solid #16a34a'
                            : isRejected
                            ? '5px solid #ef4444'
                            : isPmReviewed
                            ? '5px solid #7c3aed'
                            : isPendingCm
                            ? '5px solid #d97706'
                            : isForwardedPm
                            ? '5px solid #2563eb'
                            : '5px solid #16a34a',
                        }}
                      >
                        {/* Header Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>
                              {req.category} &nbsp;•&nbsp; Client: <strong>{req.client?.name || 'Client'}</strong> ({req.client?.email || 'N/A'}, {req.client?.phone || 'N/A'})
                            </span>
                            <h3 style={{ margin: '0.2rem 0', color: '#0f172a' }}>{req.title}</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              📍 {req.location || 'Location not specified'} &nbsp;|&nbsp; Submitted on {formatDate(req.createdAt)}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {isPendingCm && <span className="pill-badge warning">Pending CM Review</span>}
                            {isForwardedPm && <span className="pill-badge active">Forwarded to PM</span>}
                            {isPmReviewed && <span className="pill-badge active" style={{ background: '#ede9fe', color: '#6d28d9', fontWeight: 700 }}>PM Assessment Complete</span>}
                            {isClientNotified && <span className="pill-badge completed">Client Notified</span>}
                            {isApproved && <span className="pill-badge completed" style={{ background: '#dcfce7', color: '#166534', fontWeight: 700 }}>✓ Approved (Awaiting PM to Start)</span>}
                            {isStarted && <span className="pill-badge completed" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #10b981', fontWeight: 700 }}>🚀 Project Started</span>}
                            {isRejected && <span className="pill-badge error" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>✗ Rejected</span>}
                          </div>
                        </div>

                        {/* Specs & Budget Grid */}
                        <div style={{ display: 'flex', gap: '1.5rem', margin: '1rem 0', flexWrap: 'wrap', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                          <div>
                            <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Client Expected Budget</small>
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
                              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Client Specifications</small>
                              <span style={{ color: '#334155', fontSize: '0.9rem' }}>{req.specifications}</span>
                            </div>
                          )}
                        </div>

                        <p style={{ margin: '0.5rem 0', color: '#334155', fontSize: '0.92rem', lineHeight: 1.5 }}>
                          <strong>Requirements:</strong> {req.description}
                        </p>

                        {/* Attached Photos */}
                        {req.imageUrls && req.imageUrls.length > 0 && (
                          <div style={{ margin: '0.75rem 0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <small style={{ color: 'var(--text-muted)', marginRight: '0.25rem' }}>Client Photos / Blueprints ({req.imageUrls.length}):</small>
                            {req.imageUrls.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Attachment ${idx + 1}`}
                                style={{ width: '65px', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                                onClick={() => setPreviewRequestPhotosModal(req)}
                              />
                            ))}
                          </div>
                        )}

                        {/* Forwarding history note */}
                        {req.cmNotes && (
                          <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#eff6ff', borderLeft: '3px solid #3b82f6', borderRadius: '0 6px 6px 0', fontSize: '0.88rem' }}>
                            <strong style={{ color: '#1d4ed8' }}>Forwarded to PM ({req.forwardedByCm || 'CM'} on {formatDate(req.forwardedToPmAt)}):</strong>
                            <p style={{ margin: '0.2rem 0 0', color: '#1e3a8a' }}>{req.cmNotes}</p>
                          </div>
                        )}

                        {/* PM Technical Assessment */}
                        {req.pmReply && (
                          <div style={{ marginTop: '0.75rem', padding: '0.85rem 1rem', background: '#f5f3ff', borderLeft: '3px solid #7c3aed', borderRadius: '0 6px 6px 0', fontSize: '0.88rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                              <strong style={{ color: '#6d28d9' }}>🏗️ Project Manager Engineering Review ({req.pmRespondedBy || 'PM'} on {formatDate(req.pmRespondedAt)}):</strong>
                              {req.pmEstimatedBudget && (
                                <span style={{ color: '#6d28d9', fontWeight: 700 }}>
                                  Estimated: {formatMoney(req.pmEstimatedBudget)} {req.pmEstimatedDuration ? `| ${req.pmEstimatedDuration}` : ''}
                                </span>
                              )}
                            </div>
                            <p style={{ margin: '0.25rem 0 0', color: '#4c1d95', whiteSpace: 'pre-wrap' }}>{req.pmReply}</p>
                          </div>
                        )}

                        {/* Rejection reason if rejected */}
                        {req.rejectionReason && (
                          <div style={{ marginTop: '0.75rem', padding: '0.85rem 1rem', background: '#fef2f2', borderLeft: '3px solid #ef4444', borderRadius: '0 6px 6px 0', fontSize: '0.88rem' }}>
                            <strong style={{ color: '#b91c1c' }}>Rejection Reason (by {req.rejectedBy || 'Client Manager'} on {formatDate(req.rejectedAt)}):</strong>
                            <p style={{ margin: '0.2rem 0 0', color: '#7f1d1d' }}>{req.rejectionReason}</p>
                          </div>
                        )}

                        {/* Approved notice */}
                        {isApproved && (
                          <div style={{ marginTop: '0.75rem', padding: '0.85rem 1rem', background: '#f0fdf4', borderLeft: '3px solid #16a34a', borderRadius: '0 6px 6px 0', fontSize: '0.88rem' }}>
                            <strong style={{ color: '#15803d' }}>✓ Approved by {req.approvedBy || 'Client Manager'} on {formatDate(req.approvedAt)}</strong>
                            <p style={{ margin: '0.2rem 0 0', color: '#166534' }}>Awaiting Project Manager to initialize and assign client to the new construction project.</p>
                          </div>
                        )}

                        {/* Project started notice */}
                        {isStarted && (
                          <div style={{ marginTop: '0.75rem', padding: '0.85rem 1rem', background: '#ecfdf5', borderLeft: '3px solid #10b981', borderRadius: '0 6px 6px 0', fontSize: '0.88rem' }}>
                            <strong style={{ color: '#047857' }}>🚀 Project Initialized by Project Manager (Project ID #{req.startedProjectId})</strong>
                            <p style={{ margin: '0.2rem 0 0', color: '#065f46' }}>Construction project is underway and client is assigned.</p>
                          </div>
                        )}

                        {/* Official Response sent to client */}
                        {req.clientMessage && (
                          <div style={{ marginTop: '0.75rem', padding: '0.85rem 1rem', background: '#f0fdf4', borderLeft: '3px solid #16a34a', borderRadius: '0 6px 6px 0', fontSize: '0.88rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                              <strong style={{ color: '#15803d' }}>✉️ Official Message Delivered to Client on {formatDate(req.clientNotifiedAt)}:</strong>
                              <small style={{ color: 'var(--text-muted)' }}>By {req.clientNotifiedBy || 'Client Manager'}</small>
                            </div>
                            <p style={{ margin: '0.25rem 0 0', color: '#14532d', whiteSpace: 'pre-wrap' }}>{req.clientMessage}</p>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
                          {!isApproved && !isStarted && !isRejected && (
                            <>
                              <button
                                type="button"
                                className="btn-solid-green"
                                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: '#16a34a' }}
                                onClick={() => handleOpenApproveModal(req)}
                              >
                                ✓ Approve Request
                              </button>
                              <button
                                type="button"
                                className="btn-outline-green"
                                style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderColor: '#ef4444', color: '#ef4444' }}
                                onClick={() => handleOpenRejectModal(req)}
                              >
                                ✗ Reject Request
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            className="btn-outline-green"
                            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                            onClick={() => handleOpenForwardModal(req)}
                          >
                            {req.status === 'FORWARDED_TO_PM' ? 'Update Forward to PM' : 'Forward to PM →'}
                          </button>

                          <button
                            type="button"
                            className="btn-outline-green"
                            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                            onClick={() => handleOpenClientNotifyModal(req)}
                          >
                            {req.status === 'CLIENT_NOTIFIED' ? 'Update Client Response' : 'Send Response ✉️'}
                          </button>

                          <button
                            type="button"
                            className="btn-outline-green"
                            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', borderColor: '#ef4444', color: '#ef4444' }}
                            onClick={() => handleDeleteProjectRequest(req)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* MODALS */}
        {clientModalOpen && (
          <div className="light-modal-overlay">
            <div className="light-modal-box">
              <div className="modal-head-row">
                <h3>{editingClient ? 'Edit Client Profile' : 'Create Client Profile'}</h3>
                <button type="button" onClick={() => setClientModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveClient}>
                <div className="modal-body-content">
                  <div className="form-grid-2">
                    <div className="form-input-box">
                      <label>Client Name *</label>
                      <input type="text" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} required />
                    </div>
                    <div className="form-input-box">
                      <label>Email *</label>
                      <input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} required />
                    </div>
                    <div className="form-input-box">
                      <label>Phone</label>
                      <input type="text" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
                    </div>
                    <div className="form-input-box">
                      <label>Status</label>
                      <select value={clientForm.status} onChange={(e) => setClientForm({ ...clientForm, status: e.target.value })}>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                    <div className="form-input-box">
                      <label>Preferred Category</label>
                      <select value={clientForm.preferredCategory} onChange={(e) => setClientForm({ ...clientForm, preferredCategory: e.target.value })}>
                        <option value="RESIDENCIES">RESIDENCIES</option>
                        <option value="APARTMENTS">APARTMENTS</option>
                        <option value="LANDS">LANDS</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-input-box" style={{ marginTop: '1rem' }}>
                    <label>Address</label>
                    <textarea rows={2} value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} />
                  </div>
                </div>
                <div className="modal-actions-row">
                  <button type="button" className="btn-outline-green" onClick={() => setClientModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-solid-green">{editingClient ? 'Save Changes' : 'Create Profile'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {contractModalOpen && (
          <div className="light-modal-overlay">
            <div className="light-modal-box">
              <div className="modal-head-row">
                <h3>{editingContract ? 'Edit Contract' : 'Record New Contract'}</h3>
                <button type="button" onClick={() => setContractModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveContract}>
                <div className="modal-body-content">
                  <div className="form-grid-2">
                    <div className="form-input-box">
                      <label>Contract Number *</label>
                      <input type="text" value={contractForm.contractNumber} onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })} required />
                    </div>
                    <div className="form-input-box">
                      <label>Client *</label>
                      <select value={contractForm.clientId} onChange={(e) => setContractForm({ ...contractForm, clientId: e.target.value })} required>
                        <option value="">-- Choose Client --</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-input-box">
                      <label>Title *</label>
                      <input type="text" value={contractForm.title} onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })} required />
                    </div>
                    <div className="form-input-box">
                      <label>Amount (LKR) *</label>
                      <input type="number" step="0.01" value={contractForm.amount} onChange={(e) => setContractForm({ ...contractForm, amount: e.target.value })} required />
                    </div>
                    <div className="form-input-box">
                      <label>Signed Date *</label>
                      <input type="date" value={contractForm.signedDate} onChange={(e) => setContractForm({ ...contractForm, signedDate: e.target.value })} required />
                    </div>
                    <div className="form-input-box">
                      <label>End Date</label>
                      <input type="date" value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-input-box" style={{ marginTop: '1rem' }}>
                    <label>Status</label>
                    <select value={contractForm.status} onChange={(e) => setContractForm({ ...contractForm, status: e.target.value })}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="EXPIRING_SOON">EXPIRING_SOON</option>
                      <option value="EXPIRED">EXPIRED</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </div>
                  <div className="form-input-box" style={{ marginTop: '1rem' }}>
                    <label>Terms</label>
                    <textarea rows={2} value={contractForm.terms} onChange={(e) => setContractForm({ ...contractForm, terms: e.target.value })} />
                  </div>
                </div>
                <div className="modal-actions-row">
                  <button type="button" className="btn-outline-green" onClick={() => setContractModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-solid-green">{editingContract ? 'Update' : 'Record'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {projectModalOpen && (
          <div className="light-modal-overlay">
            <div className="light-modal-box">
              <div className="modal-head-row">
                <h3>{editingProject ? 'Edit Client-Visible Design' : 'Add Client-Visible Design'}</h3>
                <button type="button" onClick={() => setProjectModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveProject}>
                <div className="modal-body-content">
                  <div className="form-grid-2">
                    <div className="form-input-box">
                      <label>Design Name *</label>
                      <input value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} required />
                    </div>
                    <div className="form-input-box">
                      <label>Design Type *</label>
                      <select value={projectForm.category} onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}>
                        <option value="LANDS">Land / Plot</option>
                        <option value="RESIDENCIES">Residencies</option>
                        <option value="APARTMENTS">Apartments</option>
                      </select>
                    </div>
                    <div className="form-input-box">
                      <label>Location</label>
                      <input value={projectForm.location} onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })} />
                    </div>
                    <div className="form-input-box">
                      <label>Assign Client (optional)</label>
                      <select value={projectForm.clientId} onChange={(e) => setProjectForm({ ...projectForm, clientId: e.target.value })}>
                        <option value="">Not assigned — browse sample only</option>
                        {clients.filter((client) => client.status === 'ACTIVE').map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                      </select>
                    </div>
                    <div className="form-input-box">
                      <label>Start Date *</label>
                      <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} required />
                    </div>
                    <div className="form-input-box">
                      <label>Starting Price / Budget *</label>
                      <input type="number" min="0" value={projectForm.budget} onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })} required />
                    </div>
                    <div className="form-input-box">
                      <label>Display Price</label>
                      <input placeholder="e.g. From LKR 25,000,000" value={projectForm.priceRange} onChange={(e) => setProjectForm({ ...projectForm, priceRange: e.target.value })} />
                    </div>
                    <div className="form-input-box">
                      <label>Expected Completion</label>
                      <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })} />
                    </div>
                    <div className="form-input-box">
                      <label>Progress (0 - 100%)</label>
                      <input type="number" min="0" max="100" value={projectForm.progressPercentage} onChange={(e) => setProjectForm({ ...projectForm, progressPercentage: e.target.value })} required />
                    </div>
                    <div className="form-input-box">
                      <label>Status</label>
                      <select value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}>
                        <option value="PLANNING">PLANNING</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="ON_HOLD">ON_HOLD</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </div>
                  </div>

                  {/* 5-IMAGE DESIGN GALLERY MANAGER */}
                  <div className="form-input-box" style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <label style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                          Client Design Images (Maximum 5 Images)
                        </label>
                        <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                          Upload up to 5 photos per design. The first image marked ★ Cover is displayed in catalogs.
                        </small>
                      </div>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        background: (projectForm.imageUrls?.length || 0) >= 5 ? '#fef2f2' : '#ecfdf5',
                        color: (projectForm.imageUrls?.length || 0) >= 5 ? '#dc2626' : '#059669',
                        border: `1px solid ${(projectForm.imageUrls?.length || 0) >= 5 ? '#fecaca' : '#a7f3d0'}`,
                      }}>
                        {projectForm.imageUrls?.length || 0} / 5 Images Added
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
                      <label
                        className="btn-solid-green"
                        style={{
                          margin: 0,
                          cursor: (projectForm.imageUrls?.length || 0) >= 5 ? 'not-allowed' : 'pointer',
                          opacity: (projectForm.imageUrls?.length || 0) >= 5 ? 0.5 : 1,
                          padding: '0.5rem 1rem',
                          fontSize: '0.82rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#047857',
                        }}
                      >
                        <span>📁 Choose Images (Up to 5)</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          multiple
                          disabled={(projectForm.imageUrls?.length || 0) >= 5}
                          style={{ display: 'none' }}
                          onChange={handleDesignImageUpload}
                        />
                      </label>

                      <div style={{ display: 'flex', gap: '0.4rem', flex: 1, minWidth: '240px' }}>
                        <input
                          type="url"
                          placeholder="Or paste image URL (https://...)"
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                          disabled={(projectForm.imageUrls?.length || 0) >= 5}
                          style={{ flex: 1, fontSize: '0.82rem', padding: '0.45rem 0.7rem' }}
                        />
                        <button
                          type="button"
                          className="btn-outline-green"
                          onClick={handleAddImageUrl}
                          disabled={!newImageUrl.trim() || (projectForm.imageUrls?.length || 0) >= 5}
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                        >
                          + Add URL
                        </button>
                      </div>
                    </div>

                    {/* Previews Grid: 5 slots */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '0.6rem',
                      marginTop: '0.85rem',
                    }}>
                      {(projectForm.imageUrls || []).map((imgUrl, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            aspectRatio: '4/3',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: idx === 0 ? '2px solid #059669' : '1px solid #cbd5e1',
                            background: '#000',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          }}
                        >
                          <img
                            src={imgUrl}
                            alt={`Design view ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: '3px',
                            left: '3px',
                            background: idx === 0 ? '#059669' : 'rgba(15,23,42,0.8)',
                            color: '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                          }}>
                            {idx === 0 ? '★ Cover' : `#${idx + 1}`}
                          </span>

                          <div style={{ position: 'absolute', top: '3px', right: '3px', display: 'flex', gap: '3px' }}>
                            {idx !== 0 && (
                              <button
                                type="button"
                                title="Set as primary cover image"
                                onClick={() => handleSetCoverImage(idx)}
                                style={{
                                  background: 'rgba(15,23,42,0.75)',
                                  color: '#fbbf24',
                                  border: 'none',
                                  borderRadius: '3px',
                                  width: '20px',
                                  height: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                ★
                              </button>
                            )}
                            <button
                              type="button"
                              title="Delete this image"
                              onClick={() => handleRemoveDesignImage(idx)}
                              style={{
                                background: 'rgba(220,38,38,0.9)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Remaining Empty Slot Placeholders */}
                      {Array.from({ length: Math.max(0, 5 - (projectForm.imageUrls?.length || 0)) }).map((_, emptyIdx) => (
                        <div
                          key={`empty-slot-${emptyIdx}`}
                          style={{
                            aspectRatio: '4/3',
                            borderRadius: '6px',
                            border: '1.5px dashed #cbd5e1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fff',
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            gap: '3px',
                          }}
                        >
                          <span style={{ fontSize: '1.1rem', opacity: 0.5 }}>📷</span>
                          <span>Image {(projectForm.imageUrls?.length || 0) + emptyIdx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-input-box" style={{ marginTop: '1rem' }}>
                    <label>Property Description</label>
                    <textarea rows={2} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
                  </div>
                  <div className="form-input-box" style={{ marginTop: '1rem' }}>
                    <label>Design Specifications</label>
                    <textarea rows={2} placeholder="e.g. 3 bedrooms, 2 bathrooms, 1,850 sq ft" value={projectForm.specifications} onChange={(e) => setProjectForm({ ...projectForm, specifications: e.target.value })} />
                  </div>
                  <div className="form-input-box" style={{ marginTop: '1rem' }}>
                    <label>Status Remarks (Notified to Client)</label>
                    <textarea rows={3} placeholder="Optional note shown to the assigned client" value={projectForm.constructionStatus} onChange={(e) => setProjectForm({ ...projectForm, constructionStatus: e.target.value })} />
                  </div>
                </div>
                <div className="modal-actions-row">
                  <button type="button" className="btn-outline-green" onClick={() => setProjectModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-solid-green" disabled={savingProject}>{savingProject ? 'Saving…' : (editingProject ? 'Save Design Changes' : 'Publish Design for Clients')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {milestoneModalOpen && (
          <div className="light-modal-overlay">
            <div className="light-modal-box">
              <div className="modal-head-row">
                <h3>Add Milestone (US-CM-18)</h3>
                <button type="button" onClick={() => setMilestoneModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleAddMilestone}>
                <div className="modal-body-content">
                  <div className="form-input-box">
                    <label>Milestone Title *</label>
                    <input type="text" placeholder="e.g. 15th Floor Slab Pour" value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} required />
                  </div>
                  <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                    <div className="form-input-box">
                      <label>Target Date</label>
                      <input type="date" value={milestoneForm.targetDate} onChange={(e) => setMilestoneForm({ ...milestoneForm, targetDate: e.target.value })} />
                    </div>
                    <div className="form-input-box">
                      <label>Status</label>
                      <select value={milestoneForm.status} onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value })}>
                        <option value="PENDING">PENDING</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-input-box" style={{ marginTop: '1rem' }}>
                    <label>Description</label>
                    <textarea rows={2} value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} />
                  </div>
                </div>
                <div className="modal-actions-row">
                  <button type="button" className="btn-outline-green" onClick={() => setMilestoneModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-solid-green">Save Milestone</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {responseModalOpen && activeInquiry && (
          <div className="light-modal-overlay">
            <div className="light-modal-box">
              <div className="modal-head-row">
                <h3>Respond to Client Inquiry (US-CM-15)</h3>
                <button type="button" onClick={() => setResponseModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleRespondInquiry}>
                <div className="modal-body-content">
                  <p style={{ color: 'var(--brand-green)', fontWeight: 600 }}>
                    From: {activeInquiry.client?.name} | Subject: {activeInquiry.subject}
                  </p>
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-sm)', margin: '1rem 0' }}>
                    <small style={{ color: 'var(--text-muted)' }}>Client Inquiry:</small>
                    <p style={{ color: '#0f172a', marginTop: '0.25rem' }}>{activeInquiry.message}</p>
                  </div>
                  <div className="form-input-box">
                    <label>Your Official Response *</label>
                    <textarea rows={4} value={responseText} onChange={(e) => setResponseText(e.target.value)} required />
                  </div>
                </div>
                <div className="modal-actions-row">
                  <button type="button" className="btn-outline-green" onClick={() => setResponseModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-solid-green">Send Response</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {docModalOpen && (
          <div className="light-modal-overlay">
            <div className="light-modal-box">
              <div className="modal-head-row">
                <h3>Upload Document for Client</h3>
                <button type="button" onClick={() => setDocModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleUploadDoc}>
                <div className="modal-body-content">
                  <div className="form-input-box">
                    <label>Title *</label>
                    <input type="text" placeholder="e.g. Certified Title Deed" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} required />
                  </div>
                  <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                    <div className="form-input-box">
                      <label>Target Client *</label>
                      <select value={docForm.clientId} onChange={(e) => setDocForm({ ...docForm, clientId: e.target.value })} required>
                        <option value="">-- Select Client --</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-input-box">
                      <label>Type</label>
                      <select value={docForm.documentType} onChange={(e) => setDocForm({ ...docForm, documentType: e.target.value })}>
                        <option value="CONTRACT_DEED">CONTRACT_DEED</option>
                        <option value="BLUEPRINT">BLUEPRINT</option>
                        <option value="PERMIT">PERMIT</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-input-box" style={{ marginTop: '1rem' }}>
                    <label>Remarks</label>
                    <textarea rows={2} value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} />
                  </div>
                  <div className="form-input-box" style={{ marginTop: '1rem' }}>
                    <label>Document file *</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      onChange={(e) => setDocForm({ ...docForm, file: e.target.files?.[0] || null })}
                      required
                    />
                    {docForm.file && <small className="text-muted">Selected: {docForm.file.name}</small>}
                  </div>
                </div>
                <div className="modal-actions-row">
                  <button type="button" className="btn-outline-green" onClick={() => setDocModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-solid-green">Upload to Client</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {paymentModalOpen && (
          <div className="light-modal-overlay">
            <div className="light-modal-box" style={{ maxWidth: '640px' }}>
              <div className="modal-head-row">
                <h3>{editingPayment ? 'Edit Down Payment Record' : 'Record Project Down Payment'}</h3>
                <button type="button" onClick={() => setPaymentModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleSavePayment}>
                <div className="modal-body-content">
                  <div className="form-grid-2">
                    <div className="form-input-box">
                      <label>Client *</label>
                      <select
                        value={paymentForm.clientId}
                        onChange={(e) => {
                          const newClientId = e.target.value;
                          setPaymentForm({
                            ...paymentForm,
                            clientId: newClientId,
                            projectId: projects.some(p => p.id === Number(paymentForm.projectId) && p.client?.id === Number(newClientId))
                              ? paymentForm.projectId
                              : '',
                          });
                        }}
                        required
                      >
                        <option value="">-- Choose Client --</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-input-box">
                      <label>Project (Starts Project)</label>
                      <select
                        value={paymentForm.projectId}
                        onChange={(e) => {
                          const pid = e.target.value;
                          const proj = projects.find(p => p.id === Number(pid));
                          setPaymentForm({
                            ...paymentForm,
                            projectId: pid,
                            totalProjectAmount: proj?.budget ? String(proj.budget) : paymentForm.totalProjectAmount,
                            clientId: proj?.client?.id ? String(proj.client.id) : paymentForm.clientId,
                          });
                        }}
                      >
                        <option value="">-- Select Project (Optional) --</option>
                        {projects
                          .filter(p => !paymentForm.clientId || !p.client?.id || p.client.id === Number(paymentForm.clientId))
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.client?.name ? `(${p.client.name})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="form-input-box">
                      <label>Amount (LKR) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="e.g. 500000"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-input-box">
                      <label>Payment Date *</label>
                      <input
                        type="date"
                        value={paymentForm.paymentDate}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Automatic 60-day Validity Notice */}
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '0.75rem 1rem', margin: '1rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <strong style={{ color: 'var(--brand-green)', fontSize: '0.9rem' }}>
                          Automatic Validity: 60 Days from Payment Date
                        </strong>
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: '#166534' }}>
                          Valid Until: <b>{formatDate(calculateValidityDate(paymentForm.paymentDate))}</b>
                        </p>
                      </div>
                      <div>
                        <span className={
                          computeStatusFromDates(paymentForm.paymentDate) === 'Valid' ? 'dp-badge-valid' :
                          computeStatusFromDates(paymentForm.paymentDate) === 'Expiring Soon' ? 'dp-badge-expiring' : 'dp-badge-expired'
                        }>
                          Status: {computeStatusFromDates(paymentForm.paymentDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-input-box">
                      <label>Payment Method *</label>
                      <select
                        value={paymentForm.paymentMethod}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                        required
                      >
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="ONLINE">Online Payment / Gateway</option>
                        <option value="CASH">Cash</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CREDIT_CARD">Credit / Debit Card</option>
                      </select>
                    </div>

                    <div className="form-input-box">
                      <label>Reference Number</label>
                      <input
                        type="text"
                        placeholder="Auto-generated if left blank"
                        value={paymentForm.referenceNumber}
                        onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-input-box" style={{ marginTop: '1rem' }}>
                    <label>Upload Receipt Document / Slip (Image or PDF)</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setReceiptFile(file);
                        }
                      }}
                    />
                    {receiptFile ? (
                      <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem' }}>
                        Selected: {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
                      </small>
                    ) : paymentForm.receipt ? (
                      <small style={{ display: 'block', color: 'var(--brand-green)', marginTop: '0.25rem' }}>
                        Existing receipt attached: {paymentForm.receiptFileName || 'receipt file'}
                      </small>
                    ) : null}
                  </div>

                  <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                    <div className="form-input-box">
                      <label>Total Project Budget (LKR)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Optional"
                        value={paymentForm.totalProjectAmount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, totalProjectAmount: e.target.value })}
                      />
                    </div>

                    <div className="form-input-box">
                      <label>Required Downpayment (LKR)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Optional"
                        value={paymentForm.requiredDownPayment}
                        onChange={(e) => setPaymentForm({ ...paymentForm, requiredDownPayment: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-input-box" style={{ marginTop: '1rem' }}>
                    <label>Payment Notes / Remarks</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Initial 20% down payment to commence project construction"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-actions-row">
                  <button type="button" className="btn-outline-green" onClick={() => setPaymentModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-solid-green">{editingPayment ? 'Save Payment Changes' : 'Record Down Payment'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {receiptPreviewModal && (
          <div className="light-modal-overlay">
            <div className="light-modal-box" style={{ maxWidth: '540px' }}>
              <div className="modal-head-row">
                <h3>Payment Receipt — {receiptPreviewModal.referenceNumber || `DP-${receiptPreviewModal.id}`}</h3>
                <button type="button" onClick={() => setReceiptPreviewModal(null)}>✕</button>
              </div>
              <div className="modal-body-content" style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                  Client: <b>{receiptPreviewModal.client?.name}</b> | Amount: <b>{formatMoney(receiptPreviewModal.amount)}</b> | Date: <b>{formatDate(receiptPreviewModal.paymentDate)}</b>
                </p>

                {receiptPreviewModal.receipt?.startsWith('data:image') || receiptPreviewModal.receipt?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ? (
                  <div className="receipt-preview-box">
                    <img src={receiptPreviewModal.receipt} alt="Receipt Slip" className="receipt-preview-img" />
                  </div>
                ) : receiptPreviewModal.receipt?.startsWith('data:application/pdf') ? (
                  <div className="receipt-preview-box">
                    <p>PDF Document: {receiptPreviewModal.receiptFileName || 'receipt.pdf'}</p>
                    <a
                      href={receiptPreviewModal.receipt}
                      download={receiptPreviewModal.receiptFileName || `receipt-${receiptPreviewModal.referenceNumber || 'payment'}.pdf`}
                      className="btn-solid-green"
                      style={{ display: 'inline-block', marginTop: '0.75rem' }}
                    >
                      Download PDF Receipt
                    </a>
                  </div>
                ) : (
                  <div className="receipt-preview-box">
                    <p style={{ fontWeight: 600 }}>Receipt Details / Voucher:</p>
                    <p style={{ color: '#0f172a', wordBreak: 'break-all' }}>{receiptPreviewModal.receipt}</p>
                    {receiptPreviewModal.receipt?.startsWith('data:') && (
                      <a
                        href={receiptPreviewModal.receipt}
                        download={receiptPreviewModal.receiptFileName || `receipt-${receiptPreviewModal.referenceNumber || 'payment'}.bin`}
                        className="btn-solid-green"
                        style={{ display: 'inline-block', marginTop: '0.75rem' }}
                      >
                        Download Receipt File
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-actions-row">
                <button type="button" className="btn-solid-green" onClick={() => setReceiptPreviewModal(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
        {/* FORWARD TO PM MODAL */}
        {forwardModalOpen && forwardTarget && (
          <div className="light-modal-overlay">
            <div className="light-modal-box" style={{ maxWidth: '640px' }}>
              <div className="modal-head-row">
                <div>
                  <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>FORWARD TO ENGINEERING TEAM</span>
                  <h3 style={{ margin: '0.2rem 0 0' }}>Forward to Project Manager: {forwardTarget.title}</h3>
                </div>
                <button type="button" onClick={() => { setForwardModalOpen(false); setForwardTarget(null); }}>✕</button>
              </div>

              <form onSubmit={handleSubmitForward} style={{ marginTop: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                  <p style={{ margin: '0 0 0.35rem' }}><strong>Client:</strong> {forwardTarget.client?.name} ({forwardTarget.client?.email})</p>
                  <p style={{ margin: '0 0 0.35rem' }}><strong>Category:</strong> {forwardTarget.category} &nbsp;|&nbsp; <strong>Location:</strong> {forwardTarget.location}</p>
                  <p style={{ margin: '0 0 0.35rem' }}><strong>Client Expected Budget:</strong> {forwardTarget.expectedBudget ? formatMoney(forwardTarget.expectedBudget) : 'N/A'}</p>
                  {forwardTarget.imageUrls && forwardTarget.imageUrls.length > 0 && (
                    <p style={{ margin: 0, color: 'var(--brand-green)', fontWeight: 600 }}>📸 {forwardTarget.imageUrls.length} Photos/Drawings Attached</p>
                  )}
                </div>

                <div className="form-input-box">
                  <label>Instructions &amp; Forwarding Notes for Project Manager *</label>
                  <textarea
                    rows={4}
                    value={forwardCmNotes}
                    onChange={(e) => setForwardCmNotes(e.target.value)}
                    placeholder="Specify what technical feedback, cost estimates, or soil/site checks the PM should provide..."
                    required
                  />
                </div>

                <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.82rem' }}>
                  This request will be assigned to the Project Manager workspace under "Client Project Requests".
                </small>

                <div className="modal-actions-row" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn-outline-green" onClick={() => { setForwardModalOpen(false); setForwardTarget(null); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-solid-green" disabled={submittingForward}>
                    {submittingForward ? 'Forwarding to PM...' : 'Confirm & Forward to PM'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SEND RESPONSE TO CLIENT MODAL */}
        {clientNotifyModalOpen && clientNotifyTarget && (
          <div className="light-modal-overlay">
            <div className="light-modal-box" style={{ maxWidth: '680px' }}>
              <div className="modal-head-row">
                <div>
                  <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>CLIENT OFFICIAL PROPOSAL DISPATCH</span>
                  <h3 style={{ margin: '0.2rem 0 0' }}>Send Official Response to: {clientNotifyTarget.client?.name}</h3>
                </div>
                <button type="button" onClick={() => { setClientNotifyModalOpen(false); setClientNotifyTarget(null); }}>✕</button>
              </div>

              <form onSubmit={handleSubmitClientNotify} style={{ marginTop: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                  <p style={{ margin: '0 0 0.35rem' }}><strong>Project:</strong> {clientNotifyTarget.title} ({clientNotifyTarget.category})</p>
                  {clientNotifyTarget.pmReply && (
                    <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.85rem', background: '#f5f3ff', borderLeft: '3px solid #7c3aed', borderRadius: '4px' }}>
                      <strong style={{ color: '#6d28d9', fontSize: '0.82rem' }}>PM Engineering Feedback ({clientNotifyTarget.pmRespondedBy}):</strong>
                      <p style={{ margin: '0.2rem 0 0', color: '#4c1d95', fontSize: '0.85rem' }}>{clientNotifyTarget.pmReply}</p>
                      {clientNotifyTarget.pmEstimatedBudget && (
                        <p style={{ margin: '0.3rem 0 0', fontWeight: 600, fontSize: '0.85rem' }}>
                          PM Est. Cost: {formatMoney(clientNotifyTarget.pmEstimatedBudget)} {clientNotifyTarget.pmEstimatedDuration ? `| Duration: ${clientNotifyTarget.pmEstimatedDuration}` : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-input-box">
                  <label>Official Proposal &amp; Response Message *</label>
                  <textarea
                    rows={7}
                    value={clientNotifyMessage}
                    onChange={(e) => setClientNotifyMessage(e.target.value)}
                    placeholder="Compose the official response, quotation, next steps, and site meeting invitation..."
                    required
                  />
                </div>

                <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.82rem' }}>
                  This will update the client portal with the proposal message and send a real-time notification alert to their account.
                </small>

                <div className="modal-actions-row" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn-outline-green" onClick={() => { setClientNotifyModalOpen(false); setClientNotifyTarget(null); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-solid-green" disabled={submittingClientNotify}>
                    {submittingClientNotify ? 'Dispatching Response...' : 'Send Response & Notify Client ✉️'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* APPROVE PROJECT REQUEST MODAL */}
        {approveModalOpen && approveTarget && (
          <div className="light-modal-overlay">
            <div className="light-modal-box" style={{ maxWidth: '520px' }}>
              <div className="modal-head-row">
                <h3 style={{ color: '#166534' }}>✓ Approve Project Request</h3>
                <button type="button" onClick={() => { setApproveModalOpen(false); setApproveTarget(null); }}>✕</button>
              </div>
              <form onSubmit={handleConfirmApprove} style={{ marginTop: '1rem' }}>
                <div className="modal-body-content">
                  <div style={{ background: '#f0fdf4', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 0.35rem', fontWeight: 600, color: '#166534' }}>{approveTarget.title}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#14532d' }}>
                      Client: <strong>{approveTarget.client?.name}</strong> &nbsp;|&nbsp; Category: <strong>{approveTarget.category}</strong>
                    </p>
                  </div>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                    Approving this request authorizes the <strong>Project Manager</strong> to start and initialize the new construction project for this client.
                  </p>
                  <div className="form-input-box">
                    <label>Approval Message / Note for Client &amp; PM (Optional)</label>
                    <textarea
                      rows={3}
                      value={approveNotes}
                      onChange={(e) => setApproveNotes(e.target.value)}
                      placeholder="Enter any confirmation message or notes..."
                    />
                  </div>
                </div>
                <div className="modal-actions-row" style={{ marginTop: '1.25rem' }}>
                  <button type="button" className="btn-outline-green" onClick={() => { setApproveModalOpen(false); setApproveTarget(null); }} disabled={submittingApprove}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-solid-green" disabled={submittingApprove} style={{ background: '#16a34a' }}>
                    {submittingApprove ? 'Approving...' : '✓ Confirm Approval'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REJECT PROJECT REQUEST MODAL */}
        {rejectModalOpen && rejectTarget && (
          <div className="light-modal-overlay">
            <div className="light-modal-box" style={{ maxWidth: '520px' }}>
              <div className="modal-head-row">
                <h3 style={{ color: '#b91c1c' }}>✗ Reject Project Request</h3>
                <button type="button" onClick={() => { setRejectModalOpen(false); setRejectTarget(null); }}>✕</button>
              </div>
              <form onSubmit={handleConfirmReject} style={{ marginTop: '1rem' }}>
                <div className="modal-body-content">
                  <div style={{ background: '#fef2f2', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 0.35rem', fontWeight: 600, color: '#991b1b' }}>{rejectTarget.title}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f1d1d' }}>
                      Client: <strong>{rejectTarget.client?.name}</strong> &nbsp;|&nbsp; Category: <strong>{rejectTarget.category}</strong>
                    </p>
                  </div>
                  <div className="form-input-box">
                    <label>Reason for Rejection *</label>
                    <textarea
                      rows={4}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Please specify why this project request is being rejected..."
                      required
                    />
                  </div>
                </div>
                <div className="modal-actions-row" style={{ marginTop: '1.25rem' }}>
                  <button type="button" className="btn-outline-green" onClick={() => { setRejectModalOpen(false); setRejectTarget(null); }} disabled={submittingReject}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-solid-green" disabled={submittingReject} style={{ background: '#dc2626' }}>
                    {submittingReject ? 'Rejecting...' : '✗ Confirm Rejection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PHOTO PREVIEW MODAL FOR CM */}
        {previewRequestPhotosModal && (
          <div className="light-modal-overlay">
            <div className="light-modal-box" style={{ maxWidth: '750px' }}>
              <div className="modal-head-row">
                <h3>Photos / Drawings — {previewRequestPhotosModal.title}</h3>
                <button type="button" onClick={() => setPreviewRequestPhotosModal(null)}>✕</button>
              </div>
              <div className="modal-body-content" style={{ marginTop: '1rem' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Client: <b>{previewRequestPhotosModal.client?.name}</b> | Category: <b>{previewRequestPhotosModal.category}</b>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                  {(previewRequestPhotosModal.imageUrls || []).map((img, idx) => (
                    <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                      <img src={img} alt={`Drawing ${idx + 1}`} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </a>
                  ))}
                </div>
              </div>
              <div className="modal-actions-row" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-solid-green" onClick={() => setPreviewRequestPhotosModal(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
