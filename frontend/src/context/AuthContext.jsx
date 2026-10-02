import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { authLogin, authLogout } from '../services/api';

const SESSION_KEY = 'odiliya-tab-auth';

// Ensure no stale credentials remain in localStorage so no portal ever auto-logs in without credentials
try {
  localStorage.removeItem('odiliya-portal-sessions');
  localStorage.removeItem('odiliya-management-auth');
} catch {
  // ignore
}

const AuthContext = createContext(null);

function readStoredAuth() {
  // Each browser tab strictly maintains its own isolated session in sessionStorage.
  // A portal is NEVER logged in automatically without the user entering credentials.
  // Refreshing a tab preserves that tab's own login so it refreshes to show latest updates.
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.role && parsed.username) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredAuth());

  useEffect(() => {
    if (user) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
      } catch {
        // ignore
      }
    } else {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // ignore
      }
    }
  }, [user]);

  const logout = useCallback(() => {
    if (user?.token) {
      authLogout(user.token).catch(() => {});
    }
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setUser(null);
  }, [user]);

  const login = useCallback(async (username, password, portal) => {
    // Authentication occurs ONLY upon providing valid credentials
    const response = await authLogin(username, password, portal);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(response));
    } catch {
      // ignore
    }
    setUser(response);
    return response;
  }, []);

  const updateUser = useCallback((updater) => {
    setUser((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      try {
        if (next) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    user,
    setUser,
    updateUser,
    login,
    logout,
  }), [user, login, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
