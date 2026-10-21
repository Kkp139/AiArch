import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'ADMIN' | 'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER';

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  projectIds?: string[];
  showPricing?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  theme: 'dark' | 'light';
  login: (user: UserProfile, token?: string) => void;
  logout: () => void;
  toggleTheme: () => void;
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
    if (t) {
      setToken(t);
      try {
        localStorage.setItem('pronex_auth_token', t);
        localStorage.setItem('pronex_auth_user', JSON.stringify(u));
      } catch {}
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem('pronex_auth_token');
      localStorage.removeItem('pronex_auth_user');
    } catch {}
    // Call backend logout
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  };

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <AuthContext.Provider value={{ user, token, theme, login, logout, toggleTheme }}>
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
