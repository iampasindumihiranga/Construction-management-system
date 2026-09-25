import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  approveMaterialRequest,
  createMaterial,
  createMaterialRequest,
  createPurchaseOrder,
  deleteMaterial,
  formatDate,
  formatMoney,
  getInventorySummary,
  getMaterialCategories,
  getMaterials,
  getMaterialRequests,
  getMaterialTransactions,
  getNextMaterialCode,
  getProjectMaterialConsumption,
  getProjects,
  getPurchaseOrders,
  issueMaterial,
  receivePurchaseOrder,
  rejectMaterialRequest,
  updateMaterial,
  getStockAlerts,
  updateStockAlertStatus,
} from '../services/api';

const DEFAULT_CATEGORIES = [
  'Building Materials',
  'Electrical Materials',
  'Plumbing Materials',
  'Finishing & Paint',
  'Structural Steel',
  'Hardware & Tools',
  'Masonry & Aggregates',
];

const COMMON_UNITS = ['bags', 'kg', 'tons', 'meters', 'liters', 'units', 'sq.ft', 'cubes', 'rolls', 'boxes'];

const emptyMaterial = {
  materialCode: '',
  name: '',
  category: 'Building Materials',
  quantity: '',
  unit: 'bags',
  unitPrice: '',
  supplier: '',
  minStockLevel: '10',
  location: '',
  description: '',
};

