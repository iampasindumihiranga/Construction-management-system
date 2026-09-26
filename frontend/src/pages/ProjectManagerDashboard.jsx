import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  addMilestone,
  assignEmployeeProjects,
  createEmployee,
  createExpense,
  createProject,
  createTask,
  deleteExpense,
  deleteProject,
  formatDate,
  formatMoney,
  getAllEmployees,
  getClients,
  getExpenses,
  getProjectManagementSummary,
  getProjects,
  getTasks,
  getForwardedProjectRequests,
  pmReplyProjectRequest,
  startProjectFromRequest,
  updateProject,
  updateTask,
} from '../services/api';

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
  category: 'RESIDENCIES',
  clientId: '',
  location: '',
  startDate: '',
  endDate: '',
  budget: '',
  status: 'PLANNING',
  progressPercentage: 0,
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
  status: 'TODO',
};

const emptyMilestone = {
  title: '',
  description: '',
  targetDate: '',
  status: 'PENDING',
  progressPercentage: 0,
};

const emptyExpense = {
  description: '',
  amount: '',
  date: '',
};

const Status = ({ value }) => (
  <span className={`pm-status ${String(value).toLowerCase().replaceAll('_', '-')}`}>
    {String(value).replaceAll('_', ' ')}
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

  // Forms
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [milestoneForm, setMilestoneForm] = useState(emptyMilestone);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '', role: '' });
  const [editingProject, setEditingProject] = useState(null);

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

  // Start Project from Approved Request Modal
  const [startProjectModalOpen, setStartProjectModalOpen] = useState(false);
  const [startProjectTarget, setStartProjectTarget] = useState(null);
  const [startProjectForm, setStartProjectForm] = useState({
    name: '',
    description: '',
    category: 'RESIDENCIES',
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
      ]);

      const [sumRes, projRes, clientRes, empRes, taskRes, expRes, reqRes] = results;
      const nextSummary = sumRes.status === 'fulfilled' ? sumRes.value : {};
      const nextProjects = projRes.status === 'fulfilled' ? projRes.value || [] : [];
      const nextClients = clientRes.status === 'fulfilled' ? clientRes.value || [] : [];
      const nextEmployees = empRes.status === 'fulfilled' ? empRes.value || [] : [];
      const nextTasks = taskRes.status === 'fulfilled' ? taskRes.value || [] : [];
      const nextExpenses = expRes.status === 'fulfilled' ? expRes.value || [] : [];
      const nextRequests = reqRes.status === 'fulfilled' ? reqRes.value || [] : [];

      setSummary(nextSummary || {});
      setProjects(nextProjects);
      setClients(nextClients);
      setEmployees(nextEmployees);
      setTasks(nextTasks);
      setExpenses(nextExpenses);
      setForwardedRequests(nextRequests);

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

  const ProjectSelector = () => (
    <div style={{ background: '#f8fafc', padding: '12px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.1rem' }}>🏗️</span>
        <label htmlFor="pm-project-select" style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>
          Active Project:
        </label>
        <select
          id="pm-project-select"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', background: '#fff', fontWeight: 600, color: '#0f172a', minWidth: '220px' }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.status})
            </option>
          ))}
        </select>
      </div>

      {activeProject && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: '#64748b' }}>
          <span>Client: <strong style={{ color: '#0f172a' }}>{activeProject.client?.name || 'In-House'}</strong></span>
          <span>·</span>
          <span>Budget: <strong style={{ color: '#047857' }}>{formatMoney(activeProject.budget)}</strong></span>
          <span>·</span>
          <span>Progress: <strong style={{ color: '#0284c7' }}>{activeProject.progressPercentage || 0}%</strong></span>
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
          <button onClick={() => setTab('requests')} className={tab === 'requests' ? 'active' : ''}>
            Client Requests ({forwardedRequests.filter((r) => r.status === 'FORWARDED_TO_PM').length > 0 ? `${forwardedRequests.length} (${forwardedRequests.filter((r) => r.status === 'FORWARDED_TO_PM').length} Pending)` : forwardedRequests.length})
          </button>
          <button onClick={startProject} className={tab === 'projects' ? 'active' : ''}>
            Projects
          </button>
          <button onClick={() => setTab('clients')} className={tab === 'clients' ? 'active' : ''}>
            Assign Clients
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
                emptyMessage="No projects yet. Open Projects to create your first project."
              />
            </section>
          </>
        )}

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
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>📋</span>
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
                            📍 Location: <strong>{req.location || 'N/A'}</strong> &nbsp;|&nbsp; Target Start: <strong>{req.targetStartDate ? formatDate(req.targetStartDate) : 'Flexible'}</strong>
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {isAwaitingPm && (
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.82rem' }}>
                              ⚠️ Action Needed (Reply to CM)
                            </span>
                          )}
                          {isPmReviewed && (
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', background: '#eff6ff', color: '#1e40af', fontWeight: 600, fontSize: '0.82rem' }}>
                              ✓ Engineering Review Submitted
                            </span>
                          )}
                          {isClientNotified && (
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', background: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: '0.82rem' }}>
                              ✓ Client Notified by CM
                            </span>
                          )}
                          {isApproved && (
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.82rem' }}>
                              ✓ Approved by Client Manager — Ready to Start
                            </span>
                          )}
                          {isStarted && (
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', background: '#ecfdf5', color: '#047857', border: '1px solid #10b981', fontWeight: 700, fontSize: '0.82rem' }}>
                              🚀 Project Started (ID #{req.startedProjectId})
                            </span>
                          )}
                          {isRejected && (
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: '0.82rem' }}>
                              ✗ Rejected
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
                            <strong style={{ color: '#1d4ed8' }}>💬 Client Manager Instructions ({req.forwardedByCm || 'CM'}):</strong>
                            <small style={{ color: '#64748b' }}>{formatDate(req.forwardedToPmAt)}</small>
                          </div>
                          <p style={{ margin: 0, color: '#1e3a8a' }}>{req.cmNotes}</p>
                        </div>
                      )}

                      {/* Your Engineering Review (if already replied) */}
                      {req.pmReply && (
                        <div style={{ marginTop: '0.85rem', padding: '0.85rem 1rem', background: '#f5f3ff', borderLeft: '4px solid #7c3aed', borderRadius: '0 8px 8px 0', fontSize: '0.88rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#6d28d9' }}>✓ Your Engineering Assessment &amp; Feasibility ({formatDate(req.pmRespondedAt)}):</strong>
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
                          <strong style={{ color: '#15803d' }}>✓ Approved by Client Manager ({req.approvedBy || 'CM'} on {formatDate(req.approvedAt)})</strong>
                          <p style={{ margin: '0.2rem 0 0', color: '#166534' }}>
                            This custom request has been approved! You can now start the construction project and assign this client.
                          </p>
                        </div>
                      )}

                      {/* Started notice */}
                      {isStarted && (
                        <div style={{ marginTop: '0.85rem', padding: '0.85rem 1rem', background: '#ecfdf5', borderLeft: '4px solid #10b981', borderRadius: '0 8px 8px 0', fontSize: '0.9rem' }}>
                          <strong style={{ color: '#047857' }}>🚀 Construction Project Initialized &amp; Assigned</strong>
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
                            🚀 Start Project (Assign Client)
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
                  🔒 <strong>Internal Construction Project:</strong> Visible exclusively to project staff and the assigned client. Not published on the public showcase.
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
                  >
                    <option value="RESIDENCIES">Residencies</option>
                    <option value="APARTMENTS">Apartments</option>
                    <option value="LANDS">Land / Plot</option>
                  </select>
                </label>
                <select
                  value={projectForm.clientId}
                  onChange={(e) => setProjectForm({ ...projectForm, clientId: e.target.value })}
                >
                  <option value="">No client assigned</option>
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
                      <span>📁 Upload</span>
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
                      ✕
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
                  >
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
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
              </form>
            </FormCard>
            <FormCard title="All projects">
              <ProjectTable
                projects={projects}
                spentByProject={spentByProject}
                onEdit={editProject}
                emptyMessage="No projects have been created."
              />
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
                                      ✓ Assigned
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
                      <option value="">Unassigned</option>
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
        {/* PM TECHNICAL REPLY MODAL */}
        {pmReplyModalOpen && pmReplyTarget && (
          <div className="light-modal-overlay">
            <div className="light-modal-box" style={{ maxWidth: '650px' }}>
              <div className="modal-head-row">
                <div>
                  <span className="brand-green-subtitle" style={{ fontSize: '0.8rem' }}>PROJECT ENGINEERING ASSESSMENT</span>
                  <h3 style={{ margin: '0.2rem 0 0' }}>Technical Reply for: {pmReplyTarget.title}</h3>
                </div>
                <button type="button" onClick={() => { setPmReplyModalOpen(false); setPmReplyTarget(null); }}>✕</button>
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
                <button type="button" onClick={() => setPmPreviewPhotosModal(null)}>✕</button>
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
                  <h3 style={{ margin: '0.2rem 0 0', color: '#166534' }}>🚀 Start Project: {startProjectTarget.title}</h3>
                </div>
                <button type="button" onClick={() => { setStartProjectModalOpen(false); setStartProjectTarget(null); }}>✕</button>
              </div>

              <form onSubmit={handleConfirmStartProject} style={{ marginTop: '1.25rem' }}>
                <div style={{ background: '#f0fdf4', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #bbf7d0', fontSize: '0.88rem' }}>
                  <p style={{ margin: '0 0 0.35rem' }}>
                    <strong>Assigned Client:</strong> {startProjectTarget.client?.name} ({startProjectTarget.client?.email || 'N/A'}, {startProjectTarget.client?.phone || 'N/A'})
                  </p>
                  <p style={{ margin: 0, color: '#166534' }}>
                    🔒 Starting this project will assign client <strong>{startProjectTarget.client?.name}</strong> to the construction pipeline. The client will be able to track live progress and milestones from their portal.
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
                    {startingProject ? 'Starting Project...' : '🚀 Initialize Project & Assign Client'}
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
                    💬 Worker Note: {task.progressRemarks}
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

function ProjectTable({ projects, spentByProject, onEdit, emptyMessage }) {
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
            <th>Budget / spent</th>
            <th>Progress</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>
                <strong>{project.name}</strong>
                <small>{project.description || 'No description added'}</small>
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
                <button className="pm-text-button" onClick={() => onEdit(project)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
