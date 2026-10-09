import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  addMilestone,
  assignEmployeeProjects,
  createEmployee,
  createExpense,
  createInquiry,
  createProject,
  createTask,
  deleteExpense,
  deleteInquiry,
  deleteProject,
  formatDate,
  formatMoney,
  getAllEmployees,
  getClients,
  getExpenses,
  getInquiries,
  getProjectManagementSummary,
  getProjects,
  getTasks,
  getForwardedProjectRequests,
  pmReplyProjectRequest,
  sendInquiryMessage,
  startProjectFromRequest,
  submitInquiryDecision,
  updateProject,
  updateTask,
} from '../services/api';
import { downloadFile, exportCsv, generateProjectDetailsPdf } from '../utils/documentDownload';
import InquiryThread from '../components/InquiryThread';

const statuses = ['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

const readImageAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read the selected file.'));
  reader.readAsDataURL(file);
});

const emptyProject = {
  name: '',
  description: '',
  category: '',
  clientId: '',
  location: '',
  startDate: '',
  endDate: '',
  budget: '',
  status: '',
  progressPercentage: '',
  imageUrl: '',
  specifications: '',
  constructionStatus: '',
  priceRange: '',
};

const emptyTask = {
  taskName: '',
  description: '',
  assignedEmployeeId: '',
  startDate: '',
  deadline: '',
  status: '',
};

const emptyMilestone = {
  title: '',
  description: '',
  targetDate: '',
  status: '',
  progressPercentage: '',
};

const emptyExpense = {
  description: '',
  amount: '',
  date: '',
};

const Status = ({ value }) => (
  <span className={`pm-status ${String(value || '').toLowerCase().replaceAll('_', '-')}`}>
    {String(value || '').replaceAll('_', ' ')}
  </span>
);

