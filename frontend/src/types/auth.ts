export type UserRole = 'ADMIN' | 'STAFF' | 'FINANCE' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string | null;
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  message: string;
}
