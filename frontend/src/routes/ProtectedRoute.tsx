import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRoleDefaultDashboard } from '../utils/navigation';

export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermission?: string;
}> = ({ children, allowedRoles, requiredPermission }) => {
  const { user, isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CCFF00] border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Loading Apex Sports Club...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Allow seamless previewing of customer portal pages during development
    if (location.pathname.startsWith('/customer')) {
      return <>{children}</>;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || '').toUpperCase();
    const hasAllowed = allowedRoles.some((r) => r.toUpperCase() === userRole || hasRole(r));
    if (!hasAllowed) {
      return <Navigate to={getRoleDefaultDashboard(user)} replace />;
    }
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={getRoleDefaultDashboard(user)} replace />;
  }

  return <>{children}</>;
};

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#101316] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C7FF36] border-t-transparent" />
          <p className="text-xs text-slate-400">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={getRoleDefaultDashboard(user)} replace />;
  }

  return <>{children}</>;
};
