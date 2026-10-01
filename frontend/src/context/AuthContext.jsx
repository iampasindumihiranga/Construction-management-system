import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { authLogin, authLogout } from '../services/api';

const STORAGE_KEY = 'odiliya-management-auth';

const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredAuth());

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const logout = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token) {
          authLogout(parsed.token).catch(() => {});
        }
      }
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.clear();
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  const login = useCallback(async (username, password, portal) => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.clear();
    } catch {
      // ignore
    }
    const response = await authLogin(username, password, portal);
    setUser(response);
    return response;
  }, []);

  const value = useMemo(() => ({
    user,
    login,
    logout,
  }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

