import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import {
  formatDate,
  formatMoney,
  getEmployeeAttendanceHistory,
  getMyAssignedProjects,
  getMyEmployeeProfile,
  getTasks,
  updateTaskProgress,
  recordAttendance,
} from '../services/api';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('projects');

  // Self Attendance Form
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    status: 'PRESENT',
    checkInTime: '08:00',
    checkOutTime: '17:00',
    remarks: '',
  });
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [attendanceNotice, setAttendanceNotice] = useState('');
  const [attendanceError, setAttendanceError] = useState('');

  // Task Progress Editing
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [taskProgressPayload, setTaskProgressPayload] = useState({
    progressPercentage: 0,
    status: 'IN_PROGRESS',
    progressRemarks: '',
  });
  const [savingTaskProgress, setSavingTaskProgress] = useState(false);
  const [taskNotice, setTaskNotice] = useState('');

  const loadEmployeeData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const username = user.username;
      const [empProfile, assignedProjs] = await Promise.all([
        getMyEmployeeProfile(username).catch(() => null),
        getMyAssignedProjects(username).catch(() => []),
      ]);

      setProfile(empProfile);
      setProjects(assignedProjs || []);

      if (empProfile?.id) {
        const [attRecords, empTasks] = await Promise.all([
          getEmployeeAttendanceHistory(empProfile.id).catch(() => []),
          getTasks(null, empProfile.id).catch(() => []),
        ]);
        setAttendance(attRecords || []);
        setTasks(empTasks || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to load employee dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, [user]);

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!profile?.id) return;
    setMarkingAttendance(true);
    setAttendanceNotice('');
    setAttendanceError('');

    try {
      await recordAttendance({
        employeeId: profile.id,
        date: attendanceForm.date,
        status: attendanceForm.status,
        checkInTime: attendanceForm.status === 'ABSENT' ? null : attendanceForm.checkInTime,
        checkOutTime: attendanceForm.status === 'ABSENT' ? null : attendanceForm.checkOutTime,
        remarks: attendanceForm.remarks.trim() || 'Self-marked attendance from Employee Portal',
        recordedBy: `Self (${profile.name || user?.username})`,
      });

      setAttendanceNotice(`✓ Attendance for ${attendanceForm.date} successfully recorded!`);
      const updatedAtt = await getEmployeeAttendanceHistory(profile.id);
      setAttendance(updatedAtt || []);
      setTimeout(() => setAttendanceNotice(''), 4000);
    } catch (err) {
      setAttendanceError(err.message || 'Failed to record attendance.');
    } finally {
      setMarkingAttendance(false);
    }
  };

  const startEditTaskProgress = (task) => {
    setUpdatingTaskId(task.id);
    setTaskProgressPayload({
      progressPercentage: task.progressPercentage || 0,
      status: task.status || 'IN_PROGRESS',
      progressRemarks: task.progressRemarks || '',
    });
    setTaskNotice('');
  };

  const handleSaveTaskProgress = async (taskId) => {
    setSavingTaskProgress(true);
    setTaskNotice('');
    try {
      await updateTaskProgress(taskId, {
        progressPercentage: Number(taskProgressPayload.progressPercentage),
        status: taskProgressPayload.status,
        progressRemarks: taskProgressPayload.progressRemarks.trim(),
      });
      setTaskNotice(`✓ Task progress updated successfully! Project Manager notified.`);
      setUpdatingTaskId(null);
      if (profile?.id) {
        const empTasks = await getTasks(null, profile.id);
        setTasks(empTasks || []);
      }
      setTimeout(() => setTaskNotice(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update task progress.');
    } finally {
      setSavingTaskProgress(false);
    }
  };

  const presentCount = attendance.filter((a) => a.status === 'PRESENT').length;
  const attendanceRate =
    attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 100;

  return (
    <div className="light-site-wrapper">
      <Navbar />

      <main className="pm-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Welcome Header Banner */}
        <section
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '28px 32px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(4, 120, 87, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                EMPLOYEE PORTAL
              </span>
              <h1 style={{ fontSize: '2.2rem', margin: '12px 0 6px', fontWeight: 800 }}>
                Welcome, {profile?.name || user?.displayName || user?.username}!
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
                Position: <b>{profile?.role || profile?.position || 'Site Workforce'}</b> | Department: <b>{profile?.department || 'Operations'}</b> | ID:{' '}
                <b>{profile?.employeeId || 'EMP001'}</b>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 600 }}>Assigned Projects</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{projects.length}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 600 }}>Assigned Tasks</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{tasks.length}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 600 }}>Attendance Rate</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{attendanceRate}%</div>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('projects')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'projects' ? '#047857' : '#f3f4f6',
              color: activeTab === 'projects' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            🏢 My Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'tasks' ? '#047857' : '#f3f4f6',
              color: activeTab === 'tasks' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            📋 My Tasks &amp; Progress Updates ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'attendance' ? '#047857' : '#f3f4f6',
              color: activeTab === 'attendance' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            ⏱️ Attendance &amp; Self Check-in ({attendance.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'profile' ? '#047857' : '#f3f4f6',
              color: activeTab === 'profile' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            👤 My Profile &amp; Qualifications
          </button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fecaca' }}>
            ⚠️ {error}
          </div>
        )}

        {/* TAB 1: MY ASSIGNED PROJECTS */}
        {activeTab === 'projects' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.4rem' }}>
                🏗️ Construction Projects Assigned to You
              </h2>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>
                View current project milestones, timelines, locations, and site progress.
              </p>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading projects...</div>
            ) : projects.length === 0 ? (
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏗️</div>
                <h3 style={{ color: '#111827', margin: '0 0 8px' }}>No Projects Assigned Yet</h3>
                <p style={{ color: '#6b7280', maxWidth: '450px', margin: '0 auto' }}>
                  You have not been assigned to any active construction projects yet. Please check with your Employee Manager.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      padding: '24px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {proj.category || 'RESIDENCIES'}
                          </span>
                          <h3 style={{ fontSize: '1.25rem', color: '#111827', margin: '8px 0 4px', fontWeight: 700 }}>
                            {proj.name}
                          </h3>
                        </div>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background:
                              proj.status === 'IN_PROGRESS'
                                ? '#dcfce7'
                                : proj.status === 'COMPLETED'
                                ? '#e0e7ff'
                                : '#fef3c7',
                            color:
                              proj.status === 'IN_PROGRESS'
                                ? '#166534'
                                : proj.status === 'COMPLETED'
                                ? '#3730a3'
                                : '#92400e',
                          }}
                        >
                          {proj.status}
                        </span>
                      </div>

                      <p style={{ color: '#4b5563', fontSize: '0.85rem', lineHeight: '1.5', margin: '0 0 16px' }}>
                        {proj.description || 'Modern construction project undertaken by Odiliya Residencies & Engineering.'}
                      </p>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                          <span>Site Completion</span>
                          <span>{proj.progressPercentage || 0}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${proj.progressPercentage || 0}%`,
                              height: '100%',
                              background: '#047857',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </div>

                      {/* Key details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f9fafb', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', color: '#4b5563', marginBottom: '16px' }}>
                        <div>
                          <strong>📍 Location:</strong> {proj.location || 'Colombo, Sri Lanka'}
                        </div>
                        <div>
                          <strong>📅 Timeline:</strong> {formatDate(proj.startDate)}
                        </div>
                        <div>
                          <strong>👤 Client:</strong> {proj.client?.name || 'Odiliya In-House'}
                        </div>
                        <div>
                          <strong>💰 Budget:</strong> {formatMoney(proj.budget)}
                        </div>
                      </div>

                      {/* Milestones Preview */}
                      {proj.milestones && proj.milestones.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                            🎯 Project Milestones:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {proj.milestones.slice(0, 3).map((m) => (
                              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#4b5563', padding: '4px 0', borderBottom: '1px dashed #e5e7eb' }}>
                                <span>• {m.title}</span>
                                <span style={{ fontWeight: 600 }}>{m.status} ({m.progressPercentage}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                        Active Site Assignment ✓
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY TASKS & PROGRESS UPDATES (Req 4) */}
        {activeTab === 'tasks' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.4rem' }}>
                📋 Your Assigned Tasks &amp; Progress Updates
              </h2>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>
                Update your task completion percentage, status, and site remarks so the Project Manager can monitor site progress.
              </p>
            </div>

            {taskNotice && (
              <div style={{ background: '#ecfdf5', color: '#065f46', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #a7f3d0' }}>
                {taskNotice}
              </div>
            )}

            {tasks.length === 0 ? (
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
                <h3 style={{ color: '#111827', margin: '0 0 8px' }}>No Tasks Assigned Yet</h3>
                <p style={{ color: '#6b7280', maxWidth: '450px', margin: '0 auto' }}>
                  You currently have no tasks assigned by the Project Manager. Check back once your site supervisor assigns daily tasks.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                {tasks.map((task) => {
                  const isEditing = updatingTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        padding: '24px',
                        border: isEditing ? '2px solid #047857' : '1px solid #e5e7eb',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                              {task.project?.name || 'Assigned Project'}
                            </span>
                            <h3 style={{ fontSize: '1.2rem', color: '#111827', margin: '6px 0 2px', fontWeight: 700 }}>
                              {task.taskName}
                            </h3>
                          </div>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background:
                                task.status === 'COMPLETED'
                                  ? '#dcfce7'
                                  : task.status === 'IN_PROGRESS'
                                  ? '#dbeafe'
                                  : '#fef3c7',
                              color:
                                task.status === 'COMPLETED'
                                  ? '#166534'
                                  : task.status === 'IN_PROGRESS'
                                  ? '#1e40af'
                                  : '#92400e',
                            }}
                          >
                            {task.status}
                          </span>
                        </div>

                        <p style={{ color: '#4b5563', fontSize: '0.85rem', margin: '0 0 12px' }}>
                          {task.description || 'Complete the assigned work per construction architectural specifications.'}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', color: '#6b7280', marginBottom: '14px', background: '#f9fafb', padding: '8px 12px', borderRadius: '6px' }}>
                          <div>📅 Start: <b>{formatDate(task.startDate)}</b></div>
                          <div>⏳ Deadline: <b>{formatDate(task.deadline)}</b></div>
                        </div>

                        {/* Current Progress bar */}
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                            <span>Progress</span>
                            <span>{task.progressPercentage || 0}%</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${task.progressPercentage || 0}%`,
                                height: '100%',
                                background: (task.progressPercentage || 0) === 100 ? '#10b981' : '#047857',
                                borderRadius: '4px',
                              }}
                            />
                          </div>
                        </div>

                        {task.progressRemarks && !isEditing && (
                          <div style={{ fontSize: '0.8rem', color: '#374151', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}>
                            <strong>💬 Latest Update:</strong> {task.progressRemarks}
                          </div>
                        )}

                        {/* EDIT PROGRESS MODE */}
                        {isEditing ? (
                          <div style={{ background: '#f9fafb', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb', marginTop: '10px' }}>
                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                                Progress Percentage ({taskProgressPayload.progressPercentage}%)
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={taskProgressPayload.progressPercentage}
                                onChange={(e) => setTaskProgressPayload({ ...taskProgressPayload, progressPercentage: Number(e.target.value) })}
                                style={{ width: '100%' }}
                              />
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                                Status
                              </label>
                              <select
                                value={taskProgressPayload.status}
                                onChange={(e) => setTaskProgressPayload({ ...taskProgressPayload, status: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                              >
                                <option value="TODO">TODO</option>
                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                <option value="IN_REVIEW">IN_REVIEW</option>
                                <option value="COMPLETED">COMPLETED</option>
                              </select>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                                Remarks / Notes for Project Manager
                              </label>
                              <textarea
                                value={taskProgressPayload.progressRemarks}
                                onChange={(e) => setTaskProgressPayload({ ...taskProgressPayload, progressRemarks: e.target.value })}
                                placeholder="E.g. Completed wall framing, awaiting plastering..."
                                rows="2"
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleSaveTaskProgress(task.id)}
                                disabled={savingTaskProgress}
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  background: '#047857',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                }}
                              >
                                {savingTaskProgress ? 'Saving...' : 'Save & Update PM'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setUpdatingTaskId(null)}
                                style={{
                                  padding: '8px 12px',
                                  background: '#e5e7eb',
                                  color: '#374151',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditTaskProgress(task)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              background: '#f3f4f6',
                              color: '#047857',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            ✏️ Update Task Progress
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MY ATTENDANCE LOG & SELF CHECK-IN (Req 3) */}
        {activeTab === 'attendance' && (
          <div>
            {/* Self-Attendance Form */}
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 6px', color: '#111827', fontSize: '1.3rem' }}>
                ⏱️ Mark Today's Attendance (Self Check-in)
              </h3>
              <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '0.85rem' }}>
                Submit your daily check-in / check-out time and site notes. Your recorded attendance will be visible immediately to the Employee Manager.
              </p>

              {attendanceNotice && (
                <div style={{ background: '#ecfdf5', color: '#065f46', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #a7f3d0' }}>
                  {attendanceNotice}
                </div>
              )}
              {attendanceError && (
                <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fecaca' }}>
                  ⚠️ {attendanceError}
                </div>
              )}

              <form onSubmit={handleMarkAttendance} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Attendance Date
                  </label>
                  <input
                    type="date"
                    value={attendanceForm.date}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    value={attendanceForm.status}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  >
                    <option value="PRESENT">PRESENT (Full Day)</option>
                    <option value="LATE">LATE (Delayed arrival)</option>
                    <option value="HALF_DAY">HALF_DAY (4 Hours)</option>
                    <option value="ON_LEAVE">ON_LEAVE (Approved leave)</option>
                    <option value="ABSENT">ABSENT</option>
                  </select>
                </div>

                {attendanceForm.status !== 'ABSENT' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Check-in Time
                    </label>
                    <input
                      type="time"
                      value={attendanceForm.checkInTime}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, checkInTime: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                  </div>
                )}

                {attendanceForm.status !== 'ABSENT' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Check-out Time
                    </label>
                    <input
                      type="time"
                      value={attendanceForm.checkOutTime}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, checkOutTime: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                  </div>
                )}

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Site Remarks / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. On-site at Residencies block B, structural inspection..."
                    value={attendanceForm.remarks}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, remarks: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={markingAttendance}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: '#047857',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {markingAttendance ? 'Submitting...' : '✓ Submit Attendance'}
                  </button>
                </div>
              </form>
            </div>

            {/* Attendance History Table */}
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.3rem' }}>
                    📋 Recorded Attendance History
                  </h3>
                  <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>
                    Complete log of daily attendance and manager / self check-in records.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ padding: '6px 12px', borderRadius: '20px', background: '#ecfdf5', color: '#065f46', fontSize: '0.85rem', fontWeight: 600 }}>
                    Present: {presentCount}
                  </span>
                  <span style={{ padding: '6px 12px', borderRadius: '20px', background: '#fef2f2', color: '#991b1b', fontSize: '0.85rem', fontWeight: 600 }}>
                    Absent: {attendance.filter((a) => a.status === 'ABSENT').length}
                  </span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>DATE</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>CHECK-IN</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>CHECK-OUT</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>REMARKS / SITE NOTES</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>RECORDED BY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                          No attendance records logged yet.
                        </td>
                      </tr>
                    ) : (
                      attendance.map((att) => (
                        <tr key={att.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                            {formatDate(att.date)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background:
                                  att.status === 'PRESENT'
                                    ? '#dcfce7'
                                    : att.status === 'ABSENT'
                                    ? '#fee2e2'
                                    : att.status === 'LATE'
                                    ? '#fef3c7'
                                    : '#e0e7ff',
                                color:
                                  att.status === 'PRESENT'
                                    ? '#166534'
                                    : att.status === 'ABSENT'
                                    ? '#991b1b'
                                    : att.status === 'LATE'
                                    ? '#92400e'
                                    : '#3730a3',
                              }}
                            >
                              {att.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4b5563' }}>
                            {att.checkInTime || '-'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4b5563' }}>
                            {att.checkOutTime || '-'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#374151' }}>
                            {att.remarks || '-'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#6b7280' }}>
                            {att.recordedBy || 'Employee Manager'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MY PROFILE */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', background: '#ffffff', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 16px', color: '#111827', fontSize: '1.3rem' }}>
              👤 Employee Identification &amp; Qualifications
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
                  Employee ID
                </label>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#047857', marginTop: '2px' }}>
                  {profile?.employeeId || 'EMP001'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
                  Full Name
                </label>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', marginTop: '2px' }}>
                  {profile?.name || user?.displayName || '-'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
                  Role / Trade
                </label>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginTop: '2px' }}>
                  {profile?.role || profile?.position || '-'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
                  Department
                </label>
                <div style={{ fontSize: '1rem', color: '#374151', marginTop: '2px' }}>
                  {profile?.department || 'Operations'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
                  Phone / Contact
                </label>
                <div style={{ fontSize: '1rem', color: '#374151', marginTop: '2px' }}>
                  {profile?.phone || 'Not specified'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
                  Email Address
                </label>
                <div style={{ fontSize: '1rem', color: '#374151', marginTop: '2px' }}>
                  {profile?.email || user?.username || '-'}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
                  Qualifications &amp; Certifications
                </label>
                <div style={{ fontSize: '0.95rem', color: '#1f2937', marginTop: '4px', background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  {profile?.qualifications || 'No qualifications specified yet.'}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
                  Residential Address
                </label>
                <div style={{ fontSize: '0.95rem', color: '#374151', marginTop: '2px' }}>
                  {profile?.address || 'Not specified'}
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