export default function ProjectManagerDashboard() {
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState({});
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Selected project context for detail segments (Tasks, Milestones, Expenses, Team)
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Direct Client Inquiries (Direct PM-Client Flow)
  const [inquiries, setInquiries] = useState([]);
  const [inquiryFilterStatus, setInquiryFilterStatus] = useState('ALL');
  const [inquiryProjectFilter, setInquiryProjectFilter] = useState('');
  const [inquiryClientFilter, setInquiryClientFilter] = useState('');
  const [inquirySearch, setInquirySearch] = useState('');
  const [pmReplyingInquiryId, setPmReplyingInquiryId] = useState(null);
  const [pmReplyText, setPmReplyText] = useState('');
  const [sendingPmReply, setSendingPmReply] = useState(false);
  const [composeInquiryOpen, setComposeInquiryOpen] = useState(false);
  const [composeInquiryForm, setComposeInquiryForm] = useState({
    clientId: '',
    projectId: '',
    subject: '',
    message: '',
  });
  const [sendingComposeInquiry, setSendingComposeInquiry] = useState(false);

  // Forms
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [milestoneForm, setMilestoneForm] = useState(emptyMilestone);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '', role: '' });
  const [editingProject, setEditingProject] = useState(null);
  const [projectFilterCategory, setProjectFilterCategory] = useState('ALL');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  // Client Assignment state
  const [clientAssignProject, setClientAssignProject] = useState('');
  const [clientAssignClient, setClientAssignClient] = useState('');
  const [savingClientAssign, setSavingClientAssign] = useState(false);

  // Employee Assignment state
  const [selectedEmpForAssign, setSelectedEmpForAssign] = useState(null);
  const [assignedProjectIds, setAssignedProjectIds] = useState([]);
  const [savingEmpAssign, setSavingEmpAssign] = useState(false);

  // Client Custom Project Requests (Forwarded by Client Manager)
  const [forwardedRequests, setForwardedRequests] = useState([]);
  const [pmReplyModalOpen, setPmReplyModalOpen] = useState(false);
  const [pmReplyTarget, setPmReplyTarget] = useState(null);
  const [pmReplyForm, setPmReplyForm] = useState({
    pmReply: '',
    pmEstimatedBudget: '',
    pmEstimatedDuration: '',
  });
  const [submittingPmReply, setSubmittingPmReply] = useState(false);
  const [pmPreviewPhotosModal, setPmPreviewPhotosModal] = useState(null);

  // PM Inquiry Decision State
  const [inquiryDecisionModalOpen, setInquiryDecisionModalOpen] = useState(false);
  const [inquiryDecisionTarget, setInquiryDecisionTarget] = useState(null);
  const [inquiryDecisionForm, setInquiryDecisionForm] = useState({
    decision: 'APPROVED',
    decisionRemarks: '',
    estimatedBudget: '',
    estimatedDuration: '8 - 10 Months',
  });
  const [submittingInquiryDecision, setSubmittingInquiryDecision] = useState(false);

  // Start Project from Approved Request Modal
  const [startProjectModalOpen, setStartProjectModalOpen] = useState(false);
  const [startProjectTarget, setStartProjectTarget] = useState(null);
  const [startProjectForm, setStartProjectForm] = useState({
    name: '',
    description: '',
    category: '',
    location: '',
    budget: '',
    startDate: '',
    endDate: '',
  });
  const [startingProject, setStartingProject] = useState(false);

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      const results = await Promise.allSettled([
        getProjectManagementSummary(),
        getProjects({ realOnly: true }),
        getClients(),
        getAllEmployees(),
        getTasks(),
        getExpenses(),
        getForwardedProjectRequests(),
        getInquiries(),
      ]);

      const [sumRes, projRes, clientRes, empRes, taskRes, expRes, reqRes, inqRes] = results;
      const nextSummary = sumRes.status === 'fulfilled' ? sumRes.value : {};
      const nextProjects = projRes.status === 'fulfilled' ? projRes.value || [] : [];
      const nextClients = clientRes.status === 'fulfilled' ? clientRes.value || [] : [];
      const nextEmployees = empRes.status === 'fulfilled' ? empRes.value || [] : [];
      const nextTasks = taskRes.status === 'fulfilled' ? taskRes.value || [] : [];
      const nextExpenses = expRes.status === 'fulfilled' ? expRes.value || [] : [];
      const nextRequests = reqRes.status === 'fulfilled' ? reqRes.value || [] : [];
      const nextInquiries = inqRes.status === 'fulfilled' ? inqRes.value || [] : [];

      setSummary(nextSummary || {});
      setProjects(nextProjects);
      setClients(nextClients);
      setEmployees(nextEmployees);
      setTasks(nextTasks);
      setExpenses(nextExpenses);
      setForwardedRequests(nextRequests);
      setInquiries(nextInquiries);

      if (!selectedProjectId && nextProjects.length > 0) {
        setSelectedProjectId(String(nextProjects[0].id));
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load project management data.');
    }
  };

  const handleOpenPmReplyModal = (request) => {
    setPmReplyTarget(request);
    setPmReplyForm({
      pmReply: request.pmReply || '',
      pmEstimatedBudget: request.pmEstimatedBudget ? String(request.pmEstimatedBudget) : (request.expectedBudget ? String(request.expectedBudget) : ''),
      pmEstimatedDuration: request.pmEstimatedDuration || '8 - 10 Months',
    });
    setPmReplyModalOpen(true);
  };

  const handleSubmitPmReply = async (e) => {
    e.preventDefault();
    if (!pmReplyTarget || !pmReplyForm.pmReply.trim()) return;
    setSubmittingPmReply(true);
    setError('');
    try {
      await pmReplyProjectRequest(pmReplyTarget.id, {
        pmReply: pmReplyForm.pmReply.trim(),
        pmEstimatedBudget: pmReplyForm.pmEstimatedBudget ? Number(pmReplyForm.pmEstimatedBudget) : null,
        pmEstimatedDuration: pmReplyForm.pmEstimatedDuration.trim() || null,
        pmRespondedBy: 'Project Manager',
      });
      setNotice(`Engineering assessment & reply submitted for "${pmReplyTarget.title}". Transmitted to Client Manager.`);
      setPmReplyModalOpen(false);
      setPmReplyTarget(null);
      await refresh();
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to submit PM reply');
    } finally {
      setSubmittingPmReply(false);
    }
  };

  const handleOpenInquiryDecisionModal = (inquiry, defaultDecision = 'APPROVED') => {
    setInquiryDecisionTarget(inquiry);
    const existingRemarks = inquiry.pmDecisionRemarks || (defaultDecision === 'APPROVED' 
      ? 'Structural & engineering feasibility verified. Specifications, site requirements, and architectural scope meet Odiliya standards.'
      : 'Site parameters or design constraints currently incompatible with engineering requirements.');
    setInquiryDecisionForm({
      decision: defaultDecision,
      decisionRemarks: existingRemarks,
      estimatedBudget: inquiry.pmEstimatedBudget ? String(inquiry.pmEstimatedBudget) : (inquiry.project?.budget ? String(inquiry.project.budget) : '15000000'),
      estimatedDuration: inquiry.pmEstimatedDuration || '8 - 10 Months',
    });
    setInquiryDecisionModalOpen(true);
  };

  const handleSubmitInquiryDecision = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (!inquiryDecisionTarget) return;
    setSubmittingInquiryDecision(true);
    try {
      const dec = inquiryDecisionForm.decision || 'APPROVED';
      const defaultRemarks = dec === 'APPROVED'
        ? 'Structural & engineering feasibility verified. Specifications, site requirements, and architectural scope meet Odiliya standards.'
        : 'Site parameters or design constraints currently incompatible with engineering requirements.';
      const remarks = (inquiryDecisionForm.decisionRemarks || '').trim() || defaultRemarks;
      const budgetVal = dec === 'APPROVED' && inquiryDecisionForm.estimatedBudget ? Number(inquiryDecisionForm.estimatedBudget) : null;
      const durationVal = dec === 'APPROVED' ? (inquiryDecisionForm.estimatedDuration || '8 - 10 Months').trim() : '';

      const payload = {
        decision: dec,
        decisionRemarks: remarks,
        estimatedBudget: budgetVal,
        estimatedDuration: durationVal,
        decidedBy: 'Project Manager',
      };

      const updatedInq = await submitInquiryDecision(inquiryDecisionTarget.id, payload);

      setInquiries((prev) =>
        prev.map((item) =>
          item.id === inquiryDecisionTarget.id
            ? {
                ...item,
                pmDecision: dec,
                pmDecisionDate: new Date().toISOString(),
                pmDecisionRemarks: remarks,
                pmEstimatedBudget: budgetVal,
                pmEstimatedDuration: durationVal,
                status: dec,
                ...(updatedInq && typeof updatedInq === 'object' ? updatedInq : {}),
              }
            : item
        )
      );

      try {
        localStorage.setItem('odiliya-inquiries-timestamp', String(Date.now()));
        window.dispatchEvent(new CustomEvent('odiliya-inquiry-replied', { detail: inquiryDecisionTarget.id }));
      } catch (_) {}

      report(`Technical feasibility decision [${dec}] registered for "${inquiryDecisionTarget.subject}". Transmitted to Client Manager.`);
      setInquiryDecisionModalOpen(false);
      setInquiryDecisionTarget(null);
      await refresh();
    } catch (err) {
      fail(err);
    } finally {
      setSubmittingInquiryDecision(false);
    }
  };

  const handleOpenStartProjectModal = (request) => {
    setStartProjectTarget(request);
    const budgetVal = request.pmEstimatedBudget || request.expectedBudget || 1000000;
    const startVal = request.targetStartDate ? request.targetStartDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
    setStartProjectForm({
      name: request.title,
      description: request.description || '',
      category: request.category || 'RESIDENCIES',
      location: request.location || '',
      budget: String(budgetVal),
      startDate: startVal,
      endDate: '',
    });
    setStartProjectModalOpen(true);
  };

  const handleConfirmStartProject = async (e) => {
    e.preventDefault();
    if (!startProjectTarget) return;
    setStartingProject(true);
    setError('');
    try {
      const payload = {
        name: startProjectForm.name.trim(),
        description: startProjectForm.description.trim(),
        category: startProjectForm.category,
        location: startProjectForm.location.trim(),
        budget: Number(startProjectForm.budget) || 1000000,
        startDate: startProjectForm.startDate,
        endDate: startProjectForm.endDate || null,
        status: 'IN_PROGRESS',
        imageUrls: startProjectTarget.imageUrls || [],
      };
      const createdProj = await startProjectFromRequest(startProjectTarget.id, payload, 'Project Manager');
      setNotice(`Project "${startProjectForm.name}" successfully started and assigned to client ${startProjectTarget.client?.name}!`);
      setStartProjectModalOpen(false);
      setStartProjectTarget(null);
      await refresh();
      if (createdProj && createdProj.id) {
        setSelectedProjectId(String(createdProj.id));
      }
      setTab('projects');
      setTimeout(() => setNotice(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to start and assign project');
    } finally {
      setStartingProject(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (selectedEmpForAssign && employees.length > 0) {
      const updated = employees.find((e) => e.id === selectedEmpForAssign.id);
      if (updated) {
        setSelectedEmpForAssign(updated);
      }
    }
  }, [employees]);

  const spentByProject = useMemo(() => {
    return expenses.reduce((totals, expense) => {
      const pid = expense.project?.id;
      if (pid) {
        totals[pid] = (totals[pid] || 0) + Number(expense.amount || 0);
      }
      return totals;
    }, {});
  }, [expenses]);

  const report = (message) => {
    setNotice(message);
    setError('');
  };

  const fail = (err) => {
    setError(err.message || 'Unable to save changes.');
    setNotice('');
  };

  const activeProject = projects.find((p) => String(p.id) === String(selectedProjectId)) || projects[0];

  const projectTasks = tasks.filter((task) => String(task.project?.id) === String(activeProject?.id));
  const projectExpenses = expenses.filter((expense) => String(expense.project?.id) === String(activeProject?.id));
  const projectEmployees = employees.filter((emp) => {
    if (emp.project && String(emp.project.id) === String(activeProject?.id)) return true;
    if (emp.assignedProjects && emp.assignedProjects.some((p) => String(p.id) === String(activeProject?.id))) return true;
    return false;
  });

  const startProject = () => {
    setEditingProject(null);
    setProjectForm(emptyProject);
    setTab('projects');
  };

  const editProject = (project) => {
    setEditingProject(project);
    setProjectForm({
      ...emptyProject,
      ...project,
      clientId: project.client?.id || '',
      imageUrl: project.imageUrl || '',
      specifications: project.specifications || '',
      constructionStatus: project.constructionStatus || '',
      priceRange: project.priceRange || '',
    });
    setSelectedProjectId(String(project.id));
    setTab('projects');
  };

  const saveProject = async (event) => {
    event.preventDefault();
    const payload = {
      ...projectForm,
      budget: Number(projectForm.budget || 0),
      progressPercentage: Number(projectForm.progressPercentage || 0),
      marketingDesign: false,
      addedBy: editingProject?.addedBy || 'PROJECT_MANAGER',
      client: projectForm.clientId ? { id: Number(projectForm.clientId) } : null,
    };
    delete payload.clientId;

    try {
      const saved = editingProject
        ? await updateProject(editingProject.id, payload)
        : await createProject(payload);
      setEditingProject(saved);
      setSelectedProjectId(String(saved.id));
      setProjectForm({ ...saved, clientId: saved.client?.id || '' });
      report(editingProject ? 'Project updated successfully.' : 'Project created successfully.');
      await refresh();
    } catch (err) {
      fail(err);
    }
  };

  const removeProject = async () => {
    if (!editingProject || !window.confirm(`Delete "${editingProject.name}" and all related project records?`)) return;
    try {
      await deleteProject(editingProject.id);
      startProject();
      report('Project and its related records deleted.');
      await refresh();
    } catch (err) {
      fail(err);
    }
  };

  const handleAssignClient = async (e) => {
    e.preventDefault();
    if (!clientAssignProject) {
      fail(new Error('Please select a project to assign.'));
      return;
    }
    try {
      setSavingClientAssign(true);
      const targetProj = projects.find((p) => String(p.id) === String(clientAssignProject));
      if (!targetProj) throw new Error('Selected project not found.');

      const clientObj = clientAssignClient ? { id: Number(clientAssignClient) } : null;
      await updateProject(targetProj.id, {
        ...targetProj,
        client: clientObj,
      });

      const assignedClientName = clients.find((c) => String(c.id) === String(clientAssignClient))?.name || 'No Client';
      report(`Assigned ${assignedClientName} to ${targetProj.name}.`);
      await refresh();
    } catch (err) {
      fail(err);
    } finally {
      setSavingClientAssign(false);
    }
  };

  const openEmpAssignment = (emp) => {
    setSelectedEmpForAssign(emp);
    const pids = emp.assignedProjects ? emp.assignedProjects.map((p) => p.id) : [];
    if (emp.project?.id && !pids.includes(emp.project.id)) {
      pids.push(emp.project.id);
    }
    setAssignedProjectIds(pids);
  };

  const toggleProjectForEmp = (pid) => {
    setAssignedProjectIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const saveEmpAssignments = async (e) => {
    if (e) e.preventDefault();
    if (!selectedEmpForAssign) return;
    try {
      setSavingEmpAssign(true);
      const savedEmp = await assignEmployeeProjects(selectedEmpForAssign.id, assignedProjectIds);
      await refresh();
      const savedIds = savedEmp.assignedProjects ? savedEmp.assignedProjects.map((p) => p.id) : [];
      setSelectedEmpForAssign(savedEmp);
      setAssignedProjectIds(savedIds);
      report(`Project assignments for ${savedEmp.name} saved successfully.`);
    } catch (err) {
      fail(err);
    } finally {
      setSavingEmpAssign(false);
    }
  };

  const saveTask = async (event) => {
    event.preventDefault();
    if (!activeProject) {
      fail(new Error('Please select a project first.'));
      return;
    }
    try {
      await createTask({
        ...taskForm,
        project: { id: activeProject.id },
        assignedEmployee: taskForm.assignedEmployeeId ? { id: Number(taskForm.assignedEmployeeId) } : null,
      });
      setTaskForm(emptyTask);
      report(`Task assigned to project ${activeProject.name}.`);
      await refresh();
    } catch (err) {
      fail(err);
    }
  };

  const completeTask = async (task) => {
    try {
      await updateTask(task.id, {
        ...task,
        status: 'COMPLETED',
        project: { id: task.project.id },
        assignedEmployee: task.assignedEmployee ? { id: task.assignedEmployee.id } : null,
      });
      report('Task marked as completed.');
      await refresh();
    } catch (err) {
      fail(err);
    }
  };

  const saveMilestone = async (event) => {
    event.preventDefault();
    if (!activeProject) {
      fail(new Error('Please select a project first.'));
      return;
    }
    try {
      await addMilestone(activeProject.id, {
        ...milestoneForm,
        progressPercentage: Number(milestoneForm.progressPercentage || 0),
      });
      setMilestoneForm(emptyMilestone);
      report(`Milestone added to ${activeProject.name}.`);
      await refresh();
    } catch (err) {
      fail(err);
    }
  };

  const saveExpense = async (event) => {
    event.preventDefault();
    if (!activeProject) {
      fail(new Error('Please select a project first.'));
      return;
    }
    try {
      await createExpense({
        ...expenseForm,
        amount: Number(expenseForm.amount),
        project: { id: activeProject.id },
      });
      setExpenseForm(emptyExpense);
      report(`Expense recorded for ${activeProject.name}.`);
      await refresh();
    } catch (err) {
      fail(err);
    }
  };

  const removeExpense = async (id) => {
    try {
      await deleteExpense(id);
      report('Expense removed.');
      await refresh();
    } catch (err) {
      fail(err);
    }
  };

  const saveEmployee = async (event) => {
    event.preventDefault();
    if (!activeProject) {
      fail(new Error('Please select a project first.'));
      return;
    }
    try {
      await createEmployee({
        ...employeeForm,
        project: { id: activeProject.id },
      });
      setEmployeeForm({ name: '', email: '', role: '' });
      report(`Employee added to ${activeProject.name} team.`);
      await refresh();
    } catch (err) {
      fail(err);
    }
  };

  const handlePmReplyInquiry = async (e, inquiryId, text) => {
    if (e) e.preventDefault();
    if (!text || !text.trim()) return;
    setSendingPmReply(true);
    try {
      await sendInquiryMessage(inquiryId, {
        senderRole: 'PROJECT_MANAGER',
        senderName: 'Project Manager',
        message: text.trim(),
      });
      report('Reply sent directly to client.');
      setPmReplyingInquiryId(null);
      setPmReplyText('');
      await refresh();
    } catch (err) {
      fail(err);
    } finally {
      setSendingPmReply(false);
    }
  };

  const handleSendComposeInquiry = async (e) => {
    e.preventDefault();
    if (!composeInquiryForm.clientId) {
      fail(new Error('Please select a client to send the inquiry to.'));
      return;
    }
    if (!composeInquiryForm.subject.trim() || !composeInquiryForm.message.trim()) {
      fail(new Error('Please provide both subject and message.'));
      return;
    }
    setSendingComposeInquiry(true);
    try {
      await createInquiry({
        client: { id: Number(composeInquiryForm.clientId) },
        project: composeInquiryForm.projectId ? { id: Number(composeInquiryForm.projectId) } : null,
        subject: composeInquiryForm.subject.trim(),
        message: composeInquiryForm.message.trim(),
        initiatedBy: 'PROJECT_MANAGER',
      });
      report('Inquiry sent directly to client.');
      setComposeInquiryOpen(false);
      setComposeInquiryForm({ clientId: '', projectId: '', subject: '', message: '' });
      await refresh();
    } catch (err) {
      fail(err);
    } finally {
      setSendingComposeInquiry(false);
    }
  };

  const handleDeleteInquiry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inquiry thread?')) return;
    try {
      await deleteInquiry(id);
      report('Inquiry removed.');
      await refresh();
    } catch (err) {
      fail(err);
    }
  };

  const handleDownloadProjectPdf = async (proj = activeProject) => {
    if (!proj) {
      fail(new Error('Please select a project to download the PDF report.'));
      return;
    }
    try {
      report(`Generating professional PDF dossier for "${proj.name}"...`);
      const projTasks = tasks.filter((t) => t.project?.id === proj.id);
      const projMilestones = proj.milestones || [];
      const projExpenses = expenses.filter((e) => e.project?.id === proj.id);
      const projEmployees = employees.filter((emp) =>
        emp.project?.id === proj.id ||
        (emp.assignedProjects && emp.assignedProjects.some((p) => p.id === proj.id))
      );
      const projSpent = spentByProject[proj.id] || 0;

      await generateProjectDetailsPdf(proj, {
        client: proj.client || clients.find((c) => c.id === proj.clientId),
        tasks: projTasks,
        milestones: projMilestones,
        expenses: projExpenses,
        employees: projEmployees,
        spent: projSpent,
        pmName: 'Project Manager (Operations & Civil Engineering)',
      });
      report(`Project dossier for "${proj.name}" downloaded successfully.`);
    } catch (err) {
      fail(err);
    }
  };

  const ProjectSelector = () => (
    <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label htmlFor="pm-project-select" style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>
          Active Project:
        </label>
        <select
          id="pm-project-select"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', background: '#fff', fontWeight: 600, color: '#0f172a', minWidth: '220px' }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.status})
            </option>
          ))}
        </select>
      </div>

      {activeProject && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: '#64748b' }}>
            <span>Client: <strong style={{ color: '#0f172a' }}>{activeProject.client?.name || 'In-House'}</strong></span>
            <span>·</span>
            <span>Budget: <strong style={{ color: '#047857' }}>{formatMoney(activeProject.budget)}</strong></span>
            <span>·</span>
            <span>Progress: <strong style={{ color: '#0284c7' }}>{activeProject.progressPercentage || 0}%</strong></span>
          </div>

          <button
            type="button"
            onClick={() => handleDownloadProjectPdf(activeProject)}
            style={{
              padding: '6px 14px',
              background: '#047857',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              whiteSpace: 'nowrap',
            }}
            title="Download executive project details PDF with images, milestones & tasks"
          >
            <span>📥</span> Download Project PDF (with Images)
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="light-site-wrapper">
      <Navbar />
      <main className="pm-page">
        <section className="pm-hero">
          <div>
            <span className="brand-green-subtitle">OPERATIONS CONTROL</span>
            <h1>Project Manager Workspace</h1>
            <p>Plan projects, coordinate teams, assign clients and employees, and keep every milestone visible.</p>
          </div>
        </section>

        {/* Full Sidebar Navigation matching all requirements */}
        <nav className="pm-tabs">
          <button onClick={() => setTab('overview')} className={tab === 'overview' ? 'active' : ''}>
            Overview
          </button>
          <button onClick={() => setTab('inquiries')} className={tab === 'inquiries' ? 'active' : ''}>
            Client Inquiries {inquiries.length > 0 ? `(${inquiries.filter((i) => i.status === 'PENDING').length > 0 ? `${inquiries.length} · ${inquiries.filter((i) => i.status === 'PENDING').length} Unread` : inquiries.length})` : ''}
          </button>
          <button onClick={() => setTab('requests')} className={tab === 'requests' ? 'active' : ''}>
            Client Requests ({forwardedRequests.filter((r) => r.status === 'FORWARDED_TO_PM').length > 0 ? `${forwardedRequests.length} (${forwardedRequests.filter((r) => r.status === 'FORWARDED_TO_PM').length} Pending)` : forwardedRequests.length})
          </button>
          <button onClick={startProject} className={tab === 'projects' ? 'active' : ''}>
            Projects
          </button>
          <button onClick={() => setTab('assignments')} className={tab === 'assignments' ? 'active' : ''}>
            Assign Employees
          </button>
          <button onClick={() => setTab('tasks')} className={tab === 'tasks' ? 'active' : ''}>
            Tasks &amp; Assignments
          </button>
          <button onClick={() => setTab('milestones')} className={tab === 'milestones' ? 'active' : ''}>
            Milestones
          </button>
          <button onClick={() => setTab('budget')} className={tab === 'budget' ? 'active' : ''}>
            Budget &amp; Expenses
          </button>
          <button onClick={() => setTab('team')} className={tab === 'team' ? 'active' : ''}>
            Project Team
          </button>
          <button onClick={() => setTab('documents')} className={tab === 'documents' ? 'active' : ''}>
            Documents & Blueprints
          </button>
        </nav>

        {notice && <div className="pm-alert success">{notice}</div>}
        {error && <div className="pm-alert error">{error}</div>}

        {/* TAB 1: OVERVIEW */}
        {tab === 'overview' && (
          <>
            <section className="pm-metrics">
              <Metric label="Projects created" value={summary.projectCount ?? projects.length} />
              <Metric label="Team tasks" value={summary.taskCount ?? tasks.length} />
              <Metric label="Tasks completed" value={summary.completedTaskCount ?? tasks.filter((t) => t.status === 'COMPLETED').length} />
              <Metric label="Budget remaining" value={formatMoney(summary.remainingBudget)} />
            </section>
            <section className="pm-card">
              <div className="pm-card-heading">
                <div>
                  <h2>All Construction Projects</h2>
                  <p>Comprehensive overview of every project created in your workspace.</p>
                </div>
              </div>
              <ProjectTable
                projects={projects}
                spentByProject={spentByProject}
                onEdit={editProject}
                onDownloadPdf={handleDownloadProjectPdf}
                emptyMessage="No projects yet. Open Projects to create your first project."
              />
            </section>
          </>
        )}

        {/* TAB: CLIENT INQUIRIES (Direct PM-Client Communication) */}
        {tab === 'inquiries' && (() => {
          const filteredInquiries = inquiries.filter((inq) => {
            if (inquiryFilterStatus === 'PENDING' && inq.status !== 'PENDING') return false;
            if (inquiryFilterStatus === 'ANSWERED' && inq.status !== 'ANSWERED') return false;
            if (inquiryClientFilter && String(inq.client?.id) !== String(inquiryClientFilter)) return false;
            if (inquiryProjectFilter && String(inq.project?.id) !== String(inquiryProjectFilter)) return false;
            if (inquirySearch) {
              const q = inquirySearch.toLowerCase();
              const subjectMatch = inq.subject?.toLowerCase().includes(q);
              const messageMatch = inq.message?.toLowerCase().includes(q);
              const clientMatch = inq.client?.name?.toLowerCase().includes(q) || inq.client?.email?.toLowerCase().includes(q);
              const projectMatch = inq.project?.name?.toLowerCase().includes(q);
              if (!subjectMatch && !messageMatch && !clientMatch && !projectMatch) return false;
            }
            return true;
          });

          return (
            <section className="pm-card">
              <div className="pm-card-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2>Direct Client Inquiries &amp; Communications</h2>
                  <p>Real-time direct engineering inquiries between property owners, prospective clients, and Project Management.</p>
                </div>
                <button
                  type="button"
                  className="pm-btn primary"
                  style={{ background: '#047857', borderColor: '#047857', padding: '0.6rem 1.25rem', fontSize: '0.88rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setComposeInquiryForm({ clientId: '', projectId: '', subject: '', message: '' });
                    setComposeInquiryOpen(true);
                  }}
                >
                  ✉️ Compose Inquiry to Client
                </button>
              </div>

              {/* Status & Search Filter Bar */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', margin: '1rem 0 1.5rem', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: inquiryFilterStatus === 'ALL' ? '#047857' : '#e2e8f0',
                      color: inquiryFilterStatus === 'ALL' ? '#ffffff' : '#475569',
                    }}
                    onClick={() => setInquiryFilterStatus('ALL')}
                  >
                    All ({inquiries.length})
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: inquiryFilterStatus === 'PENDING' ? '#b45309' : '#e2e8f0',
                      color: inquiryFilterStatus === 'PENDING' ? '#ffffff' : '#475569',
                    }}
                    onClick={() => setInquiryFilterStatus('PENDING')}
                  >
                    Awaiting PM ({inquiries.filter((i) => i.status === 'PENDING').length})
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: inquiryFilterStatus === 'ANSWERED' ? '#166534' : '#e2e8f0',
                      color: inquiryFilterStatus === 'ANSWERED' ? '#ffffff' : '#475569',
                    }}
                    onClick={() => setInquiryFilterStatus('ANSWERED')}
                  >
                    Answered ({inquiries.filter((i) => i.status === 'ANSWERED').length})
                  </button>
                </div>

                <div style={{ flex: 1, minWidth: '180px' }}>
                  <input
                    type="text"
                    placeholder="Search subject, client, or message..."
                    value={inquirySearch}
                    onChange={(e) => setInquirySearch(e.target.value)}
                    style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>

                <div style={{ minWidth: '170px' }}>
                  <select
                    value={inquiryClientFilter}
                    onChange={(e) => setInquiryClientFilter(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff' }}
                  >
                    <option value="">-- All Clients --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ minWidth: '170px' }}>
                  <select
                    value={inquiryProjectFilter}
                    onChange={(e) => setInquiryProjectFilter(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff' }}
                  >
                    <option value="">-- All Projects --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inquiry List */}
              {filteredInquiries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <h3>No Inquiries Found</h3>
                  <p>When clients send questions or inquiries, they will arrive here directly for you to review and answer.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {filteredInquiries.map((inq) => {
                    const isPending = inq.status === 'PENDING';
                    const isReplying = pmReplyingInquiryId === inq.id;
                    const isClientInitiated = inq.initiatedBy === 'CLIENT';

                    return (
                      <div
                        key={inq.id}
                        style={{
                          background: '#ffffff',
                          border: isPending ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '1.35rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                        }}
                      >
                        {/* Header Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{inq.subject}</strong>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  background: isPending ? '#fef3c7' : '#dcfce7',
                                  color: isPending ? '#b45309' : '#166534',
                                  border: `1px solid ${isPending ? '#fde68a' : '#bbf7d0'}`,
                                }}
                              >
                                {isPending ? 'Action Needed (Awaiting Your Reply)' : 'Answered / In Discussion'}
                              </span>
                            </div>

                            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                              Client: <strong style={{ color: '#0f172a' }}>{inq.client?.name || 'Client'}</strong> ({inq.client?.email || 'N/A'}{inq.client?.phone ? `, ${inq.client.phone}` : ''}) &nbsp;•&nbsp;
                              Started {formatDate(inq.createdAt)} {isClientInitiated ? 'by Client' : 'by You'}
                              {inq.project && (
                                <span style={{ marginLeft: '6px', color: '#0369a1', fontWeight: 600 }}>
                                  · Project: {inq.project.name}
                                </span>
                              )}
                              {inq.design && (
                                <span style={{ marginLeft: '6px', color: '#7c3aed', fontWeight: 600 }}>
                                  · Design Model: {inq.design.name}
                                </span>
                              )}
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteInquiry(inq.id)}
                              style={{ padding: '4px 10px', background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                              title="Delete inquiry thread"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Thread View */}
                        <div style={{ marginTop: '0.75rem' }}>
                          <InquiryThread inquiry={inq} viewerRole="PROJECT_MANAGER" />
                        </div>

                        {/* Technical Feasibility & PM Decision Box */}
                        <div style={{
                          marginTop: '0.85rem',
                          padding: '1rem',
                          background: inq.pmDecision === 'APPROVED' ? '#f0fdf4' : inq.pmDecision === 'REJECTED' ? '#fef2f2' : '#fffbeb',
                          borderRadius: '8px',
                          border: `1.5px solid ${inq.pmDecision === 'APPROVED' ? '#86efac' : inq.pmDecision === 'REJECTED' ? '#fca5a5' : '#fde68a'}`,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  background: inq.pmDecision === 'APPROVED' ? '#dcfce7' : inq.pmDecision === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                                  color: inq.pmDecision === 'APPROVED' ? '#166534' : inq.pmDecision === 'REJECTED' ? '#991b1b' : '#b45309',
                                }}>
                                  {inq.pmDecision === 'APPROVED' ? '✓ FEASIBILITY APPROVED' : inq.pmDecision === 'REJECTED' ? '✕ FEASIBILITY REJECTED' : '⏳ TECHNICAL DECISION PENDING'}
                                </span>
                                {inq.contractGenerated && (
                                  <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#e0e7ff', color: '#3730a3' }}>
                                    📝 Contract Agreement Linked
                                  </span>
                                )}
                              </div>
                              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#475569' }}>
                                {inq.pmDecision === 'APPROVED'
                                  ? 'Technical assessment passed. Transmitted to Client Manager to draft and sign contract agreement with client.'
                                  : inq.pmDecision === 'REJECTED'
                                  ? 'Project scope rejected by Project Manager. Client and Client Manager notified.'
                                  : 'Review engineering requirements and record official PM decision (Approve or Reject).'}
                              </p>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {inq.pmDecision === 'APPROVED' ? (
                                <span
                                  style={{
                                    padding: '6px 14px',
                                    background: '#dcfce7',
                                    color: '#166534',
                                    border: '1px solid #86efac',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  ✓ Feasibility Approved &amp; Transmitted
                                </span>
                              ) : inq.pmDecision === 'REJECTED' ? (
                                <span
                                  style={{
                                    padding: '6px 14px',
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  ✕ Feasibility Rejected
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenInquiryDecisionModal(inq, 'APPROVED')}
                                    style={{
                                      padding: '6px 14px',
                                      background: '#16a34a',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontWeight: 700,
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <span>✓</span> Approve Feasibility
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenInquiryDecisionModal(inq, 'REJECTED')}
                                    style={{
                                      padding: '6px 14px',
                                      background: '#ffffff',
                                      color: '#dc2626',
                                      border: '1px solid #f87171',
                                      borderRadius: '6px',
                                      fontWeight: 700,
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <span>✕</span> Reject Inquiry
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {inq.pmDecisionRemarks && (
                            <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(255,255,255,0.7)', borderRadius: '6px', fontSize: '0.82rem', color: '#1e293b' }}>
                              <strong>PM Technical Remarks:</strong> {inq.pmDecisionRemarks}
                            </div>
                          )}

                          {(inq.pmEstimatedBudget || inq.pmEstimatedDuration) && (
                            <div style={{ marginTop: '6px', display: 'flex', gap: '16px', fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                              {inq.pmEstimatedBudget && <span>💰 Estimated Cost: {formatMoney(inq.pmEstimatedBudget)}</span>}
                              {inq.pmEstimatedDuration && <span>⏱ Duration: {inq.pmEstimatedDuration}</span>}
                            </div>
                          )}
                        </div>

                        {inq.attachmentData && (
                          <div style={{ margin: '0.5rem 0' }}>
                            <a href={inq.attachmentData} download={inq.attachmentName || 'client-attachment'} className="pm-btn secondary" style={{ display: 'inline-flex', fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
                              📎 View Attached File: {inq.attachmentName || 'Attachment'}
                            </a>
                          </div>
                        )}

                        {/* Quick Response Section */}
                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '6px' }}>
                            <label style={{ fontWeight: 700, fontSize: '0.84rem', color: '#047857' }}>
                              Direct Reply to Client:
                            </label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: '#e2e8f0', border: 'none', cursor: 'pointer', color: '#334155' }}
                                onClick={() => {
                                  setPmReplyingInquiryId(inq.id);
                                  setPmReplyText('We have reviewed your inquiry and our site engineering team is verifying the structural specifications.');
                                }}
                              >
                                Template: Reviewing specs
                              </button>
                              <button
                                type="button"
                                style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: '#e2e8f0', border: 'none', cursor: 'pointer', color: '#334155' }}
                                onClick={() => {
                                  setPmReplyingInquiryId(inq.id);
                                  setPmReplyText('Thank you for reaching out. We will inspect the site progress and provide updated photos and milestone status shortly.');
                                }}
                              >
                                Template: Site inspection
                              </button>
                              <button
                                type="button"
                                style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: '#e2e8f0', border: 'none', cursor: 'pointer', color: '#334155' }}
                                onClick={() => {
                                  setPmReplyingInquiryId(inq.id);
                                  setPmReplyText('We have scheduled the on-site technical consultation for your project as requested.');
                                }}
                              >
                                Template: Consultation scheduled
                              </button>
                            </div>
                          </div>

                          <textarea
                            rows={3}
                            placeholder="Type your response directly to the client..."
                            value={isReplying ? pmReplyText : ''}
                            onFocus={() => {
                              if (pmReplyingInquiryId !== inq.id) {
                                setPmReplyingInquiryId(inq.id);
                                setPmReplyText('');
                              }
                            }}
                            onChange={(e) => {
                              setPmReplyingInquiryId(inq.id);
                              setPmReplyText(e.target.value);
                            }}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                          />

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.6rem', gap: '8px' }}>
                            {isReplying && pmReplyText && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPmReplyingInquiryId(null);
                                  setPmReplyText('');
                                }}
                                style={{ padding: '6px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', cursor: 'pointer' }}
                              >
                                Clear
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={sendingPmReply || !isReplying || !pmReplyText.trim()}
                              onClick={(e) => handlePmReplyInquiry(e, inq.id, pmReplyText)}
                              style={{
                                padding: '6px 18px',
                                background: isReplying && pmReplyText.trim() ? '#047857' : '#9ca3af',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                cursor: isReplying && pmReplyText.trim() ? 'pointer' : 'not-allowed',
                              }}
                            >
                              {sendingPmReply && isReplying ? 'Sending Reply...' : 'Send Reply Directly to Client'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })()}

        {/* TAB: CLIENT PROJECT REQUESTS (Forwarded by Client Manager) */}
        {tab === 'requests' && (
          <section className="pm-card">
            <div className="pm-card-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2>Client Custom Project Requests</h2>
                <p>Engineering feasibility reviews and assessments requested by Client Management.</p>
              </div>
              <span className="pill-badge active" style={{ fontSize: '0.85rem' }}>
                {forwardedRequests.filter((r) => r.status === 'FORWARDED_TO_PM').length} Pending Technical Review
              </span>
            </div>

            {forwardedRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                
                <h3>No Client Requests Forwarded</h3>
                <p>When the Client Manager forwards custom design requests, they will appear here for engineering assessment.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                {forwardedRequests.map((req) => {
                  const isAwaitingPm = req.status === 'FORWARDED_TO_PM';
                  const isPmReviewed = req.status === 'PM_REVIEWED';
                  const isClientNotified = req.status === 'CLIENT_NOTIFIED';
                  const isApproved = req.status === 'APPROVED';
                  const isRejected = req.status === 'REJECTED';
                  const isStarted = req.status === 'PROJECT_STARTED';

                  return (
                    <div
                      key={req.id}
                      style={{
                        background: '#ffffff',
                        border: isStarted
                          ? '2px solid #10b981'
                          : isApproved
                          ? '2px solid #16a34a'
                          : isAwaitingPm
                          ? '2px solid #f59e0b'
                          : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1.35rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      }}
                    >
                      {/* Top Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {req.category} &nbsp;•&nbsp; Client: {req.client?.name || 'Valued Client'} ({req.client?.email || 'N/A'}, {req.client?.phone || 'N/A'})
                          </span>
                          <h3 style={{ margin: '0.2rem 0', color: '#0f172a', fontSize: '1.25rem' }}>{req.title}</h3>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                            Location: <strong>{req.location || 'N/A'}</strong> &nbsp;|&nbsp; Target Start: <strong>{req.targetStartDate ? formatDate(req.targetStartDate) : 'Flexible'}</strong>
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {isAwaitingPm && (
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.82rem' }}>
                              Action Needed (Reply to CM)
                            </span>
                          )}
                          {isPmReviewed && (
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', background: '#eff6ff', color: '#1e40af', fontWeight: 600, fontSize: '0.82rem' }}>
                              Engineering Review Submitted
                            </span>
                          )}
                          {isClientNotified && (
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', background: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: '0.82rem' }}>
                              Client Notified by CM
                            </span>
                          )}
                          {isApproved && (
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.82rem' }}>
                              Approved by Client Manager — Ready to Start
                            </span>
                          )}
                          {isStarted && (
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', background: '#ecfdf5', color: '#047857', border: '1px solid #10b981', fontWeight: 700, fontSize: '0.82rem' }}>
                              Project Started (ID #{req.startedProjectId})
                            </span>
                          )}
                          {isRejected && (
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: '0.82rem' }}>
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Budget & Specs Strip */}
                      <div style={{ display: 'flex', gap: '1.5rem', margin: '0.9rem 0', flexWrap: 'wrap', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                        <div>
                          <small style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Client Expected Budget</small>
                          <strong style={{ color: 'var(--brand-green)', fontSize: '1.05rem' }}>
                            {req.expectedBudget ? formatMoney(req.expectedBudget) : 'Custom Quote'}
                          </strong>
                        </div>
                        {req.specifications && (
                          <div style={{ flex: 1, minWidth: '220px' }}>
                            <small style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Specifications</small>
                            <span style={{ color: '#334155', fontSize: '0.9rem' }}>{req.specifications}</span>
                          </div>
                        )}
                      </div>

                      <p style={{ margin: '0.5rem 0', color: '#334155', fontSize: '0.92rem', lineHeight: 1.5 }}>
                        <strong>Client Requirements:</strong> {req.description}
                      </p>

                      {/* Attached Blueprints & Drawings */}
                      {req.imageUrls && req.imageUrls.length > 0 && (
                        <div style={{ margin: '0.85rem 0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <small style={{ color: '#64748b', marginRight: '0.25rem' }}>Attached Drawings / Photos ({req.imageUrls.length}):</small>
                          {req.imageUrls.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Plan ${idx + 1}`}
                              style={{ width: '65px', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                              onClick={() => setPmPreviewPhotosModal(req)}
                            />
                          ))}
                        </div>
                      )}

                      {/* Client Manager's Forwarding Notes */}
                      {req.cmNotes && (
                        <div style={{ marginTop: '0.85rem', padding: '0.75rem 1rem', background: '#eff6ff', borderLeft: '4px solid #3b82f6', borderRadius: '0 8px 8px 0', fontSize: '0.88rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                            <strong style={{ color: '#1d4ed8' }}>Client Manager Instructions ({req.forwardedByCm || 'CM'}):</strong>
                            <small style={{ color: '#64748b' }}>{formatDate(req.forwardedToPmAt)}</small>
                          </div>
                          <p style={{ margin: 0, color: '#1e3a8a' }}>{req.cmNotes}</p>
                        </div>
                      )}

                      {/* Your Engineering Review (if already replied) */}
                      {req.pmReply && (
                        <div style={{ marginTop: '0.85rem', padding: '0.85rem 1rem', background: '#f5f3ff', borderLeft: '4px solid #7c3aed', borderRadius: '0 8px 8px 0', fontSize: '0.88rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#6d28d9' }}>Your Engineering Assessment & Feasibility ({formatDate(req.pmRespondedAt)}):</strong>
                            {req.pmEstimatedBudget && (
                              <span style={{ color: '#6d28d9', fontWeight: 700 }}>
                                Est. Budget: {formatMoney(req.pmEstimatedBudget)} {req.pmEstimatedDuration ? `| Timeline: ${req.pmEstimatedDuration}` : ''}
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, color: '#4c1d95', whiteSpace: 'pre-wrap' }}>{req.pmReply}</p>
                        </div>
                      )}

                      {/* Approved notice */}
                      {isApproved && (
                        <div style={{ marginTop: '0.85rem', padding: '0.85rem 1rem', background: '#f0fdf4', borderLeft: '4px solid #16a34a', borderRadius: '0 8px 8px 0', fontSize: '0.9rem' }}>
                          <strong style={{ color: '#15803d' }}>Approved by Client Manager ({req.approvedBy || 'CM'} on {formatDate(req.approvedAt)})</strong>
                          <p style={{ margin: '0.2rem 0 0', color: '#166534' }}>
                            This custom request has been approved! You can now start the construction project and assign this client.
                          </p>
                        </div>
                      )}

                      {/* Started notice */}
                      {isStarted && (
                        <div style={{ marginTop: '0.85rem', padding: '0.85rem 1rem', background: '#ecfdf5', borderLeft: '4px solid #10b981', borderRadius: '0 8px 8px 0', fontSize: '0.9rem' }}>
                          <strong style={{ color: '#047857' }}>Construction Project Initialized & Assigned</strong>
                          <p style={{ margin: '0.2rem 0 0', color: '#065f46' }}>
                            Project ID #{req.startedProjectId} is actively managed under Projects. Client {req.client?.name} is assigned.
                          </p>
                        </div>
                      )}

                      {/* Rejection notice */}
                      {req.rejectionReason && (
                        <div style={{ marginTop: '0.85rem', padding: '0.85rem 1rem', background: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '0 8px 8px 0', fontSize: '0.9rem' }}>
                          <strong style={{ color: '#b91c1c' }}>Rejection Reason (by {req.rejectedBy || 'CM'} on {formatDate(req.rejectedAt)}):</strong>
                          <p style={{ margin: '0.2rem 0 0', color: '#7f1d1d' }}>{req.rejectionReason}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', flexWrap: 'wrap' }}>
                        {isApproved && (
                          <button
                            type="button"
                            className="pm-btn primary"
                            style={{ padding: '0.6rem 1.4rem', fontSize: '0.92rem', background: '#16a34a', borderColor: '#16a34a', fontWeight: 700 }}
                            onClick={() => handleOpenStartProjectModal(req)}
                          >
                            Start Project (Assign Client)
                          </button>
                        )}

                        {isStarted && (
                          <button
                            type="button"
                            className="pm-btn secondary"
                            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                            onClick={() => {
                              setSelectedProjectId(String(req.startedProjectId));
                              setTab('projects');
                            }}
                          >
                            View Assigned Project #{req.startedProjectId} →
                          </button>
                        )}

                        {!isStarted && (
                          <button
                            type="button"
                            className="pm-btn secondary"
                            style={{ padding: '0.55rem 1.25rem', fontSize: '0.9rem' }}
                            onClick={() => handleOpenPmReplyModal(req)}
                          >
                            {req.pmReply ? 'Update Technical Reply' : 'Review & Reply to Client Manager →'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: PROJECTS */}
        {tab === 'projects' && (
          <section className="pm-two-column">
            <FormCard title={editingProject ? 'Edit project' : 'Create project'}>
              <form onSubmit={saveProject} className="pm-form">
                <div style={{ padding: '0.65rem 0.85rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.84rem', color: '#166534', marginBottom: '0.75rem' }}>
                  <strong>Internal Construction Project:</strong> Visible exclusively to project staff and the assigned client. Not published on the public showcase.
                </div>
                <input
                  placeholder="Project name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  required
                />
                <label>
                  Property design type
                  <select
                    value={projectForm.category}
                    onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                    required
                  >
                    <option value="">-- Select Property Type --</option>
                    <option value="RESIDENCIES">Residencies</option>
                    <option value="APARTMENTS">Apartments</option>
                    <option value="LANDS">Land / Plot</option>
                  </select>
                </label>
                <select
                  value={projectForm.clientId}
                  onChange={(e) => setProjectForm({ ...projectForm, clientId: e.target.value })}
                >
                  <option value="">-- Choose Assigned Client (Optional) --</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Location (e.g. Colombo 03, Negombo)"
                  value={projectForm.location || ''}
                  onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
                />
                <textarea
                  placeholder="Project description"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                />

                {/* Project Image: URL or Upload */}
                <label>
                  Project Image (URL or File Upload)
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <input
                      placeholder="Paste image URL (https://...)"
                      value={projectForm.imageUrl || ''}
                      onChange={(e) => setProjectForm({ ...projectForm, imageUrl: e.target.value })}
                      style={{ flex: 1 }}
                    />
                    <label className="pm-secondary" style={{ padding: '0.55rem 0.85rem', cursor: 'pointer', margin: 0, fontSize: '0.82rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const dataUrl = await readImageAsDataUrl(file);
                              setProjectForm((prev) => ({ ...prev, imageUrl: dataUrl }));
                            } catch (err) {
                              fail(err);
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                </label>
                {projectForm.imageUrl && (
                  <div style={{ position: 'relative', width: '100%', height: '140px', overflow: 'hidden', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '0.75rem' }}>
                    <img src={projectForm.imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setProjectForm({ ...projectForm, imageUrl: '' })}
                      style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Additional Construction & Specifications Details */}
                <label>
                  Construction Status Detail
                  <input
                    placeholder="e.g. Foundation Complete, Level 3 Slabs, Interior Finishes"
                    value={projectForm.constructionStatus || ''}
                    onChange={(e) => setProjectForm({ ...projectForm, constructionStatus: e.target.value })}
                  />
                </label>

                <label>
                  Price Range / Estimate
                  <input
                    placeholder="e.g. LKR 45,000,000 - 55,000,000"
                    value={projectForm.priceRange || ''}
                    onChange={(e) => setProjectForm({ ...projectForm, priceRange: e.target.value })}
                  />
                </label>

                <label>
                  Project Specifications &amp; Architectural Details
                  <textarea
                    rows={3}
                    placeholder="e.g. 4 Bedrooms, 3 Bathrooms, 3,200 sqft, Rooftop Terrace, Solar Panels, 2 Car Garage"
                    value={projectForm.specifications || ''}
                    onChange={(e) => setProjectForm({ ...projectForm, specifications: e.target.value })}
                  />
                </label>

                <label>
                  Start date
                  <input
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                    required
                  />
                </label>
                <label>
                  End date
                  <input
                    type="date"
                    value={projectForm.endDate}
                    onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                  />
                </label>
                <label>
                  Project budget (LKR)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={projectForm.budget}
                    onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Project status
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                    required
                  >
                    <option value="">-- Select Status --</option>
                    {statuses.map((status) => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                {editingProject && (
                  <label>
                    Progress ({projectForm.progressPercentage || 0}%)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={projectForm.progressPercentage}
                      onChange={(e) => setProjectForm({ ...projectForm, progressPercentage: e.target.value })}
                    />
                  </label>
                )}
                <button className="pm-primary">{editingProject ? 'Save project changes' : 'Create project'}</button>
                {editingProject && (
                  <div className="pm-form-actions">
                    <button type="button" className="pm-secondary" onClick={startProject}>
                      New project
                    </button>
                    <button type="button" className="pm-danger-button" onClick={removeProject}>
                      Delete project
                    </button>
                  </div>
                )}
                {editingProject && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => handleDownloadProjectPdf(editingProject)}
                      style={{
                        width: '100%',
                        padding: '9px 16px',
                        background: '#ecfdf5',
                        color: '#047857',
                        border: '1.5px solid #10b981',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      📄 Download Project Dossier (PDF)
                    </button>
                  </div>
                )}
              </form>
            </FormCard>
            <FormCard title="All projects">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Filter by category:</label>
                  <select
                    value={projectFilterCategory}
                    onChange={(e) => setProjectFilterCategory(e.target.value)}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  >
                    <option value="ALL">All Categories ({projects.length})</option>
                    <option value="RESIDENCIES">Residencies ({projects.filter((p) => p.category === 'RESIDENCIES').length})</option>
                    <option value="APARTMENTS">Apartments ({projects.filter((p) => p.category === 'APARTMENTS').length})</option>
                    <option value="LANDS">Lands &amp; Plots ({projects.filter((p) => p.category === 'LANDS').length})</option>
                  </select>
                </div>
                <div style={{ flex: '1 1 180px', maxWidth: '240px' }}>
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {(() => {
                const filteredProjects = projects.filter((p) => {
                  if (projectFilterCategory !== 'ALL' && p.category !== projectFilterCategory) return false;
                  if (projectSearchQuery.trim()) {
                    const q = projectSearchQuery.toLowerCase();
                    const nameMatch = p.name?.toLowerCase().includes(q);
                    const clientMatch = p.client?.name?.toLowerCase().includes(q);
                    const locMatch = p.location?.toLowerCase().includes(q);
                    if (!nameMatch && !clientMatch && !locMatch) return false;
                  }
                  return true;
                });

                return (
                  <ProjectTable
                    projects={filteredProjects}
                    spentByProject={spentByProject}
                    onEdit={editProject}
                    onDownloadPdf={handleDownloadProjectPdf}
                    emptyMessage="No projects match the current filter."
                  />
                );
              })()}
            </FormCard>
          </section>
        )}

        {/* TAB 3: ASSIGN CLIENTS */}
        {tab === 'clients' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '1.4rem' }}>Assign Clients to Projects</h2>
              <p style={{ color: '#6b7280', margin: '6px 0 0' }}>Link registered clients to their corresponding construction projects and track agreements.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
              {/* Form to Assign Client */}
              <FormCard title="Assign Client">
                <form onSubmit={handleAssignClient} className="pm-form">
                  <label>
                    Select Project
                    <select
                      value={clientAssignProject}
                      onChange={(e) => setClientAssignProject(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Project --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.status} - Currently: {p.client?.name || 'No Client'})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Select Client
                    <select
                      value={clientAssignClient}
                      onChange={(e) => setClientAssignClient(e.target.value)}
                    >
                      <option value="">-- No Client (Remove Assignment) --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email}) {c.phone ? `· ${c.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  {clientAssignClient && (() => {
                    const chosen = clients.find((c) => String(c.id) === String(clientAssignClient));
                    if (!chosen) return null;
                    return (
                      <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.85rem', color: '#166534' }}>
                        <div><strong>Client:</strong> {chosen.name}</div>
                        <div><strong>Email:</strong> {chosen.email}</div>
                        <div><strong>Phone:</strong> {chosen.phone || 'N/A'}</div>
                        <div><strong>Status:</strong> {chosen.status}</div>
                      </div>
                    );
                  })()}

                  <button type="submit" className="pm-primary" disabled={savingClientAssign}>
                    {savingClientAssign ? 'Saving...' : 'Assign Client to Project'}
                  </button>
                </form>
              </FormCard>

              {/* Project Client Mapping Table */}
              <FormCard title="Current Project & Client Allocations">
                <div className="pm-table-wrap">
                  <table className="pm-table">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Assigned Client</th>
                        <th>Budget</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                            <small>{p.location || 'Location not set'}</small>
                          </td>
                          <td>
                            {p.client ? (
                              <div>
                                <span style={{ fontWeight: 600, color: '#047857' }}>{p.client.name}</span>
                                <small>{p.client.email}</small>
                              </div>
                            ) : (
                              <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Unassigned</span>
                            )}
                          </td>
                          <td>{formatMoney(p.budget)}</td>
                          <td><Status value={p.status} /></td>
                          <td>
                            <button
                              type="button"
                              className="pm-text-button"
                              onClick={() => {
                                setClientAssignProject(String(p.id));
                                setClientAssignClient(p.client?.id ? String(p.client.id) : '');
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </FormCard>
            </div>
          </div>
        )}

        {/* TAB 4: ASSIGN EMPLOYEES (PM Feature matching requirement 1 & 2) */}
        {tab === 'assignments' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '1.4rem' }}>Assign Employees to Projects</h2>
              <p style={{ color: '#6b7280', margin: '6px 0 0' }}>Allocate site engineers, masons, electricians, and trade workers to active construction sites.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
              {/* Left: Select Employee */}
              <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px', color: '#111827', fontSize: '1.2rem' }}>
                  Select Employee to Assign Projects
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 16px' }}>
                  Choose an employee below to manage their construction site allocations.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
                  {employees.map((emp) => {
                    const isSelected = selectedEmpForAssign?.id === emp.id;
                    const projectCount = emp.assignedProjects ? emp.assignedProjects.length : (emp.project ? 1 : 0);
                    return (
                      <div
                        key={emp.id}
                        onClick={() => openEmpAssignment(emp)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #047857' : '1px solid #e5e7eb',
                          background: isSelected ? '#ecfdf5' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>
                            {emp.name}{' '}
                            <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px' }}>
                              {emp.employeeId || 'STAFF'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            Trade: <b>{emp.role || emp.position}</b>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: projectCount > 0 ? '#047857' : '#9ca3af', fontWeight: 600 }}>
                          {projectCount} project(s)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Project Checkboxes */}
              <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {selectedEmpForAssign ? (
                  <form onSubmit={saveEmpAssignments}>
                    <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.2rem' }}>
                      Assign Projects to {selectedEmpForAssign.name}
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 16px' }}>
                      Role: <b>{selectedEmpForAssign.role || selectedEmpForAssign.position}</b> ({selectedEmpForAssign.employeeId || 'Staff'})
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                      {projects.length === 0 ? (
                        <p style={{ color: '#6b7280' }}>No active construction projects available.</p>
                      ) : (
                        projects.map((proj) => {
                          const checked = assignedProjectIds.includes(proj.id);
                          return (
                            <div
                              key={proj.id}
                              onClick={() => toggleProjectForEmp(proj.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 14px',
                                borderRadius: '8px',
                                border: checked ? '1.5px solid #059669' : '1px solid #e5e7eb',
                                background: checked ? '#f0fdf4' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleProjectForEmp(proj.id);
                                }}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#059669' }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {proj.name}
                                  {checked && (
                                    <span style={{ fontSize: '0.72rem', background: '#d1fae5', color: '#065f46', padding: '2px 7px', borderRadius: '999px', fontWeight: 700 }}>
                                      Assigned
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                                  Status: {proj.status} | Client: {proj.client?.name || 'Odiliya In-House'}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={savingEmpAssign}
                      style={{
                        padding: '10px 22px',
                        background: '#047857',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        cursor: savingEmpAssign ? 'not-allowed' : 'pointer',
                        opacity: savingEmpAssign ? 0.75 : 1,
                        boxShadow: '0 2px 4px rgba(4,120,87,0.2)',
                      }}
                    >
                      {savingEmpAssign ? 'Saving…' : 'Save Project Assignments'}
                    </button>
                  </form>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                    <p style={{ fontWeight: 500 }}>Select an employee from the left panel to assign projects.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TASKS & ASSIGNMENTS (Screenshot 2 left) */}
        {tab === 'tasks' && (
          <div>
            <ProjectSelector />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
              <FormCard title="Tasks & assignments">
                <form onSubmit={saveTask} className="pm-form">
                  <input
                    placeholder="Task name"
                    value={taskForm.taskName}
                    onChange={(e) => setTaskForm({ ...taskForm, taskName: e.target.value })}
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                  <label>
                    Assigned Employee
                    <select
                      value={taskForm.assignedEmployeeId}
                      onChange={(e) => setTaskForm({ ...taskForm, assignedEmployeeId: e.target.value })}
                    >
                      <option value="">-- Select Employee (Optional) --</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} ({employee.role || employee.position || 'Staff'})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Start date
                    <input
                      type="date"
                      value={taskForm.startDate}
                      onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Deadline
                    <input
                      type="date"
                      value={taskForm.deadline}
                      onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                      required
                    />
                  </label>
                  <button className="pm-primary">Assign task</button>
                </form>
              </FormCard>

              <FormCard title={`Tasks for ${activeProject?.name || 'Project'}`}>
                <TaskTable tasks={projectTasks} completeTask={completeTask} />
              </FormCard>
            </div>
          </div>
        )}

        {/* TAB 6: MILESTONES (Screenshot 2 right) */}
        {tab === 'milestones' && (
          <div>
            <ProjectSelector />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
              <FormCard title="Add Project Milestone">
                <form onSubmit={saveMilestone} className="pm-form">
                  <input
                    placeholder="Milestone name (e.g. Foundation Complete)"
                    value={milestoneForm.title}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={milestoneForm.description}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  />
                  <label>
                    Target Date
                    <input
                      type="date"
                      value={milestoneForm.targetDate}
                      onChange={(e) => setMilestoneForm({ ...milestoneForm, targetDate: e.target.value })}
                    />
                  </label>
                  <label>
                    Completion Percentage ({milestoneForm.progressPercentage}%)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={milestoneForm.progressPercentage}
                      onChange={(e) => setMilestoneForm({ ...milestoneForm, progressPercentage: e.target.value })}
                    />
                  </label>
                  <button className="pm-primary">Add milestone</button>
                </form>
              </FormCard>

              <FormCard title={`Milestones for ${activeProject?.name || 'Project'}`}>
                {activeProject?.milestones && activeProject.milestones.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeProject.milestones.map((milestone) => (
                      <div className="pm-milestone" key={milestone.id}>
                        <div>
                          <strong>{milestone.title}</strong>
                          <small>{formatDate(milestone.targetDate)}</small>
                          {milestone.description && <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>{milestone.description}</p>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Status value={milestone.status} />
                          <b>{milestone.progressPercentage}%</b>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No milestones scheduled for this project yet." />
                )}
              </FormCard>
            </div>
          </div>
        )}

        {/* TAB 7: BUDGET & EXPENSES (Screenshot 3 left) */}
        {tab === 'budget' && (
          <div>
            <ProjectSelector />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
              <FormCard title="Budget & expenses">
                <form onSubmit={saveExpense} className="pm-form">
                  <input
                    placeholder="Expense description (e.g. Timber delivery)"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount (LKR)"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                  />
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    required
                  />
                  <button className="pm-primary">Save expense</button>
                </form>
              </FormCard>

              <FormCard title={`Expenses Log: ${activeProject?.name || 'Project'}`}>
                {projectExpenses.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {projectExpenses.map((expense) => (
                      <div className="pm-milestone" key={expense.id}>
                        <div>
                          <strong>{expense.description}</strong>
                          <small>{formatDate(expense.date)} · <b style={{ color: '#047857' }}>{formatMoney(expense.amount)}</b></small>
                        </div>
                        <button className="pm-text-button danger" onClick={() => removeExpense(expense.id)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No expenses recorded for this project yet." />
                )}
              </FormCard>
            </div>
          </div>
        )}

        {/* TAB 8: PROJECT TEAM (Screenshot 3 right) */}
        {tab === 'team' && (
          <div>
            <ProjectSelector />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
              <FormCard title="Add Employee to Project Team">
                <form onSubmit={saveEmployee} className="pm-form">
                  <input
                    placeholder="Employee name"
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                  />
                  <input
                    placeholder="Role / trade (e.g. Mason, Electrician)"
                    value={employeeForm.role}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                  />
                  <button className="pm-primary">Add employee</button>
                </form>
              </FormCard>

              <FormCard title={`Team for ${activeProject?.name || 'Project'}`}>
                {projectEmployees.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {projectEmployees.map((employee) => (
                      <div className="pm-milestone" key={employee.id}>
                        <div>
                          <strong style={{ fontSize: '0.98rem' }}>{employee.name}</strong>
                          <small>{employee.role || employee.position || 'Site Staff'} · {employee.email || 'No email'}</small>
                        </div>
                        <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {employee.employeeId || 'STAFF'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No team members assigned to this project yet. Use the form or 'Assign Employees' tab to allocate staff." />
                )}
              </FormCard>
            </div>
          </div>
        )}

        {/* TAB 9: DOCUMENTS & BLUEPRINTS VAULT */}
        {tab === 'documents' && (
          <div>
            <ProjectSelector />
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    ENGINEERING &amp; PROJECT VAULT
                  </span>
                  <h2 style={{ margin: '6px 0 2px', color: '#111827', fontSize: '1.4rem', fontWeight: 800 }}>
                    Project Blueprints & Technical Documents
                  </h2>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.88rem' }}>
                    Download official architectural plans, CAD drawings, municipal clearances, task schedules, and BOQ specifications.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      exportCsv(
                        projects.map((p) => ({
                          'Project ID': p.id,
                          'Project Name': p.name,
                          'Category': p.category,
                          'Client': p.client?.name || 'In-House',
                          'Location': p.location || '—',
                          'Budget (LKR)': p.budget || 0,
                          'Start Date': p.startDate || '—',
                          'End Date': p.endDate || '—',
                          'Progress %': p.progressPercentage || 0,
                          'Status': p.status,
                        })),
                        `Odiliya_Projects_Master_List_${new Date().toISOString().slice(0, 10)}`
                      );
                    }}
                    style={{
                      padding: '9px 16px',
                      background: '#047857',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    Export All Projects (CSV)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadProjectPdf(activeProject)}
                    style={{
                      padding: '9px 16px',
                      background: '#065f46',
                      color: '#ffffff',
                      border: '1px solid #34d399',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                    title="Download active project report with images, milestones & tasks"
                  >
                    <span>📄</span> Download Project Dossier (PDF)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      exportCsv(
                        tasks.map((t) => ({
                          'Task ID': t.id,
                          'Task Name': t.taskName,
                          'Project': t.project?.name || activeProject?.name || '—',
                          'Assigned Employee': t.assignedEmployee?.name || 'Unassigned',
                          'Deadline': t.deadline || '—',
                          'Progress %': t.progressPercentage || 0,
                          'Status': t.status,
                          'Worker Remarks': t.progressRemarks || '—',
                        })),
                        `Odiliya_Tasks_Schedule_${new Date().toISOString().slice(0, 10)}`
                      );
                    }}
                    style={{
                      padding: '9px 16px',
                      background: '#1d4ed8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    Export Tasks Schedule (CSV)
                  </button>
                </div>
              </div>
            </div>

            {/* Featured Executive Project Report Card (PDF with Images) */}
            <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)', borderRadius: '14px', padding: '24px', color: '#ffffff', marginBottom: '24px', boxShadow: '0 4px 14px rgba(4, 120, 87, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: '1 1 400px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px' }}>
                    <span>⭐</span> OFFICIAL EXECUTIVE DOSSIER
                  </div>
                  <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', color: '#ffffff' }}>
                    {activeProject?.name || 'Project'} — Executive Audit Dossier (PDF)
                  </h2>
                  <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#d1fae5', lineHeight: 1.5 }}>
                    Generate a publication-grade, verified PDF engineering report with high-resolution site images, architectural specifications, milestone completion progress, task execution schedule, assigned personnel roster, and itemized financial expenditure breakdown.
                  </p>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#a7f3d0' }}>
                    <span>📍 {activeProject?.location || 'Site Location'}</span>
                    <span>•</span>
                    <span>Client: <b>{activeProject?.client?.name || 'In-House Development'}</b></span>
                    <span>•</span>
                    <span>Budget: <b>{formatMoney(activeProject?.budget)}</b></span>
                    <span>•</span>
                    <span>Progress: <b>{activeProject?.progressPercentage || 0}%</b></span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '230px' }}>
                  <button
                    type="button"
                    onClick={() => handleDownloadProjectPdf(activeProject)}
                    style={{
                      padding: '12px 22px',
                      background: '#fbbf24',
                      color: '#78350f',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <span>📥</span> Download Project PDF (with Images)
                  </button>
                  <small style={{ color: '#d1fae5', textAlign: 'center', fontSize: '0.74rem' }}>
                    Includes architectural visual &amp; corporate seal
                  </small>
                </div>
              </div>
            </div>

            {/* Document Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              {/* Card 1: Project Blueprints & Technical Drawings */}
              <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 8px', color: '#111827', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Architectural & Engineering Drawings
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.83rem', margin: '0 0 16px' }}>
                  Structural designs, MEP blueprints, and foundation drawings for <b>{activeProject?.name || 'Selected Project'}</b>.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { name: `${(activeProject?.name || 'Project').replace(/\s+/g, '_')}_Architectural_CAD_Master_Plan.pdf`, size: '4.8 MB', desc: 'Complete floor layout and 3D elevations' },
                    { name: `${(activeProject?.name || 'Project').replace(/\s+/g, '_')}_Structural_Engineering_Calculations.pdf`, size: '2.1 MB', desc: 'Reinforced concrete & steel beam specifications' },
                    { name: `${(activeProject?.name || 'Project').replace(/\s+/g, '_')}_MEP_Electrical_Plumbing_Schematics.pdf`, size: '3.3 MB', desc: 'Mechanical, electrical & piping conduit layout' },
                    { name: `${(activeProject?.name || 'Project').replace(/\s+/g, '_')}_Soil_Investigation_Foundation_Report.pdf`, size: '1.2 MB', desc: 'Geotechnical soil report & piling foundation' },
                  ].map((doc) => (
                    <div key={doc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.86rem' }}>📄 {doc.name}</div>
                        <div style={{ color: '#6b7280', fontSize: '0.76rem', marginTop: '2px' }}>{doc.desc} • {doc.size}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Legal Approvals, BOQ & Compliance */}
              <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 8px', color: '#111827', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Municipal Permits & BOQ Specifications
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.83rem', margin: '0 0 16px' }}>
                  Statutory approvals, Urban Development Authority (UDA) permits, and master bills of quantities.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { name: `${(activeProject?.name || 'Project').replace(/\s+/g, '_')}_Municipal_Building_Permit_Clearance.pdf`, size: '920 KB', desc: 'Approved municipal council building plan certificate' },
                    { name: `${(activeProject?.name || 'Project').replace(/\s+/g, '_')}_Bill_of_Quantities_BOQ_Master.pdf`, size: '1.8 MB', desc: 'Itemized material & labor estimation schedule' },
                    { name: `${(activeProject?.name || 'Project').replace(/\s+/g, '_')}_Environmental_Impact_Clearance.pdf`, size: '640 KB', desc: 'Central Environmental Authority (CEA) clearance certificate' },
                    { name: `${(activeProject?.name || 'Project').replace(/\s+/g, '_')}_Fire_Safety_Department_Approval.pdf`, size: '480 KB', desc: 'Civil defense fire safety & hydrant installation pass' },
                  ].map((doc) => (
                    <div key={doc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.86rem' }}>📑 {doc.name}</div>
                        <div style={{ color: '#6b7280', fontSize: '0.76rem', marginTop: '2px' }}>{doc.desc} • {doc.size}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* PM TECHNICAL REPLY MODAL */}
        {pmReplyModalOpen && pmReplyTarget && (
          <div className="light-modal-overlay">
            <div className="light-modal-box" style={{ maxWidth: '650px' }}>
              <div className="modal-head-row">
                <div>
                  <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>PROJECT ENGINEERING ASSESSMENT</span>
                  <h3 style={{ margin: '0.2rem 0 0' }}>Technical Reply for: {pmReplyTarget.title}</h3>
                </div>
                <button type="button" onClick={() => { setPmReplyModalOpen(false); setPmReplyTarget(null); }}>×</button>
              </div>

              <form onSubmit={handleSubmitPmReply} style={{ marginTop: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                  <p style={{ margin: '0 0 0.35rem' }}><strong>Client:</strong> {pmReplyTarget.client?.name} &nbsp;|&nbsp; <strong>Location:</strong> {pmReplyTarget.location}</p>
                  <p style={{ margin: '0 0 0.35rem' }}><strong>Client Expected Budget:</strong> {pmReplyTarget.expectedBudget ? formatMoney(pmReplyTarget.expectedBudget) : 'N/A'}</p>
                  {pmReplyTarget.cmNotes && (
                    <div style={{ marginTop: '0.4rem', padding: '0.5rem', background: '#eff6ff', borderRadius: '4px', color: '#1e3a8a', fontSize: '0.83rem' }}>
                      <strong>CM Note:</strong> {pmReplyTarget.cmNotes}
                    </div>
                  )}
                </div>

                <div className="form-input-box">
                  <label>Engineering Feasibility &amp; Technical Assessment *</label>
                  <textarea
                    rows={5}
                    value={pmReplyForm.pmReply}
                    onChange={(e) => setPmReplyForm({ ...pmReplyForm, pmReply: e.target.value })}
                    placeholder="Describe structural assessment, site clearance recommendations, soil suitability, material availability, and technical comments..."
                    required
                  />
                </div>

                <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                  <div className="form-input-box">
                    <label>PM Estimated Construction Cost (LKR)</label>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      placeholder="e.g. 26000000"
                      value={pmReplyForm.pmEstimatedBudget}
                      onChange={(e) => setPmReplyForm({ ...pmReplyForm, pmEstimatedBudget: e.target.value })}
                    />
                  </div>

                  <div className="form-input-box">
                    <label>Estimated Construction Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 8 - 10 Months"
                      value={pmReplyForm.pmEstimatedDuration}
                      onChange={(e) => setPmReplyForm({ ...pmReplyForm, pmEstimatedDuration: e.target.value })}
                    />
                  </div>
                </div>

                <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.6rem', fontSize: '0.82rem' }}>
                  This technical evaluation will be returned to the Client Manager so they can compile the official proposal for the client.
                </small>

                <div className="modal-actions-row" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn-outline-green" onClick={() => { setPmReplyModalOpen(false); setPmReplyTarget(null); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-solid-green" disabled={submittingPmReply}>
                    {submittingPmReply ? 'Submitting Reply...' : 'Transmit Reply to Client Manager'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PM PREVIEW PHOTOS MODAL */}
        {pmPreviewPhotosModal && (
          <div className="light-modal-overlay">
            <div className="light-modal-box" style={{ maxWidth: '750px' }}>
              <div className="modal-head-row">
                <h3>Drawings &amp; Photos — {pmPreviewPhotosModal.title}</h3>
                <button type="button" onClick={() => setPmPreviewPhotosModal(null)}>×</button>
              </div>
              <div className="modal-body-content" style={{ marginTop: '1rem' }}>
                <p style={{ color: '#64748b', marginBottom: '1rem' }}>
                  Client: <b>{pmPreviewPhotosModal.client?.name}</b> | Location: <b>{pmPreviewPhotosModal.location}</b>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                  {(pmPreviewPhotosModal.imageUrls || []).map((img, idx) => (
                    <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                      <img src={img} alt={`Drawing ${idx + 1}`} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </a>
                  ))}
                </div>
              </div>
              <div className="modal-actions-row" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-solid-green" onClick={() => setPmPreviewPhotosModal(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* START PROJECT MODAL (ASSIGN CLIENT & INITIALIZE PROJECT) */}
        {startProjectModalOpen && startProjectTarget && (
          <div className="light-modal-overlay">
            <div className="light-modal-box" style={{ maxWidth: '650px' }}>
              <div className="modal-head-row">
                <div>
                  <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>CONSTRUCTION PROJECT INITIALIZATION</span>
                  <h3 style={{ margin: '0.2rem 0 0', color: '#166534' }}>Start Project: {startProjectTarget.title}</h3>
                </div>
                <button type="button" onClick={() => { setStartProjectModalOpen(false); setStartProjectTarget(null); }}>×</button>
              </div>

              <form onSubmit={handleConfirmStartProject} style={{ marginTop: '1.25rem' }}>
                <div style={{ background: '#f0fdf4', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #bbf7d0', fontSize: '0.88rem' }}>
                  <p style={{ margin: '0 0 0.35rem' }}>
                    <strong>Assigned Client:</strong> {startProjectTarget.client?.name} ({startProjectTarget.client?.email || 'N/A'}, {startProjectTarget.client?.phone || 'N/A'})
                  </p>
                  <p style={{ margin: 0, color: '#166534' }}>
                    Starting this project will assign client <strong>{startProjectTarget.client?.name}</strong> to the construction pipeline. The client will be able to track live progress and milestones from their portal.
                  </p>
                </div>

                <div className="form-grid-2">
                  <div className="form-input-box">
                    <label>Project Name *</label>
                    <input
                      type="text"
                      value={startProjectForm.name}
                      onChange={(e) => setStartProjectForm({ ...startProjectForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-input-box">
                    <label>Property Category *</label>
                    <select
                      value={startProjectForm.category}
                      onChange={(e) => setStartProjectForm({ ...startProjectForm, category: e.target.value })}
                      required
                    >
                      <option value="">-- Select Property Category --</option>
                      <option value="RESIDENCIES">Residencies</option>
                      <option value="LANDS">Lands &amp; Plots</option>
                      <option value="APARTMENTS">Apartments</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: '0.75rem' }}>
                  <div className="form-input-box">
                    <label>Site Location</label>
                    <input
                      type="text"
                      value={startProjectForm.location}
                      onChange={(e) => setStartProjectForm({ ...startProjectForm, location: e.target.value })}
                      placeholder="e.g. Negombo, Colombo 07"
                    />
                  </div>

                  <div className="form-input-box">
                    <label>Agreed Project Budget (LKR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={startProjectForm.budget}
                      onChange={(e) => setStartProjectForm({ ...startProjectForm, budget: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: '0.75rem' }}>
                  <div className="form-input-box">
                    <label>Project Start Date *</label>
                    <input
                      type="date"
                      value={startProjectForm.startDate}
                      onChange={(e) => setStartProjectForm({ ...startProjectForm, startDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-input-box">
                    <label>Estimated Completion Date</label>
                    <input
                      type="date"
                      value={startProjectForm.endDate}
                      onChange={(e) => setStartProjectForm({ ...startProjectForm, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-input-box" style={{ marginTop: '0.75rem' }}>
                  <label>Project Description &amp; Scope of Work</label>
                  <textarea
                    rows={3}
                    value={startProjectForm.description}
                    onChange={(e) => setStartProjectForm({ ...startProjectForm, description: e.target.value })}
                    placeholder="Enter project scope and specifications..."
                  />
                </div>

                <div className="modal-actions-row" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn-outline-green" onClick={() => { setStartProjectModalOpen(false); setStartProjectTarget(null); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-solid-green" disabled={startingProject} style={{ background: '#16a34a' }}>
                    {startingProject ? 'Starting Project...' : 'Initialize Project & Assign Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PM INQUIRY TECHNICAL DECISION MODAL */}
        {inquiryDecisionModalOpen && inquiryDecisionTarget && (
          <div className="light-modal-overlay" style={{ zIndex: 10000, padding: '1rem' }}>
            <div className="light-modal-box" style={{ maxWidth: '640px', width: '95%', padding: '1.75rem', borderRadius: '14px' }}>
              <div className="modal-head-row">
                <div>
                  <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>ENGINEERING FEASIBILITY &amp; TECHNICAL DECISION</span>
                  <h3 style={{ margin: '0.2rem 0 0', color: inquiryDecisionForm.decision === 'APPROVED' ? '#166534' : '#dc2626' }}>
                    {inquiryDecisionForm.decision === 'APPROVED' ? 'Approve Technical Feasibility' : 'Reject Inquiry Assessment'}
                  </h3>
                </div>
                <button type="button" onClick={() => { setInquiryDecisionModalOpen(false); setInquiryDecisionTarget(null); }}>×</button>
              </div>

              <form onSubmit={handleSubmitInquiryDecision} style={{ marginTop: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                  <p style={{ margin: '0 0 0.35rem' }}>
                    <strong>Client:</strong> {inquiryDecisionTarget.client?.name} ({inquiryDecisionTarget.client?.email || 'N/A'}{inquiryDecisionTarget.client?.phone ? `, ${inquiryDecisionTarget.client.phone}` : ''})
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Subject:</strong> {inquiryDecisionTarget.subject}
                    {inquiryDecisionTarget.project && <span> &bull; Project: <b>{inquiryDecisionTarget.project.name}</b></span>}
                    {inquiryDecisionTarget.design && <span> &bull; Design Model: <b>{inquiryDecisionTarget.design.name}</b></span>}
                  </p>
                </div>

                <div className="form-input-box">
                  <label style={{ fontWeight: 700, marginBottom: '6px', display: 'block' }}>Official Decision *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                    <div
                      onClick={() => {
                        const newRemarks = (!inquiryDecisionForm.decisionRemarks || inquiryDecisionForm.decisionRemarks.includes('Site parameters or design constraints'))
                          ? 'Structural & engineering feasibility verified. Specifications, site requirements, and architectural scope meet Odiliya standards.'
                          : inquiryDecisionForm.decisionRemarks;
                        setInquiryDecisionForm({
                          ...inquiryDecisionForm,
                          decision: 'APPROVED',
                          decisionRemarks: newRemarks,
                        });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        border: inquiryDecisionForm.decision === 'APPROVED' ? '2px solid #16a34a' : '1.5px solid #cbd5e1',
                        background: inquiryDecisionForm.decision === 'APPROVED' ? '#ecfdf5' : '#ffffff',
                        color: inquiryDecisionForm.decision === 'APPROVED' ? '#15803d' : '#334155',
                        boxShadow: inquiryDecisionForm.decision === 'APPROVED' ? '0 2px 6px rgba(22,163,74,0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="radio"
                        name="pmDecisionChoice"
                        value="APPROVED"
                        checked={inquiryDecisionForm.decision === 'APPROVED'}
                        onChange={() => {
                          const newRemarks = (!inquiryDecisionForm.decisionRemarks || inquiryDecisionForm.decisionRemarks.includes('Site parameters or design constraints'))
                            ? 'Structural & engineering feasibility verified. Specifications, site requirements, and architectural scope meet Odiliya standards.'
                            : inquiryDecisionForm.decisionRemarks;
                          setInquiryDecisionForm({
                            ...inquiryDecisionForm,
                            decision: 'APPROVED',
                            decisionRemarks: newRemarks,
                          });
                        }}
                        style={{ accentColor: '#16a34a', width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>✓ APPROVE (Feasible &amp; Ready for Contract)</span>
                    </div>

                    <div
                      onClick={() => {
                        const newRemarks = (!inquiryDecisionForm.decisionRemarks || inquiryDecisionForm.decisionRemarks.includes('Structural & engineering feasibility'))
                          ? 'Site parameters or design constraints currently incompatible with engineering requirements.'
                          : inquiryDecisionForm.decisionRemarks;
                        setInquiryDecisionForm({
                          ...inquiryDecisionForm,
                          decision: 'REJECTED',
                          decisionRemarks: newRemarks,
                        });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        border: inquiryDecisionForm.decision === 'REJECTED' ? '2px solid #dc2626' : '1.5px solid #cbd5e1',
                        background: inquiryDecisionForm.decision === 'REJECTED' ? '#fef2f2' : '#ffffff',
                        color: inquiryDecisionForm.decision === 'REJECTED' ? '#b91c1c' : '#334155',
                        boxShadow: inquiryDecisionForm.decision === 'REJECTED' ? '0 2px 6px rgba(220,38,38,0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="radio"
                        name="pmDecisionChoice"
                        value="REJECTED"
                        checked={inquiryDecisionForm.decision === 'REJECTED'}
                        onChange={() => {
                          const newRemarks = (!inquiryDecisionForm.decisionRemarks || inquiryDecisionForm.decisionRemarks.includes('Structural & engineering feasibility'))
                            ? 'Site parameters or design constraints currently incompatible with engineering requirements.'
                            : inquiryDecisionForm.decisionRemarks;
                          setInquiryDecisionForm({
                            ...inquiryDecisionForm,
                            decision: 'REJECTED',
                            decisionRemarks: newRemarks,
                          });
                        }}
                        style={{ accentColor: '#dc2626', width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>✕ REJECT (Not Feasible / Incompatible)</span>
                    </div>
                  </div>
                </div>

                <div className="form-input-box" style={{ marginTop: '0.85rem' }}>
                  <label>Engineering Evaluation &amp; Decision Remarks *</label>
                  <textarea
                    rows={4}
                    value={inquiryDecisionForm.decisionRemarks}
                    onChange={(e) => setInquiryDecisionForm({ ...inquiryDecisionForm, decisionRemarks: e.target.value })}
                    placeholder="Detail the technical reasoning, structural suitability, soil compatibility, site clearance comments, or rejection rationale..."
                    required
                  />
                </div>

                {inquiryDecisionForm.decision === 'APPROVED' && (
                  <div className="form-grid-2" style={{ marginTop: '0.85rem' }}>
                    <div className="form-input-box">
                      <label>Estimated Construction Budget (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        placeholder="e.g. 25000000"
                        value={inquiryDecisionForm.estimatedBudget}
                        onChange={(e) => setInquiryDecisionForm({ ...inquiryDecisionForm, estimatedBudget: e.target.value })}
                      />
                    </div>

                    <div className="form-input-box">
                      <label>Estimated Construction Duration</label>
                      <input
                        type="text"
                        placeholder="e.g. 8 - 10 Months"
                        value={inquiryDecisionForm.estimatedDuration}
                        onChange={(e) => setInquiryDecisionForm({ ...inquiryDecisionForm, estimatedDuration: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '0.85rem', padding: '0.75rem', background: inquiryDecisionForm.decision === 'APPROVED' ? '#ecfdf5' : '#fef2f2', borderRadius: '8px', border: `1px solid ${inquiryDecisionForm.decision === 'APPROVED' ? '#a7f3d0' : '#fecaca'}`, fontSize: '0.82rem', color: inquiryDecisionForm.decision === 'APPROVED' ? '#065f46' : '#991b1b' }}>
                  {inquiryDecisionForm.decision === 'APPROVED'
                    ? '✓ Upon approval, this decision is automatically transmitted to the Client Manager so they can draft and sign the formal construction contract agreement with the client.'
                    : '✕ Upon rejection, the client and Client Manager will receive an official notification with your technical rationale.'}
                </div>

                <div className="modal-actions-row" style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-outline-green" onClick={() => { setInquiryDecisionModalOpen(false); setInquiryDecisionTarget(null); }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-solid-green"
                    disabled={submittingInquiryDecision}
                    style={{
                      background: inquiryDecisionForm.decision === 'APPROVED' ? '#16a34a' : '#dc2626',
                      borderColor: inquiryDecisionForm.decision === 'APPROVED' ? '#16a34a' : '#dc2626',
                      padding: '8px 20px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    onClick={handleSubmitInquiryDecision}
                  >
                    {submittingInquiryDecision ? 'Submitting Decision...' : `Submit Official Decision: [${inquiryDecisionForm.decision}]`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* COMPOSE DIRECT INQUIRY TO CLIENT MODAL */}
        {composeInquiryOpen && (
          <div className="light-modal-overlay" style={{ zIndex: 10000, padding: '1rem' }}>
            <div className="light-modal-box" style={{ maxWidth: '620px', width: '95%', padding: '1.75rem', borderRadius: '14px' }}>
              <div className="modal-head-row">
                <div>
                  <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>DIRECT CLIENT COMMUNICATION</span>
                  <h3 style={{ margin: '0.2rem 0 0', color: '#0f172a' }}>Send Inquiry to Client</h3>
                </div>
                <button type="button" onClick={() => setComposeInquiryOpen(false)}>×</button>
              </div>

              <form onSubmit={handleSendComposeInquiry} style={{ marginTop: '1.25rem' }}>
                <div className="form-grid-2">
                  <div className="form-input-box">
                    <label>Client *</label>
                    <select
                      value={composeInquiryForm.clientId}
                      onChange={(e) => setComposeInquiryForm({ ...composeInquiryForm, clientId: e.target.value })}
                      required
                    >
                      <option value="">-- Select Client --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-input-box">
                    <label>Related Project (Optional)</label>
                    <select
                      value={composeInquiryForm.projectId}
                      onChange={(e) => setComposeInquiryForm({ ...composeInquiryForm, projectId: e.target.value })}
                    >
                      <option value="">-- Choose Project (Optional) --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-input-box" style={{ marginTop: '1rem' }}>
                  <label>Subject *</label>
                  <input
                    type="text"
                    placeholder="e.g. Milestone Inspection & Material Confirmation"
                    value={composeInquiryForm.subject}
                    onChange={(e) => setComposeInquiryForm({ ...composeInquiryForm, subject: e.target.value })}
                    required
                  />
                </div>

                <div className="form-input-box" style={{ marginTop: '1rem' }}>
                  <label>Message *</label>
                  <textarea
                    rows={5}
                    placeholder="Write your inquiry or engineering update directly to the client..."
                    value={composeInquiryForm.message}
                    onChange={(e) => setComposeInquiryForm({ ...composeInquiryForm, message: e.target.value })}
                    required
                  />
                </div>

                <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.6rem', fontSize: '0.8rem' }}>
                  The client will receive this message directly in their Client Portal and can reply back to you in this thread.
                </small>

                <div className="modal-actions-row" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn-outline-green" onClick={() => setComposeInquiryOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-solid-green" disabled={sendingComposeInquiry}>
                    {sendingComposeInquiry ? 'Sending...' : 'Send Inquiry to Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="pm-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FormCard({ title, children }) {
  return (
    <section className="pm-card">
      <div className="pm-card-heading">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }) {
  return <p className="pm-empty">{message}</p>;
}

function TaskTable({ tasks, completeTask }) {
  return !tasks.length ? (
    <EmptyState message="No tasks have been assigned yet." />
  ) : (
    <div className="pm-table-wrap">
      <table className="pm-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Assignee</th>
            <th>Deadline</th>
            <th>Progress</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <strong>{task.taskName}</strong>
                {task.description && <small>{task.description}</small>}
                {task.progressRemarks && (
                  <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '4px', fontStyle: 'italic' }}>
                    Worker Note: {task.progressRemarks}
                  </div>
                )}
              </td>
              <td>{task.assignedEmployee?.name || 'Unassigned'}</td>
              <td>{formatDate(task.deadline)}</td>
              <td style={{ minWidth: '130px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>
                  <span>{task.progressPercentage || 0}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${task.progressPercentage || 0}%`,
                      height: '100%',
                      background: (task.progressPercentage || 0) === 100 ? '#10b981' : '#3b82f6',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </td>
              <td>
                <Status value={task.status} />
              </td>
              <td>
                {task.status !== 'COMPLETED' && (
                  <button className="pm-text-button" onClick={() => completeTask(task)}>
                    Complete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectTable({ projects, spentByProject, onEdit, onDownloadPdf, emptyMessage }) {
  return !projects.length ? (
    <EmptyState message={emptyMessage} />
  ) : (
    <div className="pm-table-wrap">
      <table className="pm-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Client</th>
            <th>Dates</th>
            <th>Budget / Spent</th>
            <th>Progress</th>
            <th>Status</th>
            <th style={{ textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {project.imageUrl && (
                    <img
                      src={project.imageUrl}
                      alt={project.name}
                      style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', flexShrink: 0 }}
                    />
                  )}
                  <div>
                    <strong>{project.name}</strong>
                    <small>{project.location || project.category || 'Odiliya Project'}</small>
                  </div>
                </div>
              </td>
              <td>{project.client?.name || <span style={{ color: '#9ca3af' }}>Unassigned</span>}</td>
              <td>
                {formatDate(project.startDate)}
                <br />
                {formatDate(project.endDate)}
              </td>
              <td>
                {formatMoney(project.budget)}
                <small>{formatMoney(spentByProject[project.id] || 0)} spent</small>
              </td>
              <td>
                <strong>{project.progressPercentage || 0}%</strong>
              </td>
              <td>
                <Status value={project.status} />
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="pm-text-button"
                    onClick={() => onEdit(project)}
                    title="Edit project parameters"
                  >
                    Edit
                  </button>
                  {onDownloadPdf && (
                    <button
                      type="button"
                      onClick={() => onDownloadPdf(project)}
                      style={{
                        padding: '4px 10px',
                        background: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title="Download executive project report (PDF with images)"
                    >
                      <span>📄</span> PDF
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
