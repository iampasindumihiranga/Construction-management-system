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
  recordCheckOut,
  registerEmployee,
  updateEmployeeProfile,
} from '../services/api';
import { downloadFile, exportCsv, exportExcel } from '../utils/documentDownload';

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

const getCurrentTimeStr = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
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

  const [currentTimeDisplay, setCurrentTimeDisplay] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeDisplay(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Attendance Views & Filters
  const [attSubTab, setAttSubTab] = useState('markTable'); // 'markTable' | 'dayToDayLogs'
  const [attSearch, setAttSearch] = useState('');
  const [attStatusFilter, setAttStatusFilter] = useState('ALL');
  const [attDeptFilter, setAttDeptFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('ALL');
  const [selectedExportEmpId, setSelectedExportEmpId] = useState('');

  // Forms
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [empFormErrors, setEmpFormErrors] = useState({});
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedProjectEmp, setSelectedProjectEmp] = useState(null);
  const [assignedProjectIds, setAssignedProjectIds] = useState([]);
  const [savingAssignments, setSavingAssignments] = useState(false);



  // Time In (Check-in) & Time Out (Check-out) Separate Modal State
  const [markingModalEmp, setMarkingModalEmp] = useState(null);
  const [markingModalMode, setMarkingModalMode] = useState('checkin'); // 'checkin' | 'checkout'
  const [modalAttRecord, setModalAttRecord] = useState(null);
  const [modalAttForm, setModalAttForm] = useState({
    status: 'PRESENT',
    checkInTime: getCurrentTimeStr(),
    checkOutTime: getCurrentTimeStr(),
    remarks: 'Unavailable',
  });
  const [modalAttError, setModalAttError] = useState('');
  const [submittingModalAtt, setSubmittingModalAtt] = useState(false);

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
  //attendance marking dropdown
  const getStatusConfig = (status) => {
    switch (status) {
      case 'PRESENT':
        return { label: 'Present', bg: '#dcfce7', text: '#15803d', border: '#86efac' };
      case 'ABSENT':
        return { label: 'Absent', bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
      case 'LATE':
        return { label: 'Late', bg: '#fef3c7', text: '#92400e', border: '#e3b80e' };
      case 'HALF_DAY':
        return { label: 'Half Day', bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' };
      case 'ON_LEAVE':
        return { label: 'On Leave', bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' };
      default:
        return { label: 'Unmarked', bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
    }
  };

  const downloadEmployeeAttendance = (emp) => {
    if (!emp) return;
    const empLogs = allAttendanceLogs.filter(
      (log) => log.employee?.id === emp.id || log.employeeId === emp.id
    );
    if (empLogs.length === 0) {
      const todayRec = attendanceList.find((a) => a.employee?.id === emp.id);
      if (todayRec) empLogs.push(todayRec);
    }

    if (empLogs.length === 0) {
      report(`No attendance records logged yet for ${emp.name}.`);
      return;
    }

    const rows = empLogs.map((log) => ({
      'Employee ID': emp.employeeId || `EMP-${emp.id}`,
      'Employee Name': emp.name,
      'Role / Trade': emp.role || emp.position || '—',
      'Department': emp.department || 'General',
      'Date': log.date || '—',
      'Status': log.status || 'UNMARKED',
      'Time In (Arrival)': log.checkInTime || '—',
      'Time Out (Departure)': log.checkOutTime || '—',
      'Site Remarks': log.remarks || '—',
      'Recorded By': log.recordedBy || 'Employee Manager',
    }));

    const cleanEmpName = emp.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    exportExcel(`Odiliya_Attendance_${cleanEmpName}_${today}`, rows, null, `Attendance - ${emp.name}`);
    report(`Attendance Excel sheet (.xlsx) exported successfully for ${emp.name}.`);
  };



  // 1-Click Instant Time In at Current Live Time
  const quickCheckInNow = async (emp, status = 'PRESENT') => {
    if (selectedDate !== today) {
      fail(new Error(`Attendance can only be marked for today (${formatDate(today)}). Historical and upcoming dates cannot be marked.`));
      return;
    }
    const existing = attendanceList.find((a) => a.employee?.id === emp.id);
    if (existing) {
      if (existing.checkOutTime) {
        fail(new Error(`Attendance for ${emp.name} is already finalized for today (${formatDate(today)}).`));
        return;
      }
      openCheckOutModal(emp, existing);
      return;
    }

    const liveNow = getCurrentTimeStr();
    try {
      setLoading(true);
      await recordAttendance({
        employeeId: emp.id,
        employee: { id: emp.id },
        date: today,
        status: status,
        checkInTime: ['PRESENT', 'LATE', 'HALF_DAY'].includes(status) ? liveNow : null,
        checkOutTime: null, // Leaves shift in progress until Time Out is marked
        remarks: status === 'PRESENT' ? 'Unavailable' : `Marked as ${status}`,
        recordedBy: 'Employee Manager',
      });
      report(`Time In (Arrival) recorded for ${emp.name} at current live time (${liveNow}). Shift is now active.`);
      await refreshData();
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Instant Time Out at Current Live Time
  const quickCheckOutNow = async (emp, record) => {
    if (selectedDate !== today) {
      fail(new Error(`Check-out can only be recorded for today (${formatDate(today)}).`));
      return;
    }
    if (!record) {
      fail(new Error(`Please record Time In (Check-in) first before marking Time Out.`));
      return;
    }
    if (record.checkOutTime) {
      fail(new Error(`Time Out for ${emp.name} has already been recorded today (${record.checkOutTime}). Attendance is finalized.`));
      return;
    }

    const liveNow = getCurrentTimeStr();
    try {
      setLoading(true);
      await recordCheckOut(record.id, {
        checkOutTime: liveNow,
        remarks: record.remarks && record.remarks !== 'Unavailable' ? record.remarks : '',
      });
      report(`Time Out (Departure) recorded for ${emp.name} at current live time (${liveNow}). Daily shift completed!`);
      await refreshData();
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const openCheckInModal = (emp, initialStatus = 'PRESENT') => {
    if (selectedDate !== today) {
      fail(new Error(`Attendance can only be marked for today (${formatDate(today)}). Historical and upcoming dates cannot be marked.`));
      return;
    }
    const existing = attendanceList.find((a) => a.employee?.id === emp.id);
    if (existing) {
      if (existing.checkOutTime) {
        fail(new Error(`Attendance for ${emp.name} is already finalized for today (${formatDate(today)}).`));
        return;
      }
      openCheckOutModal(emp, existing);
      return;
    }

    // Auto-populate with current live time
    const liveNow = getCurrentTimeStr();
    let inTime = liveNow;
    let rem = 'Unavailable';

    if (initialStatus === 'LATE') {
      rem = 'Delayed arrival on site';
    } else if (initialStatus === 'HALF_DAY') {
      rem = 'Half day shift';
    } else if (initialStatus === 'ABSENT') {
      inTime = '';
      rem = 'Absent from site';
    } else if (initialStatus === 'ON_LEAVE') {
      inTime = '';
      rem = 'Approved leave';
    }

    setMarkingModalEmp(emp);
    setMarkingModalMode('checkin');
    setModalAttRecord(null);
    setModalAttForm({
      status: initialStatus,
      checkInTime: inTime,
      checkOutTime: '',
      remarks: rem,
    });
    setModalAttError('');
  };

  const openCheckOutModal = (emp, record) => {
    if (selectedDate !== today) {
      fail(new Error(`Check-out can only be recorded for today (${formatDate(today)}).`));
      return;
    }
    if (!record) {
      fail(new Error(`Please record Time In (Check-in) first before marking Time Out.`));
      return;
    }
    if (record.checkOutTime) {
      fail(new Error(`Time Out for ${emp.name} has already been recorded today (${record.checkOutTime}). Attendance is finalized.`));
      return;
    }

    // Auto-populate departure with current live time
    const liveNow = getCurrentTimeStr();

    setMarkingModalEmp(emp);
    setMarkingModalMode('checkout');
    setModalAttRecord(record);
    setModalAttForm({
      status: record.status || 'PRESENT',
      checkInTime: record.checkInTime || liveNow,
      checkOutTime: liveNow,
      remarks: record.remarks && record.remarks !== 'Unavailable' ? record.remarks : '',
    });
    setModalAttError('');
  };

  const openMarkModal = (emp, initialStatus = 'PRESENT') => {
    const existing = attendanceList.find((a) => a.employee?.id === emp.id);
    if (existing && !existing.checkOutTime && ['PRESENT', 'LATE', 'HALF_DAY'].includes(existing.status)) {
      openCheckOutModal(emp, existing);
    } else {
      openCheckInModal(emp, initialStatus);
    }
  };

  const closeMarkModal = () => {
    setMarkingModalEmp(null);
    setModalAttRecord(null);
    setModalAttError('');
  };

  const handleModalStatusChange = (newStatus) => {
    const liveNow = getCurrentTimeStr();
    let inTime = liveNow;
    let rem = modalAttForm.remarks;

    if (newStatus === 'PRESENT') {
      inTime = liveNow;
      rem = 'Unavailable';
    } else if (newStatus === 'LATE') {
      inTime = liveNow;
      rem = rem === 'Unavailable' ? 'Delayed arrival on site' : rem;
    } else if (newStatus === 'HALF_DAY') {
      inTime = liveNow;
      rem = rem === 'Unavailable' ? 'Half day shift' : rem;
    } else if (newStatus === 'ABSENT') {
      inTime = '';
      rem = rem === 'Unavailable' ? 'Absent from site' : rem;
    } else if (newStatus === 'ON_LEAVE') {
      inTime = '';
      rem = rem === 'Unavailable' ? 'Approved leave' : rem;
    }

    setModalAttForm({
      status: newStatus,
      checkInTime: inTime,
      checkOutTime: '',
      remarks: rem,
    });
  };

  const handleSaveModalAttendance = async (e) => {
    if (e) e.preventDefault();
    if (!markingModalEmp) return;

    if (selectedDate !== today) {
      setModalAttError(`Attendance can only be marked for today (${formatDate(today)}).`);
      return;
    }

    setSubmittingModalAtt(true);
    setModalAttError('');

    try {
      if (markingModalMode === 'checkin') {
        const { status, remarks } = modalAttForm;
        // Strictly freeze arrival time to live current clock
        const liveNow = getCurrentTimeStr();

        const finalRemarks = status === 'PRESENT' ? 'Unavailable' : (remarks.trim() || `Marked as ${status}`);
        await recordAttendance({
          employeeId: markingModalEmp.id,
          employee: { id: markingModalEmp.id },
          date: today,
          status: status,
          checkInTime: ['PRESENT', 'LATE', 'HALF_DAY'].includes(status) ? liveNow : null,
          checkOutTime: null, // Left open until Step 2: Time Out upon leaving
          remarks: finalRemarks,
          recordedBy: 'Employee Manager',
        });

        report(`Time In (Arrival) recorded for ${markingModalEmp.name} at current live time (${liveNow}). Shift is now active.`);
      } else {
        // Mode === 'checkout'
        const { remarks } = modalAttForm;
        // Strictly freeze leaving time to live current clock upon leaving
        const liveNow = getCurrentTimeStr();

        await recordCheckOut(modalAttRecord.id, {
          checkOutTime: liveNow,
          remarks: remarks.trim() || modalAttRecord.remarks || '',
        });

        report(`Time Out (Leaving) recorded for ${markingModalEmp.name} at current live time (${liveNow}). Daily shift completed!`);
      }

      closeMarkModal();
      await refreshData();
    } catch (err) {
      setModalAttError(err.message || 'Failed to record attendance.');
    } finally {
      setSubmittingModalAtt(false);
    }
  };

  const handleStatusChange = (emp, newStatus) => {
    if (!newStatus) return;
    openCheckInModal(emp, newStatus);
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
          <button
            onClick={() => setTab('documents')}
            className={`btn-tab em-tab ${tab === 'documents' ? 'active' : ''}`}
          >
            Documents Vault
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
                  <h3 style={{ margin: 0, color: '#111827', fontSize: '1.2rem' }}>
                    Day-to-Day Attendance Record Logs
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
                              }}>
                                {conf.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#4b5563' }}>
                              {log.checkInTime ? `${log.checkInTime} - ${log.checkOutTime || '—'}` : '—'}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#6b7280', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.remarks}>
                              {log.remarks || '—'}
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '920px' }}>
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
                            title="Assign Employee Role"
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
                          <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => downloadEmployeeAttendance(emp)}
                              style={{ padding: '4px 9px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                              title={`Download Attendance Excel Sheet for ${emp.name} (.xlsx)`}
                            >
                              Download Attendance (Excel)
                            </button>
                            <button
                              onClick={() => editProfile(emp)}
                              style={{ padding: '4px 9px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500 }}
                              title="Edit Employee Profile"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openProjectAssignment(emp)}
                              style={{ padding: '4px 9px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500 }}
                              title="Assign Projects"
                            >
                              Projects
                            </button>
                            <button
                              onClick={() => deleteEmp(emp)}
                              style={{ padding: '4px 8px', background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
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
                                {proj.name}
                                <span style={{ fontSize: '0.72rem', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                                  Assigned
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
                    <b>Note:</b> Project assignments and team allocations are managed in the <b>Project Manager Workspace</b>.
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
                          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '5px 0 0' }}>{project.location || 'Location not specified'} · {project.status}</p>
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

        {/* TAB 6: ATTENDANCE REGISTER */}
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
                    Mark daily site attendance with real-time arrival and departure timestamps, or inspect day-to-day activity logs.
                  </p>
                </div>

                {/* Sub-view switcher tabs */}
                <div style={{ display: 'inline-flex', background: '#f3f4f6', padding: '4px', borderRadius: '10px', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAttSubTab('markTable');
                      setSelectedDate(today);
                    }}
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
                    Today's Marking Register
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
                    Day-to-Day Record Logs
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

              {/* Date Information Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                {attSubTab === 'markTable' ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        background: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        Today's Marking Register: <b>{formatDate(today)}</b> | Live Time: <b>{currentTimeDisplay}</b>
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#047857', background: '#f0fdf4', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                        Marking is active for Today only. Historical and upcoming dates cannot be marked.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        exportExcel(
                          `Odiliya_Daily_Attendance_${today}`,
                          attendanceList.map((a) => ({
                            'Date': a.date,
                            'Employee ID': a.employee?.employeeId || `EMP-${a.employee?.id}`,
                            'Full Name': a.employee?.name || 'Staff',
                            'Role': a.employee?.role || a.employee?.position || 'General',
                            'Department': a.employee?.department || 'General',
                            'Status': a.status,
                            'Time In': a.checkInTime || '—',
                            'Time Out': a.checkOutTime || '—',
                            'Remarks': a.remarks || '—',
                            'Recorded By': a.recordedBy || 'Manager',
                          })),
                          null,
                          `Attendance ${today}`
                        );
                        report(`Today's Attendance exported as Excel sheet (.xlsx).`);
                      }}
                      style={{
                        padding: '7px 14px',
                        background: '#047857',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '7px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      Export Today's Attendance (Excel)
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>Filter Historical Logs by Date:</span>
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
                      Reset to Today
                    </button>
                  </div>
                )}
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
                      Attendance Marking Register Table — {formatDate(selectedDate)}
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
                          const isInShift = record && record.checkInTime && !record.checkOutTime && ['PRESENT', 'LATE', 'HALF_DAY'].includes(record.status);
                          const isFinalized = record && (!isInShift);

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
                                  {isInShift ? (
                                    <span style={{
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      background: '#ecfdf5',
                                      color: '#065f46',
                                      border: '1px solid #34d399',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      boxShadow: '0 1px 2px rgba(16, 185, 129, 0.15)',
                                    }}>
                                      Shift Active (Time In Marked)
                                    </span>
                                  ) : isFinalized && record?.checkOutTime ? (
                                    <span style={{
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      background: '#dcfce7',
                                      color: '#15803d',
                                      border: '1px solid #86efac',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                    }}>
                                      Shift Completed
                                    </span>
                                  ) : (
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
                                    }}>
                                      {statusConf.label}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 4. Time In / Out */}
                              <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#4b5563' }}>
                                {isInShift ? (
                                  <div>
                                    <div><b>In:</b> <span style={{ color: '#047857', fontWeight: 800 }}>{record?.checkInTime}</span> <span style={{ fontSize: '0.72rem', color: '#047857' }}>(Arrival)</span></div>
                                    <div style={{ marginTop: '2px' }}>
                                      <b>Out:</b> <span style={{ color: '#d97706', fontWeight: 700, background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', fontSize: '0.74rem' }}>
                                        Pending (Mark when leaving)
                                      </span>
                                    </div>
                                  </div>
                                ) : isFinalized && record?.checkInTime && record?.checkOutTime ? (
                                  <div>
                                    <div><b>In:</b> <span style={{ color: '#047857', fontWeight: 700 }}>{record.checkInTime}</span> <span style={{ fontSize: '0.72rem', color: '#047857' }}>(Arrival)</span></div>
                                    <div><b>Out:</b> <span style={{ color: '#111827', fontWeight: 700 }}>{record.checkOutTime}</span> <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>(Leaving)</span></div>
                                  </div>
                                ) : currentStatus === 'UNMARKED' ? (
                                  <div style={{ color: '#9ca3af', fontSize: '0.78rem' }}>
                                    <div><b>In:</b> Not marked yet</div>
                                    <div><b>Out:</b> Not marked yet</div>
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
                                <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                  {/* Button 1: Time In */}
                                  {!record?.checkInTime && currentStatus === 'UNMARKED' ? (
                                    <button
                                      type="button"
                                      onClick={() => quickCheckInNow(emp, 'PRESENT')}
                                      style={{
                                        padding: '7px 14px',
                                        background: '#047857',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.82rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        boxShadow: '0 2px 4px rgba(4, 120, 87, 0.25)',
                                      }}
                                      title={`Step 1: Mark Arrival (Time In) for ${emp.name} at current live time (${getCurrentTimeStr()})`}
                                    >
                                      Time In ({getCurrentTimeStr()})
                                    </button>
                                  ) : record?.checkInTime ? (
                                    <span
                                      style={{
                                        padding: '6px 12px',
                                        background: '#ecfdf5',
                                        color: '#047857',
                                        border: '1px solid #a7f3d0',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 800,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                      }}
                                      title={`Time In ${record.checkInTime}`}
                                    >
                                      In: {record.checkInTime}
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        padding: '6px 10px',
                                        background: '#f3f4f6',
                                        color: '#9ca3af',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                      }}
                                    >
                                      Time In (N/A)
                                    </span>
                                  )}

                                  {/* Button 2: Time Out */}
                                  {isInShift ? (
                                    <button
                                      type="button"
                                      onClick={() => quickCheckOutNow(emp, record)}
                                      style={{
                                        padding: '7px 14px',
                                        background: '#d97706',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.82rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        boxShadow: '0 2px 4px rgba(217, 119, 6, 0.3)',
                                      }}
                                      title={`Step 2: Mark Leaving (Time Out) for ${emp.name} at current live time (${getCurrentTimeStr()})`}
                                    >
                                      Time Out ({getCurrentTimeStr()})
                                    </button>
                                  ) : record?.checkOutTime ? (
                                    <span
                                      style={{
                                        padding: '6px 12px',
                                        background: '#fef3c7',
                                        color: '#92400e',
                                        border: '1px solid #fde68a',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 800,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                      }}
                                      title={`Time Out ${record.checkOutTime}`}
                                    >
                                      Out: {record.checkOutTime}
                                    </span>
                                  ) : currentStatus === 'UNMARKED' ? (
                                    <button
                                      type="button"
                                      disabled
                                      style={{
                                        padding: '7px 12px',
                                        background: '#f3f4f6',
                                        color: '#9ca3af',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'not-allowed',
                                      }}
                                      title="Mark Time In first before Time Out can be recorded"
                                    >
                                      Time Out
                                    </button>
                                  ) : (
                                    <span
                                      style={{
                                        padding: '6px 10px',
                                        background: '#f3f4f6',
                                        color: '#9ca3af',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                      }}
                                    >
                                      Time Out (N/A)
                                    </span>
                                  )}

                                  {/* Sub Actions: Late, Absent, Options */}
                                  {currentStatus === 'UNMARKED' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openCheckInModal(emp, 'LATE')}
                                        style={{
                                          padding: '7px 9px',
                                          background: '#fffbeb',
                                          color: '#92400e',
                                          border: '1px solid #fde047',
                                          borderRadius: '6px',
                                          fontSize: '0.75rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                        title="Mark Late with Current Time In"
                                      >
                                        Late
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openCheckInModal(emp, 'ABSENT')}
                                        style={{
                                          padding: '7px 9px',
                                          background: '#fef2f2',
                                          color: '#991b1b',
                                          border: '1px solid #fca5a5',
                                          borderRadius: '6px',
                                          fontSize: '0.75rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                        title="Mark Absent"
                                      >
                                        Absent
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openCheckInModal(emp, 'PRESENT')}
                                        style={{
                                          padding: '7px 9px',
                                          background: '#f3f4f6',
                                          color: '#374151',
                                          border: '1px solid #d1d5db',
                                          borderRadius: '6px',
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                        }}
                                        title="Other Status / Custom Remarks"
                                      >
                                        Options
                                      </button>
                                    </>
                                  )}
                                  {isInShift && (
                                    <button
                                      type="button"
                                      onClick={() => openCheckOutModal(emp, record)}
                                      style={{
                                        padding: '7px 10px',
                                        background: '#fef3c7',
                                        color: '#92400e',
                                        border: '1px solid #fde68a',
                                        borderRadius: '6px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                      }}
                                      title="Add Departure Remarks / Options"
                                    >
                                      Options
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
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

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
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
                      <button
                        type="button"
                        onClick={() => {
                          exportExcel(
                            `Odiliya_Attendance_Master_Logs_${today}`,
                            allAttendanceLogs.map((a) => ({
                              'Date': a.date,
                              'Employee ID': a.employee?.employeeId || `EMP-${a.employee?.id}`,
                              'Full Name': a.employee?.name || 'Staff',
                              'Role': a.employee?.role || a.employee?.position || 'General',
                              'Department': a.employee?.department || 'General',
                              'Status': a.status,
                              'Time In': a.checkInTime || '—',
                              'Time Out': a.checkOutTime || '—',
                              'Remarks': a.remarks || '—',
                              'Recorded By': a.recordedBy || 'Manager',
                            })),
                            null,
                            'Attendance Logs'
                          );
                          report('Historical Attendance Logs exported as Excel sheet (.xlsx).');
                        }}
                        style={{
                          padding: '8px 14px',
                          background: '#047857',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Export Logs (Excel)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Day-to-Day Grouped View */}
                {Object.keys(groupedLogs).length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 20px', textAlign: 'center', border: '1px solid #e5e7eb', color: '#6b7280' }}>
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
                                {formatDate(dateKey)}
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
                                        }}>
                                          {conf.label}
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

        {/* TAB 7: DOCUMENTS & WORKFORCE REPORTS VAULT */}
        {tab === 'documents' && (
          <div>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    WORKFORCE DOCUMENTS &amp; EXPORTS
                  </span>
                  <h2 style={{ margin: '6px 0 2px', color: '#111827', fontSize: '1.4rem', fontWeight: 800 }}>
                    Workforce Documents &amp; Attendance Exports
                  </h2>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.88rem' }}>
                    Download separate attendance Excel spreadsheets (.xlsx) for each individual employee, master daily registers, and workforce roster sheets.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      exportExcel(
                        `Odiliya_Workforce_Roster_${today}`,
                        employees.map((e) => ({
                          'Employee ID': e.employeeId || `EMP-${e.id}`,
                          'Full Name': e.name,
                          'Email': e.email || '—',
                          'Phone': e.phone || '—',
                          'Role / Trade': e.role || e.position,
                          'Department': e.department || 'General',
                          'Qualifications': e.qualifications || '—',
                          'Address': e.address || '—',
                          'Status': e.status,
                        })),
                        null,
                        'Workforce Roster'
                      );
                      report('Workforce Roster Excel sheet exported successfully.');
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
                    Export Workforce Roster (Excel)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      exportExcel(
                        `Odiliya_Daily_Attendance_${selectedDate}`,
                        attendanceList.map((a) => ({
                          'Date': a.date,
                          'Employee ID': a.employee?.employeeId || `EMP-${a.employee?.id}`,
                          'Full Name': a.employee?.name || 'Staff',
                          'Role': a.employee?.role || a.employee?.position || 'General',
                          'Department': a.employee?.department || 'General',
                          'Status': a.status,
                          'Time In': a.checkInTime || '—',
                          'Time Out': a.checkOutTime || '—',
                          'Remarks': a.remarks || '—',
                          'Recorded By': a.recordedBy || 'Manager',
                        })),
                        null,
                        `Attendance ${selectedDate}`
                      );
                      report(`Daily Attendance Excel sheet exported for ${selectedDate}.`);
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
                    Export Today's Attendance (Excel)
                  </button>
                </div>
              </div>
            </div>

            {/* Focused Section 1: Individual Employee Attendance Downloader */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.2rem', fontWeight: 800 }}>
                  Individual Employee Attendance Export (Excel Sheet)
                </h3>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>
                  Select any employee to immediately download their complete individual attendance log history as an Excel (.xlsx) spreadsheet.
                </p>
              </div>

              {/* Quick Select & Export bar */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px', background: '#f9fafb', padding: '16px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                    Select Employee to Download Attendance:
                  </label>
                  <select
                    value={selectedExportEmpId}
                    onChange={(e) => setSelectedExportEmpId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', background: '#fff', fontWeight: 600 }}
                  >
                    <option value="">-- Choose Employee ({employees.length} available) --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId || `EMP-${emp.id}`}) — {emp.role || emp.position}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={!selectedExportEmpId}
                  onClick={() => {
                    const emp = employees.find((e) => String(e.id) === String(selectedExportEmpId));
                    if (emp) downloadEmployeeAttendance(emp);
                  }}
                  style={{
                    padding: '10px 22px',
                    background: selectedExportEmpId ? '#047857' : '#9ca3af',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: selectedExportEmpId ? 'pointer' : 'not-allowed',
                    alignSelf: 'flex-end',
                    boxShadow: selectedExportEmpId ? '0 2px 4px rgba(4, 120, 87, 0.25)' : 'none',
                  }}
                >
                  Download Selected Attendance (Excel)
                </button>
              </div>

              {/* Employee Quick Download Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>EMPLOYEE ID</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>EMPLOYEE NAME</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>TRADE / ROLE</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>ATTENDANCE LOGS</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const empLogsCount = allAttendanceLogs.filter(
                        (log) => log.employee?.id === emp.id || log.employeeId === emp.id
                      ).length;
                      return (
                        <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#047857' }}>
                            {emp.employeeId || `EMP-${emp.id}`}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>
                            {emp.name}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.85rem' }}>
                            {emp.role || emp.position || '—'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: '0.78rem', background: empLogsCount > 0 ? '#ecfdf5' : '#f3f4f6', color: empLogsCount > 0 ? '#047857' : '#6b7280', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                              {empLogsCount} shift records
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => downloadEmployeeAttendance(emp)}
                              style={{
                                padding: '5px 12px',
                                background: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                              }}
                            >
                              Download Attendance (Excel)
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Workforce Master Reports Card */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.2rem', fontWeight: 800 }}>
                  Workforce Master Reports (Excel Sheets)
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>
                  Generate and download real-time Excel spreadsheets (.xlsx) for workforce master registers, payroll calculations, and compliance audits.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>Complete Workforce Register</div>
                    <div style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '2px' }}>{employees.length} Active &amp; Registered Personnel</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      exportExcel(
                        'Odiliya_Complete_Workforce_Register',
                        employees.map((e) => ({
                          'Employee ID': e.employeeId || `EMP-${e.id}`,
                          'Full Name': e.name,
                          'Email': e.email || '—',
                          'Phone': e.phone || '—',
                          'Role / Trade': e.role || e.position,
                          'Department': e.department || 'General',
                          'Qualifications': e.qualifications || '—',
                          'Address': e.address || '—',
                          'Status': e.status,
                        })),
                        null,
                        'Workforce Register'
                      );
                      report('Workforce Master Register exported as Excel sheet.');
                    }}
                    style={{ padding: '8px 16px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '7px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Download Excel
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>Full Historical Attendance Logs</div>
                    <div style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '2px' }}>{allAttendanceLogs.length} Total Shift Records Across All Employees</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      exportExcel(
                        'Odiliya_Attendance_History_Full_Master',
                        allAttendanceLogs.map((a) => ({
                          'Date': a.date,
                          'Employee ID': a.employee?.employeeId || `EMP-${a.employee?.id}`,
                          'Staff Name': a.employee?.name || 'Staff',
                          'Role': a.employee?.role || a.employee?.position || 'General',
                          'Department': a.employee?.department || 'General',
                          'Status': a.status,
                          'Time In': a.checkInTime || '—',
                          'Time Out': a.checkOutTime || '—',
                          'Remarks': a.remarks || '—',
                          'Recorded By': a.recordedBy || 'Manager',
                        })),
                        null,
                        'Historical Attendance'
                      );
                      report('Complete historical attendance logs exported as Excel sheet.');
                    }}
                    style={{ padding: '8px 16px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '7px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Download Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TIME IN & TIME OUT SEPARATE ATTENDANCE MODAL */}
        {markingModalEmp && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '16px',
              backdropFilter: 'blur(2px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !submittingModalAtt) closeMarkModal();
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '28px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                border: '1px solid #e5e7eb',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: markingModalMode === 'checkin' ? '#047857' : '#d97706',
                    background: markingModalMode === 'checkin' ? '#ecfdf5' : '#fef3c7',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}>
                    {markingModalMode === 'checkin' ? 'STEP 1: TIME IN (ARRIVAL)' : 'STEP 2: TIME OUT (DEPARTURE)'}
                  </span>
                  <h3 style={{ margin: '6px 0 2px', fontSize: '1.35rem', fontWeight: 800, color: '#111827' }}>
                    {markingModalMode === 'checkin' ? 'Mark Time In (Check-in)' : 'Mark Time Out (Check-out)'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                    Staff: <b>{markingModalEmp.name}</b> ({markingModalEmp.employeeId || `EMP-${markingModalEmp.id}`}) • <i>{markingModalEmp.role || markingModalEmp.position}</i>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeMarkModal}
                  disabled={submittingModalAtt}
                  style={{
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  X
                </button>
              </div>

              {modalAttError && (
                <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #fecaca', fontSize: '0.85rem' }}>
                  {modalAttError}
                </div>
              )}

              <form onSubmit={handleSaveModalAttendance}>
                {/* Live Real-Time & Date Box */}
                <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '16px', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ color: '#4b5563', fontSize: '0.8rem' }}>Date: </span>
                    <strong style={{ color: '#047857' }}>{formatDate(today)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#4b5563', fontSize: '0.8rem' }}>Live Clock Time: </span>
                    <strong style={{ color: '#047857', fontSize: '0.95rem' }}>{currentTimeDisplay}</strong>
                  </div>
                </div>

                {/* CHECK-IN MODE */}
                {markingModalMode === 'checkin' && (
                  <>
                    {/* Status selector */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                        Attendance Status *
                      </label>
                      <select
                        value={modalAttForm.status}
                        onChange={(e) => handleModalStatusChange(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.92rem', fontWeight: 600, background: '#fff' }}
                      >
                        <option value="PRESENT">PRESENT (Full Day Shift)</option>
                        <option value="LATE">LATE (Delayed Arrival)</option>
                        <option value="HALF_DAY">HALF DAY (4 Hours Shift)</option>
                        <option value="ON_LEAVE">ON LEAVE (Approved Leave)</option>
                        <option value="ABSENT">ABSENT (Did Not Report)</option>
                      </select>
                    </div>

                    {/* Time In section (Active for Present, Late, Half Day) */}
                    {['PRESENT', 'LATE', 'HALF_DAY'].includes(modalAttForm.status) ? (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065f46', marginBottom: '8px' }}>
                          Arrival Timestamp (Time In) — FROZEN TO CURRENT TIME:
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                          <div style={{
                            padding: '10px 18px',
                            borderRadius: '8px',
                            border: '1px solid #059669',
                            fontSize: '1.35rem',
                            fontWeight: 800,
                            background: '#ffffff',
                            color: '#065f46',
                            fontFamily: 'monospace',
                            letterSpacing: '1px',
                          }}>
                            {getCurrentTimeStr()}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700 }}>
                            Live System Clock: <b>{currentTimeDisplay}</b>
                            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#065f46', marginTop: '2px' }}>
                              Time is permanently locked to current arrival time.
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: '10px' }}>
                          Step 1 of 2: Records arrival and starts active shift. Step 2 (Time Out) will be marked separately upon departure.
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '0.82rem', color: '#991b1b' }}>
                        Time In / Time Out hours are not applicable when status is <b>{modalAttForm.status}</b>. Record will be finalized directly.
                      </div>
                    )}

                    {/* Remarks */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                        Site Remarks / Notes
                        {modalAttForm.status === 'PRESENT' && (
                          <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#6b7280', fontWeight: 500 }}>
                            (Unavailable for Full Day Present)
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={modalAttForm.status === 'PRESENT' ? 'Unavailable' : modalAttForm.remarks}
                        disabled={modalAttForm.status === 'PRESENT'}
                        onChange={(e) => setModalAttForm({ ...modalAttForm, remarks: e.target.value })}
                        placeholder="E.g. Delayed due to transport, medical clearance..."
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.88rem',
                          background: modalAttForm.status === 'PRESENT' ? '#f3f4f6' : '#fff',
                          color: modalAttForm.status === 'PRESENT' ? '#6b7280' : '#111827',
                          fontStyle: modalAttForm.status === 'PRESENT' ? 'italic' : 'normal',
                        }}
                      />
                    </div>
                  </>
                )}

                {/* CHECK-OUT MODE */}
                {markingModalMode === 'checkout' && (
                  <>
                    {/* Shift Summary Card */}
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>Active Shift Status:</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#065f46', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                          {modalAttForm.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#78350f' }}>
                        <b>Recorded Time In (Arrival):</b> <span style={{ fontWeight: 800 }}>{modalAttForm.checkInTime}</span>
                      </div>
                    </div>

                    {/* Time Out Picker */}
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', marginBottom: '8px' }}>
                        Departure Timestamp (Time Out) — FROZEN TO CURRENT TIME:
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div style={{
                          padding: '10px 18px',
                          borderRadius: '8px',
                          border: '1px solid #d97706',
                          fontSize: '1.35rem',
                          fontWeight: 800,
                          background: '#ffffff',
                          color: '#92400e',
                          fontFamily: 'monospace',
                          letterSpacing: '1px',
                        }}>
                          {getCurrentTimeStr()}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 700 }}>
                          Live System Clock: <b>{currentTimeDisplay}</b>
                          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#92400e', marginTop: '2px' }}>
                            Time is permanently locked to current departure time.
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#92400e', marginTop: '10px' }}>
                        Step 2 of 2: Records departure and permanently completes today's work shift.
                      </div>
                    </div>

                    {/* Remarks on Check-out */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                        Departure Remarks / Shift Summary (Optional)
                      </label>
                      <input
                        type="text"
                        value={modalAttForm.remarks === 'Unavailable' ? '' : modalAttForm.remarks}
                        onChange={(e) => setModalAttForm({ ...modalAttForm, remarks: e.target.value })}
                        placeholder="E.g. Completed site inspection, authorized overtime..."
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.88rem',
                          background: '#fff',
                          color: '#111827',
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Form Buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={closeMarkModal}
                    disabled={submittingModalAtt}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#f3f4f6',
                      color: '#374151',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingModalAtt}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '8px',
                      border: 'none',
                      background: markingModalMode === 'checkin' ? '#047857' : '#d97706',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: submittingModalAtt ? 'not-allowed' : 'pointer',
                      fontSize: '0.88rem',
                      boxShadow: markingModalMode === 'checkin' ? '0 2px 4px rgba(4, 120, 87, 0.25)' : '0 2px 4px rgba(217, 119, 6, 0.25)',
                    }}
                  >
                    {submittingModalAtt
                      ? 'Saving...'
                      : markingModalMode === 'checkin'
                      ? `Confirm Time In at Current Time (${getCurrentTimeStr()})`
                      : `Confirm Time Out at Current Time (${getCurrentTimeStr()})`}
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
