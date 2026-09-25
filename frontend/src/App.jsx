import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { ROLE_PATHS } from './services/api';
import Login from './pages/Login';
import ClientRegister from './pages/ClientRegister';
import ClientManagerDashboard from './pages/ClientManagerDashboard';
import ClientDashboard from './pages/ClientDashboard';
import ProjectManagerDashboard from './pages/ProjectManagerDashboard';
import EmployeeManagerDashboard from './pages/EmployeeManagerDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import InventoryManagerDashboard from './pages/InventoryManagerDashboard';
import SiteManagerDashboard from './pages/SiteManagerDashboard';
import LandingPage from './pages/LandingPage';
import PublicFeedbackDashboard from './pages/PublicFeedbackDashboard';

import EmployeeRegister from './pages/EmployeeRegister';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) {
    return <LandingPage />;
  }
  return <Navigate to={ROLE_PATHS[user.role] ?? '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<ClientRegister />} />
      <Route path="/employee-register" element={<EmployeeRegister />} />
      <Route path="/register-employee" element={<EmployeeRegister />} />
      <Route path="/feedbacks" element={<PublicFeedbackDashboard />} />
      <Route path="/reviews" element={<PublicFeedbackDashboard />} />
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={['CLIENT', 'CLIENT_MANAGER', 'ADMIN']}>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client-manager"
        element={
          <ProtectedRoute allowedRoles={['CLIENT_MANAGER', 'ADMIN']}>
            <ClientManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project-manager"
        element={
          <ProtectedRoute allowedRoles={['PROJECT_MANAGER', 'ADMIN']}>
            <ProjectManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee-manager"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE_MANAGER', 'ADMIN']}>
            <EmployeeManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE', 'EMPLOYEE_MANAGER', 'ADMIN']}>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory-manager"
        element={
          <ProtectedRoute allowedRoles={['INVENTORY_MANAGER', 'ADMIN']}>
            <InventoryManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/site-manager"
        element={
          <ProtectedRoute allowedRoles={['SITE_MANAGER', 'ADMIN']}>
            <SiteManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'CLIENT_MANAGER']}>
            <ClientManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
