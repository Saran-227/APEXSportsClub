# Champions Club Management System (SCMS) - Frontend Architecture Specification

> **Phase 1 Architecture Foundation**  
> **Lead Architect:** Asim Maji  
> **Target Framework:** React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router v7  
> **Facility Focus:** Tennis & Cricket Facilities  
> **Membership Tiers:** Gold, Silver, Junior  

---

## 1. Architectural Philosophy

The SCMS frontend architecture is designed for a unified athletic sports club management platform for **Champions Club**. The primary goals are:
- **Clean Separation of Concerns**: Views, reusable UI components, routing guards, and network services are strictly decoupled.
- **Predictable Data Flow & Typing**: Strict end-to-end TypeScript interfaces corresponding to backend models.
- **Resilient Network Layer**: Centralized Axios client configured for HTTP-only cookies (`withCredentials: true`), robust base URL resolution preventing duplicate `/api/v1` prefixes, standard response envelopes, and deterministic error handling.
- **Role-Aware Layouts & Route Protection**: Full route protection (`ProtectedRoute`) blocking unauthenticated access to operational views without a valid session.
- **Scope Alignment**: Strictly scoped to Champions Club operations (Tennis Courts, Cricket Pitches & Nets, Pro Shop POS, Pavilion Cafeteria, Finance Ledger, Staff Roster, and CRM Leads).

---

## 2. Directory & Component Organization

The frontend codebase is organized under `frontend/src/` adhering to the following structure:

```
frontend/
├── src/
│   ├── assets/               # Static images, athletic club badge SVG
│   ├── components/
│   │   ├── common/           # Domain-agnostic reusable components (TopNavbar, Sidebar, Breadcrumbs, PageHeader, PlaceholderNoticeBanner)
│   │   └── ui/               # Atomic visual primitives (Button, Input, Card, Badge, StatCard, Alert, EmptyState)
│   ├── layouts/
│   │   ├── AdminLayout.tsx   # Dashboard frame with Navy Sidebar, Topbar, Breadcrumbs & Content view
│   │   └── AuthLayout.tsx    # Branded container for authentication flows
│   ├── pages/
│   │   ├── auth/             # LoginPage
│   │   ├── dashboard/        # DashboardOverview (Tennis & Cricket scheduling, KPI cards, activity feeds)
│   │   ├── members/          # MembersPage (Gold, Silver, Junior member directory & tiers)
│   │   ├── bookings/         # BookingsPage (Tennis courts & Cricket pitches/nets timetable)
│   │   ├── inventory/        # InventoryPage (Equipment stock levels, bats, rackets, balls, restock)
│   │   ├── shop/             # ShopPage (Pro Shop POS, merchandise orders, receipts)
│   │   ├── cafeteria/        # CafeteriaPage (Pavilion floor plan, table tabs, kitchen orders)
│   │   ├── finance/          # FinancePage (Revenue breakdown, invoices, ledger)
│   │   ├── employees/        # EmployeesPage (Tennis & Cricket coaches, staff directory, shift roster)
│   │   ├── crm/              # CrmPage (Prospect member leads, tour requests, follow-ups)
│   │   └── NotFoundPage.tsx  # 404 page not found view
│   ├── routes/
│   │   ├── index.tsx         # Central router definition with layout nesting
│   │   └── ProtectedRoute.tsx # ProtectedRoute & PublicOnlyRoute authentication guards
│   ├── services/
│   │   └── api.ts            # Centralized Axios client instance, resolveApiBaseUrl(), interceptors, and typed API methods
│   ├── hooks/
│   │   └── useAuth.ts        # Authentication consumer hook
│   ├── context/
│   │   ├── AuthContext.tsx   # Real session context via HTTP-only cookie
│   │   └── authContextDef.ts # Fast-refresh compliant context interface
│   ├── types/
│   │   ├── api.ts            # Generic API response and error envelopes
│   │   ├── auth.ts           # User, credentials, and role definitions
│   │   ├── member.ts         # Member profile and tier types (Gold, Silver, Junior)
│   │   ├── booking.ts        # Court and pitch types (Tennis, Cricket)
│   │   ├── modules.ts        # Shop, Inventory, Cafe, HR, Finance models
│   │   └── index.ts          # Central types export
│   ├── utils/
│   │   ├── formatters.ts     # Currency, date, time, and number formatters
│   │   └── validation.ts     # Email and login form validators
│   ├── App.tsx               # Root application wrapper with context providers and router
│   ├── main.tsx              # Application entry point with Tailwind styles import
│   └── index.css             # Design system tokens, Tailwind directives, and base styles
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Layout System & Styling Hierarchy

### 3.1 Design Direction
- **Sidebar**: High-contrast, sleek Dark Navy (`#0b132b` / `slate-900`) representing athletic heritage and operational focus.
- **Main Workspace**: Clean light-neutral palette (`slate-50` / `gray-100`) maximizing data contrast and readability during long operational shifts.
- **Accent Color**: Vivid Emerald Green (`#10b981` / `emerald-600`) utilized for positive actions, active statuses, confirmed reservations, and primary buttons.
- **Typography**: Clean, geometric sans-serif (`Inter`, `system-ui`) with clear hierarchical weight distinctions (400, 500, 600, 700).

