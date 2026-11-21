import axios, { AxiosError } from 'axios';
import type {
  ApiErrorResponse,
  LoginCredentials,
  LoginResponse,
  BackendLoginResponse,
  BackendUser,
  CSRFInitResponse,
  HealthResponse,
  User,
  Member,
  PaginatedResponse,
} from '../types';
import { mapBackendUser } from '../types';

/**
 * SCMS Centralized Axios Client
 * Configured with:
 * - Base URL from VITE_API_BASE_URL (defaults to /api/v1)
 * - Prepared support for cookie-based authentication (withCredentials: true)
 * - Anti-CSRF token synchronization (header + cookie)
 * - Request timeout (15s)
 * - Centralized response and error interceptors
 */

// In-memory CSRF token cache fallback
let cachedCsrfToken: string | null = null;

export function getCsrfToken(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)scms_csrf_token=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return cachedCsrfToken;
}

export function setCachedCsrfToken(token: string | null): void {
  cachedCsrfToken = token;
}

/**
 * Normalizes the API base URL to ensure:
 * 1. No trailing slashes.
 * 2. Guaranteed inclusion of the '/api/v1' prefix without ever duplicating it into '/api/v1/api/v1'.
 */
export function resolveApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!envUrl) {
    return '/api/v1';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl;
  }
  return `${cleanUrl}/api/v1`;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Centralized error normalizer
export function normalizeApiError(error: unknown): ApiErrorResponse {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<Record<string, unknown>>;
    const responseData = axiosError.response?.data;

    // Handle FastAPI style detail format
    if (responseData) {
      if (typeof responseData.detail === 'string') {
        return {
          status: 'error',
          message: responseData.detail,
          code: (responseData.code as string) || `HTTP_${axiosError.response?.status}`,
        };
      }
      if (Array.isArray(responseData.detail)) {
        return {
          status: 'error',
          message: 'Validation failed for one or more fields',
          errors: responseData.detail.map((d: { loc?: string[]; msg?: string }) => ({
            field: Array.isArray(d.loc) ? d.loc.join('.') : 'field',
            message: d.msg || 'Invalid input',
          })),
        };
      }
      if (typeof responseData.message === 'string') {
        return {
          status: 'error',
          message: responseData.message,
          code: responseData.code as string,
        };
      }
    }

    if (axiosError.code === 'ECONNABORTED') {
      return {
        status: 'error',
        message: 'Request timed out. Please check your connection to the SCMS server.',
        code: 'TIMEOUT',
      };
    }

    if (!axiosError.response) {
      return {
        status: 'error',
        message: 'Unable to reach SCMS backend server. Ensure FastAPI backend is running.',
        code: 'NETWORK_ERROR',
      };
    }

    return {
      status: 'error',
      message: axiosError.message || 'An unexpected server error occurred',
      code: `HTTP_${axiosError.response.status}`,
    };
  }

  return {
    status: 'error',
    message: error instanceof Error ? error.message : 'Unknown application error occurred',
    code: 'UNKNOWN',
  };
}

