// client/src/context/AuthContext.tsx - Auth & Demo Role Switcher
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  demoUsers: User[];
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch demo users from backend on load
  useEffect(() => {
    async function loadAuth() {
      try {
        const res = await fetch('/api/auth/demo-users');
        if (res.ok) {
          const users: User[] = await res.json();
          setDemoUsers(users);

          // Check localStorage for saved session
          const savedUserId = localStorage.getItem('gkr_user_id');
          if (savedUserId) {
            const found = users.find(u => u.id === savedUserId);
            if (found) {
              setUser(found);
              setIsLoading(false);
              return;
            }
          }

          // Default initial session: Customer Aarav Sharma
          const defaultCustomer = users.find(u => u.role === 'CUSTOMER') || users[0];
          if (defaultCustomer) {
            setUser(defaultCustomer);
            localStorage.setItem('gkr_user_id', defaultCustomer.id);
          }
        }
      } catch (err) {
        console.error('Failed to load demo users:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuth();
  }, []);

  const login = async (email: string, password = 'password123'): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('gkr_user_id', data.user.id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('gkr_user_id');
    // Revert to demo customer or null
    const cust = demoUsers.find(u => u.role === 'CUSTOMER');
    setUser(cust || null);
  };

  const switchDemoRole = (targetRole: UserRole) => {
    const targetUser = demoUsers.find(u => u.role === targetRole);
    if (targetUser) {
      setUser(targetUser);
      localStorage.setItem('gkr_user_id', targetUser.id);
    }
  };

  const role: UserRole = user?.role || 'CUSTOMER';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        demoUsers,
        login,
        logout,
        switchDemoRole,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
