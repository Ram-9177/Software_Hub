import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../lib/api.js';
import type { UserRole } from '@command-center/shared';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  internType?: 'paid' | 'unpaid' | null;
  pairedPaidInternId?: string | null;
  pairedPaidInternName?: string | null;
  currentLevel?: number;
  marksheetPercentage?: number | null;
  marksheetConfirmed?: boolean;
}

interface AuthContextValue {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  microsoftLogin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const user = await apiRequest<User>('/auth/me');
        setCurrentUser(user);
      } catch {
        localStorage.removeItem('token');
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await apiRequest<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });
    localStorage.setItem('token', res.accessToken);
    setCurrentUser(res.user);
  };

  const microsoftLogin = () => {
    window.location.href = '/api/auth/microsoft-signin';
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('token');
      setCurrentUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, microsoftLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
