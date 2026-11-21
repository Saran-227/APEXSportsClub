import type { User } from '../types';

export function getRoleDefaultDashboard(user: User | null): string {
  if (!user) return '/login';
  const role = (user.role || '').toUpperCase();
  if (role === 'ADMIN' || role.includes('ADMIN')) {
    return '/admin/dashboard';
  }
  if (role === 'SPORTS_SHOP_VENDOR' || role.includes('VENDOR') || role.includes('SHOP')) {
    return '/vendor/dashboard';
  }
  if (role === 'CAFETERIA_OWNER' || role.includes('CAFE')) {
    return '/cafeteria/dashboard';
  }
  return '/customer/dashboard';
}
