// client/src/context/AuthContext.tsx - Real Supabase Auth & Role Session Switcher
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  token: string | null;
  demoUsers: User[];
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => Promise<boolean>;
  isLoading: boolean;
  isSandbox: boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  CUSTOMER: { email: 'customer@gharkirasoi.com', pass: 'Customer@GKR2026' },
  COOK: { email: 'cook@gharkirasoi.com', pass: 'Cook@GKR2026' },
  DELIVERY_PARTNER: { email: 'rider@gharkirasoi.com', pass: 'Rider@GKR2026' },
  ADMIN: { email: 'admin@gharkirasoi.com', pass: 'Admin@GKR2026' }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from localStorage (NO auto-login for unauthenticated users)
  useEffect(() => {
    async function loadAuth() {
      try {
        const res = await fetch('/api/auth/demo-users');
        if (res.ok) {
          const users: User[] = await res.json();
          setDemoUsers(users);

          const savedToken = localStorage.getItem('gkr_token');
          const savedUserId = localStorage.getItem('gkr_user_id');

          if (savedToken && savedUserId) {
            const found = users.find(u => u.id === savedUserId);
            if (found) {
              setUser(found);
              setToken(savedToken);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuth();
  }, []);

  const login = async (email: string, password = 'Customer@GKR2026'): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('gkr_token', data.token);
        localStorage.setItem('gkr_user_id', data.user.id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('gkr_token');
    localStorage.removeItem('gkr_user_id');
    setUser(null);
    setToken(null);
  };

  // Switch role session
  const switchDemoRole = async (targetRole: UserRole): Promise<boolean> => {
    setIsLoading(true);
    try {
      const cred = ROLE_CREDENTIALS[targetRole];
      if (cred) {
        const success = await login(cred.email, cred.pass);
        if (success) {
          setIsLoading(false);
          return true;
        }
      }

      const targetUser = demoUsers.find(u => u.role === targetRole);
      if (targetUser) {
        setUser(targetUser);
        localStorage.setItem('gkr_user_id', targetUser.id);
      }
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Failed to switch role session:', err);
      setIsLoading(false);
      return false;
    }
  };

  // Helper fetch with automatic Authorization and role headers
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (user?.id) {
      headers.set('x-user-id', user.id);
    }
    if (user?.role) {
      headers.set('x-user-role', user.role);
    }
    return fetch(url, { ...options, headers });
  };

  const role: UserRole = user?.role || 'CUSTOMER';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        demoUsers,
        login,
        logout,
        switchDemoRole,
        isLoading,
        isSandbox: false,
        authFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
