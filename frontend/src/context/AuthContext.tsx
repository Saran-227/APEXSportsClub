import React, { useState, useEffect, type ReactNode } from 'react';
import { authApi, normalizeApiError } from '../services/api';
import type { User, LoginCredentials } from '../types';
import { AuthContext } from './authContextDef';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('scms_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkCurrentSession() {
      try {
        // Pre-initialize anti-CSRF token handshake
        try {
          await authApi.initCsrf();
        } catch {
          // Non-blocking if backend is temporarily unreachable
        }

        const currentUser = await authApi.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          localStorage.setItem('scms_user', JSON.stringify(currentUser));
        }
      } catch {
        if (isMounted) {
          setUser(null);
          localStorage.removeItem('scms_user');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkCurrentSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(credentials);
      setUser(response.user);
      localStorage.setItem('scms_user', JSON.stringify(response.user));
      return true;
    } catch (err) {
      const normalized = normalizeApiError(err);
      setError(normalized.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.loginWithGoogle(credential);
      setUser(response.user);
      localStorage.setItem('scms_user', JSON.stringify(response.user));
      return true;
    } catch (err) {
      const normalized = normalizeApiError(err);
      setError(normalized.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    password?: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.register({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        password: userData.password || 'ApexMember@123',
      });
      setUser(response.user);
      localStorage.setItem('scms_user', JSON.stringify(response.user));
      return true;
    } catch (err) {
      const normalized = normalizeApiError(err);
      setError(normalized.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Clean local session state even if network logout fails
    } finally {
      setUser(null);
      localStorage.removeItem('scms_user');
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    const target = role.toLowerCase();
    if (user.role && user.role.toLowerCase() === target) return true;
    return Array.isArray(user.roles) && user.roles.some((r) => r.toLowerCase() === target);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (hasRole('admin')) return true;
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        loginWithGoogle,
        register,
        logout,
        clearError,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
