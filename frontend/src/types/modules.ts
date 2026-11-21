// Inventory & Products
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: 'RACKETS' | 'BALLS' | 'APPAREL' | 'ACCESSORIES' | 'NUTRITION';
  unitPrice: number;
  rentalPricePerHr?: number;
  stockQuantity: number;
  reorderLevel: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface StockMovement {
  movementId: string;
  productId: string;
  movementType: 'RESTOCK' | 'DAMAGE_WRITE_OFF' | 'SALE' | 'ADJUSTMENT';
  quantityChange: number;
  referenceDoc?: string;
  loggedAt: string;
}

// Pro Shop
export interface ShopOrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ShopOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  memberId?: string;
  items: ShopOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED';
  paymentMethod: 'CARD' | 'CASH' | 'MEMBER_ACCOUNT';
  createdAt: string;
}

// Bar & Cafeteria
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';

export interface CafeTable {
  tableId: string;
  tableNumber: number;
  section: string;
  seats: number;
  status: TableStatus;
  currentOrderId?: string | null;
  currentTotal: number;
}

export interface CafeOrder {
  orderId: string;
  tableNumber: number;
  status: 'OPEN' | 'IN_PREPARATION' | 'READY' | 'SETTLED';
  itemCount: number;
  elapsedMinutes: number;
  totalAmount: number;
}

// Finance
export interface FinancialSummary {
  period: string;
  startDate: string;
  endDate: string;
  grossRevenue: number;
  breakdown: {
    memberships: number;
    courtBookings: number;
    proShop: number;
    cafeteria: number;
  };
  operatingExpenses: number;
  netMargin: number;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  transaction_type: 'MEMBERSHIP' | 'BOOKING' | 'SHOP' | 'RENTAL' | 'CAFETERIA' | string;
  reference_id?: string;
  payment_id?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  amount: number;
  currency: string;
  status: string;
  issued_at: string;
  has_pdf: boolean;
  email_status: 'SENT' | 'PENDING' | 'FAILED' | string;
  email_sent_at?: string;
  email_message_id?: string;
  email_retry_count: number;
  email_error?: string;
  items?: InvoiceItem[];
  // Legacy compatibility fields if any legacy component expects them
  invoiceNumber?: string;
  memberName?: string;
  issueDate?: string;
  dueDate?: string;
}

export interface InvoiceSummary {
  total_invoices: number;
  total_revenue: number;
  successful_deliveries: number;
  failed_deliveries: number;
  pending_deliveries: number;
}

// Staff & Employees
export interface Employee {
  id: string;
  fullName: string;
  role: string;
  department: 'ATHLETICS' | 'OPERATIONS' | 'FOOD_AND_BEV' | 'ADMINISTRATION';
  email: string;
  phone: string;
  employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'OFF_DUTY';
}

export interface Shift {
  shiftId: string;
  employeeName: string;
  facility: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
}

// CRM
export type EnquiryStatus = 'NEW' | 'CONTACTED' | 'TOUR_SCHEDULED' | 'CONVERTED' | 'CLOSED';

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  source: string;
  status: EnquiryStatus;
  createdAt: string;
  assignedTo?: string;
  notes?: string;
}
