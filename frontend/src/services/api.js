// Use Vite's development proxy by default so the frontend does not hard-code a
// localhost backend URL into production builds. Deployments can set
// VITE_API_BASE_URL when their API is hosted on a different origin.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const jsonHeaders = {
  'Content-Type': 'application/json',
};

async function request(path, { method = 'GET', body, token } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...jsonHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('The service is unavailable. Please try again in a moment.');
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const data = text ? safeParse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error || data?.detail || text || response.statusText;
    throw new Error(message);
  }

  return data;
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const ROLE_PATHS = {
  CLIENT: '/client',
  ADMIN: '/client-manager',
  CLIENT_MANAGER: '/client-manager',
  PROJECT_MANAGER: '/project-manager',
  EMPLOYEE_MANAGER: '/employee-manager',
  INVENTORY_MANAGER: '/inventory-manager',
  SITE_MANAGER: '/site-manager',
  EMPLOYEE: '/employee',
};

export const ROLE_LABELS = {
  CLIENT: 'Valued Client',
  ADMIN: 'System Admin',
  CLIENT_MANAGER: 'Client Relationship Manager',
  PROJECT_MANAGER: 'Project Manager',
  EMPLOYEE_MANAGER: 'Employee Manager',
  INVENTORY_MANAGER: 'Material & Inventory Manager',
  SITE_MANAGER: 'Site Manager',
  EMPLOYEE: 'Employee Portal',
};

export const PROJECT_STATUS_OPTIONS = [
  'PLANNING',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
];

export const PROPERTY_CATEGORIES = [
  'RESIDENCIES',
  'APARTMENTS',
  'LANDS',
];

export function formatDate(value) {
  if (!value) {
    return '-';
  }
  return String(value).slice(0, 10);
}

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const number = Number(value);
  if (Number.isNaN(number)) {
    return String(value);
  }
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(number);
}

// Authentication
export const authLogin = (username, password, portal) => request('/api/auth/login', {
  method: 'POST',
  body: { username, password, portal },
});

