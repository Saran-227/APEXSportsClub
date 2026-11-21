import axios, { AxiosError } from 'axios';
import type {
  ApiErrorResponse,
  LoginCredentials,
  LoginResponse,
  User,
  Member,
  MembershipPlan,
  PaginatedResponse,
  Booking,
  CourtFacility,
  Product,
  StockMovement,
  ShopOrder,
  CafeTable,
  CafeOrder,
  FinancialSummary,
  Invoice,
  Employee,
  Shift,
  Enquiry,
} from '../types';

/**
 * SCMS Centralized Axios Client
 * Configured with:
 * - Base URL from VITE_API_BASE_URL (defaults to /api/v1)
 * - Prepared support for cookie-based authentication (withCredentials: true)
 * - Request timeout (15s)
 * - Centralized response and error interceptors
 */
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

// Interceptors
apiClient.interceptors.request.use(
  (config) => {
    // Allows injecting CSRF token header if cookie-to-header pattern is used
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Global interceptor hook: can broadcast unauthenticated events if 401
    if (error.response?.status === 401) {
      // Cookie session has expired or is invalid
    }
    return Promise.reject(error);
  }
);

/* ==========================================================================
   Service Layer (Connecting to proposed contracts in docs/api-contracts.md)
   ========================================================================== */

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },
  logout: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/logout');
    return response.data;
  },
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};

export const membersApi = {
  getMembers: async (params?: { page?: number; pageSize?: number; search?: string; status?: string }) => {
    const response = await apiClient.get<PaginatedResponse<Member>>('/members', { params });
    return response.data;
  },
  getMemberById: async (id: string) => {
    const response = await apiClient.get<Member>(`/members/${id}`);
    return response.data;
  },
  createMember: async (payload: Partial<Member>) => {
    const response = await apiClient.post<Member>('/members', payload);
    return response.data;
  },
  updateMember: async (id: string, payload: Partial<Member>) => {
    const response = await apiClient.patch<Member>(`/members/${id}`, payload);
    return response.data;
  },
};

export const membershipsApi = {
  getPlans: async () => {
    const response = await apiClient.get<{ plans: MembershipPlan[] }>('/memberships');
    return response.data;
  },
  renewMembership: async (id: string, payload: { planId: string; paymentMethod: string }) => {
    const response = await apiClient.post(`/memberships/${id}/renew`, payload);
    return response.data;
  },
};

export const bookingsApi = {
  getAvailability: async (date: string, facilityType?: string) => {
    const response = await apiClient.get<{ date: string; courts: CourtFacility[] }>('/bookings/availability', {
      params: { date, facilityType },
    });
    return response.data;
  },
  getBookings: async (params?: { page?: number; pageSize?: number; date?: string; status?: string }) => {
    const response = await apiClient.get<PaginatedResponse<Booking>>('/bookings', { params });
    return response.data;
  },
  createBooking: async (payload: { courtId: string; memberId: string; date: string; startTime: string; endTime: string }) => {
    const response = await apiClient.post<Booking>('/bookings', payload);
    return response.data;
  },
  cancelBooking: async (id: string, reason: string) => {
    const response = await apiClient.post(`/bookings/${id}/cancel`, { reason });
    return response.data;
  },
};

export const inventoryApi = {
  getProducts: async (params?: { category?: string }) => {
    const response = await apiClient.get<{ items: Product[] }>('/products', { params });
    return response.data;
  },
  createProduct: async (payload: Partial<Product>) => {
    const response = await apiClient.post<Product>('/products', payload);
    return response.data;
  },
  getInventorySummary: async () => {
    const response = await apiClient.get('/inventory');
    return response.data;
  },
  logStockMovement: async (payload: { productId: string; movementType: string; quantityChange: number; notes?: string }) => {
    const response = await apiClient.post<StockMovement>('/inventory/stock-movements', payload);
    return response.data;
  },
};

export const shopApi = {
  getOrders: async (params?: { page?: number; pageSize?: number }) => {
    const response = await apiClient.get<PaginatedResponse<ShopOrder>>('/orders', { params });
    return response.data;
  },
  getOrderById: async (id: string) => {
    const response = await apiClient.get<ShopOrder>(`/orders/${id}`);
    return response.data;
  },
  createOrder: async (payload: { memberId?: string; items: Array<{ productId: string; quantity: number }>; paymentMethod: string }) => {
    const response = await apiClient.post<ShopOrder>('/orders', payload);
    return response.data;
  },
};

export const cafeApi = {
  getTables: async () => {
    const response = await apiClient.get<{ tables: CafeTable[] }>('/cafe/tables');
    return response.data;
  },
  getOrders: async () => {
    const response = await apiClient.get<{ activeOrders: CafeOrder[] }>('/cafe/orders');
    return response.data;
  },
  createOrder: async (payload: { tableId: string; items: Array<{ menuItemId: string; quantity: number }> }) => {
    const response = await apiClient.post<CafeOrder>('/cafe/orders', payload);
    return response.data;
  },
  settleOrder: async (id: string, payload: { paymentMethod: string; tipAmount?: number }) => {
    const response = await apiClient.post(`/cafe/orders/${id}/settle`, payload);
    return response.data;
  },
};

export const financeApi = {
  getFinancialReports: async (params?: { period?: string; startDate?: string; endDate?: string }) => {
    const response = await apiClient.get<FinancialSummary>('/finance/reports', { params });
    return response.data;
  },
  getInvoices: async (params?: { page?: number; pageSize?: number; status?: string }) => {
    const response = await apiClient.get<PaginatedResponse<Invoice>>('/finance/invoices', { params });
    return response.data;
  },
};

export const employeesApi = {
  getEmployees: async () => {
    const response = await apiClient.get<{ items: Employee[] }>('/employees');
    return response.data;
  },
  getShifts: async (weekStartDate?: string) => {
    const response = await apiClient.get<{ shifts: Shift[] }>('/employees/shifts', { params: { weekStartDate } });
    return response.data;
  },
  submitLeaveRequest: async (payload: { employeeId: string; startDate: string; endDate: string; leaveType: string; reason: string }) => {
    const response = await apiClient.post('/employees/leave-requests', payload);
    return response.data;
  },
};

export const crmApi = {
  getEnquiries: async (status?: string) => {
    const response = await apiClient.get<{ items: Enquiry[] }>('/enquiries', { params: { status } });
    return response.data;
  },
  createEnquiry: async (payload: { name: string; email: string; phone: string; interest: string; message?: string }) => {
    const response = await apiClient.post<Enquiry>('/enquiries', payload);
    return response.data;
  },
  addFollowUp: async (id: string, payload: { actionType: string; notes: string; nextFollowUpDate?: string }) => {
    const response = await apiClient.post(`/enquiries/${id}/follow-ups`, payload);
    return response.data;
  },
};
