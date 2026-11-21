export type UserRole =
  | 'ADMIN'
  | 'CUSTOMER'
  | 'SPORTS_SHOP_VENDOR'
  | 'CAFETERIA_OWNER'
  | string;

export interface BackendUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string | null;
  role?: string;
  phone_number?: string | null;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
  permissions: string[];
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  isVerified: boolean;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface BackendLoginResponse {
  message: string;
  user: BackendUser;
  csrf_token: string;
}

export interface LoginResponse {
  user: User;
  message: string;
  csrfToken?: string;
}

export interface CSRFInitResponse {
  csrf_token: string;
  message: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  database: 'connected' | 'disconnected';
  version: string;
  timestamp: string;
}

/**
 * Data Adapter: Maps backend user schema to frontend User interface.
 */
export function mapBackendUser(data: Partial<BackendUser> & Record<string, any>): User {
  const firstName = data.first_name || '';
  const lastName = data.last_name || '';
  const derivedFullName = `${firstName} ${lastName}`.trim() || data.email || 'Club User';
  const roles: string[] = Array.isArray(data.roles) ? data.roles : [];
  const rawRole = String(data.role || (roles[0] ? roles[0].toUpperCase() : 'CUSTOMER')).toUpperCase();

  let primaryRole: UserRole = 'CUSTOMER';
  if (rawRole.includes('ADMIN')) {
    primaryRole = 'ADMIN';
  } else if (rawRole.includes('VENDOR') || rawRole.includes('SHOP')) {
    primaryRole = 'SPORTS_SHOP_VENDOR';
  } else if (rawRole.includes('CAFE')) {
    primaryRole = 'CAFETERIA_OWNER';
  } else {
    primaryRole = 'CUSTOMER';
  }

  return {
    id: String(data.id || ''),
    email: data.email || '',
    firstName,
    lastName,
    fullName: data.fullName || data.full_name || derivedFullName,
    role: primaryRole,
    roles,
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    isActive: Boolean(data.is_active ?? true),
    isVerified: Boolean(data.is_verified ?? true),
    phoneNumber: data.phone_number || null,
    avatarUrl: data.avatarUrl || null,
    createdAt: data.created_at,
  };
}
