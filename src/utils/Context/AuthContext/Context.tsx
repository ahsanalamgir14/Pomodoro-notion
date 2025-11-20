// src/utils/Context/AuthContext/Context.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';

interface User {
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple user database (in a real app, this would be server-side)
const USERS = [
  { username: 'demo', password: 'demo123', email: 'demo@example.com' },
  { username: 'user', password: 'password', email: 'user@example.com' },
  // Add more users as needed
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/session')
      .then(r => r.json())
      .then(data => {
        if (data?.isAuthenticated && data?.email) {
          const email = String(data.email);
          const username = email.split('@')[0];
          setUser({ username, email });
        } else {
          setUser(null);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoading(false);
      });
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password }),
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      const email = String(data?.email || username);
      const uname = email.split('@')[0];
      setUser({ username: uname, email });
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    Promise.allSettled([
      fetch('/api/auth/logout', { method: 'POST' }),
      signOut({ redirect: false }),
    ]).finally(() => {
      setUser(null);
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}