### 3.2 Layout Structure
1. **`AdminLayout.tsx`**:
   - Houses the collapsible dark navy sidebar navigation with route matching indicators and category groupings (Overview, Club Operations, Commerce & Facilities, Management).
   - Top navigation bar containing breadcrumbs, facility indicator ("Champions Club - Main Arena"), notification trigger placeholder, and user profile drawer.
   - Dynamic main content viewport with responsive paddings and consistent page headers.
2. **`AuthLayout.tsx`**:
   - Clean split or centered layout with sports imagery, Champions Club badge branding, and secure login card.

---

## 4. Routing Architecture & Protected Routes

Routing is handled via `react-router-dom`:
- **Auth Routes (`PublicOnlyRoute`)**: Accessible only when unauthenticated (`/login`). If an authenticated session is detected, automatically redirects to `/dashboard`.
- **Protected Club Routes (`ProtectedRoute`)**: Wrapped in `ProtectedRoute` boundary. Strictly blocks unauthenticated access; if session check reveals unauthenticated state, redirects immediately to `/login`:
  - `/` -> Redirects to `/dashboard`
  - `/dashboard` -> Dashboard Overview
  - `/members` -> Members directory & memberships (Gold, Silver, Junior)
  - `/bookings` -> Court & pitch reservations (Tennis & Cricket)
  - `/inventory` -> Equipment & retail inventory
  - `/shop` -> Pro Shop POS & merchandise orders
  - `/cafeteria` -> Pavilion Cafeteria & bar tabs
  - `/finance` -> Financial metrics, reports & invoices
  - `/employees` -> Coaches, staff roster, shifts & leave
  - `/crm` -> Prospective leads & tour enquiries
  - `*` -> 404 Not Found view

---

## 5. API Client & Networking Architecture

### 5.1 Centralized Axios Client (`services/api.ts`)
- **Safe Base URL Resolution**:
  ```typescript
  export function resolveApiBaseUrl(): string {
    const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
    if (!envUrl) return '/api/v1';
    const cleanUrl = envUrl.replace(/\/+$/, '');
    if (cleanUrl.endsWith('/api/v1')) return cleanUrl;
    return `${cleanUrl}/api/v1`;
  }
  ```
  Guarantees that whether `VITE_API_BASE_URL` is set to `http://localhost:8000`, `http://localhost:8000/`, or `http://localhost:8000/api/v1`, the base URL is always properly formatted without duplicating `/api/v1/api/v1`.
- **Session Credentials**: Hardened with `withCredentials: true` to seamlessly transmit HTTP-only session cookies set by FastAPI.
- **Timeout**: 15,000ms default to prevent hanging network sockets.
- **Request Interceptor**:
  - Adds standard JSON headers (`Content-Type: application/json`).
  - Automatically attaches `X-Requested-With: XMLHttpRequest` and CSRF tokens if stored.
- **Response Interceptor & Normalizer**:
  - Normalizes FastAPI error responses (`detail` array or string) into standard typed `ApiErrorResponse` shapes.
  - Handles network offline / timeout conditions gracefully.

---

## 6. Authentication & Session Strategy

1. **No Fake Authentication**:
   - The application does **not** store mock tokens in `localStorage` or simulate fake authentication bypasses.
   - On initial mount, `AuthContext` calls `authApi.getCurrentUser()`. If backend is unavailable or unauthenticated (401), state is cleanly set to `user: null`, `isAuthenticated: false`, and `isLoading: false`.
2. **FastAPI Integration Plan (Phase 2 with Saran)**:
   - When Saran activates `POST /api/v1/auth/login` and `GET /api/v1/auth/me`, FastAPI sets HTTP-only session cookies.
   - The frontend Axios client will automatically transmit these cookies via `withCredentials: true`.
