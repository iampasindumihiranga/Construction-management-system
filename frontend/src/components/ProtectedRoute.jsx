import { Navigate, useLocation } from 'react-router-dom';
import { ROLE_PATHS } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_PATHS[user.role] ?? '/login'} replace />;
  }

  return children;
}