// Request Interceptor: Attach Anti-CSRF token on state-modifying HTTP methods
apiClient.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    // If backend returns a new csrf_token in the payload, synchronize cache
    if (response.data && typeof response.data.csrf_token === 'string') {
      setCachedCsrfToken(response.data.csrf_token);
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/* ==========================================================================
   Service Layer (Connecting to verified FastAPI backend)
   ========================================================================== */

export const systemApi = {
  getHealth: async (): Promise<HealthResponse> => {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  },
};

export const authApi = {
  /**
   * Initializes pre-login CSRF token and sets the scms_csrf_token cookie.
   */
  initCsrf: async (): Promise<string> => {
    const response = await apiClient.get<CSRFInitResponse>('/auth/csrf-init');
    if (response.data?.csrf_token) {
      setCachedCsrfToken(response.data.csrf_token);
      return response.data.csrf_token;
    }
    return '';
  },

  /**
   * Performs user authentication against FastAPI POST /auth/login.
   * Ensures CSRF handshake is completed first, then submits credentials.
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    // Ensure anti-CSRF token exists before login request
    let csrfToken = getCsrfToken();
    if (!csrfToken) {
      csrfToken = await authApi.initCsrf();
    }

    const response = await apiClient.post<BackendLoginResponse>(
      '/auth/login',
      {
        email: credentials.email,
        password: credentials.password,
      },
      {
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
      }
    );

    if (response.data.csrf_token) {
      setCachedCsrfToken(response.data.csrf_token);
    }

    const mappedUser = mapBackendUser(response.data.user);

    return {
      message: response.data.message || 'Login successful',
      user: mappedUser,
      csrfToken: response.data.csrf_token,
    };
  },

  /**
   * Terminates active session and purges server session and cookies.
   */
  logout: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/logout');
    setCachedCsrfToken(null);
    return response.data;
  },

  /**
   * Performs customer registration against FastAPI POST /auth/register.
   */
  register: async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<LoginResponse> => {
    let csrfToken = getCsrfToken();
    if (!csrfToken) {
      csrfToken = await authApi.initCsrf();
    }

    const response = await apiClient.post<BackendLoginResponse>(
      '/auth/register',
      {
        email: payload.email,
        password: payload.password,
        first_name: payload.firstName,
        last_name: payload.lastName,
        phone_number: payload.phone || null,
      },
      {
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
      }
    );

    if (response.data.csrf_token) {
      setCachedCsrfToken(response.data.csrf_token);
    }

    const mappedUser = mapBackendUser(response.data.user);
    return {
      message: response.data.message || 'Registration successful',
      user: mappedUser,
      csrfToken: response.data.csrf_token,
    };
  },

  /**
   * Authenticate Google OAuth JWT token against FastAPI POST /auth/google.
   */
  loginWithGoogle: async (credential: string): Promise<LoginResponse> => {
    let csrfToken = getCsrfToken();
    if (!csrfToken) {
      csrfToken = await authApi.initCsrf();
    }

    const response = await apiClient.post<BackendLoginResponse>(
      '/auth/google',
      { credential },
      {
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
      }
    );

    if (response.data.csrf_token) {
      setCachedCsrfToken(response.data.csrf_token);
    }

    const mappedUser = mapBackendUser(response.data.user);
    return {
      message: response.data.message || 'Google authentication successful',
      user: mappedUser,
      csrfToken: response.data.csrf_token,
    };
  },

  /**
   * Restores authenticated session from HTTP-only scms_session cookie.
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<BackendUser>('/auth/me');
    return mapBackendUser(response.data);
  },
};

export const membersApi = {
  getMembers: async (params?: { page?: number; pageSize?: number; search?: string; status?: string }) => {
    const response = await apiClient.get<PaginatedResponse<Member>>('/members', { params });
    return response.data;
  },
  getMyMembership: async () => {
    const response = await apiClient.get('/members/me');
    return response.data;
  },
  createMember: async (payload: { firstName: string; lastName: string; email: string; phone?: string; planId?: string }) => {
    const response = await apiClient.post('/members', {
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      phone_number: payload.phone,
      plan_id: payload.planId,
    });
    return response.data;
  },
};

export const membershipsApi = {
  getPlans: async () => {
    const response = await apiClient.get<Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      duration_months: number;
      court_discount_percent: number;
      shop_discount_percent: number;
      cafe_discount_percent: number;
      is_active: boolean;
    }>>('/memberships/plans');
    return response.data;
  },
  subscribe: async (planId: string) => {
    const response = await apiClient.post('/memberships/subscribe', { plan_id: planId });
    return response.data;
  },
};

export const bookingsApi = {
  getCourts: async (sport?: string) => {
    const response = await apiClient.get<Array<{
      id: string;
      name: string;
      sport: string;
      surface_type?: string;
      hourly_rate: number;
      is_indoor: boolean;
      is_active: boolean;
      opening_time: string;
      closing_time: string;
      image_url?: string;
      description?: string;
    }>>('/courts', { params: { sport } });
    return response.data;
  },
  getAvailability: async (courtId: string, date: string) => {
    const response = await apiClient.get<{
      court_id: string;
      court_name: string;
      sport: string;
      date: string;
      slots: Array<{ time_str: string; is_available: boolean; price: number }>;
    }>(`/courts/${courtId}/availability`, { params: { date } });
    return response.data;
  },
  getBookings: async (params?: { court_id?: string; booking_date?: string }) => {
    const response = await apiClient.get<Array<{
      id: string;
      court_id: string;
      court_name: string;
      sport: string;
      booking_date: string;
      start_time: string;
      end_time: string;
      duration_minutes: number;
      hourly_rate: number;
      discount_amount: number;
      total_amount: number;
      status: string;
      participant_count: number;
      notes?: string;
      user_name: string;
      user_email: string;
    }>>('/bookings', { params });
    return response.data;
  },
  createBooking: async (payload: {
    court_id: string;
    booking_date: string;
    start_time: string;
    participant_count?: number;
    notes?: string;
  }) => {
    const response = await apiClient.post('/bookings', payload);
    return response.data;
  },
  cancelBooking: async (bookingId: string) => {
    const response = await apiClient.patch(`/bookings/${bookingId}/cancel`);
    return response.data;
  },
};

export const shopApi = {
  getCatalog: async (params?: { category?: string; is_rental?: boolean; search?: string }) => {
    const response = await apiClient.get<Array<{
      id: string;
      vendor_id: string;
      name: string;
      sku: string;
      category: string;
      price: number;
      cost_price?: number;
      stock_quantity: number;
      low_stock_threshold: number;
      is_active: boolean;
      is_rental: boolean;
      rental_price_per_day?: number;
      image_url?: string;
      description?: string;
    }>>('/shop/products', { params });
    return response.data;
  },
  getVendorProducts: async () => {
    const response = await apiClient.get('/shop/vendor/products');
    return response.data;
  },
  addVendorProduct: async (payload: {
    name: string;
    category: string;
    price: number;
    cost_price?: number;
    stock_quantity: number;
    is_rental?: boolean;
    rental_price_per_day?: number;
    image_url?: string;
    description?: string;
  }) => {
    const response = await apiClient.post('/shop/vendor/products', payload);
    return response.data;
  },
  updateVendorProduct: async (id: string, payload: any) => {
    const response = await apiClient.patch(`/shop/vendor/products/${id}`, payload);
    return response.data;
  },
  getVendorAnalytics: async () => {
    const response = await apiClient.get<{
      business_name: string;
      total_revenue: number;
      total_orders: number;
      pending_orders: number;
      completed_orders: number;
      total_products: number;
      low_stock_products: number;
      active_rentals: number;
    }>('/shop/vendor/analytics');
    return response.data;
  },
  createOrder: async (payload: {
    items: Array<{ product_id: string; quantity: number }>;
    fulfilment_type?: string;
    delivery_address?: string;
  }) => {
    const response = await apiClient.post('/shop/orders', payload);
    return response.data;
  },
  getOrders: async () => {
    const response = await apiClient.get<Array<any>>('/shop/orders');
    return response.data;
  },
  updateOrderStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/shop/orders/${id}/status`, { status });
    return response.data;
  },
  getRentals: async () => {
    const response = await apiClient.get<Array<any>>('/shop/rentals');
    return response.data;
  },
  bookRental: async (payload: { product_id: string; rental_start: string; rental_end: string; notes?: string }) => {
    const response = await apiClient.post('/shop/rentals', payload);
    return response.data;
  },
  returnRental: async (id: string) => {
    const response = await apiClient.patch(`/shop/rentals/${id}/return`);
    return response.data;
  },
};

export const cafeteriaApi = {
  getMenu: async (category?: string) => {
    const response = await apiClient.get<Array<{
      id: string;
      cafeteria_id: string;
      name: string;
      category: string;
      price: number;
      description?: string;
      image_url?: string;
      is_available: boolean;
      preparation_time_minutes: number;
      calories?: number;
    }>>('/cafeteria/menu', { params: { category } });
    return response.data;
  },
  getOwnerMenu: async () => {
    const response = await apiClient.get('/cafeteria/owner/menu');
    return response.data;
  },
  addMenuItem: async (payload: any) => {
    const response = await apiClient.post('/cafeteria/owner/menu', payload);
    return response.data;
  },
  updateMenuItem: async (id: string, payload: any) => {
    const response = await apiClient.patch(`/cafeteria/owner/menu/${id}`, payload);
    return response.data;
  },
  getOwnerAnalytics: async () => {
    const response = await apiClient.get<{
      cafeteria_name: string;
      revenue_today: number;
      total_revenue: number;
      orders_today_count: number;
      total_orders_count: number;
      stage_counts: Record<string, number>;
    }>('/cafeteria/owner/analytics');
    return response.data;
  },
  createOrder: async (payload: {
    items: Array<{ menu_item_id: string; quantity: number; special_instructions?: string }>;
    order_type?: string;
    customer_notes?: string;
  }) => {
    const response = await apiClient.post('/cafeteria/orders', payload);
    return response.data;
  },
  getOrders: async (status_filter?: string) => {
    const response = await apiClient.get<Array<any>>('/cafeteria/orders', { params: { status_filter } });
    return response.data;
  },
  updateOrderStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/cafeteria/orders/${id}/status`, { status });
    return response.data;
  },
};

export const adminApi = {
  getOverview: async () => {
    const response = await apiClient.get<{
      total_members: number;
      active_memberships: number;
      expiring_memberships: number;
      todays_bookings_count: number;
      court_occupancy_percent: number;
      revenue_today: number;
      revenue_this_month: number;
      court_revenue_today: number;
      shop_revenue_today: number;
      cafeteria_revenue_today: number;
      membership_revenue_this_month: number;
      pending_orders_count: number;
      pending_vendor_approvals_count: number;
    }>('/admin/overview');
    return response.data;
  },
  getVendors: async () => {
    const response = await apiClient.get<Array<{
      id: string;
      business_name: string;
      vendor_type: string;
      status: string;
      contact_phone?: string;
      contact_email?: string;
      owner_name: string;
      owner_email: string;
      products_count: number;
      orders_count: number;
      total_revenue: number;
    }>>('/admin/vendors');
    return response.data;
  },
  updateVendorStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/admin/vendors/${id}/status`, { status });
    return response.data;
  },
  getTransactions: async () => {
    const response = await apiClient.get<Array<any>>('/finance/transactions');
    return response.data;
  },
};

export const crmApi = {
  submitEnquiry: async (payload: { name: string; email: string; phone?: string; subject: string; message: string }) => {
    const response = await apiClient.post('/crm/enquiries', payload);
    return response.data;
  },
  getEnquiries: async () => {
    const response = await apiClient.get<Array<any>>('/crm/enquiries');
    return response.data;
  },
  getNotifications: async () => {
    const response = await apiClient.get<Array<any>>('/crm/notifications');
    return response.data;
  },
};

