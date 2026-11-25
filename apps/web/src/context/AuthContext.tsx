import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { purgePwaSessionCache } from '../pwa/registerServiceWorker';

export type UserRole = 'ADMIN' | 'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER';

export interface UserProfile {
  id: string;
  fullName: string;
  username?: string;
  email?: string;
  mobile?: string;
  role: UserRole;
  projectIds?: string[];
  showPricing?: boolean;
  allowMeetings?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  theme: 'dark' | 'light';
  login: (user: UserProfile, token?: string) => void;
  logout: () => void;
  toggleTheme: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialUser = null }: { children: ReactNode; initialUser?: UserProfile | null }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (initialUser) return initialUser;
    try {
      const stored = localStorage.getItem('pronex_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('pronex_auth_token');
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const login = (u: UserProfile, t?: string) => {
    setUser(u);
    try {
      localStorage.setItem('pronex_auth_user', JSON.stringify(u));
      if (t) {
        setToken(t);
        localStorage.setItem('pronex_auth_token', t);
      }
    } catch {}
  };

  const logout = () => {
    const activeToken = token;
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem('pronex_auth_token');
      localStorage.removeItem('pronex_auth_user');
    } catch {}
    purgePwaSessionCache();
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : undefined,
    }).catch(() => {});
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const profile = data?.user || data;
        if (profile && profile.id && profile.role) {
          setUser(profile);
          try {
            localStorage.setItem('pronex_auth_user', JSON.stringify(profile));
          } catch {}
        }
      }
    } catch {
      // Preserve offline/transient session when offline
    }
  };

  useEffect(() => {
    if (token && !initialUser && typeof fetch === 'function') {
      refreshUser();
    }
  }, [token]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <AuthContext.Provider value={{ user, token, theme, login, logout, toggleTheme, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
