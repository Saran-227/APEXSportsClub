import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardOverview } from '../pages/dashboard/DashboardOverview';
import { MembersPage } from '../pages/members/MembersPage';
import { BookingsPage } from '../pages/bookings/BookingsPage';
import { InventoryPage } from '../pages/inventory/InventoryPage';
import { ShopPage } from '../pages/shop/ShopPage';
import { CafeteriaPage } from '../pages/cafeteria/CafeteriaPage';
import { FinancePage } from '../pages/finance/FinancePage';
import { EmployeesPage } from '../pages/employees/EmployeesPage';
import { CrmPage } from '../pages/crm/CrmPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  // Authentication routes (accessible only when not authenticated)
  {
    element: (
      <PublicOnlyRoute>
        <AuthLayout />
      </PublicOnlyRoute>
    ),
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },
  // Protected operational routes (strictly requires authenticated session)
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardOverview />,
      },
      {
        path: 'members',
        element: <MembersPage />,
      },
      {
        path: 'bookings',
        element: <BookingsPage />,
      },
      {
        path: 'inventory',
        element: <InventoryPage />,
      },
      {
        path: 'shop',
        element: <ShopPage />,
      },
      {
        path: 'cafeteria',
        element: <CafeteriaPage />,
      },
      {
        path: 'finance',
        element: <FinancePage />,
      },
      {
        path: 'employees',
        element: <EmployeesPage />,
      },
      {
        path: 'crm',
        element: <CrmPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
