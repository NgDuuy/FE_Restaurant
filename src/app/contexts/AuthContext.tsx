import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { login as loginRequest } from '../services/authApi';
import { config } from '../config/config';
import React from "react";
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_TOKEN_KEY = config.auth.tokenKey;
const AUTH_USER_KEY = config.auth.userKey;

const roleLabels: Record<UserRole, string> = {
  server: 'Server',
  chef: 'Chef',
  manager: 'Manager',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem(AUTH_USER_KEY);

    if (!storedUser) {
      return;
    }

    try {
      setUser(JSON.parse(storedUser) as User);
    } catch {
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }, []);

  const login = async (username: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const response = await loginRequest({ username, password });

      const newUser: User = {
        id: username,
        username,
        role,
        name: roleLabels[role],
      };

      localStorage.setItem(AUTH_TOKEN_KEY, response.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
      setUser(newUser);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