// Client Management (US-CM-01, 02, 04, 05, 06, 07, 08, 25)
export const registerClient = (client) => request('/api/clients/register', { method: 'POST', body: client });
export const getNextEmployeeNumber = () => request('/api/clients/next-employee-number');
export const getClients = (search = '') => request(`/api/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const getClientById = (id) => request(`/api/clients/${id}`);
export const createClient = (client) => request('/api/clients', { method: 'POST', body: client });
export const updateClient = (id, client) => request(`/api/clients/${id}`, { method: 'PUT', body: client });
export const updateClientProfile = (id, profile) => request(`/api/clients/${id}/profile`, { method: 'PUT', body: profile });
export const deleteClient = (id) => request(`/api/clients/${id}`, { method: 'DELETE' });
export const getDashboardSummary = () => request('/api/clients/dashboard-summary');

// Contracts & Expiry Alerts (US-CM-09, 10, 11)
export const getContracts = (clientId) => request(`/api/contracts${clientId ? `?clientId=${clientId}` : ''}`);
export const getExpiringContracts = (days = 60) => request(`/api/contracts/expiring?days=${days}`);
export const getExpiredContracts = () => request('/api/contracts/expired');
export const createContract = (contract) => request('/api/contracts', { method: 'POST', body: contract });
export const updateContract = (id, contract) => request(`/api/contracts/${id}`, { method: 'PUT', body: contract });
export const deleteContract = (id) => request(`/api/contracts/${id}`, { method: 'DELETE' });

// Projects & Milestones (US-CM-12, 13, 17, 18, Category Selection)
export const getProjects = (params = {}) => {
  const query = new URLSearchParams();
  if (params.clientId) query.set('clientId', params.clientId);
  if (params.category) query.set('category', params.category);
  if (params.marketingOnly !== undefined) query.set('marketingOnly', params.marketingOnly);
  if (params.realOnly !== undefined) query.set('realOnly', params.realOnly);
  const qs = query.toString();
  return request(`/api/projects${qs ? `?${qs}` : ''}`);
};
export const getProjectById = (id) => request(`/api/projects/${id}`);
export const createProject = (project) => request('/api/projects', { method: 'POST', body: project });
export const updateProject = (id, project) => request(`/api/projects/${id}`, { method: 'PUT', body: project });
export const deleteProject = (id) => request(`/api/projects/${id}`, { method: 'DELETE' });
export const addMilestone = (projectId, milestone) => request(`/api/projects/${projectId}/milestones`, { method: 'POST', body: milestone });
export const updateMilestone = (projectId, milestoneId, milestone) => request(`/api/projects/${projectId}/milestones/${milestoneId}`, { method: 'PUT', body: milestone });
export const deleteMilestone = (projectId, milestoneId) => request(`/api/projects/${projectId}/milestones/${milestoneId}`, { method: 'DELETE' });

// Inquiries & Communication History (US-CM-14, 15, 16)
export const getInquiries = (clientId) => request(`/api/inquiries${clientId ? `?clientId=${clientId}` : ''}`);
export const createInquiry = (inquiry) => request('/api/inquiries', { method: 'POST', body: inquiry });
export const respondToInquiry = (id, response, respondedBy = 'Client Manager') => request(`/api/inquiries/${id}/respond`, {
  method: 'PUT',
  body: { response, respondedBy },
});
export const deleteInquiry = (id) => request(`/api/inquiries/${id}`, { method: 'DELETE' });

// Documents Vault (US-CM-19, 20, 21, 22)
export const getDocuments = (params = {}) => {
  const query = new URLSearchParams();
  if (params.clientId) query.set('clientId', params.clientId);
  if (params.projectId) query.set('projectId', params.projectId);
  const qs = query.toString();
  return request(`/api/documents${qs ? `?${qs}` : ''}`);
};
export const uploadDocument = (document) => request('/api/documents', { method: 'POST', body: document });
export const deleteDocument = (id) => request(`/api/documents/${id}`, { method: 'DELETE' });

// Feedback & Ratings (US-CM-23)
export const getFeedback = (clientId) => request(`/api/feedback${clientId ? `?clientId=${clientId}` : ''}`);
export const submitFeedback = (feedback) => request('/api/feedback', { method: 'POST', body: feedback });
export const getFeedbackSummary = () => request('/api/feedback/summary');
export const deleteFeedback = (id) => request(`/api/feedback/${id}`, { method: 'DELETE' });

// Notifications (US-CM-24)
export const getNotifications = (clientId) => request(`/api/notifications?clientId=${clientId}`);
export const getUnreadNotificationCount = (clientId) => request(`/api/notifications/unread-count?clientId=${clientId}`);
export const markNotificationRead = (id) => request(`/api/notifications/${id}/read`, { method: 'PUT' });
export const markAllNotificationsRead = (clientId) => request(`/api/notifications/read-all?clientId=${clientId}`, { method: 'PUT' });

// Project Manager workspace
export const getProjectManagementSummary = () => request('/api/project-management/summary');
export const getEmployees = (projectId) => request(`/api/project-management/employees${projectId ? `?projectId=${projectId}` : ''}`);
export const createEmployee = (employee) => request('/api/project-management/employees', { method: 'POST', body: employee });
export const getTasks = (projectId, employeeId) => {
  const query = new URLSearchParams();
  if (projectId) query.set('projectId', projectId);
  if (employeeId) query.set('employeeId', employeeId);
  const qs = query.toString();
  return request(`/api/project-management/tasks${qs ? `?${qs}` : ''}`);
};
export const createTask = (task) => request('/api/project-management/tasks', { method: 'POST', body: task });
export const updateTask = (id, task) => request(`/api/project-management/tasks/${id}`, { method: 'PUT', body: task });
export const updateTaskProgress = (id, payload) => request(`/api/project-management/tasks/${id}/progress`, {
  method: 'PATCH',
  body: payload,
});
export const getExpenses = (projectId) => request(`/api/project-management/expenses${projectId ? `?projectId=${projectId}` : ''}`);
export const createExpense = (expense) => request('/api/project-management/expenses', { method: 'POST', body: expense });
export const deleteExpense = (id) => request(`/api/project-management/expenses/${id}`, { method: 'DELETE' });

// Employee Management (Steps 1 to 6)
export const registerEmployee = (employee) => request('/api/employees', { method: 'POST', body: employee });
export const getNextEmployeeId = () => request('/api/employees/next-id');
export const getAllEmployees = (search = '', projectId = '') => {
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (projectId) query.set('projectId', projectId);
  const qs = query.toString();
  return request(`/api/employees${qs ? `?${qs}` : ''}`);
};
export const getEmployeeById = (id) => request(`/api/employees/${id}`);
export const updateEmployeeProfile = (id, employee) => request(`/api/employees/${id}`, { method: 'PUT', body: employee });
export const assignEmployeeRole = (id, role, position) => request(`/api/employees/${id}/role`, {
  method: 'PUT',
  body: { role, position },
});
export const assignEmployeeProjects = (id, projectIds) => request(`/api/employees/${id}/projects`, {
  method: 'PUT',
  body: { projectIds },
});
export const assignEmployeesToProject = (projectId, employeeIds) => request(`/api/employees/project/${projectId}/assign`, {
  method: 'POST',
  body: { employeeIds },
});
export const deleteEmployeeById = (id) => request(`/api/employees/${id}`, { method: 'DELETE' });
export const getEmployeeDashboardSummary = () => request('/api/employees/summary');

// Attendance Management (Step 5)
export const recordAttendance = (attendance) => request('/api/employees/attendance', { method: 'POST', body: attendance });
export const getAttendanceRecords = (params = {}) => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set('employeeId', params.employeeId);
  if (params.date) query.set('date', params.date);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return request(`/api/employees/attendance${qs ? `?${qs}` : ''}`);
};
export const getEmployeeAttendanceHistory = (id) => request(`/api/employees/${id}/attendance`);
export const getAttendanceSummary = (date = '') => request(`/api/employees/attendance/summary${date ? `?date=${date}` : ''}`);
export const deleteAttendanceRecord = (id) => request(`/api/employees/attendance/${id}`, { method: 'DELETE' });

// Employee Portal (Step 6)
export const getMyAssignedProjects = (username) => request(`/api/employees/my-projects${username ? `?username=${encodeURIComponent(username)}` : ''}`);
export const getMyEmployeeProfile = (username) => request(`/api/employees/me?username=${encodeURIComponent(username)}`);

// Material & Inventory Management (Steps 1 to 9)
export const getMaterials = (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return request(`/api/inventory/materials${qs ? `?${qs}` : ''}`);
};
export const getNextMaterialCode = () => request('/api/inventory/materials/next-code');
export const getMaterialById = (id) => request(`/api/inventory/materials/${id}`);
export const getMaterialCategories = () => request('/api/inventory/materials/categories');
export const getLowStockMaterials = () => request('/api/inventory/materials/low-stock');
export const createMaterial = (material) => request('/api/inventory/materials', { method: 'POST', body: material });
export const updateMaterial = (id, material) => request(`/api/inventory/materials/${id}`, { method: 'PUT', body: material });
export const deleteMaterial = (id) => request(`/api/inventory/materials/${id}`, { method: 'DELETE' });
export const getInventorySummary = () => request('/api/inventory/summary');

// Material Requests & Approvals (Steps 5 & 6)
export const getMaterialRequests = (params = {}) => {
  const query = new URLSearchParams();
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.materialId) query.set('materialId', params.materialId);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return request(`/api/inventory/requests${qs ? `?${qs}` : ''}`);
};
export const createMaterialRequest = (reqData) => request('/api/inventory/requests', { method: 'POST', body: reqData });
export const approveMaterialRequest = (id, approvedBy, remarks) => request(`/api/inventory/requests/${id}/approve`, {
  method: 'PUT',
  body: { approvedBy, remarks },
});
export const rejectMaterialRequest = (id, approvedBy, remarks) => request(`/api/inventory/requests/${id}/reject`, {
  method: 'PUT',
  body: { approvedBy, remarks },
});
export const issueMaterial = (id, payload) => request(`/api/inventory/requests/${id}/issue`, {
  method: 'POST',
  body: payload,
});

// Transactions & Consumption Tracking (Steps 7 & 8)
export const getMaterialTransactions = (params = {}) => {
  const query = new URLSearchParams();
  if (params.materialId) query.set('materialId', params.materialId);
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.type) query.set('type', params.type);
  const qs = query.toString();
  return request(`/api/inventory/transactions${qs ? `?${qs}` : ''}`);
};
export const getProjectMaterialConsumption = (projectId) => request(`/api/inventory/consumption/project/${projectId}`);

// Purchase Orders & Stock Replenishment (Step 9)
export const getPurchaseOrders = (params = {}) => {
  const query = new URLSearchParams();
  if (params.materialId) query.set('materialId', params.materialId);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return request(`/api/inventory/purchase-orders${qs ? `?${qs}` : ''}`);
};
export const createPurchaseOrder = (po) => request('/api/inventory/purchase-orders', { method: 'POST', body: po });
export const receivePurchaseOrder = (id, receivedBy = 'Inventory Manager') => request(`/api/inventory/purchase-orders/${id}/receive`, {
  method: 'PUT',
  body: { receivedBy },
});

// Stock Alerts & Site Manager Low Stock Informer
export const createStockAlert = (alert) => request('/api/inventory/stock-alerts', { method: 'POST', body: alert });
export const getStockAlerts = (status = '') => request(`/api/inventory/stock-alerts${status ? `?status=${encodeURIComponent(status)}` : ''}`);
export const updateStockAlertStatus = (id, status) => request(`/api/inventory/stock-alerts/${id}/status`, {
  method: 'PUT',
  body: { status },
});

// Down Payments (Feature 4)
export const getDownPayments = (params = {}) => {
  const query = new URLSearchParams();
  if (params.clientId) query.set('clientId', params.clientId);
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return request(`/api/down-payments${qs ? `?${qs}` : ''}`);
};
export const getDownPaymentById = (id) => request(`/api/down-payments/${id}`);
export const createDownPayment = (payment) => request('/api/down-payments', { method: 'POST', body: payment });
export const updateDownPayment = (id, payment) => request(`/api/down-payments/${id}`, { method: 'PUT', body: payment });
export const updateDownPaymentStatus = (id, status) => request(`/api/down-payments/${id}/status`, {
  method: 'PATCH',
  body: { status },
});
export const deleteDownPayment = (id) => request(`/api/down-payments/${id}`, { method: 'DELETE' });
export const getPaymentSummary = (clientId, projectId) => {
  const query = new URLSearchParams();
  if (clientId) query.set('clientId', clientId);
  if (projectId) query.set('projectId', projectId);
  const qs = query.toString();
  return request(`/api/down-payments/summary${qs ? `?${qs}` : ''}`);
};
