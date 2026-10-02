import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  // If no user has explicitly signed in with credentials in this tab, redirect to login:
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // If this tab's user does not have permission for this portal route, redirect to login:
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