export default function InventoryManagerDashboard() {
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState({});
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Form states
  const [materialForm, setMaterialForm] = useState(emptyMaterial);
  const [editingMaterial, setEditingMaterial] = useState(null);

  // Request Form
  const [requestForm, setRequestForm] = useState({
    projectId: '',
    materialId: '',
    requestedQuantity: '',
    requestedBy: 'Site Engineer',
    remarks: '',
  });

  // Issue Dialog State
  const [issuingRequest, setIssuingRequest] = useState(null);
  const [issueQty, setIssueQty] = useState('');
  const [issueNotes, setIssueNotes] = useState('');

  // Consumption Project Selector
  const [consumptionProjectId, setConsumptionProjectId] = useState('');
  const [consumptionData, setConsumptionData] = useState(null);

  // Purchase Order Form
  const [poForm, setPoForm] = useState({
    materialId: '',
    supplier: '',
    quantity: '',
    unitPrice: '',
    expectedDeliveryDate: '',
    notes: '',
  });

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [sum, mats, cats, projs, reqs, txns, pos, alerts] = await Promise.all([
        getInventorySummary().catch(() => ({})),
        getMaterials({ search, category: selectedCategory, status: selectedStatus }).catch(() => []),
        getMaterialCategories().catch(() => DEFAULT_CATEGORIES),
        getProjects().catch(() => []),
        getMaterialRequests().catch(() => []),
        getMaterialTransactions().catch(() => []),
        getPurchaseOrders().catch(() => []),
        getStockAlerts().catch(() => []),
      ]);

      setSummary(sum || {});
      setMaterials(mats || []);
      if (cats && cats.length > 0) {
        const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...cats]));
        setCategories(merged);
      }
      setProjects(projs || []);
      setRequests(reqs || []);
      setTransactions(txns || []);
      setPurchaseOrders(pos || []);
      setStockAlerts(alerts || []);

      if (consumptionProjectId) {
        const cons = await getProjectMaterialConsumption(consumptionProjectId).catch(() => null);
        setConsumptionData(cons);
      } else if (projs && projs.length > 0) {
        setConsumptionProjectId(projs[0].id);
        const cons = await getProjectMaterialConsumption(projs[0].id).catch(() => null);
        setConsumptionData(cons);
      }
    } catch (err) {
      setError(err.message || 'Error loading inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [search, selectedCategory, selectedStatus]);

  const report = (msg) => {
    setNotice(msg);
    setError('');
  };
  const fail = (err) => {
    setError(err.message || 'Action failed.');
    setNotice('');
  };

  const startNewMaterial = async () => {
    try {
      const code = await getNextMaterialCode();
      setMaterialForm({ ...emptyMaterial, materialCode: code });
    } catch {
      setMaterialForm(emptyMaterial);
    }
    setEditingMaterial(null);
    setTab('add_material');
  };

  const editMaterialClick = (mat) => {
    setEditingMaterial(mat);
    setMaterialForm({
      materialCode: mat.materialCode || '',
      name: mat.name || '',
      category: mat.category || 'Building Materials',
      quantity: mat.quantity ?? '',
      unit: mat.unit || 'bags',
      unitPrice: mat.unitPrice ?? '',
      supplier: mat.supplier || '',
      minStockLevel: mat.minStockLevel ?? '10',
      location: mat.location || '',
      description: mat.description || '',
    });
    setTab('add_material');
  };

  const saveMaterialSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...materialForm,
        quantity: Number(materialForm.quantity || 0),
        unitPrice: Number(materialForm.unitPrice || 0),
        minStockLevel: Number(materialForm.minStockLevel || 0),
      };

      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, payload);
        report(`Material '${payload.name}' updated successfully.`);
      } else {
        await createMaterial(payload);
        report(`Material '${payload.name}' (${payload.materialCode}) registered successfully.`);
      }

      setEditingMaterial(null);
      setMaterialForm(emptyMaterial);
      setTab('materials');
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const deleteMaterialClick = async (mat) => {
    if (!window.confirm(`Are you sure you want to delete material ${mat.name} (${mat.materialCode})?`)) {
      return;
    }
    try {
      await deleteMaterial(mat.id);
      report(`Material ${mat.name} deleted.`);
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const handleAlertStatus = async (alertId, newStatus) => {
    try {
      await updateStockAlertStatus(alertId, newStatus);
      report(`Site Manager alert marked as ${newStatus}.`);
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const createPOForAlert = (alert) => {
    if (alert.material) {
      setPoForm({
        materialId: String(alert.material.id),
        supplier: alert.material.supplier || '',
        quantity: alert.requestedQuantity ? String(alert.requestedQuantity) : '100',
        unitPrice: alert.material.unitPrice ? String(alert.material.unitPrice) : '',
        expectedDeliveryDate: '',
        notes: `Replenishment order triggered by Site Manager low-stock alert (${alert.siteLocation || 'Site'})`,
      });
    }
    setTab('purchase_orders');
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    try {
      await createMaterialRequest({
        project: { id: Number(requestForm.projectId) },
        material: { id: Number(requestForm.materialId) },
        requestedQuantity: Number(requestForm.requestedQuantity),
        requestedBy: requestForm.requestedBy,
        remarks: requestForm.remarks,
      });
      report('Material request submitted for approval.');
      setRequestForm({
        projectId: projects[0]?.id || '',
        materialId: materials[0]?.id || '',
        requestedQuantity: '',
        requestedBy: 'Site Engineer',
        remarks: '',
      });
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const handleApproveRequest = async (reqId) => {
    try {
      await approveMaterialRequest(reqId, 'Inventory Manager', 'Approved by Inventory Manager');
      report('Request approved. You can now issue the materials.');
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const handleRejectRequest = async (reqId) => {
    const reason = window.prompt('Please provide a reason for rejecting this request:');
    if (reason === null) return;
    try {
      await rejectMaterialRequest(reqId, 'Inventory Manager', reason || 'Rejected by manager');
      report('Request rejected.');
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const openIssueModal = (req) => {
    setIssuingRequest(req);
    setIssueQty(req.requestedQuantity);
    setIssueNotes(`Issued for ${req.project?.name}`);
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issuingRequest) return;
    try {
      await issueMaterial(issuingRequest.id, {
        quantity: Number(issueQty),
        performedBy: 'Inventory Manager',
        notes: issueNotes,
      });
      report(`Materials successfully issued to ${issuingRequest.project?.name}. Stock updated.`);
      setIssuingRequest(null);
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const submitPurchaseOrder = async (e) => {
    e.preventDefault();
    try {
      await createPurchaseOrder({
        material: { id: Number(poForm.materialId) },
        supplier: poForm.supplier,
        quantity: Number(poForm.quantity),
        unitPrice: Number(poForm.unitPrice),
        expectedDeliveryDate: poForm.expectedDeliveryDate || null,
        notes: poForm.notes,
        createdBy: 'Inventory Manager',
      });
      report('Purchase order created successfully.');
      setPoForm({
        materialId: '',
        supplier: '',
        quantity: '',
        unitPrice: '',
        expectedDeliveryDate: '',
        notes: '',
      });
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const handleReceivePO = async (poId) => {
    if (!window.confirm('Confirm receipt of materials for this Purchase Order? This will automatically increase inventory stock.')) {
      return;
    }
    try {
      await receivePurchaseOrder(poId, 'Inventory Manager');
      report('Materials received! Inventory stock level has been automatically updated.');
      await refreshData();
    } catch (err) {
      fail(err);
    }
  };

  const loadProjectConsumption = async (pid) => {
    setConsumptionProjectId(pid);
    try {
      const data = await getProjectMaterialConsumption(pid);
      setConsumptionData(data);
    } catch (err) {
      fail(err);
    }
  };

  const lowStockItems = useMemo(() => {
    return materials.filter((m) => m.quantity <= m.minStockLevel);
  }, [materials]);

  return (
    <div className="light-site-wrapper">
      <Navbar />

      <main className="pm-page inventory-page">
        {/* Hero Section */}
        <section className="pm-hero">
          <div>
            <span className="brand-green-subtitle">CONSTRUCTION SUPPLY CHAIN</span>
            <h1>Material &amp; Inventory Workspace</h1>
            <p>
              Register materials, track warehouse stock &amp; low stock alerts, manage project requests &amp; approvals, record issuance transactions, and replenish stock with purchase orders.
            </p>
          </div>
        </section>

        {/* Workspace Navigation Tabs */}
        <nav className="pm-tabs">
          <button
            onClick={() => setTab('overview')}
            className={tab === 'overview' ? 'active' : ''}
          >
            Overview
          </button>
          <button
            onClick={() => setTab('materials')}
            className={tab === 'materials' ? 'active' : ''}
          >
            Materials
          </button>
          <button
            onClick={startNewMaterial}
            className={tab === 'add_material' ? 'active' : ''}
          >
            {editingMaterial ? 'Edit Material' : 'Register Material'}
          </button>
          <button
            onClick={() => setTab('requests')}
            className={tab === 'requests' ? 'active' : ''}
          >
            Requests ({requests.filter(r => r.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setTab('transactions')}
            className={tab === 'transactions' ? 'active' : ''}
          >
            Transactions
          </button>
          <button
            onClick={() => setTab('purchase_orders')}
            className={tab === 'purchase_orders' ? 'active' : ''}
          >
            Purchase Orders ({purchaseOrders.filter(p => p.status === 'ORDERED').length})
          </button>
          <button
            onClick={() => setTab('site_alerts')}
            className={tab === 'site_alerts' ? 'active' : ''}
            style={{
              background: tab === 'site_alerts' ? '#b45309' : (stockAlerts.filter(a => a.status === 'PENDING').length > 0 ? '#fffbeb' : ''),
              color: tab === 'site_alerts' ? '#ffffff' : (stockAlerts.filter(a => a.status === 'PENDING').length > 0 ? '#b45309' : ''),
              fontWeight: stockAlerts.filter(a => a.status === 'PENDING').length > 0 ? 700 : 500,
            }}
          >
            🚨 Site Manager Alerts ({stockAlerts.filter(a => a.status === 'PENDING').length})
          </button>
        </nav>

        {notice && (
          <div className="pm-alert success">
            {notice}
          </div>
        )}
        {error && (
          <div className="pm-alert error">
            {error}
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {tab === 'overview' && (
          <div>
            {/* KPI Cards */}
            <section className="pm-metrics inventory-metrics">
              <MetricBox label="Total material SKUs" value={summary.totalItems ?? materials.length} />
              <MetricBox label="Low-stock alerts" value={summary.lowStockCount ?? lowStockItems.length} />
              <MetricBox label="Inventory value" value={formatMoney(summary.totalStockValue || 0)} />
              <MetricBox label="Pending requests" value={summary.pendingRequestsCount ?? 0} />
              <MetricBox label="Active purchase orders" value={summary.activePurchaseOrdersCount ?? 0} />
            </section>

            {/* Step 4: Low Stock Alert Banner */}
            {lowStockItems.length > 0 && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, color: '#9f1239', fontSize: '1.1rem' }}>
                      Stock shortage alerts ({lowStockItems.length} items below minimum threshold)
                    </h3>
                  </div>
                  <button
                    onClick={() => setTab('purchase_orders')}
                    style={{ padding: '6px 14px', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Create purchase order
                  </button>
                </div>
                <p style={{ color: '#881337', margin: '0 0 12px', fontSize: '0.85rem' }}>
                  The following materials have fallen below their required safety reorder levels:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                  {lowStockItems.map((mat) => (
                    <div key={mat.id} style={{ background: '#fff', borderRadius: '8px', padding: '10px 14px', border: '1px solid #fbcfe8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: '#111827', fontSize: '0.9rem' }}>{mat.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Available: <b style={{ color: '#e11d48' }}>{mat.quantity} {mat.unit}</b> (Min Level: {mat.minStockLevel} {mat.unit})
                        </div>
                      </div>
                      <span style={{ background: '#ffe4e6', color: '#be123c', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {mat.quantity <= 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Breakdown & Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 16px', color: '#111827', fontSize: '1.1rem' }}>
                  Materials by category
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {summary.categoryCounts &&
                    Object.entries(summary.categoryCounts).map(([catName, count]) => (
                      <div key={catName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: '6px' }}>
                        <span style={{ fontWeight: 500, color: '#374151' }}>{catName}</span>
                        <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
                          {count} {count === 1 ? 'material' : 'materials'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 16px', color: '#111827', fontSize: '1.1rem' }}>Quick actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={startNewMaterial}
                    style={{ padding: '12px 16px', background: '#047857', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                  >
                    Register new material
                  </button>
                  <button
                    onClick={() => setTab('requests')}
                    style={{ padding: '12px 16px', background: '#f3f4f6', color: '#111827', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                  >
                    Review material requests
                  </button>
                  <button
                    onClick={() => setTab('transactions')}
                    style={{ padding: '12px 16px', background: '#f3f4f6', color: '#111827', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                  >
                    View consumption costs
                  </button>
                  <button
                    onClick={() => setTab('purchase_orders')}
                    style={{ padding: '12px 16px', background: '#f3f4f6', color: '#111827', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                  >
                    Create purchase order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MATERIALS & STOCK LEVELS (STEPS 1, 2, 3, 4) */}
        {tab === 'materials' && (
          <div>
            {/* Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
                <input
                  type="text"
                  placeholder="Search material code, name, supplier, or warehouse location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                >
                  <option value="ALL">All Stock Statuses</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </select>
              </div>

              <button
                onClick={startNewMaterial}
                style={{ padding: '10px 18px', background: '#047857', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Register material
              </button>
            </div>

            {/* Materials Table */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>MATERIAL CODE</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>MATERIAL NAME &amp; CATEGORY</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>AVAILABLE STOCK</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>MIN LEVEL</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>UNIT PRICE / VALUE</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>SUPPLIER &amp; LOCATION</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem' }}>STATUS</th>
                    <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '0.85rem', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                        No materials found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    materials.map((mat) => {
                      const isLow = mat.quantity <= mat.minStockLevel;
                      const isOut = mat.quantity <= 0;
                      return (
                        <tr key={mat.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>
                              {mat.materialCode}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{mat.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                              {mat.category}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: isLow ? '#dc2626' : '#111827' }}>
                              {mat.quantity} {mat.unit}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '0.85rem' }}>
                            {mat.minStockLevel} {mat.unit}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{formatMoney(mat.unitPrice)} / {mat.unit}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              Total: {formatMoney(Number(mat.unitPrice || 0) * Number(mat.quantity || 0))}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#4b5563' }}>
                            <div>{mat.supplier || 'Standard Supplier'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{mat.location || 'Warehouse'}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: isOut ? '#fee2e2' : isLow ? '#fef3c7' : '#dcfce7',
                              color: isOut ? '#991b1b' : isLow ? '#92400e' : '#166534',
                            }}>
                              {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'AVAILABLE'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => editMaterialClick(mat)}
                                style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}
                                title="Step 3: Update Material Details"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteMaterialClick(mat)}
                                style={{ padding: '4px 8px', background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                                title="Delete Material"
                              >
                                Delete
                              </button>
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

        {/* TAB 3: REGISTER / EDIT MATERIAL FORM (STEPS 1, 2, 3) */}
        {tab === 'add_material' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '1.4rem' }}>
                {editingMaterial ? `Update material details (${editingMaterial.name})` : 'Register construction material'}
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '4px 0 0' }}>
                Specify material code, name, category, initial quantity, measurement unit, unit cost, supplier, and minimum stock threshold.
              </p>
            </div>

            <form onSubmit={saveMaterialSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Material Code *
                </label>
                <input
                  type="text"
                  value={materialForm.materialCode}
                  onChange={(e) => setMaterialForm({ ...materialForm, materialCode: e.target.value })}
                  placeholder="e.g. MAT001"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Material Name * (e.g. Cement, Steel, Bricks)
                </label>
                <input
                  type="text"
                  value={materialForm.name}
                  onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                  placeholder="e.g. Portland General Cement"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Category (Step 2) *
                </label>
                <select
                  value={materialForm.category}
                  onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Unit of Measurement *
                </label>
                <select
                  value={materialForm.unit}
                  onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Available Quantity *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={materialForm.quantity}
                  onChange={(e) => setMaterialForm({ ...materialForm, quantity: e.target.value })}
                  placeholder="e.g. 500"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Minimum Stock Level (Alert Threshold) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={materialForm.minStockLevel}
                  onChange={(e) => setMaterialForm({ ...materialForm, minStockLevel: e.target.value })}
                  placeholder="e.g. 100"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Unit Price (LKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={materialForm.unitPrice}
                  onChange={(e) => setMaterialForm({ ...materialForm, unitPrice: e.target.value })}
                  placeholder="e.g. 8.50"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={materialForm.supplier}
                  onChange={(e) => setMaterialForm({ ...materialForm, supplier: e.target.value })}
                  placeholder="e.g. Tokyo Cement Lanka / Kelani Cables"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Warehouse / Storage Location
                </label>
                <input
                  type="text"
                  value={materialForm.location}
                  onChange={(e) => setMaterialForm({ ...materialForm, location: e.target.value })}
                  placeholder="e.g. Main Warehouse - Bay A1, Yard Store"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  Description &amp; Specifications
                </label>
                <textarea
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                  placeholder="e.g. Standard 50kg hydraulic cement bags for structural concrete."
                  rows="3"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="submit"
                  style={{ padding: '12px 24px', background: '#047857', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {editingMaterial ? '💾 Save Material Details' : '✅ Register Material'}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('materials')}
                  style={{ padding: '12px 20px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: PROJECT REQUESTS & APPROVALS (STEPS 5, 6, 7) */}
        {tab === 'requests' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            {/* Step 5: Request Form */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.2rem' }}>
                Project material requests
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 16px' }}>
                Example: ABC Project requests 200 bags of cement.
              </p>

              <form onSubmit={submitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Construction Project *
                  </label>
                  <select
                    value={requestForm.projectId}
                    onChange={(e) => setRequestForm({ ...requestForm, projectId: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Material to Request *
                  </label>
                  <select
                    value={requestForm.materialId}
                    onChange={(e) => setRequestForm({ ...requestForm, materialId: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="">-- Select Material --</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (In Stock: {m.quantity} {m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Requested Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="e.g. 200"
                    value={requestForm.requestedQuantity}
                    onChange={(e) => setRequestForm({ ...requestForm, requestedQuantity: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Requested By (Employee / Engineer)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kasun Perera (Site Engineer)"
                    value={requestForm.requestedBy}
                    onChange={(e) => setRequestForm({ ...requestForm, requestedBy: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Purpose / Site Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Foundation casting, structural beam work"
                    value={requestForm.remarks}
                    onChange={(e) => setRequestForm({ ...requestForm, remarks: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{ padding: '12px 16px', background: '#047857', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}
                >
                  Submit material request
                </button>
              </form>
            </div>

            {/* Step 6: Requests Review & Approvals */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.2rem' }}>
                Request approvals and stock issuance
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 16px' }}>
                Review site requisitions, approve/reject, and issue materials to deduct stock and log transaction.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
                {requests.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '30px' }}>No material requests submitted yet.</p>
                ) : (
                  requests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: req.status === 'PENDING' ? '#fffbeb' : req.status === 'APPROVED' ? '#eff6ff' : req.status === 'ISSUED' ? '#f0fdf4' : '#f9fafb',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <strong style={{ color: '#111827', fontSize: '0.95rem' }}>{req.project?.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '6px' }}>({req.requestCode})</span>
                        </div>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background:
                            req.status === 'PENDING'
                              ? '#fef3c7'
                              : req.status === 'APPROVED'
                              ? '#dbeafe'
                              : req.status === 'ISSUED'
                              ? '#dcfce7'
                              : '#fee2e2',
                          color:
                            req.status === 'PENDING'
                              ? '#92400e'
                              : req.status === 'APPROVED'
                              ? '#1e40af'
                              : req.status === 'ISSUED'
                              ? '#166534'
                              : '#991b1b',
                        }}>
                          {req.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#374151', margin: '4px 0' }}>
                        Requested: <b>{req.requestedQuantity} {req.material?.unit}</b> of <b>{req.material?.name}</b>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        By: {req.requestedBy || 'Site Staff'} | Date: {formatDate(req.requestDate)}
                        {req.remarks ? ` | Note: ${req.remarks}` : ''}
                      </div>

                      {/* Action Buttons */}
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {req.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              style={{ padding: '6px 12px', background: '#047857', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Approve request
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              style={{ padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {req.status === 'APPROVED' && (
                          <button
                            onClick={() => openIssueModal(req)}
                            style={{ padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Issue materials and deduct stock
                          </button>
                        )}

                        {req.status === 'ISSUED' && (
                          <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                            Issued {req.issuedQuantity || req.requestedQuantity} {req.material?.unit} to site
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Issuing Modal Form */}
            {issuingRequest && (
              <div style={{ gridColumn: 'span 2', background: '#ecfdf5', borderRadius: '12px', padding: '20px', border: '2px solid #047857' }}>
                <h4 style={{ margin: '0 0 8px', color: '#065f46' }}>
                  Confirm material issuance for {issuingRequest.project?.name}
                </h4>
                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#047857' }}>
                  Material: <b>{issuingRequest.material?.name}</b> | Current Available Stock: <b>{issuingRequest.material?.quantity} {issuingRequest.material?.unit}</b>
                </p>

                <form onSubmit={handleIssueSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Quantity to Issue *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max={issuingRequest.material?.quantity}
                      value={issueQty}
                      onChange={(e) => setIssueQty(e.target.value)}
                      required
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Issuance Notes</label>
                    <input
                      type="text"
                      value={issueNotes}
                      onChange={(e) => setIssueNotes(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{ padding: '9px 18px', background: '#047857', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Confirm &amp; Record Transaction
                  </button>
                  <button
                    type="button"
                    onClick={() => setIssuingRequest(null)}
                    style={{ padding: '9px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TRANSACTIONS & PROJECT CONSUMPTION (STEPS 7 & 8) */}
        {tab === 'transactions' && (
          <div>
            {/* Step 8: Project Material Consumption Section */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.2rem' }}>
                    Material consumption by project
                  </h3>
                  <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>
                    View materials consumed per project site and total project material expenditure.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Select Project:</label>
                  <select
                    value={consumptionProjectId}
                    onChange={(e) => loadProjectConsumption(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontWeight: 600 }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {consumptionData && (
                <div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ background: '#ecfdf5', padding: '12px 20px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065f46' }}>PROJECT</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#065f46' }}>{consumptionData.projectName}</div>
                    </div>
                    <div style={{ background: '#eff6ff', padding: '12px 20px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af' }}>TOTAL MATERIAL COST</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e40af' }}>{formatMoney(consumptionData.totalMaterialCost)}</div>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                          <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>MATERIAL CODE</th>
                          <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>MATERIAL NAME</th>
                          <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>CATEGORY</th>
                          <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>TOTAL QUANTITY USED</th>
                          <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>CALCULATED COST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consumptionData.materialsConsumed && consumptionData.materialsConsumed.length > 0 ? (
                          consumptionData.materialsConsumed.map((mc) => (
                            <tr key={mc.materialId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#047857' }}>{mc.materialCode}</td>
                              <td style={{ padding: '10px 14px', fontWeight: 600 }}>{mc.materialName}</td>
                              <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#6b7280' }}>{mc.category}</td>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>
                                {mc.totalQuantityUsed} {mc.unit}
                              </td>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#047857' }}>
                                {formatMoney(mc.totalCost)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                              No materials have been issued to this project yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Step 7: Full Material Transactions Audit Table */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.2rem' }}>
                Material transactions audit log
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 16px' }}>
                Every issuance, receipt, and stock adjustment with previous stock, quantity changed, and remaining balance.
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>TXN CODE</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>TYPE</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>MATERIAL</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>PROJECT / REF</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>PREVIOUS STOCK</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>QUANTITY</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>REMAINING STOCK</th>
                      <th style={{ padding: '10px 14px', color: '#4b5563', fontSize: '0.8rem' }}>DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                          No transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#374151' }}>{t.transactionCode}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: t.type === 'ISSUE' ? '#fee2e2' : '#dcfce7',
                              color: t.type === 'ISSUE' ? '#991b1b' : '#166534',
                            }}>
                              {t.type}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 600 }}>{t.material?.name}</td>
                          <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#4b5563' }}>
                            {t.project ? t.project.name : t.referenceNo || 'Warehouse'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#6b7280' }}>
                            {t.previousStock} {t.material?.unit}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: t.type === 'ISSUE' ? '#dc2626' : '#16a34a' }}>
                            {t.type === 'ISSUE' ? '-' : '+'}{t.quantity} {t.material?.unit}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>
                            {t.newStock} {t.material?.unit}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#6b7280' }}>
                            {formatDate(t.transactionDate)}
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

        {/* TAB 6: PURCHASE ORDERS (STEP 9) */}
        {tab === 'purchase_orders' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            {/* Create PO Form */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.2rem' }}>
                Create supplier purchase order
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 16px' }}>
                Order replenishment materials from suppliers when stock levels are low.
              </p>

              <form onSubmit={submitPurchaseOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Material to Order *
                  </label>
                  <select
                    value={poForm.materialId}
                    onChange={(e) => {
                      const m = materials.find((mat) => mat.id === Number(e.target.value));
                      setPoForm({
                        ...poForm,
                        materialId: e.target.value,
                        supplier: m ? m.supplier : poForm.supplier,
                        unitPrice: m ? m.unitPrice : poForm.unitPrice,
                      });
                    }}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="">-- Choose Material --</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Current Stock: {m.quantity} {m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tokyo Cement Lanka / Dulux Paints"
                    value={poForm.supplier}
                    onChange={(e) => setPoForm({ ...poForm, supplier: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Order Quantity *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="e.g. 500"
                      value={poForm.quantity}
                      onChange={(e) => setPoForm({ ...poForm, quantity: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Unit Price (LKR) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 8.50"
                      value={poForm.unitPrice}
                      onChange={(e) => setPoForm({ ...poForm, unitPrice: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={poForm.expectedDeliveryDate}
                    onChange={(e) => setPoForm({ ...poForm, expectedDeliveryDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    PO Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Reorder for low stock batch"
                    value={poForm.notes}
                    onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{ padding: '12px 16px', background: '#047857', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}
                >
                  Dispatch purchase order
                </button>
              </form>
            </div>

            {/* PO List & 1-Click Receive Action */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.2rem' }}>
                Active purchase orders and goods receipt
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 16px' }}>
                When materials arrive from the supplier, click <b>Receive Materials</b> to automatically increment warehouse inventory stock.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
                {purchaseOrders.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '30px' }}>No purchase orders created yet.</p>
                ) : (
                  purchaseOrders.map((po) => (
                    <div
                      key={po.id}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: po.status === 'ORDERED' ? '#eff6ff' : '#f0fdf4',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <strong style={{ color: '#111827', fontSize: '0.95rem' }}>{po.poNumber}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#4b5563', marginLeft: '6px' }}>{po.supplier}</span>
                        </div>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: po.status === 'ORDERED' ? '#dbeafe' : '#dcfce7',
                          color: po.status === 'ORDERED' ? '#1e40af' : '#166534',
                        }}>
                          {po.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#374151', margin: '4px 0' }}>
                        Item: <b>{po.material?.name}</b> | Quantity: <b>{po.quantity} {po.material?.unit}</b> | Total: <b>{formatMoney(po.totalAmount)}</b>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Ordered Date: {formatDate(po.orderDate)}
                        {po.expectedDeliveryDate ? ` | Expected: ${formatDate(po.expectedDeliveryDate)}` : ''}
                      </div>

                      {po.status === 'ORDERED' ? (
                        <div style={{ marginTop: '10px' }}>
                          <button
                            onClick={() => handleReceivePO(po.id)}
                            style={{ padding: '6px 14px', background: '#047857', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Receive materials and update inventory stock
                          </button>
                        </div>
                      ) : (
                        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                          Received on {formatDate(po.receivedDate)} | Stock added to inventory
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SITE MANAGER ALERTS (Requirement 5) */}
        {tab === 'site_alerts' && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1.3rem' }}>
                  🚨 Direct Stock Alerts &amp; Low Stock Reports from Site Manager
                </h3>
                <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>
                  Live alerts transmitted directly by on-site managers when construction materials are running critically low.
                </p>
              </div>

              <span style={{ padding: '6px 14px', borderRadius: '20px', background: '#fffbeb', color: '#b45309', fontSize: '0.85rem', fontWeight: 700, border: '1px solid #fde68a' }}>
                Pending Review: {stockAlerts.filter(a => a.status === 'PENDING').length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {stockAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✓</div>
                  <h4 style={{ margin: '0 0 6px', color: '#111827' }}>No Active Site Manager Alerts</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Site managers have not reported any urgent low-stock situations.</p>
                </div>
              ) : (
                stockAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '10px',
                      border: alert.status === 'PENDING' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                      background: alert.status === 'PENDING' ? '#fffdfa' : '#f9fafb',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: alert.urgency === 'CRITICAL' ? '#fee2e2' : alert.urgency === 'HIGH' ? '#ffedd5' : '#fef3c7',
                            color: alert.urgency === 'CRITICAL' ? '#991b1b' : alert.urgency === 'HIGH' ? '#c2410c' : '#92400e',
                          }}>
                            {alert.urgency} URGENCY
                          </span>
                          <h4 style={{ margin: 0, color: '#111827', fontSize: '1.15rem' }}>
                            {alert.material?.name} ({alert.material?.materialCode})
                          </h4>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                          Reported by: <b>{alert.reportedBy || 'Site Manager'}</b> | 📍 Location: <b>{alert.siteLocation || 'Main Job Site'}</b> | Date: {formatDate(alert.createdAt)}
                        </div>
                      </div>

                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '14px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: alert.status === 'RESOLVED' ? '#dcfce7' : alert.status === 'ACKNOWLEDGED' ? '#dbeafe' : '#fef3c7',
                        color: alert.status === 'RESOLVED' ? '#166534' : alert.status === 'ACKNOWLEDGED' ? '#1e40af' : '#92400e',
                      }}>
                        STATUS: {alert.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '12px', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: '#6b7280' }}>Observed Site Stock:</span>{' '}
                        <strong style={{ color: '#b91c1c' }}>{alert.currentSiteStock !== null ? `${alert.currentSiteStock} ${alert.material?.unit || ''}` : 'Low'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Requested Replenishment:</span>{' '}
                        <strong>{alert.requestedQuantity ? `${alert.requestedQuantity} ${alert.material?.unit || ''}` : 'As needed'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Warehouse Main Stock:</span>{' '}
                        <strong>{alert.material?.quantity} {alert.material?.unit || ''}</strong>
                      </div>
                    </div>

                    {alert.notes && (
                      <div style={{ fontSize: '0.85rem', color: '#374151', background: '#fef3c7', padding: '10px 14px', borderRadius: '6px', border: '1px solid #fde68a', marginBottom: '12px' }}>
                        <strong>💬 Site Manager Note:</strong> "{alert.notes}"
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {alert.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleAlertStatus(alert.id, 'ACKNOWLEDGED')}
                          style={{ padding: '6px 14px', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          👁️ Acknowledge Alert
                        </button>
                      )}
                      {alert.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          onClick={() => handleAlertStatus(alert.id, 'RESOLVED')}
                          style={{ padding: '6px 14px', background: '#047857', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          ✓ Mark Resolved
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => createPOForAlert(alert)}
                        style={{ padding: '6px 14px', background: '#b45309', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        📦 Create Supplier PO for this Material
                      </button>
                    </div>
                  </div>
                ))
              )}
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
    <div className="pm-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
