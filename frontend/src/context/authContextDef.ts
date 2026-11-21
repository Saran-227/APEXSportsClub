import { createContext } from 'react';
import type { User, LoginCredentials } from '../types';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  loginWithGoogle: (credential: string) => Promise<boolean>;
  register: (userData: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    password?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
