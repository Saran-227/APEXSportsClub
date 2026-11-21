export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  status?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  status: 'error';
  message: string;
  code?: string;
  errors?: ApiFieldError[];
  detail?: string | Array<{ loc: string[]; msg: string; type: string }>;
}
