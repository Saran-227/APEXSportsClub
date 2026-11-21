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

export interface Invoice {
  id: string;
  invoiceNumber: string;
  memberName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: 'PAID' | 'UNPAID' | 'OVERDUE';
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
