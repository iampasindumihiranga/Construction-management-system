import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import {
  formatDate,
  formatMoney,
  getMaterials,
  getMaterialCategories,
  getInventorySummary,
  createStockAlert,
  getStockAlerts,
  updateMaterial,
  createMaterialRequest,
  getMaterialRequests,
  getProjects,
} from '../services/api';

export default function SiteManagerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('alerts');
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({});
  const [stockAlerts, setStockAlerts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Stock Alert Form State
  const [alertForm, setAlertForm] = useState({
    materialId: '',
    currentSiteStock: '',
    isLowStock: true,
    urgency: 'HIGH',
    requestedQuantity: '',
    siteLocation: 'Main Construction Site A',
    notes: '',
  });
  const [submittingAlert, setSubmittingAlert] = useState(false);

  // Quick Usage / Update Modal
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [updateQty, setUpdateQty] = useState('');
  const [updatingStock, setUpdatingStock] = useState(false);

  // Material Request Form State
  const [requestForm, setRequestForm] = useState({
    materialId: '',
    projectId: '',
    quantity: '',
    priority: 'MEDIUM',
    notes: '',
  });
  const [submittingReq, setSubmittingReq] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [matData, catData, sumData, alertsData, projsData, reqsData] = await Promise.all([
        getMaterials({ search, category: categoryFilter }),
        getMaterialCategories().catch(() => []),
        getInventorySummary().catch(() => ({})),
        getStockAlerts().catch(() => []),
        getProjects({ realOnly: true }).catch(() => []),
        getMaterialRequests().catch(() => []),
      ]);

      setMaterials(matData || []);
      setCategories(catData || []);
      setSummary(sumData || {});
      setStockAlerts(alertsData || []);
      setProjects(projsData || []);
      setMaterialRequests(reqsData || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error loading site manager dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [search, categoryFilter]);

  const handleSendStockAlert = async (e) => {
    e.preventDefault();
    if (!alertForm.materialId) {
      setError('Please select a material to alert.');
      return;
    }
    setSubmittingAlert(true);
    setNotice('');
    setError('');

    try {
      await createStockAlert({
        material: { id: Number(alertForm.materialId) },
        currentSiteStock: alertForm.currentSiteStock !== '' ? Number(alertForm.currentSiteStock) : null,
        isLowStock: alertForm.isLowStock,
        urgency: alertForm.urgency,
        requestedQuantity: alertForm.requestedQuantity !== '' ? Number(alertForm.requestedQuantity) : null,
        siteLocation: alertForm.siteLocation.trim(),
        notes: alertForm.notes.trim(),
        reportedBy: `Site Manager (${user?.displayName || user?.username || 'Site Lead'})`,
      });

      setNotice('✓ Stock alert and low-stock notice successfully transmitted to Inventory Manager!');
      setAlertForm({
        materialId: '',
        currentSiteStock: '',
        isLowStock: true,
        urgency: 'HIGH',
        requestedQuantity: '',
        siteLocation: 'Main Construction Site A',
        notes: '',
      });
      const updatedAlerts = await getStockAlerts();
      setStockAlerts(updatedAlerts || []);
      setTimeout(() => setNotice(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to submit stock alert.');
    } finally {
      setSubmittingAlert(false);
    }
  };

  const handleQuickStockUpdate = async (e) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    setUpdatingStock(true);
    try {
      const updated = {
        ...selectedMaterial,
        quantity: Number(updateQty),
      };
      await updateMaterial(selectedMaterial.id, updated);
      setNotice(`✓ Stock count for ${selectedMaterial.name} updated to ${updateQty} ${selectedMaterial.unit || 'units'}.`);
      setSelectedMaterial(null);
      await loadAll();
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update stock quantity.');
    } finally {
      setUpdatingStock(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!requestForm.materialId || !requestForm.quantity) {
      setError('Please fill in material and quantity.');
      return;
    }
    if (!requestForm.projectId) {
      setError('Please select a target construction project for the material request.');
      return;
    }
    setSubmittingReq(true);
    try {
      await createMaterialRequest({
        material: { id: Number(requestForm.materialId) },
        project: { id: Number(requestForm.projectId) },
        requestedQuantity: Number(requestForm.quantity),
        remarks: (requestForm.notes ? requestForm.notes.trim() + ' ' : '') + (requestForm.priority ? `[Priority: ${requestForm.priority}]` : ''),
        requestedBy: `Site Manager (${user?.displayName || user?.username || 'Site Lead'})`,
      });
      setNotice('✓ Material request submitted for Inventory Manager approval.');
      setRequestForm({
        materialId: '',
        projectId: projects[0]?.id ? String(projects[0].id) : '',
        quantity: '',
        priority: 'MEDIUM',
        notes: '',
      });
      const reqsData = await getMaterialRequests().catch(() => []);
      setMaterialRequests(reqsData || []);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to submit material request.');
    } finally {
      setSubmittingReq(false);
    }
  };

  const pendingAlertsCount = stockAlerts.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="light-site-wrapper">
      <Navbar />

      <main className="pm-page">
        {/* Welcome Header */}
        <section
          style={{
            background: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '28px 32px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                EXCLUSIVE SITE MANAGER PORTAL
              </span>
              <h1 style={{ fontSize: '2.2rem', margin: '12px 0 6px', fontWeight: 800 }}>
                Site Inventory &amp; Stock Informer
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
                Logged in as: <b>{user?.displayName || 'Site Manager'}</b> | Real-time site stock monitoring &amp; direct alerts to Inventory Manager.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 600 }}>Active Materials</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{materials.length}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 600 }}>Low Stock Alerts</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{pendingAlertsCount}</div>
              </div>
            </div>
          </div>
        </section>

        {notice && (
          <div style={{ background: '#ecfdf5', color: '#065f46', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #a7f3d0' }}>
            {notice}
          </div>
        )}
        {error && (
          <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fecaca' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setTab('alerts')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: tab === 'alerts' ? '#b45309' : '#f3f4f6',
              color: tab === 'alerts' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Low Stock Informer &amp; Alerts ({stockAlerts.length})
          </button>
          <button
            onClick={() => setTab('inventory')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: tab === 'inventory' ? '#b45309' : '#f3f4f6',
              color: tab === 'inventory' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Site Materials &amp; Quick Stock Update ({materials.length})
          </button>
          <button
            onClick={() => setTab('requests')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: tab === 'requests' ? '#b45309' : '#f3f4f6',
              color: tab === 'requests' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Request Material Dispatch
          </button>
        </div>

        {/* TAB 1: LOW STOCK INFORMER & ALERTS (Requirement 5) */}
        {tab === 'alerts' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              {/* Informer Form */}
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 6px', color: '#111827', fontSize: '1.3rem' }}>
                  🚨 Inform Inventory Manager of Stock Status
                </h3>
                <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '0.85rem' }}>
                  Report on-site material levels and notify if critical construction items are running low.
                </p>

                <form onSubmit={handleSendStockAlert} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Select Material *
                    </label>
                    <select
                      value={alertForm.materialId}
                      onChange={(e) => {
                        const mId = e.target.value;
                        const found = materials.find((m) => String(m.id) === String(mId));
                        setAlertForm({
                          ...alertForm,
                          materialId: mId,
                          currentSiteStock: found ? String(found.quantity) : '',
                        });
                      }}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">-- Choose Material --</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.materialCode} - {m.name} (Current Main Stock: {m.quantity} {m.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                        Observed On-Site Stock
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 15"
                        value={alertForm.currentSiteStock}
                        onChange={(e) => setAlertForm({ ...alertForm, currentSiteStock: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                        Needed Quantity
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 100"
                        value={alertForm.requestedQuantity}
                        onChange={(e) => setAlertForm({ ...alertForm, requestedQuantity: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                        Is Stock Low?
                      </label>
                      <select
                        value={alertForm.isLowStock ? 'YES' : 'NO'}
                        onChange={(e) => setAlertForm({ ...alertForm, isLowStock: e.target.value === 'YES' })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      >
                        <option value="YES">⚠️ YES - Critical / Low Stock</option>
                        <option value="NO">✓ NO - Stock Adequate</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                        Urgency Level
                      </label>
                      <select
                        value={alertForm.urgency}
                        onChange={(e) => setAlertForm({ ...alertForm, urgency: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH (Restock in 48h)</option>
                        <option value="CRITICAL">CRITICAL (Work Halted)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Site Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Odiliya Residencies Tower 1, Ground Floor"
                      value={alertForm.siteLocation}
                      onChange={(e) => setAlertForm({ ...alertForm, siteLocation: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Site Notes / Reason for Inventory Manager
                    </label>
                    <textarea
                      placeholder="Describe current consumption rate, concrete pouring schedule, urgent needs..."
                      value={alertForm.notes}
                      onChange={(e) => setAlertForm({ ...alertForm, notes: e.target.value })}
                      rows="3"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingAlert}
                    style={{
                      padding: '12px 20px',
                      background: '#b45309',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                    }}
                  >
                    {submittingAlert ? 'Transmitting Alert...' : '🚀 Transmit Stock Alert to Inventory Manager'}
                  </button>
                </form>
              </div>

              {/* Informer Guidance & Tips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#92400e', fontSize: '1.1rem' }}>
                    👷 Role Responsibilities: Site Manager
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#78350f', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    <li>Perform physical inspections of stock stockpiles at the job site daily.</li>
                    <li>When steel bars, cement, sand, or electrical fixtures drop below 2-day buffer, immediately transmit a <b>CRITICAL</b> or <b>HIGH</b> alert.</li>
                    <li>The Inventory Manager receives these alerts directly in real time to dispatch or issue purchase orders.</li>
                  </ul>
                </div>

                <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ margin: '0 0 12px', color: '#111827', fontSize: '1.1rem' }}>
                    📊 Live Stock Summary
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Total Items</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827' }}>{summary.totalItems || materials.length}</div>
                    </div>
                    <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#991b1b', textTransform: 'uppercase' }}>Low Stock Items</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#991b1b' }}>{summary.lowStockCount || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Alert History Table */}
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', color: '#111827', fontSize: '1.2rem' }}>
                📋 Historical Stock Alerts Sent to Inventory Manager
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>DATE / TIME</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>MATERIAL</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>ON-SITE STOCK</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>URGENCY</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>LOCATION / NOTES</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockAlerts.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                          No stock alerts sent yet. Use the form above to inform the Inventory Manager.
                        </td>
                      </tr>
                    ) : (
                      stockAlerts.map((alert) => (
                        <tr key={alert.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#111827' }}>
                            {formatDate(alert.createdAt)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <strong>{alert.material?.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{alert.material?.materialCode}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#374151' }}>
                            {alert.currentSiteStock !== null ? `${alert.currentSiteStock} ${alert.material?.unit || ''}` : '-'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background:
                                  alert.urgency === 'CRITICAL'
                                    ? '#fee2e2'
                                    : alert.urgency === 'HIGH'
                                    ? '#ffedd5'
                                    : '#fef3c7',
                                color:
                                  alert.urgency === 'CRITICAL'
                                    ? '#991b1b'
                                    : alert.urgency === 'HIGH'
                                    ? '#c2410c'
                                    : '#92400e',
                              }}
                            >
                              {alert.urgency}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4b5563' }}>
                            <div>📍 {alert.siteLocation || 'Site A'}</div>
                            {alert.notes && <small style={{ color: '#6b7280' }}>"{alert.notes}"</small>}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background:
                                  alert.status === 'RESOLVED'
                                    ? '#dcfce7'
                                    : alert.status === 'ACKNOWLEDGED'
                                    ? '#dbeafe'
                                    : '#fef3c7',
                                color:
                                  alert.status === 'RESOLVED'
                                    ? '#166534'
                                    : alert.status === 'ACKNOWLEDGED'
                                    ? '#1e40af'
                                    : '#92400e',
                              }}
                            >
                              {alert.status}
                            </span>
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

        {/* TAB 2: SITE MATERIALS & QUICK UPDATE */}
        {tab === 'inventory' && (
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.3rem' }}>
                  📦 Construction Materials Catalog &amp; On-Site Stock
                </h3>
                <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>
                  Search construction inventory, monitor minimum thresholds, and adjust physical on-site count.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>CODE</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>MATERIAL NAME</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>CATEGORY</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>CURRENT STOCK</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>STATUS</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => {
                    const isLow = m.quantity <= (m.minimumStockLevel || 10);
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                          {m.materialCode}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <strong>{m.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{m.unit} | Unit Price: {formatMoney(m.unitPrice)}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4b5563' }}>
                          {m.category}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: isLow ? '#b91c1c' : '#111827' }}>
                          {m.quantity} {m.unit}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: isLow ? '#fee2e2' : '#dcfce7',
                              color: isLow ? '#991b1b' : '#166534',
                            }}
                          >
                            {isLow ? 'LOW STOCK' : 'IN STOCK'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMaterial(m);
                                setUpdateQty(String(m.quantity));
                              }}
                              style={{
                                padding: '4px 10px',
                                background: '#f3f4f6',
                                color: '#111827',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              ✏️ Update Stock
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTab('alerts');
                                setAlertForm({
                                  ...alertForm,
                                  materialId: String(m.id),
                                  currentSiteStock: String(m.quantity),
                                  isLowStock: true,
                                  urgency: isLow ? 'CRITICAL' : 'HIGH',
                                });
                              }}
                              style={{
                                padding: '4px 10px',
                                background: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              🚨 Alert Low Stock
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Update Stock Modal */}
            {selectedMaterial && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%' }}>
                  <h3 style={{ margin: '0 0 8px', color: '#111827' }}>Update Physical Stock Count</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 16px' }}>
                    Adjusting count for: <b>{selectedMaterial.name}</b> ({selectedMaterial.materialCode})
                  </p>

                  <form onSubmit={handleQuickStockUpdate}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                        Actual Stock on Site ({selectedMaterial.unit})
                      </label>
                      <input
                        type="number"
                        value={updateQty}
                        onChange={(e) => setUpdateQty(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedMaterial(null)}
                        style={{ padding: '8px 14px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updatingStock}
                        style={{ padding: '8px 14px', background: '#b45309', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {updatingStock ? 'Updating...' : 'Save Stock Count'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REQUEST MATERIAL DISPATCH */}
        {tab === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%' }}>
            <h3 style={{ margin: '0 0 8px', color: '#111827', fontSize: '1.3rem' }}>
              📝 Submit Material Dispatch Request
            </h3>
            <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '0.85rem' }}>
              Request materials to be issued from the main warehouse to your construction site.
            </p>

            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Material Required *
                </label>
                <select
                  value={requestForm.materialId}
                  onChange={(e) => setRequestForm({ ...requestForm, materialId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="">-- Choose Material --</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.materialCode} - {m.name} ({m.quantity} {m.unit} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Target Construction Project
                </label>
                <select
                  value={requestForm.projectId}
                  onChange={(e) => setRequestForm({ ...requestForm, projectId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="">-- General Site Supply --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.location || 'Site'})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Quantity Needed *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={requestForm.quantity}
                    onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Priority
                  </label>
                  <select
                    value={requestForm.priority}
                    onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Notes / Site Application
                </label>
                <textarea
                  placeholder="Specify location and application..."
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  rows="3"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>

              <button
                type="submit"
                disabled={submittingReq}
                style={{
                  padding: '12px 20px',
                  background: '#b45309',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                }}
              >
                {submittingReq ? 'Submitting Request...' : '📨 Submit Material Dispatch Request'}
              </button>
            </form>
          </div>

          {/* Request History — Inventory Manager Approval/Rejection Status */}
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 6px', color: '#111827', fontSize: '1.2rem' }}>
              My Material Dispatch Requests — Inventory Manager Response
            </h3>
            <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '0.85rem' }}>
              Track the approval or rejection of each request you submitted. Refresh the page to see the latest status.
            </p>

            {materialRequests.filter(r => r.requestedBy && r.requestedBy.toLowerCase().includes('site manager')).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No material dispatch requests submitted yet. Use the form above.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>REQUEST CODE &amp; DATE</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>PROJECT</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>MATERIAL</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>QTY REQUESTED</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>STATUS</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>REMARKS / MANAGER RESPONSE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialRequests
                      .filter(r => !r.requestedBy || r.requestedBy.toLowerCase().includes('site manager') || r.requestedBy.toLowerCase().includes('site engineer') || r.requestedBy.toLowerCase().includes(user?.username?.toLowerCase() || ''))
                      .sort((a, b) => new Date(b.requestDate || b.createdAt || 0) - new Date(a.requestDate || a.createdAt || 0))
                      .map((req) => {
                        const statusColor = req.status === 'APPROVED'
                          ? { bg: '#dbeafe', text: '#1e40af' }
                          : req.status === 'ISSUED'
                          ? { bg: '#dcfce7', text: '#166534' }
                          : req.status === 'REJECTED'
                          ? { bg: '#fee2e2', text: '#991b1b' }
                          : { bg: '#fef3c7', text: '#92400e' };
                        return (
                          <tr key={req.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 14px', color: '#374151' }}>
                              <strong>{req.requestCode || `#REQ-${req.id}`}</strong>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{formatDate(req.requestDate || req.createdAt)}</div>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#374151' }}>
                              {req.project?.name || 'Project Site'}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <strong>{req.material?.name || 'Material'}</strong>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{req.material?.materialCode}</div>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#374151' }}>
                              <strong>{req.requestedQuantity || req.quantity}</strong> {req.material?.unit || 'units'}
                              {req.issuedQuantity > 0 && (
                                <div style={{ fontSize: '0.75rem', color: '#059669' }}>Issued: {req.issuedQuantity}</div>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: statusColor.bg,
                                color: statusColor.text,
                              }}>
                                {req.status === 'PENDING' ? 'Awaiting Review' : req.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#4b5563' }}>
                              {req.remarks || (req.status === 'PENDING' ? 'Pending review by Inventory Manager…' : '—')}
                              {req.approvedBy && (
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Reviewed by: {req.approvedBy}</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
