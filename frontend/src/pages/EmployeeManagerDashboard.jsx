import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  assignEmployeeProjects,
  assignEmployeeRole,
  deleteAttendanceRecord,
  deleteEmployeeById,
  formatDate,
  getAllEmployees,
  getAttendanceRecords,
  getAttendanceSummary,
  getEmployeeDashboardSummary,
  getNextEmployeeId,
  getProjects,
  recordAttendance,
  registerEmployee,
  updateEmployeeProfile,
} from '../services/api';

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

const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE', 'HALF_DAY'];

const localDateString = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const emptyEmployee = {
  employeeId: '',
  name: '',
  email: '',
  phone: '',
  position: 'Site Engineer',
  role: 'Site Engineer',
  qualifications: '',
  department: 'Engineering',
  address: '',
  status: 'ACTIVE',
  passwordHash: '',
  confirmPassword: '',
};

export default function EmployeeManagerDashboard() {
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState({});
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [attSummary, setAttSummary] = useState({});
  const [allAttendanceLogs, setAllAttendanceLogs] = useState([]);

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [selectedDate, setSelectedDate] = useState(localDateString());
  const today = localDateString();

  // Attendance Views & Filters
  const [attSubTab, setAttSubTab] = useState('markTable'); // 'markTable' | 'dayToDayLogs'
  const [attSearch, setAttSearch] = useState('');
  const [attStatusFilter, setAttStatusFilter] = useState('ALL');
  const [attDeptFilter, setAttDeptFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('ALL');

  // Forms
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [empFormErrors, setEmpFormErrors] = useState({});
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedProjectEmp, setSelectedProjectEmp] = useState(null);
  const [assignedProjectIds, setAssignedProjectIds] = useState([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Attendance Form
  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    status: 'PRESENT',
    checkInTime: '08:00',
    checkOutTime: '17:00',
    remarks: '',
  });
  const [attFormErrors, setAttFormErrors] = useState({});

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [dashSum, emps, projs, atts, attSum, allLogs] = await Promise.all([
        getEmployeeDashboardSummary(),
        getAllEmployees(search),
        getProjects(),
        getAttendanceRecords({ date: selectedDate }),
        getAttendanceSummary(selectedDate),
        getAttendanceRecords({}),
      ]);
      setSummary(dashSum || {});
      setEmployees(emps || []);
      setProjects(projs || []);
      setAttendanceList(atts || []);
      setAttSummary(attSum || {});
      setAllAttendanceLogs(allLogs || []);
    } catch (err) {
      setError(err.message || 'Error loading employee data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [search, selectedDate]);

  const report = (msg) => {
    setNotice(msg);
    setError('');
  };
  const fail = (err) => {
    setError(err.message || 'Action failed.');
    setNotice('');
  };

  const validateEmpField = (field, value, isEditing = editingEmployee) => {
    let err = '';
    const trimmed = typeof value === 'string' ? value.trim() : '';

    switch (field) {
      case 'name':
        if (!trimmed) {
          err = 'Full name is required.';
        } else if (trimmed.length < 2) {
          err = 'Name must be at least 2 characters.';
        } else if (!/^[a-zA-Z\s.\-']+$/.test(trimmed)) {
          err = 'Name must contain only letters, spaces, dots, or hyphens.';
        }
        break;

      case 'email':
        if (!trimmed) {
          err = 'Email address is required.';
        } else if (!/^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})$/.test(trimmed)) {
          err = 'Please enter a valid email address (e.g. kasun@odiliya.com).';
        }
        break;

      case 'phone':
        if (!trimmed) {
          err = 'Contact phone number is required.';
        } else if (!/^\+?[0-9\s()\-]{7,20}$/.test(trimmed)) {
          err = 'Phone number must be valid (7 to 20 digits).';
        }
        break;

      case 'role':
        if (!trimmed) {
          err = 'Role assignment is required.';
        }
        break;

      case 'department':
        if (!trimmed) {
          err = 'Department is required.';
        }
        break;

      case 'passwordHash':
        if (!isEditing && !value) {
          err = 'Password is required when registering a new employee.';
        } else if (value && value.length < 8) {
          err = 'Password must be at least 8 characters long.';
        } else if (value && !(/[a-zA-Z]/.test(value) && /\d/.test(value))) {
          err = 'Password must contain both letters and numbers.';
        }
        break;

      case 'confirmPassword':
        if ((!isEditing || employeeForm.passwordHash) && value !== employeeForm.passwordHash) {
          err = 'Passwords do not match.';
        }
        break;

      default:
        break;
    }

    setEmpFormErrors((prev) => ({ ...prev, [field]: err }));
    return err;
  };

  const handleEmpChange = (field, value) => {
    setEmployeeForm((prev) => ({ ...prev, [field]: value }));
    if (empFormErrors[field]) {
      validateEmpField(field, value);
    }
  };

  const validateAllEmpForm = () => {
    const errors = {};
    const nameErr = validateEmpField('name', employeeForm.name);
    if (nameErr) errors.name = nameErr;

    const emailErr = validateEmpField('email', employeeForm.email);
    if (emailErr) errors.email = emailErr;

    const phoneErr = validateEmpField('phone', employeeForm.phone);
    if (phoneErr) errors.phone = phoneErr;

    const roleErr = validateEmpField('role', employeeForm.role);
    if (roleErr) errors.role = roleErr;

    const deptErr = validateEmpField('department', employeeForm.department);
    if (deptErr) errors.department = deptErr;

    const passErr = validateEmpField('passwordHash', employeeForm.passwordHash);
    if (passErr) errors.passwordHash = passErr;

    const confErr = validateEmpField('confirmPassword', employeeForm.confirmPassword);
    if (confErr) errors.confirmPassword = confErr;

    setEmpFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const startNewEmployee = async () => {
    setEmpFormErrors({});
    try {
      const nextId = await getNextEmployeeId();
      setEmployeeForm({ ...emptyEmployee, employeeId: nextId });
      setEditingEmployee(null);
      setTab('register');
    } catch {
      setEmployeeForm(emptyEmployee);
      setEditingEmployee(null);
      setTab('register');
    }
  };

  const editProfile = (emp) => {
    setEmpFormErrors({});
    setEditingEmployee(emp);
    setEmployeeForm({
      employeeId: emp.employeeId || '',
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      position: emp.position || emp.role || '',
      role: emp.role || '',
      qualifications: emp.qualifications || '',
      department: emp.department || 'Engineering',
      address: emp.address || '',
      status: emp.status || 'ACTIVE',
      passwordHash: '',
      confirmPassword: '',
    });
    setTab('register');
  };

  const openProjectAssignment = (emp) => {
    setSelectedProjectEmp(emp);
    const pids = emp.assignedProjects ? emp.assignedProjects.map((p) => p.id) : [];
    if (emp.project?.id && !pids.includes(emp.project.id)) {
      pids.push(emp.project.id);
    }
    setAssignedProjectIds(pids);
    setTab('assignments');
  };

  const saveEmployee = async (e) => {
    e.preventDefault();
    if (!validateAllEmpForm()) {
      setError('Please resolve the highlighted validation errors before saving.');
      return;
    }

    try {
      if (editingEmployee) {
        await updateEmployeeProfile(editingEmployee.id, employeeForm);
        report(`Employee profile for ${employeeForm.name} updated successfully.`);
      } else {
        await registerEmployee(employeeForm);
        report(`Employee ${employeeForm.name} (${employeeForm.employeeId}) registered successfully.`);
      }
      setEditingEmployee(null);
      setEmployeeForm(emptyEmployee);
      setEmpFormErrors({});
      setTab('roster');
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const quickChangeRole = async (emp, newRole) => {
    if (!newRole || !newRole.trim()) {
      fail(new Error('Please select a valid role.'));
      return;
    }
    try {
      await assignEmployeeRole(emp.id, newRole, newRole);
      report(`Assigned role '${newRole}' to ${emp.name}.`);
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const saveProjectAssignments = async (e) => {
    if (e) e.preventDefault();
    if (!selectedProjectEmp) {
      fail(new Error('Please select an employee first.'));
      return;
    }
    try {
      setSavingAssignments(true);
      const savedEmployee = await assignEmployeeProjects(selectedProjectEmp.id, assignedProjectIds);
      await refreshData();
      const savedIds = savedEmployee.assignedProjects ? savedEmployee.assignedProjects.map((project) => project.id) : [];
      setSelectedProjectEmp(savedEmployee);
      setAssignedProjectIds(savedIds);
      report(`Project assignments for ${savedEmployee.name} saved successfully.`);
    } catch (err) {
      fail(err);
    } finally {
      setSavingAssignments(false);
    }
  };

  const toggleProjectSelection = (pid) => {
    setAssignedProjectIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const deleteEmp = async (emp) => {
    if (!window.confirm(`Are you sure you want to remove employee ${emp.name} (${emp.employeeId})?`)) {
      return;
    }
    try {
      await deleteEmployeeById(emp.id);
      report(`Employee ${emp.name} deleted.`);
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const shiftSelectedDate = (days) => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(localDateString(current));
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'PRESENT':
        return { label: 'Present', icon: '✓', bg: '#dcfce7', text: '#166534', border: '#86efac' };
      case 'ABSENT':
        return { label: 'Absent', icon: '✕', bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
      case 'LATE':
        return { label: 'Late', icon: '⏱', bg: '#fef3c7', text: '#92400e', border: '#fde047' };
      case 'HALF_DAY':
        return { label: 'Half Day', icon: '🌗', bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' };
      case 'ON_LEAVE':
        return { label: 'On Leave', icon: '🏖', bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' };
      default:
        return { label: 'Unmarked', icon: '⏳', bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
    }
  };

  const validateAttendance = () => {
    const errors = {};
    if (!attendanceForm.employeeId) {
      errors.employeeId = 'Please select an employee.';
    }
    if (!attendanceForm.status) {
      errors.status = 'Attendance status is required.';
    }
    if (['PRESENT', 'LATE'].includes(attendanceForm.status)) {
      if (!attendanceForm.checkInTime) {
        errors.checkInTime = `Check-in time is required for ${attendanceForm.status} status.`;
      }
    }
    if (attendanceForm.checkInTime && attendanceForm.checkOutTime) {
      if (attendanceForm.checkOutTime <= attendanceForm.checkInTime) {
        errors.checkOutTime = `Check-out time (${attendanceForm.checkOutTime}) must be after check-in time (${attendanceForm.checkInTime}).`;
      }
    }
    setAttFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitAttendance = async (e) => {
    e.preventDefault();
    if (!validateAttendance()) {
      setError('Please correct the attendance validation errors.');
      return;
    }
    const alreadyMarked = attendanceList.find((a) => a.employee?.id === Number(attendanceForm.employeeId));
    if (alreadyMarked) {
      fail(new Error(`Attendance for this employee is already marked for ${formatDate(selectedDate)}. In attendance, records can only be marked once and cannot be changed.`));
      return;
    }
    try {
      await recordAttendance({
        employeeId: Number(attendanceForm.employeeId),
        employee: { id: Number(attendanceForm.employeeId) },
        date: selectedDate,
        status: attendanceForm.status,
        checkInTime: ['PRESENT', 'LATE', 'HALF_DAY'].includes(attendanceForm.status) ? attendanceForm.checkInTime : null,
        checkOutTime: ['PRESENT', 'HALF_DAY'].includes(attendanceForm.status) ? attendanceForm.checkOutTime : null,
        remarks: attendanceForm.remarks,
        recordedBy: 'Employee Manager',
      });
      report(`Attendance marked as ${attendanceForm.status} for selected employee on ${formatDate(selectedDate)}.`);
      setAttendanceForm({
        employeeId: '',
        status: 'PRESENT',
        checkInTime: '08:00',
        checkOutTime: '17:00',
        remarks: '',
      });
      setAttFormErrors({});
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const quickMarkAttendance = async (empId, status, empName = '', customRemarks = '') => {
    try {
      const existing = attendanceList.find((a) => a.employee?.id === empId);
      if (existing) {
        fail(new Error(`Attendance for ${empName || 'this employee'} is already marked and locked for ${formatDate(selectedDate)}. In attendance, records can only be marked once and cannot be changed.`));
        return;
      }

      let inTime = null;
      let outTime = null;

      if (['PRESENT', 'LATE', 'HALF_DAY'].includes(status)) {
        inTime = status === 'LATE' ? '09:30' : '08:00';
        outTime = status === 'HALF_DAY' ? '12:00' : '17:00';
      }

      await recordAttendance({
        employeeId: empId,
        employee: { id: empId },
        date: selectedDate,
        status: status,
        checkInTime: inTime,
        checkOutTime: outTime,
        remarks: customRemarks || (status === 'ABSENT' ? 'Recorded as Absent' : `Marked as ${status}`),
        recordedBy: 'Employee Manager',
      });
      report(`Attendance for ${empName || 'employee'} marked as ${status} on ${formatDate(selectedDate)}.`);
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const handleStatusChange = async (emp, newStatus) => {
    if (!newStatus) return;
    const existing = attendanceList.find((a) => a.employee?.id === emp.id);
    if (existing) {
      fail(new Error(`Attendance for ${emp.name} is already marked and locked for ${formatDate(selectedDate)}. In attendance, records can only be marked once and cannot be changed.`));
      return;
    }
    await quickMarkAttendance(emp.id, newStatus, emp.name);
  };

  const markAllUnmarkedPresent = async () => {
    const unmarked = employees.filter((emp) => !attendanceList.some((a) => a.employee?.id === emp.id));
    if (unmarked.length === 0) {
      report('All employees are already marked for this date.');
      return;
    }
    if (!window.confirm(`Mark all ${unmarked.length} remaining unmarked employee(s) as Present for ${formatDate(selectedDate)}? (Note: Once marked, attendance is permanent and cannot be changed.)`)) {
      return;
    }
    try {
      setLoading(true);
      await Promise.all(
        unmarked.map((emp) =>
          recordAttendance({
            employeeId: emp.id,
            employee: { id: emp.id },
            date: selectedDate,
            status: 'PRESENT',
            checkInTime: '08:00',
            checkOutTime: '17:00',
            remarks: 'Bulk marked Present',
            recordedBy: 'Employee Manager',
          })
        )
      );
      report(`Successfully marked ${unmarked.length} staff member(s) as Present.`);
      await refreshData();
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (filterRole && emp.role !== filterRole && emp.position !== filterRole) {
        return false;
      }
      return true;
    });
  }, [employees, filterRole]);

  const filteredAttendanceEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (attSearch.trim()) {
        const q = attSearch.toLowerCase().trim();
        const matchesName = emp.name?.toLowerCase().includes(q);
        const matchesId = emp.employeeId?.toLowerCase().includes(q);
        const matchesRole = emp.role?.toLowerCase().includes(q) || emp.position?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesRole) return false;
      }
      if (attDeptFilter && attDeptFilter !== 'ALL') {
        if (emp.department !== attDeptFilter) return false;
      }
      if (attStatusFilter && attStatusFilter !== 'ALL') {
        const record = attendanceList.find((a) => a.employee?.id === emp.id);
        const status = record ? record.status : 'UNMARKED';
        if (attStatusFilter === 'UNMARKED' && status !== 'UNMARKED') return false;
        if (attStatusFilter !== 'UNMARKED' && status !== attStatusFilter) return false;
      }
      return true;
    });
  }, [employees, attendanceList, attSearch, attDeptFilter, attStatusFilter]);

  const groupedLogs = useMemo(() => {
    let filtered = allAttendanceLogs;
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (l) =>
          l.employee?.name?.toLowerCase().includes(q) ||
          l.employee?.employeeId?.toLowerCase().includes(q) ||
          l.employee?.role?.toLowerCase().includes(q) ||
          l.remarks?.toLowerCase().includes(q)
      );
    }
    if (logStatusFilter && logStatusFilter !== 'ALL') {
      filtered = filtered.filter((l) => l.status === logStatusFilter);
    }

    const groups = {};
    for (const log of filtered) {
      const dateKey = log.date || 'Unspecified Date';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    }
    return groups;
  }, [allAttendanceLogs, logSearch, logStatusFilter]);

  const employeesAssignedTo = (projectId) => employees.filter((employee) => {
    const assignedIds = employee.assignedProjects?.map((project) => project.id) || [];
    return assignedIds.includes(projectId) || employee.project?.id === projectId;
  });

  return (
    <div className="light-site-wrapper">
      <Navbar />

      <main className="pm-page em-workspace">
        {/* Hero Section */}
        <section className="pm-hero em-hero">
          <div>
            <span className="brand-green-subtitle em-hero__eyebrow">WORKFORCE CONTROL</span>
            <h1 className="em-hero__title">
              Employee Manager Workspace
            </h1>
            <p className="em-hero__copy">
              Register staff, coordinate site teams, and keep attendance and project assignments visible.
            </p>
          </div>
        </section>

        {/* Workspace Navigation Tabs */}
        <nav className="pm-tabs em-tabs">
          <button
            onClick={() => setTab('overview')}
            className={`btn-tab em-tab ${tab === 'overview' ? 'active' : ''}`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab('roster')}
            className={`btn-tab em-tab ${tab === 'roster' ? 'active' : ''}`}
          >
            Employees
          </button>
          <button
            onClick={startNewEmployee}
            className={`btn-tab em-tab ${tab === 'register' ? 'active' : ''}`}
          >
            {editingEmployee ? 'Edit employee' : 'Register employee'}
          </button>
          <button
            onClick={() => setTab('assignments')}
            className={`btn-tab em-tab ${tab === 'assignments' ? 'active' : ''}`}
          >
            Assignments
          </button>
          <button
            onClick={() => setTab('projects')}
            className={`btn-tab em-tab ${tab === 'projects' ? 'active' : ''}`}
          >
            Projects
          </button>
          <button
            onClick={() => setTab('attendance')}
            className={`btn-tab em-tab ${tab === 'attendance' ? 'active' : ''}`}
          >
            Attendance
          </button>
        </nav>

        {notice && (
          <div className="em-notice em-notice--success">
            {notice}
          </div>
        )}
        {error && (
          <div className="em-notice em-notice--error">
            {error}
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {tab === 'overview' && (
          <div>
            <section className="em-metric-grid">
              <MetricBox label="Total staff" value={summary.totalEmployees ?? employees.length} />
              <MetricBox label="Active staff" value={summary.activeEmployees ?? employees.length} />
              <MetricBox label="Present today" value={attSummary.presentCount ?? 0} />
              <MetricBox label="Attendance rate" value={`${attSummary.attendanceRate ?? 0}%`} />
            </section>

            {/* Role Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 16px', color: '#111827', fontSize: '1.1rem' }}>Workforce by Role / Trade</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {summary.roleCounts &&
                    Object.entries(summary.roleCounts).map(([rName, count]) => (
                      <div key={rName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: '6px' }}>
                        <span style={{ fontWeight: 500, color: '#374151' }}>{rName}</span>
                        <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
                          {count} {count === 1 ? 'staff' : 'staff'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Quick Actions Card */}
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 16px', color: '#111827', fontSize: '1.1rem' }}>Quick Management Tasks</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={startNewEmployee}
                    style={{ padding: '12px 16px', background: '#f3f4f6', color: '#111827', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                  >
                    Register New Employee
                  </button>
                  <button
                    onClick={() => setTab('roster')}
                    style={{ padding: '12px 16px', background: '#f3f4f6', color: '#111827', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                  >
                    Update Profile &amp; Qualifications
                  </button>
                  <button
                    onClick={() => setTab('assignments')}
                    style={{ padding: '12px 16px', background: '#f3f4f6', color: '#111827', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                  >
                    Assign Staff to Construction Projects
                  </button>
                  <button
                    onClick={() => setTab('attendance')}
                    style={{ padding: '12px 16px', background: '#f3f4f6', color: '#111827', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                  >
                    Mark Daily Attendance
                  </button>
                </div>
              </div>
            </div>

            {/* Day-to-Day Attendance Activity & Record Logs */}
            <div style={{ marginTop: '24px', background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#111827', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📋</span> Day-to-Day Attendance Record Logs
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.85rem' }}>
                    Chronological workforce attendance activity, ordered day by day.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTab('attendance');
                    setAttSubTab('dayToDayLogs');
                  }}
                  style={{ padding: '8px 16px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  View All Attendance Logs &rarr;
                </button>
              </div>

              {allAttendanceLogs.length === 0 ? (
                <div style={{ padding: '28px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                  No attendance records logged yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>DATE</th>
                        <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>STAFF</th>
                        <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>ROLE / TRADE</th>
                        <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>STATUS</th>
                        <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>TIME IN / OUT</th>
                        <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>REMARKS</th>
                        <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem', textAlign: 'right' }}>STATUS / AUDIT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAttendanceLogs.slice(0, 10).map((log) => {
                        const conf = getStatusConfig(log.status);
                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827', fontSize: '0.85rem' }}>
                              {formatDate(log.date)}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>
                                {log.employee?.name || 'Staff Member'}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#047857', background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                {log.employee?.employeeId || `EMP-${log.employee?.id}`}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#4b5563' }}>
                              {log.employee?.role || log.employee?.position || 'General'}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                padding: '3px 9px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: conf.bg,
                                color: conf.text,
                                border: `1px solid ${conf.border}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}>
                                <span>{conf.icon}</span> {conf.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#4b5563' }}>
                              {log.checkInTime ? `${log.checkInTime} - ${log.checkOutTime || '—'}` : '—'}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#6b7280', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.remarks}>
                              {log.remarks || '—'}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <span style={{
                                fontSize: '0.75rem',
                                color: '#047857',
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                padding: '3px 9px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}>
                                🔒 Finalized Log
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {allAttendanceLogs.length > 10 && (
                    <div style={{ padding: '10px 14px', textAlign: 'center', background: '#f9fafb', borderTop: '1px solid #e5e7eb', fontSize: '0.8rem', color: '#6b7280' }}>
                      Showing 10 most recent records of {allAttendanceLogs.length} total. Click "View All Attendance Logs" to inspect complete history.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STAFF ROSTER & PROFILES */}
        {tab === 'roster' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
                <input
                  type="text"
                  placeholder="Search employee name, ID, trade, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                >
                  <option value="">All Roles / Trades</option>
                  {ROLES_LIST.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={startNewEmployee}
                style={{ padding: '10px 18px', background: '#047857', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Register Employee
              </button>
            </div>

            {/* Employee Table */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>EMPLOYEE ID</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>NAME &amp; CONTACT</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>ROLE / POSITION</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>QUALIFICATIONS</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>ASSIGNED PROJECTS</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>STATUS</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                        No employees found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>
                            {emp.employeeId || `EMP-${emp.id}`}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{emp.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            {emp.phone || 'No phone'} | {emp.email || 'No email'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <select
                            value={emp.role || emp.position || ''}
                            onChange={(e) => quickChangeRole(emp, e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', fontWeight: 500 }}
                            title="Step 3: Assign Employee Role"
                          >
                            {ROLES_LIST.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>{emp.department || 'General'}</div>
                        </td>
                        <td style={{ padding: '14px 16px', maxWidth: '220px' }}>
                          <div style={{ fontSize: '0.85rem', color: '#374151', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={emp.qualifications}>
                            {emp.qualifications || <span style={{ color: '#9ca3af' }}>Not specified</span>}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {emp.assignedProjects && emp.assignedProjects.length > 0 ? (
                              emp.assignedProjects.map((p) => (
                                <span key={p.id} style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                                  {p.name}
                                </span>
                              ))
                            ) : emp.project ? (
                              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                                {emp.project.name}
                              </span>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Unassigned</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: String(emp.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                            color: String(emp.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? '#166534' : '#991b1b',
                          }}>
                            {String(emp.status || 'ACTIVE').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => editProfile(emp)}
                              style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}
                              title="Edit Employee Profile"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openProjectAssignment(emp)}
                              style={{ padding: '4px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}
                              title="Assign Projects"
                            >
                              Projects
                            </button>
                            <button
                              onClick={() => deleteEmp(emp)}
                              style={{ padding: '4px 8px', background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                              title="Delete Employee"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: REGISTER / EDIT EMPLOYEE */}
        {tab === 'register' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '1.4rem' }}>
                {editingEmployee ? `Manage Employee Profile: ${editingEmployee.name}` : 'Register New Employee'}
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '4px 0 0' }}>
                Store and update employee identification, position, trade role, qualifications, and department details.
              </p>
            </div>

            <form onSubmit={saveEmployee} noValidate style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Employee ID (generated automatically)
                </label>
                <input
                  type="text"
                  value={employeeForm.employeeId}
                  readOnly
                  placeholder="Generated automatically"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box', background: '#f3f4f6', color: '#047857', fontWeight: 700, cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={employeeForm.name}
                  onChange={(e) => handleEmpChange('name', e.target.value)}
                  onBlur={(e) => validateEmpField('name', e.target.value)}
                  placeholder="e.g. Kasun Perera"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${empFormErrors.name ? '#ef4444' : '#d1d5db'}`, boxSizing: 'border-box' }}
                />
                {empFormErrors.name && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {empFormErrors.name}
                  </span>
                )}
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Contact / Phone Number *
                </label>
                <input
                  type="tel"
                  value={employeeForm.phone}
                  onChange={(e) => handleEmpChange('phone', e.target.value)}
                  onBlur={(e) => validateEmpField('phone', e.target.value)}
                  placeholder="e.g. +94 77 123 4567"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${empFormErrors.phone ? '#ef4444' : '#d1d5db'}`, boxSizing: 'border-box' }}
                />
                {empFormErrors.phone && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {empFormErrors.phone}
                  </span>
                )}
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Email Address (for login &amp; alerts) *
                </label>
                <input
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => handleEmpChange('email', e.target.value)}
                  onBlur={(e) => validateEmpField('email', e.target.value)}
                  placeholder="e.g. kasun@odiliya.com"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${empFormErrors.email ? '#ef4444' : '#d1d5db'}`, boxSizing: 'border-box' }}
                />
                {empFormErrors.email && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {empFormErrors.email}
                  </span>
                )}
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Role / Trade Assignment (Step 3) *
                </label>
                <select
                  value={employeeForm.role}
                  onChange={(e) => handleEmpChange('role', e.target.value)}
                  onBlur={(e) => validateEmpField('role', e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${empFormErrors.role ? '#ef4444' : '#d1d5db'}`, boxSizing: 'border-box' }}
                >
                  {ROLES_LIST.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {empFormErrors.role && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {empFormErrors.role}
                  </span>
                )}
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Department *
                </label>
                <select
                  value={employeeForm.department}
                  onChange={(e) => handleEmpChange('department', e.target.value)}
                  onBlur={(e) => validateEmpField('department', e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${empFormErrors.department ? '#ef4444' : '#d1d5db'}`, boxSizing: 'border-box' }}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {empFormErrors.department && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {empFormErrors.department}
                  </span>
                )}
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Qualifications &amp; Certifications
                </label>
                <textarea
                  value={employeeForm.qualifications}
                  onChange={(e) => handleEmpChange('qualifications', e.target.value)}
                  placeholder="e.g. B.Sc. Civil Engineering (Hons), CEng MIE(SL), Chartered Site Engineer, NVQ Level 4..."
                  rows="3"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Residential Address
                </label>
                <input
                  type="text"
                  value={employeeForm.address}
                  onChange={(e) => handleEmpChange('address', e.target.value)}
                  placeholder="e.g. No. 45, Galle Road, Colombo 03"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Employment Status
                </label>
                <select
                  value={employeeForm.status}
                  onChange={(e) => handleEmpChange('status', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Password {editingEmployee ? '(leave blank to keep unchanged)' : '*'}
                </label>
                <input
                  type="password"
                  value={employeeForm.passwordHash}
                  onChange={(e) => handleEmpChange('passwordHash', e.target.value)}
                  onBlur={(e) => validateEmpField('passwordHash', e.target.value)}
                  placeholder={editingEmployee ? 'Leave blank to keep unchanged' : 'Enter password (min. 8 chars, letters & numbers)'}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${empFormErrors.passwordHash ? '#ef4444' : '#d1d5db'}`, boxSizing: 'border-box' }}
                  autoComplete="new-password"
                />
                {empFormErrors.passwordHash && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {empFormErrors.passwordHash}
                  </span>
                )}
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Confirm Password {editingEmployee ? '(if changing password)' : '*'}
                </label>
                <input
                  type="password"
                  value={employeeForm.confirmPassword}
                  onChange={(e) => handleEmpChange('confirmPassword', e.target.value)}
                  onBlur={(e) => validateEmpField('confirmPassword', e.target.value)}
                  placeholder={editingEmployee ? 'Confirm new password' : 'Confirm password'}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${empFormErrors.confirmPassword ? '#ef4444' : '#d1d5db'}`, boxSizing: 'border-box' }}
                  autoComplete="new-password"
                />
                {empFormErrors.confirmPassword && (
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    {empFormErrors.confirmPassword}
                  </span>
                )}
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="submit"
                  style={{ padding: '12px 24px', background: '#047857', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {editingEmployee ? 'Save Profile Changes' : 'Complete Registration'}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('roster')}
                  style={{ padding: '12px 20px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: STEP 4 - PROJECT ASSIGNMENTS */}
        {tab === 'assignments' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            {/* Left: Select Employee to View */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 12px', color: '#111827', fontSize: '1.2rem' }}>
                Employee Project Assignments
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 16px' }}>
                Select an employee to view their assigned construction sites and active projects.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
                {employees.map((emp) => {
                  const isSelected = selectedProjectEmp?.id === emp.id;
                  const empProjects = emp.assignedProjects && emp.assignedProjects.length > 0
                    ? emp.assignedProjects
                    : (emp.project ? [emp.project] : []);
                  const projectCount = empProjects.length;
                  return (
                    <div
                      key={emp.id}
                      onClick={() => openProjectAssignment(emp)}
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
                            {emp.employeeId}
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

            {/* Right: View Assigned Projects */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              {selectedProjectEmp ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #f3f4f6', paddingBottom: '14px', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.2rem' }}>
                        {selectedProjectEmp.name}'s Assigned Projects
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>
                        Role: <b>{selectedProjectEmp.role || selectedProjectEmp.position}</b> ({selectedProjectEmp.employeeId}) · Dept: <b>{selectedProjectEmp.department || 'Engineering'}</b>
                      </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '999px', fontWeight: 600 }}>
                      View Only Mode
                    </span>
                  </div>

                  {(() => {
                    const assignedList = selectedProjectEmp.assignedProjects && selectedProjectEmp.assignedProjects.length > 0
                      ? selectedProjectEmp.assignedProjects
                      : (selectedProjectEmp.project ? [selectedProjectEmp.project] : []);

                    if (assignedList.length === 0) {
                      return (
                        <div style={{ padding: '30px 20px', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', border: '1px dashed #e5e7eb', color: '#6b7280' }}>
                          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>No projects currently assigned</p>
                          <small>The Project Manager can allocate this employee to active construction sites.</small>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {assignedList.map((proj) => (
                          <div
                            key={proj.id}
                            style={{
                              padding: '14px 16px',
                              borderRadius: '8px',
                              border: '1.5px solid #10b981',
                              background: '#f0fdf4',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, color: '#111827', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🏗️ {proj.name}
                                <span style={{ fontSize: '0.72rem', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                                  ✓ Assigned
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '4px' }}>
                                Location: <b>{proj.location || 'Site location'}</b> | Status: <b>{proj.status}</b> | Client: <b>{proj.client?.name || 'Odiliya In-House'}</b>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857' }}>
                                {proj.progressPercentage || 0}% Progress
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div style={{ marginTop: '20px', padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1e40af', fontSize: '0.82rem' }}>
                    ℹ️ <b>Note:</b> Project assignments and team allocations are managed in the <b>Project Manager Workspace</b>.
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                  <p style={{ fontWeight: 500 }}>Select an employee from the left panel to view their assigned projects.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PROJECT TEAMS */}
        {tab === 'projects' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '1.4rem' }}>Project Teams</h2>
              <p style={{ color: '#6b7280', margin: '6px 0 0' }}>View every employee assigned to each project. Use Assignments to add or remove team members.</p>
            </div>
            {projects.length === 0 ? (
              <div style={{ background: '#fff', padding: '28px', borderRadius: '12px', border: '1px solid #e5e7eb', color: '#6b7280' }}>
                No projects are available yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {projects.map((project) => {
                  const team = employeesAssignedTo(project.id);
                  return (
                    <article key={project.id} style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div>
                          <h3 style={{ margin: 0, color: '#111827', fontSize: '1.15rem' }}>{project.name}</h3>
                          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '5px 0 0' }}>📍 {project.location || 'Location not specified'} · {project.status}</p>
                        </div>
                        <span style={{ background: '#ecfdf5', color: '#166534', borderRadius: '999px', padding: '4px 9px', fontSize: '0.75rem', fontWeight: 700 }}>{team.length} assigned</span>
                      </div>
                      <div style={{ borderTop: '1px solid #f3f4f6', marginTop: '16px', paddingTop: '14px' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#374151' }}>Assigned employees</strong>
                        {team.length ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                            {team.map((employee) => (
                              <div key={employee.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', background: '#f9fafb', borderRadius: '7px', padding: '8px 10px' }}>
                                <span style={{ color: '#111827', fontWeight: 600 }}>{employee.name}</span>
                                <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{employee.role || employee.position}</span>
                              </div>
                            ))}
                          </div>
                        ) : <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '10px 0 0' }}>No employees assigned.</p>}
                      </div>
                      <button type="button" onClick={() => setTab('assignments')} style={{ marginTop: '16px', padding: '9px 13px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '7px', fontWeight: 600, cursor: 'pointer' }}>
                        Manage Assignments
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: STEP 5 - ATTENDANCE REGISTER */}
        {tab === 'attendance' && (
          <div>
            {/* Top Workspace Header & View Switcher */}
            <div style={{ background: '#fff', padding: '20px 24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#111827', fontSize: '1.4rem', fontWeight: 800 }}>
                    Workforce Attendance Management
                  </h2>
                  <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: '0.88rem' }}>
                    Mark daily site attendance, update staff statuses, clear marked records, or inspect day-to-day activity logs.
                  </p>
                </div>

                {/* Sub-view switcher tabs */}
                <div style={{ display: 'inline-flex', background: '#f3f4f6', padding: '4px', borderRadius: '10px', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setAttSubTab('markTable')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: attSubTab === 'markTable' ? '#047857' : 'transparent',
                      color: attSubTab === 'markTable' ? '#ffffff' : '#374151',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>📝</span> Daily Marking Register Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttSubTab('dayToDayLogs')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: attSubTab === 'dayToDayLogs' ? '#047857' : 'transparent',
                      color: attSubTab === 'dayToDayLogs' ? '#ffffff' : '#374151',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>📜</span> Day-to-Day Record Logs
                    <span style={{
                      background: attSubTab === 'dayToDayLogs' ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                      color: attSubTab === 'dayToDayLogs' ? '#ffffff' : '#374151',
                      padding: '1px 8px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}>
                      {allAttendanceLogs.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Date Navigation Bar (always accessible) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>Selected Date:</span>
                  <button
                    type="button"
                    onClick={() => shiftSelectedDate(-1)}
                    style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                    title="Previous Day"
                  >
                    &larr; Prev Day
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDate(e.target.value);
                    }}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #047857', fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => shiftSelectedDate(1)}
                    style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                    title="Next Day"
                  >
                    Next Day &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(today)}
                    style={{
                      padding: '6px 12px',
                      background: selectedDate === today ? '#ecfdf5' : '#f3f4f6',
                      border: `1px solid ${selectedDate === today ? '#86efac' : '#d1d5db'}`,
                      color: selectedDate === today ? '#047857' : '#374151',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Today
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    background: selectedDate === today ? '#ecfdf5' : '#eff6ff',
                    color: selectedDate === today ? '#166534' : '#1d4ed8',
                    border: `1px solid ${selectedDate === today ? '#a7f3d0' : '#bfdbfe'}`,
                  }}>
                    {selectedDate === today ? '📍 Managing Today\'s Register' : `📅 Date: ${formatDate(selectedDate)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* VIEW 1: DAILY MARKING REGISTER TABLE */}
            {attSubTab === 'markTable' && (
              <div>
                {/* Quick Metrics for selected date */}
                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL WORKFORCE</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', marginTop: '4px' }}>{employees.length}</div>
                  </div>
                  <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 700, textTransform: 'uppercase' }}>PRESENT</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#065f46', marginTop: '4px' }}>{attSummary.presentCount ?? 0}</div>
                  </div>
                  <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '10px', border: '1px solid #fecaca' }}>
                    <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>ABSENT</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#991b1b', marginTop: '4px' }}>{attSummary.absentCount ?? 0}</div>
                  </div>
                  <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                    <span style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>LATE / LEAVE / HALF</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#92400e', marginTop: '4px' }}>
                      {(attSummary.lateCount ?? 0) + (attSummary.onLeaveCount ?? 0)}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>UNMARKED</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#475569', marginTop: '4px' }}>{attSummary.unmarkedCount ?? 0}</div>
                  </div>
                </section>

                {/* Filter and Quick Action Toolbar */}
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="Search employee name, ID, role..."
                        value={attSearch}
                        onChange={(e) => setAttSearch(e.target.value)}
                        style={{ flex: 1, minWidth: '200px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem' }}
                      />
                      <select
                        value={attDeptFilter}
                        onChange={(e) => setAttDeptFilter(e.target.value)}
                        style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem' }}
                      >
                        <option value="ALL">All Departments</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={markAllUnmarkedPresent}
                        style={{
                          padding: '9px 14px',
                          background: '#047857',
                          color: '#fff',
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
                        <span>⚡</span> Mark Unmarked as Present
                      </button>
                    </div>
                  </div>

                  {/* Status Filter Buttons */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', marginRight: '4px' }}>Filter Status:</span>
                    {[
                      { key: 'ALL', label: 'All', count: employees.length },
                      { key: 'UNMARKED', label: 'Unmarked', count: attSummary.unmarkedCount ?? 0 },
                      { key: 'PRESENT', label: 'Present', count: attSummary.presentCount ?? 0 },
                      { key: 'ABSENT', label: 'Absent', count: attSummary.absentCount ?? 0 },
                      { key: 'LATE', label: 'Late', count: attSummary.lateCount ?? 0 },
                      { key: 'HALF_DAY', label: 'Half Day', count: attendanceList.filter((a) => a.status === 'HALF_DAY').length },
                      { key: 'ON_LEAVE', label: 'On Leave', count: attSummary.onLeaveCount ?? 0 },
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        type="button"
                        onClick={() => setAttStatusFilter(btn.key)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          border: attStatusFilter === btn.key ? '1px solid #047857' : '1px solid #e5e7eb',
                          background: attStatusFilter === btn.key ? '#ecfdf5' : '#f9fafb',
                          color: attStatusFilter === btn.key ? '#047857' : '#4b5563',
                          cursor: 'pointer',
                        }}
                      >
                        {btn.label} ({btn.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* THE DAILY ATTENDANCE MARKING TABLE */}
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflowX: 'auto', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>
                      📋 Attendance Marking Register Table — {formatDate(selectedDate)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      Showing {filteredAttendanceEmployees.length} employee(s) • Unmarked staff can be marked once. Once recorded, attendance is locked permanently.
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.82rem', fontWeight: 700 }}>STAFF MEMBER</th>
                        <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.82rem', fontWeight: 700 }}>TRADE &amp; DEPARTMENT</th>
                        <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.82rem', fontWeight: 700 }}>ATTENDANCE STATUS</th>
                        <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.82rem', fontWeight: 700 }}>TIME IN / OUT</th>
                        <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.82rem', fontWeight: 700 }}>SITE REMARKS</th>
                        <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.82rem', fontWeight: 700, textAlign: 'right' }}>QUICK ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendanceEmployees.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#6b7280' }}>
                            No employees found matching the filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendanceEmployees.map((emp) => {
                          const record = attendanceList.find((a) => a.employee?.id === emp.id);
                          const currentStatus = record ? record.status : 'UNMARKED';
                          const statusConf = getStatusConfig(currentStatus);

                          return (
                            <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              {/* 1. Staff Member */}
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.92rem' }}>
                                  {emp.name}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px' }}>
                                    {emp.employeeId || `EMP-${emp.id}`}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {emp.phone || emp.email || ''}
                                  </span>
                                </div>
                              </td>

                              {/* 2. Trade & Department */}
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>
                                  {emp.role || emp.position}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                  {emp.department || 'General'}
                                </div>
                              </td>

                              {/* 3. Attendance Status */}
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                  {/* Status Badge */}
                                  <span style={{
                                    padding: '3px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: statusConf.bg,
                                    color: statusConf.text,
                                    border: `1px solid ${statusConf.border}`,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}>
                                    <span>{statusConf.icon}</span> {statusConf.label}
                                  </span>

                                  {record ? (
                                    <span style={{
                                      fontSize: '0.72rem',
                                      color: '#047857',
                                      background: '#ecfdf5',
                                      border: '1px solid #a7f3d0',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}>
                                      🔒 Marked &amp; Locked
                                    </span>
                                  ) : (
                                    <select
                                      value=""
                                      onChange={(e) => handleStatusChange(emp, e.target.value)}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        border: '1px solid #10b981',
                                        background: '#ffffff',
                                        color: '#047857',
                                        cursor: 'pointer',
                                      }}
                                      title="Mark attendance (once marked, cannot be changed)"
                                    >
                                      <option value="" disabled>Select Status to Mark...</option>
                                      <option value="PRESENT">✓ Present (Full Day)</option>
                                      <option value="ABSENT">✕ Absent</option>
                                      <option value="LATE">⏱ Late (Delayed arrival)</option>
                                      <option value="HALF_DAY">🌗 Half Day (4 Hours)</option>
                                      <option value="ON_LEAVE">🏖 On Leave</option>
                                    </select>
                                  )}
                                </div>
                              </td>

                              {/* 4. Time In / Out */}
                              <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#4b5563' }}>
                                {['PRESENT', 'LATE', 'HALF_DAY'].includes(currentStatus) ? (
                                  <div>
                                    <div><b>In:</b> {record?.checkInTime || '08:00'}</div>
                                    <div><b>Out:</b> {record?.checkOutTime || (currentStatus === 'HALF_DAY' ? '12:00' : '17:00')}</div>
                                  </div>
                                ) : (
                                  <span style={{ color: '#9ca3af' }}>—</span>
                                )}
                              </td>

                              {/* 5. Site Remarks */}
                              <td style={{ padding: '12px 16px', maxWidth: '200px' }}>
                                <div
                                  style={{ fontSize: '0.82rem', color: record?.remarks ? '#374151' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                  title={record?.remarks || 'No remarks logged'}
                                >
                                  {record?.remarks || '—'}
                                </div>
                              </td>

                              {/* 6. Quick Actions */}
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                {record ? (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    background: '#ecfdf5',
                                    border: '1px solid #a7f3d0',
                                    color: '#047857',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                  }}>
                                    🔒 Marked &amp; Finalized
                                  </span>
                                ) : (
                                  <div style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      onClick={() => quickMarkAttendance(emp.id, 'PRESENT', emp.name)}
                                      style={{
                                        padding: '4px 8px',
                                        background: '#ecfdf5',
                                        color: '#047857',
                                        border: '1px solid #86efac',
                                        borderRadius: '4px',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                      title="Mark Present (cannot be changed once marked)"
                                    >
                                      Present
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => quickMarkAttendance(emp.id, 'ABSENT', emp.name)}
                                      style={{
                                        padding: '4px 8px',
                                        background: '#fef2f2',
                                        color: '#991b1b',
                                        border: '1px solid #fca5a5',
                                        borderRadius: '4px',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                      title="Mark Absent (cannot be changed once marked)"
                                    >
                                      Absent
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => quickMarkAttendance(emp.id, 'LATE', emp.name)}
                                      style={{
                                        padding: '4px 8px',
                                        background: '#fffbeb',
                                        color: '#92400e',
                                        border: '1px solid #fde047',
                                        borderRadius: '4px',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                      title="Mark Late (cannot be changed once marked)"
                                    >
                                      Late
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => quickMarkAttendance(emp.id, 'HALF_DAY', emp.name)}
                                      style={{
                                        padding: '4px 8px',
                                        background: '#f0f9ff',
                                        color: '#0369a1',
                                        border: '1px solid #7dd3fc',
                                        borderRadius: '4px',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                      title="Mark Half Day (cannot be changed once marked)"
                                    >
                                      Half
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => quickMarkAttendance(emp.id, 'ON_LEAVE', emp.name)}
                                      style={{
                                        padding: '4px 8px',
                                        background: '#f5f3ff',
                                        color: '#6d28d9',
                                        border: '1px solid #c4b5fd',
                                        borderRadius: '4px',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                      title="Mark On Leave (cannot be changed once marked)"
                                    >
                                      Leave
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Collapsible Manual Detailed Entry Card */}
                <details style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <summary style={{ fontWeight: 700, color: '#374151', cursor: 'pointer', fontSize: '0.92rem' }}>
                    ➕ Manual Custom Attendance Entry (Click to expand)
                  </summary>
                  <div style={{ marginTop: '16px' }}>
                    <form onSubmit={submitAttendance} noValidate style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Employee *</label>
                        <select
                          value={attendanceForm.employeeId}
                          onChange={(e) => {
                            setAttendanceForm({ ...attendanceForm, employeeId: e.target.value });
                            if (attFormErrors.employeeId) setAttFormErrors({ ...attFormErrors, employeeId: '' });
                          }}
                          required
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${attFormErrors.employeeId ? '#ef4444' : '#d1d5db'}` }}
                        >
                          <option value="">-- Choose Employee --</option>
                          {employees.map((emp) => {
                            const isMarked = attendanceList.some((a) => a.employee?.id === emp.id);
                            return (
                              <option key={emp.id} value={emp.id} disabled={isMarked}>
                                {emp.name} ({emp.employeeId || `EMP-${emp.id}`}) - {emp.role} {isMarked ? '🔒 (Marked & Locked)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        {attFormErrors.employeeId && (
                          <span style={{ color: '#ef4444', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                            {attFormErrors.employeeId}
                          </span>
                        )}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Status *</label>
                        <select
                          value={attendanceForm.status}
                          onChange={(e) => {
                            setAttendanceForm({ ...attendanceForm, status: e.target.value });
                            if (attFormErrors.status) setAttFormErrors({ ...attFormErrors, status: '' });
                          }}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${attFormErrors.status ? '#ef4444' : '#d1d5db'}` }}
                        >
                          {ATTENDANCE_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      {['PRESENT', 'LATE', 'HALF_DAY'].includes(attendanceForm.status) && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Check-In Time</label>
                          <input
                            type="time"
                            value={attendanceForm.checkInTime}
                            onChange={(e) => setAttendanceForm({ ...attendanceForm, checkInTime: e.target.value })}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                          />
                        </div>
                      )}

                      {['PRESENT', 'HALF_DAY'].includes(attendanceForm.status) && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Check-Out Time</label>
                          <input
                            type="time"
                            value={attendanceForm.checkOutTime}
                            onChange={(e) => setAttendanceForm({ ...attendanceForm, checkOutTime: e.target.value })}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                          />
                        </div>
                      )}

                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Remarks / Site Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. Morning foundation inspection, Sick leave approved..."
                          value={attendanceForm.remarks}
                          onChange={(e) => setAttendanceForm({ ...attendanceForm, remarks: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        />
                      </div>

                      <div>
                        <button
                          type="submit"
                          style={{ width: '100%', padding: '10px 16px', background: '#047857', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Record Attendance
                        </button>
                      </div>
                    </form>
                  </div>
                </details>
              </div>
            )}

            {/* VIEW 2: DAY-TO-DAY RECORD LOGS */}
            {attSubTab === 'dayToDayLogs' && (
              <div>
                {/* Search & Filter Header for Logs */}
                <div style={{ background: '#fff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e5e7eb', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#111827', fontSize: '1.25rem', fontWeight: 800 }}>
                        Day-to-Day Attendance Master Record Logs
                      </h3>
                      <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.85rem' }}>
                        Complete log history of site attendance ordered chronologically day by day.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="Search employee name, ID, notes..."
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.85rem', minWidth: '240px' }}
                      />
                      <select
                        value={logStatusFilter}
                        onChange={(e) => setLogStatusFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                      >
                        <option value="ALL">All Statuses</option>
                        {ATTENDANCE_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Day-to-Day Grouped View */}
                {Object.keys(groupedLogs).length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 20px', textAlign: 'center', border: '1px solid #e5e7eb', color: '#6b7280' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📜</div>
                    <h3 style={{ color: '#111827', margin: '0 0 6px' }}>No Attendance Logs Found</h3>
                    <p style={{ margin: 0, fontSize: '0.88rem' }}>
                      {logSearch || logStatusFilter !== 'ALL'
                        ? 'Try clearing the search or status filters above.'
                        : 'No attendance records have been logged yet.'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {Object.entries(groupedLogs).map(([dateKey, dayLogs]) => {
                      const dayPresent = dayLogs.filter((l) => l.status === 'PRESENT').length;
                      const dayAbsent = dayLogs.filter((l) => l.status === 'ABSENT').length;
                      const dayLate = dayLogs.filter((l) => l.status === 'LATE').length;

                      return (
                        <div key={dateKey} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                          {/* Day Header Banner */}
                          <div style={{
                            padding: '12px 18px',
                            background: dateKey === today ? '#ecfdf5' : '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 800, color: dateKey === today ? '#065f46' : '#111827' }}>
                                📅 {formatDate(dateKey)}
                              </span>
                              {dateKey === today && (
                                <span style={{ background: '#047857', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800 }}>
                                  TODAY
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', fontWeight: 700 }}>
                              <span style={{ background: '#f3f4f6', color: '#374151', padding: '3px 8px', borderRadius: '6px' }}>
                                {dayLogs.length} Records
                              </span>
                              <span style={{ background: '#ecfdf5', color: '#166534', padding: '3px 8px', borderRadius: '6px' }}>
                                {dayPresent} Present
                              </span>
                              {dayAbsent > 0 && (
                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '6px' }}>
                                  {dayAbsent} Absent
                                </span>
                              )}
                              {dayLate > 0 && (
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px' }}>
                                  {dayLate} Late
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDate(dateKey);
                                  setAttSubTab('markTable');
                                }}
                                style={{
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #bfdbfe',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                }}
                              >
                                Open Date Register &rarr;
                              </button>
                            </div>
                          </div>

                          {/* Day Logs Table */}
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                              <thead style={{ background: '#fcfcfd', borderBottom: '1px solid #f3f4f6' }}>
                                <tr>
                                  <th style={{ padding: '10px 16px', color: '#6b7280', fontSize: '0.78rem', fontWeight: 700 }}>STAFF</th>
                                  <th style={{ padding: '10px 16px', color: '#6b7280', fontSize: '0.78rem', fontWeight: 700 }}>ROLE / TRADE</th>
                                  <th style={{ padding: '10px 16px', color: '#6b7280', fontSize: '0.78rem', fontWeight: 700 }}>STATUS</th>
                                  <th style={{ padding: '10px 16px', color: '#6b7280', fontSize: '0.78rem', fontWeight: 700 }}>CHECK-IN / OUT</th>
                                  <th style={{ padding: '10px 16px', color: '#6b7280', fontSize: '0.78rem', fontWeight: 700 }}>REMARKS / NOTES</th>
                                  <th style={{ padding: '10px 16px', color: '#6b7280', fontSize: '0.78rem', fontWeight: 700 }}>RECORDED BY</th>
                                  <th style={{ padding: '10px 16px', color: '#6b7280', fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>STATUS / AUDIT</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dayLogs.map((log) => {
                                  const conf = getStatusConfig(log.status);
                                  return (
                                    <tr key={log.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                                      <td style={{ padding: '10px 16px' }}>
                                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem' }}>
                                          {log.employee?.name || 'Staff Member'}
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#047857', background: '#ecfdf5', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                                          {log.employee?.employeeId || `EMP-${log.employee?.id}`}
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 16px', fontSize: '0.82rem', color: '#4b5563' }}>
                                        {log.employee?.role || log.employee?.position || 'General'}
                                      </td>
                                      <td style={{ padding: '10px 16px' }}>
                                        <span style={{
                                          padding: '3px 8px',
                                          borderRadius: '12px',
                                          fontSize: '0.75rem',
                                          fontWeight: 700,
                                          background: conf.bg,
                                          color: conf.text,
                                          border: `1px solid ${conf.border}`,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}>
                                          <span>{conf.icon}</span> {conf.label}
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 16px', fontSize: '0.8rem', color: '#4b5563' }}>
                                        {log.checkInTime ? `${log.checkInTime} - ${log.checkOutTime || '—'}` : '—'}
                                      </td>
                                      <td style={{ padding: '10px 16px', fontSize: '0.8rem', color: '#6b7280', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.remarks}>
                                        {log.remarks || '—'}
                                      </td>
                                      <td style={{ padding: '10px 16px', fontSize: '0.78rem', color: '#6b7280' }}>
                                        {log.recordedBy || 'Manager'}
                                      </td>
                                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                        <span style={{
                                          fontSize: '0.75rem',
                                          color: '#047857',
                                          background: '#ecfdf5',
                                          border: '1px solid #a7f3d0',
                                          padding: '3px 10px',
                                          borderRadius: '6px',
                                          fontWeight: 700,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}>
                                          🔒 Finalized Log
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function MetricBox({ label, value }) {
  return (
    <div className="em-metric-card">
      <div>
        <div className="em-metric-card__label">
          {label}
        </div>
        <div className="em-metric-card__value">
          {value}
        </div>
      </div>
    </div>
  );
}
