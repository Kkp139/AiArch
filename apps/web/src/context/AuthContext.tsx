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
  theme: 'dark' | 'light';
  login: (user: UserProfile) => void;
  logout: () => void;
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialUser = null }: { children: ReactNode; initialUser?: UserProfile | null }) {
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const login = (u: UserProfile) => setUser(u);
  const logout = () => setUser(null);
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <AuthContext.Provider value={{ user, theme, login, logout, toggleTheme }}>
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
