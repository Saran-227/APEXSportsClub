export interface PlanBreakdownItem {
  id: string;
  name: string;
  price: number;
  member_count: number;
  percent: number;
}

export interface RecentMemberItem {
  id: string;
  name: string;
  email: string;
  membership_number: string;
  tier: string;
  status: string;
  joined_date: string;
  expiry_date?: string | null;
}

export interface MembershipsAnalytics {
  total_members: number;
  active_members: number;
  expired_members: number;
  new_this_month: number;
  total_subscription_revenue: number;
  plans_breakdown: PlanBreakdownItem[];
  recent_members: RecentMemberItem[];
  business_clients_count: number;
}

export interface PendingClientInvoiceItem {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  transaction_type: string;
  amount: number;
  subtotal: number;
  tax_amount: number;
  due_date: string;
  status: string;
  is_overdue: boolean;
}

export interface BusinessVendorItem {
  id: string;
  business_name: string;
  vendor_type: string;
  status: string;
  tax_id?: string | null;
  contact_email?: string | null;
  owner_name: string;
  total_revenue: number;
}

export interface ClientsToInvoiceAnalytics {
  total_pending_amount: number;
  pending_invoices_count: number;
  overdue_invoices_count: number;
  total_invoices_count: number;
  total_collected_amount: number;
  pending_clients: PendingClientInvoiceItem[];
  business_vendors: BusinessVendorItem[];
}

export interface EmployeePayrollItem {
  id: string;
  full_name: string;
  email: string;
  department: string;
  job_title: string;
  hourly_rate: number;
  estimated_monthly_pay: number;
  hire_date: string;
  status: string;
}

export interface EmployeesToPayAnalytics {
  total_active_employees: number;
  total_staff: number;
  total_monthly_payroll: number;
  departments_count: number;
  payroll_roster: EmployeePayrollItem[];
}

export interface LeaveRequestItem {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: string;
  created_at: string;
}

export interface LeaveToApproveAnalytics {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  on_leave_today: number;
  requests: LeaveRequestItem[];
}

export interface TaxCategoryBreakdown {
  category: string;
  taxable_amount: number;
  tax_collected: number;
  tax_rate_percent: number;
}

export interface TaxPeriodBreakdown {
  period: string;
  taxable_amount: number;
  tax_collected: number;
}

export interface TaxesToReportAnalytics {
  total_tax_collected: number;
  total_taxable_revenue: number;
  total_gross_revenue: number;
  effective_tax_rate: number;
  club_tax_id: string;
  filing_status: string;
  next_filing_deadline: string;
  taxes_by_category: TaxCategoryBreakdown[];
  taxes_by_period: TaxPeriodBreakdown[];
}

export interface AdminRealtimeDashboardData {
  generated_at: string;
  memberships: MembershipsAnalytics;
  clients_to_invoice: ClientsToInvoiceAnalytics;
  employees_to_pay: EmployeesToPayAnalytics;
  leave_to_approve: LeaveToApproveAnalytics;
  taxes_to_report: TaxesToReportAnalytics;
}
