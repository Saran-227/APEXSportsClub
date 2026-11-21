import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { CustomerLayout } from '../layouts/CustomerLayout';
import { VendorLayout } from '../layouts/VendorLayout';
import { CafeteriaLayout } from '../layouts/CafeteriaLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { GoogleAuthCallback } from '../pages/auth/GoogleAuthCallback';
import { LandingPage } from '../pages/landing/LandingPage';

// Admin Pages
import { DashboardOverview } from '../pages/dashboard/DashboardOverview';
import { MembersPage } from '../pages/members/MembersPage';
import { BookingsPage } from '../pages/bookings/BookingsPage';
import { InventoryPage } from '../pages/inventory/InventoryPage';
import { ShopPage } from '../pages/shop/ShopPage';
import { CafeteriaPage } from '../pages/cafeteria/CafeteriaPage';
import { FinancePage } from '../pages/finance/FinancePage';
import { EmployeesPage } from '../pages/employees/EmployeesPage';
import { CrmPage } from '../pages/crm/CrmPage';
import { AdminVendorsPage } from '../pages/admin/AdminVendorsPage';

// Customer Pages
import { CustomerDashboard } from '../pages/customer/CustomerDashboard';
import { CustomerBookingPage } from '../pages/customer/CustomerBookingPage';
import { CustomerMembershipPage } from '../pages/customer/CustomerMembershipPage';
import { CustomerShopPage } from '../pages/customer/CustomerShopPage';
import { CustomerRentalsPage } from '../pages/customer/CustomerRentalsPage';
import { CustomerCafeteriaPage } from '../pages/customer/CustomerCafeteriaPage';

// Sports Shop Vendor Pages
import { VendorDashboard } from '../pages/vendor/VendorDashboard';
import { VendorProductsPage } from '../pages/vendor/VendorProductsPage';
import { VendorOrdersPage } from '../pages/vendor/VendorOrdersPage';
import { VendorRentalsPage } from '../pages/vendor/VendorRentalsPage';

// Cafeteria Owner Pages
import { CafeteriaDashboard } from '../pages/cafeteria/CafeteriaDashboard';
import { CafeteriaMenuPage } from '../pages/cafeteria/CafeteriaMenuPage';
import { CafeteriaSalesPage } from '../pages/cafeteria/CafeteriaSalesPage';

import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  // Public Landing Page (Frozen visual design & brand)
  {
    path: '/',
    element: <LandingPage />,
  },
  // Google OAuth 2.0 Callbacks
  {
    path: '/api/auth/google/callback',
    element: <GoogleAuthCallback />,
  },
  {
    path: '/api/auth/callback/google',
    element: <GoogleAuthCallback />,
  },
  // Authentication routes (Frozen authentication UI)
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

  // Role 1 — Customer Portal
  {
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <CustomerLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/customer/dashboard',
        element: <CustomerDashboard />,
      },
      {
        path: '/customer/book-court',
        element: <CustomerBookingPage />,
      },
      {
        path: '/customer/membership',
        element: <CustomerMembershipPage />,
      },
      {
        path: '/customer/shop',
        element: <CustomerShopPage />,
      },
      {
        path: '/customer/rentals',
        element: <CustomerRentalsPage />,
      },
      {
        path: '/customer/cafeteria',
        element: <CustomerCafeteriaPage />,
      },
    ],
  },

  // Role 2 — Sports Shop Vendor Portal
  {
    element: (
      <ProtectedRoute allowedRoles={['SPORTS_SHOP_VENDOR']}>
        <VendorLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/vendor/dashboard',
        element: <VendorDashboard />,
      },
      {
        path: '/vendor/products',
        element: <VendorProductsPage />,
      },
      {
        path: '/vendor/orders',
        element: <VendorOrdersPage />,
      },
      {
        path: '/vendor/rentals',
        element: <VendorRentalsPage />,
      },
    ],
  },

  // Role 3 — Cafeteria Owner Portal
  {
    element: (
      <ProtectedRoute allowedRoles={['CAFETERIA_OWNER']}>
        <CafeteriaLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/cafeteria/dashboard',
        element: <CafeteriaDashboard />,
      },
      {
        path: '/cafeteria/menu',
        element: <CafeteriaMenuPage />,
      },
      {
        path: '/cafeteria/sales',
        element: <CafeteriaSalesPage />,
      },
    ],
  },

  // Role 4 — Admin Portal
  {
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <DashboardOverview />,
      },
      {
        path: '/admin/dashboard',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/members',
        element: <MembersPage />,
      },
      {
        path: '/bookings',
        element: <BookingsPage />,
      },
      {
        path: '/admin/vendors',
        element: <AdminVendorsPage />,
      },
      {
        path: '/inventory',
        element: <InventoryPage />,
      },
      {
        path: '/shop',
        element: <ShopPage />,
      },
      {
        path: '/cafeteria',
        element: <CafeteriaPage />,
      },
      {
        path: '/finance',
        element: <FinancePage />,
      },
      {
        path: '/employees',
        element: <EmployeesPage />,
      },
      {
        path: '/crm',
        element: <CrmPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },

  // Global 404 Catch-All
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
