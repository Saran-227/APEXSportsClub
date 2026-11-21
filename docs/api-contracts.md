# Champions Club Management System (SCMS) - API Contracts Specification

> **STATUS: PROPOSED**  
> **Author:** Asim (Frontend Lead)  
> **Target Backend Reviewer:** Saran (Backend Lead)  
> **Base API Prefix:** `/api/v1`  
> **Authentication Mechanism:** Cookie-based HTTP-only session / secure token (`withCredentials: true`)  
> **Facility Scope:** Tennis & Cricket Facilities  
> **Membership Tiers:** Gold, Silver, Junior  

---

## 1. Overview & Architectural Principles

This document defines the proposed contract interface between the **Frontend (React / TypeScript)** and the **Backend (FastAPI / PostgreSQL)** for Champions Club Management System (SCMS).

### Key Guidelines for Backend Alignment
1. **Standard Envelope Pattern**:
   All successful responses return JSON. List endpoints return metadata for pagination (`page`, `pageSize`, `totalCount`, `totalPages`).
2. **Error Envelope Pattern**:
   Standard error responses follow RFC 7807 problem details or FastAPI validation detail:
   ```json
   {
     "status": "error",
     "message": "Human readable explanation",
     "code": "ERROR_CODE_STRING",
     "errors": [
       { "field": "email", "message": "Invalid email address format" }
     ]
   }
   ```
3. **Session & Security**:
   - Browser sends `withCredentials: true`.
   - Backend sets `Set-Cookie: session_id=...; HttpOnly; Secure; SameSite=Lax`.
   - CSRF protection: Cookie / header token pair when mutating (`X-CSRF-Token`).
4. **Roles and Permissions**:
   - `ADMIN`: Full system access across all club operations.
   - `STAFF`: Day-to-day front desk, bookings, POS, cafeteria operations.
   - `FINANCE`: Billing, invoices, payroll, reports.
   - `MEMBER`: Personal bookings, profile, order history.

---

## 2. Authentication & Current User Endpoints

### 2.1 POST `/api/v1/auth/login`
- **Purpose**: Authenticate club personnel or members and initialize session cookie.
- **Permission**: Public (`Anonymous`)
- **Request Body (`application/json`)**:
  ```json
  {
    "email": "staff@championsclub.com",
    "password": "SecurePassword123!",
    "rememberMe": true
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "user": {
      "id": "usr_94b2f1",
      "email": "staff@championsclub.com",
      "fullName": "Saran Patel",
      "role": "STAFF",
      "avatarUrl": null,
      "permissions": ["bookings:read", "bookings:write", "members:read"]
    },
    "message": "Login successful"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Validation failure on input fields.
  - `401 Unauthorized`: Invalid credentials (`INVALID_CREDENTIALS`).
  - `403 Forbidden`: Account suspended or inactive (`ACCOUNT_LOCKED`).
  - `429 Too Many Requests`: Rate limit exceeded after multiple failed attempts.

### 2.2 POST `/api/v1/auth/logout`
- **Purpose**: Invalidate current session and clear authentication cookies.
- **Permission**: Authenticated (`ADMIN`, `STAFF`, `FINANCE`, `MEMBER`)
- **Request Body**: Empty `{}`
- **Response (`200 OK`)**:
  ```json
  {
    "message": "Successfully logged out"
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: No active session found.

### 2.3 GET `/api/v1/auth/me`
- **Purpose**: Retrieve currently logged-in user context and active permissions for route guards.
- **Permission**: Authenticated (`ADMIN`, `STAFF`, `FINANCE`, `MEMBER`)
- **Request Query Params**: None
- **Response (`200 OK`)**:
  ```json
  {
    "id": "usr_94b2f1",
    "email": "staff@championsclub.com",
    "fullName": "Saran Patel",
    "role": "STAFF",
    "avatarUrl": null,
    "permissions": [
      "members:read",
      "members:write",
      "bookings:read",
      "bookings:write",
      "cafe:write",
      "shop:write"
    ]
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Missing or expired session cookie.

---

## 3. Members Management Endpoints

### 3.1 GET `/api/v1/members`
- **Purpose**: List Champions Club members with search, status filters, and pagination.
- **Permission**: `ADMIN`, `STAFF`
- **Query Parameters**:
  - `page` (optional, default: 1): Page number.
  - `pageSize` (optional, default: 20): Records per page.
  - `search` (optional): Query name, phone, or membership ID.
  - `status` (optional): `ACTIVE`, `EXPIRED`, `SUSPENDED`, `PENDING`.
  - `tier` (optional): `GOLD`, `SILVER`, `JUNIOR`.
- **Response (`200 OK`)**:
  ```json
  {
    "items": [
      {
        "id": "mem_01",
        "membershipNumber": "CC-1021",
        "firstName": "Alexander",
        "lastName": "Vance",
        "email": "alex.vance@example.com",
        "phone": "+1 (555) 234-5678",
        "status": "ACTIVE",
        "tier": "GOLD",
        "joinDate": "2025-01-15",
        "expiryDate": "2026-01-14"
      }
    ],
    "totalCount": 1248,
    "page": 1,
    "pageSize": 20,
    "totalPages": 63
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Unauthenticated.
  - `403 Forbidden`: Insufficient permissions.

### 3.2 POST `/api/v1/members`
- **Purpose**: Register a new member into Champions Club.
- **Permission**: `ADMIN`, `STAFF`
- **Request Body (`application/json`)**:
  ```json
  {
    "firstName": "Elena",
    "lastName": "Rostova",
    "email": "elena.r@example.com",
    "phone": "+1 (555) 987-6543",
    "tier": "GOLD",
    "planId": "plan_gold_annual",
    "dateOfBirth": "1994-06-20",
    "emergencyContact": {
      "name": "Dmitri Rostov",
      "phone": "+1 (555) 987-0000",
      "relation": "Spouse"
    }
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "id": "mem_908",
    "membershipNumber": "CC-1099",
    "firstName": "Elena",
    "lastName": "Rostova",
    "email": "elena.r@example.com",
    "status": "ACTIVE",
    "tier": "GOLD",
    "joinDate": "2026-11-21",
    "expiryDate": "2027-11-20"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Validation failure.
  - `409 Conflict`: Email or phone already registered.

### 3.3 GET `/api/v1/members/{id}`
- **Purpose**: Get comprehensive profile for a specific member including activity history.
- **Permission**: `ADMIN`, `STAFF`, or self (`id == current_user.member_id`)
- **Response (`200 OK`)**:
  ```json
  {
    "id": "mem_01",
    "membershipNumber": "CC-1021",
    "firstName": "Alexander",
    "lastName": "Vance",
    "email": "alex.vance@example.com",
    "phone": "+1 (555) 234-5678",
    "status": "ACTIVE",
    "tier": "GOLD",
    "joinDate": "2025-01-15",
    "expiryDate": "2026-01-14",
    "activePlan": {
      "id": "plan_gold_annual",
      "name": "Gold Annual Membership",
      "billingCycle": "ANNUAL"
    },
    "recentBookingsCount": 18,
    "unpaidInvoices": 0
  }
  ```
- **Error Responses**:
  - `404 Not Found`: Member ID not found.

### 3.4 PATCH `/api/v1/members/{id}`
- **Purpose**: Partially update member personal details or account status.
- **Permission**: `ADMIN`, `STAFF`
- **Request Body (`application/json`)**:
  ```json
  {
    "phone": "+1 (555) 999-8877",
    "status": "SUSPENDED"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "id": "mem_01",
    "status": "SUSPENDED",
    "updatedAt": "2026-11-21T10:30:00Z"
  }
  ```

---

## 4. Memberships Endpoints (Gold, Silver, Junior)

### 4.1 GET `/api/v1/memberships`
- **Purpose**: Retrieve all configured membership plans for Champions Club (Gold, Silver, Junior).
- **Permission**: `ADMIN`, `STAFF`, `MEMBER`
- **Query Parameters**:
  - `includeInactive` (boolean, optional, default: false)
- **Response (`200 OK`)**:
  ```json
  {
    "plans": [
      {
        "id": "plan_junior_ann",
        "name": "Junior Development Plan",
        "tier": "JUNIOR",
        "durationMonths": 12,
        "price": 350.00,
        "courtAccess": ["TENNIS_CLAY", "CRICKET_NETS"],
        "isActive": true
      },
      {
        "id": "plan_silver_m",
        "name": "Silver Monthly Membership",
        "tier": "SILVER",
        "durationMonths": 1,
        "price": 79.00,
        "courtAccess": ["TENNIS_OUTDOOR", "CRICKET_NETS"],
        "isActive": true
      },
      {
        "id": "plan_gold_annual",
        "name": "Gold Annual Membership",
        "tier": "GOLD",
        "durationMonths": 12,
        "price": 850.00,
        "courtAccess": ["ALL_TENNIS_COURTS", "CRICKET_TURF_PITCH", "PRACTICE_NETS"],
        "isActive": true
      }
    ]
  }
  ```

### 4.2 POST `/api/v1/memberships`
- **Purpose**: Create or modify a membership tier specification.
- **Permission**: `ADMIN`
- **Request Body (`application/json`)**:
  ```json
  {
    "name": "Gold Family Annual",
    "tier": "GOLD",
    "durationMonths": 12,
    "price": 1200.00,
    "courtAccess": ["ALL_TENNIS_COURTS", "CRICKET_TURF_PITCH", "PRACTICE_NETS"]
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "id": "plan_gold_family",
    "name": "Gold Family Annual",
    "tier": "GOLD",
    "isActive": true
  }
  ```

### 4.3 POST `/api/v1/memberships/{id}/renew`
- **Purpose**: Renew an existing membership subscription for an additional term.
- **Permission**: `ADMIN`, `STAFF`, `FINANCE`
- **Request Body (`application/json`)**:
  ```json
  {
    "planId": "plan_gold_annual",
    "paymentMethod": "CARD",
    "discountCode": "RENEW10"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "membershipId": "mem_01",
    "newExpiryDate": "2027-01-14",
    "invoiceId": "inv_88201",
    "amountPaid": 765.00,
    "status": "ACTIVE"
  }
  ```

---

## 5. Bookings & Reservations Endpoints (Tennis & Cricket)

### 5.1 GET `/api/v1/bookings/availability`
- **Purpose**: Check availability across Champions Club Tennis courts and Cricket pitches/nets for a given date.
- **Permission**: `ADMIN`, `STAFF`, `MEMBER`
- **Query Parameters**:
  - `date` (required, ISO 8601: `YYYY-MM-DD`): e.g. `2026-11-21`
  - `facilityType` (optional): `TENNIS`, `CRICKET`
  - `courtId` (optional): Specific court/pitch filter.
- **Response (`200 OK`)**:
  ```json
  {
    "date": "2026-11-21",
    "courts": [
      {
        "id": "court_t1",
        "name": "Tennis Court 1 (Clay)",
        "sport": "TENNIS",
        "slots": [
          { "startTime": "08:00", "endTime": "09:00", "isAvailable": false, "bookingId": "bk_99" },
          { "startTime": "09:00", "endTime": "10:00", "isAvailable": true, "price": 35.00 },
          { "startTime": "10:00", "endTime": "11:00", "isAvailable": true, "price": 35.00 }
        ]
      },
      {
        "id": "court_cr1",
        "name": "Cricket Pitch 1 (Main Turf)",
        "sport": "CRICKET",
        "slots": [
          { "startTime": "09:00", "endTime": "12:00", "isAvailable": true, "price": 120.00 },
          { "startTime": "14:00", "endTime": "17:00", "isAvailable": false, "bookingId": "bk_100" }
        ]
      }
    ]
  }
  ```

### 5.2 GET `/api/v1/bookings`
- **Purpose**: Query reservations list with pagination, date range, sport, and status filters.
- **Permission**: `ADMIN`, `STAFF`, `MEMBER`
- **Query Parameters**:
  - `page` (int, default: 1)
  - `pageSize` (int, default: 20)
  - `sport` (`TENNIS`, `CRICKET`)
  - `dateFrom` (ISO date string)
  - `dateTo` (ISO date string)
  - `status` (`CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`)
- **Response (`200 OK`)**:
  ```json
  {
    "items": [
      {
        "id": "bk_101",
        "courtId": "court_t1",
        "courtName": "Tennis Court 1 (Clay)",
        "sport": "TENNIS",
        "memberId": "mem_01",
        "memberName": "Alexander Vance",
        "date": "2026-11-21",
        "startTime": "10:00",
        "endTime": "11:00",
        "status": "CONFIRMED",
        "fee": 35.00
      },
      {
        "id": "bk_102",
        "courtId": "court_cr1",
        "courtName": "Cricket Pitch 1 (Main Turf)",
        "sport": "CRICKET",
        "memberId": "mem_02",
        "memberName": "Elena Rostova",
        "date": "2026-11-21",
        "startTime": "11:30",
        "endTime": "13:30",
        "status": "CONFIRMED",
        "fee": 60.00
      }
    ],
    "totalCount": 38,
    "page": 1,
    "pageSize": 20,
    "totalPages": 2
  }
  ```

### 5.3 POST `/api/v1/bookings`
- **Purpose**: Reserve a tennis court or cricket pitch/net slot for a member.
- **Permission**: `ADMIN`, `STAFF`, `MEMBER`
- **Request Body (`application/json`)**:
  ```json
  {
    "courtId": "court_cr_net1",
    "memberId": "mem_01",
    "sport": "CRICKET",
    "date": "2026-11-21",
    "startTime": "16:00",
    "endTime": "17:00",
    "equipmentRentalIds": ["eq_cricket_bat_01"]
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "id": "bk_104",
    "status": "CONFIRMED",
    "bookingRef": "BK-20261121-104",
    "courtName": "Cricket Practice Net A",
    "sport": "CRICKET",
    "startTime": "16:00",
    "endTime": "17:00",
    "totalFee": 25.00
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid time or past slot.
  - `409 Conflict`: Slot already booked by another reservation (`SLOT_CONFLICT`).

### 5.4 POST `/api/v1/bookings/{id}/cancel`
- **Purpose**: Cancel a confirmed reservation.
- **Permission**: `ADMIN`, `STAFF`, or reservation owner
- **Request Body (`application/json`)**:
  ```json
  {
    "reason": "Inclement weather / member schedule change"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "id": "bk_101",
    "status": "CANCELLED",
    "refundIssued": true,
    "refundAmount": 35.00
  }
  ```

---

## 6. Inventory & Products Endpoints

### 6.1 GET `/api/v1/products`
- **Purpose**: Retrieve catalog of retail goods and rental equipment (Tennis rackets, Cricket bats, balls, apparel).
- **Permission**: `ADMIN`, `STAFF`, `FINANCE`
- **Query Parameters**:
  - `category` (`RACKETS`, `BALLS`, `APPAREL`, `ACCESSORIES`, `NUTRITION`)
  - `type` (`RETAIL`, `RENTAL`)
- **Response (`200 OK`)**:
  ```json
  {
    "items": [
      {
        "id": "prod_head_speed",
        "sku": "EQ-TEN-0092",
        "name": "Head Speed Pro 2026 Tennis Racket",
        "category": "RACKETS",
        "unitPrice": 249.99,
        "rentalPricePerHr": 15.00,
        "stockQuantity": 12,
        "reorderLevel": 3
      },
      {
        "id": "prod_sg_cricket_bat",
        "sku": "EQ-CR-SG01",
        "name": "SG Sunny Gold Pro English Willow Cricket Bat",
        "category": "RACKETS",
        "unitPrice": 289.00,
        "rentalPricePerHr": 15.00,
        "stockQuantity": 8,
        "reorderLevel": 2
      }
    ]
  }
  ```

### 6.2 POST `/api/v1/products`
- **Purpose**: Add a new item to the master product catalog.
- **Permission**: `ADMIN`, `STAFF`
- **Request Body (`application/json`)**:
  ```json
  {
    "sku": "BALL-CR-KOOK",
    "name": "Kookaburra Turf Match Cricket Ball (Red)",
    "category": "BALLS",
    "costPrice": 35.00,
    "unitPrice": 59.99,
    "stockQuantity": 40,
    "reorderLevel": 10
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "id": "prod_kookaburra_ball",
    "sku": "BALL-CR-KOOK",
    "name": "Kookaburra Turf Match Cricket Ball (Red)",
    "stockQuantity": 40
  }
  ```

### 6.3 GET `/api/v1/inventory`
- **Purpose**: View current stock levels, low-stock warnings, and warehouse inventory.
- **Permission**: `ADMIN`, `STAFF`, `FINANCE`
- **Response (`200 OK`)**:
  ```json
  {
    "summary": {
      "totalStockItems": 450,
      "lowStockAlertCount": 4,
      "totalValuation": 34800.00
    },
    "stockLevels": [
      {
        "productId": "prod_kookaburra_ball",
        "name": "Kookaburra Turf Match Cricket Ball",
        "quantity": 40,
        "status": "OPTIMAL"
      }
    ]
  }
  ```

### 6.4 POST `/api/v1/inventory/stock-movements`
- **Purpose**: Log an adjustment, restocking, or write-off for audit tracking.
- **Permission**: `ADMIN`, `STAFF`
- **Request Body (`application/json`)**:
  ```json
  {
    "productId": "prod_head_speed",
    "movementType": "RESTOCK",
    "quantityChange": 10,
    "referenceDoc": "PO-2026-991",
    "notes": "Received batch of tennis rackets from distributor"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "movementId": "sm_8820",
    "productId": "prod_head_speed",
    "newQuantity": 12,
    "loggedAt": "2026-11-21T10:30:00Z"
  }
  ```

---

## 7. Pro Shop Orders Endpoints

### 7.1 POST `/api/v1/orders`
- **Purpose**: Create a point-of-sale order for pro shop merchandise.
- **Permission**: `ADMIN`, `STAFF`, `MEMBER`
- **Request Body (`application/json`)**:
  ```json
  {
    "memberId": "mem_01",
    "items": [
      { "productId": "prod_wilson_balls", "quantity": 2, "unitPrice": 8.99 }
    ],
    "discountAmount": 0.00,
    "paymentMethod": "CARD"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "orderId": "ord_shop_501",
    "orderNumber": "ORD-SHP-00501",
    "subtotal": 17.98,
    "tax": 1.44,
    "total": 19.42,
    "status": "COMPLETED",
    "createdAt": "2026-11-21T10:30:00Z"
  }
  ```

### 7.2 GET `/api/v1/orders`
- **Purpose**: List pro shop sales transactions.
- **Permission**: `ADMIN`, `STAFF`, `FINANCE`
- **Response (`200 OK`)**:
  ```json
  {
    "items": [
      {
        "orderId": "ord_shop_501",
        "orderNumber": "ORD-SHP-00501",
        "customerName": "Alexander Vance",
        "total": 19.42,
        "paymentStatus": "PAID",
        "createdAt": "2026-11-21T10:30:00Z"
      }
    ],
    "totalCount": 140,
    "page": 1,
    "pageSize": 20
  }
  ```

### 7.3 GET `/api/v1/orders/{id}`
- **Purpose**: Get receipt details for a sales order.
- **Permission**: `ADMIN`, `STAFF`, `FINANCE`
- **Response (`200 OK`)**:
  ```json
  {
    "orderId": "ord_shop_501",
    "orderNumber": "ORD-SHP-00501",
    "member": { "id": "mem_01", "name": "Alexander Vance" },
    "items": [
      { "name": "Wilson US Open Balls", "quantity": 2, "price": 8.99, "total": 17.98 }
    ],
    "subtotal": 17.98,
    "tax": 1.44,
    "total": 19.42,
    "paymentMethod": "CARD"
  }
  ```

---

## 8. Pavilion Cafeteria & Bar (POS) Endpoints

### 8.1 GET `/api/v1/cafe/tables`
- **Purpose**: View seating floor plan, active open tabs, and occupancy across Champions Club Pavilion.
- **Permission**: `ADMIN`, `STAFF`
- **Response (`200 OK`)**:
  ```json
  {
    "tables": [
      {
        "tableId": "tbl_01",
        "tableNumber": 1,
        "section": "Pavilion Terrace",
        "seats": 4,
        "status": "OCCUPIED",
        "currentOrderId": "cafe_ord_901",
        "currentTotal": 48.50
      },
      {
        "tableId": "tbl_03",
        "tableNumber": 3,
        "section": "Cricket Pavilion Bar",
        "seats": 2,
        "status": "OCCUPIED",
        "currentOrderId": "cafe_ord_902",
        "currentTotal": 22.00
      }
    ]
  }
  ```

### 8.2 POST `/api/v1/cafe/orders`
- **Purpose**: Open a new tab or append items to a cafeteria/bar order.
- **Permission**: `ADMIN`, `STAFF`
- **Request Body (`application/json`)**:
  ```json
  {
    "tableId": "tbl_01",
    "memberId": "mem_01",
    "items": [
      { "menuItemId": "cafe_protein_shake", "quantity": 2, "notes": "Almond milk" }
    ]
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "orderId": "cafe_ord_901",
    "tableId": "tbl_01",
    "status": "IN_PREPARATION",
    "totalAmount": 48.50
  }
  ```

### 8.3 GET `/api/v1/cafe/orders`
- **Purpose**: List active kitchen tickets and settled orders.
- **Permission**: `ADMIN`, `STAFF`
- **Response (`200 OK`)**:
  ```json
  {
    "activeOrders": [
      {
        "orderId": "cafe_ord_901",
        "tableNumber": 1,
        "itemCount": 3,
        "elapsedMinutes": 14,
        "status": "IN_PREPARATION"
      }
    ]
  }
  ```

### 8.4 POST `/api/v1/cafe/orders/{id}/settle`
- **Purpose**: Settle and close an open table tab.
- **Permission**: `ADMIN`, `STAFF`
- **Request Body (`application/json`)**:
  ```json
  {
    "paymentMethod": "MEMBER_ACCOUNT",
    "memberId": "mem_01",
    "tipAmount": 5.00
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "orderId": "cafe_ord_901",
    "status": "SETTLED",
    "finalAmount": 48.50,
    "settledAt": "2026-11-21T10:30:00Z"
  }
  ```

---

## 9. Finance & Invoicing Endpoints

### 9.1 GET `/api/v1/finance/reports`
- **Purpose**: Retrieve aggregated financial summaries (revenue breakdowns by memberships, tennis & cricket bookings, shop, cafe).
- **Permission**: `ADMIN`, `FINANCE`
- **Response (`200 OK`)**:
  ```json
  {
    "period": "MONTHLY",
    "startDate": "2026-11-01",
    "endDate": "2026-11-21",
    "grossRevenue": 48250.00,
    "breakdown": {
      "memberships": 28400.00,
      "courtBookings": 11200.00,
      "proShop": 5100.00,
      "cafeteria": 3550.00
    },
    "operatingExpenses": 18200.00,
    "netMargin": 30050.00
  }
  ```

### 9.2 GET `/api/v1/finance/invoices`
- **Purpose**: Query all generated member invoices.
- **Permission**: `ADMIN`, `FINANCE`
- **Response (`200 OK`)**:
  ```json
  {
    "items": [
      {
        "invoiceNumber": "INV-2026-1049",
        "memberName": "Alexander Vance",
        "issueDate": "2026-11-15",
        "dueDate": "2026-11-30",
        "amount": 850.00,
        "status": "PAID"
      }
    ],
    "totalCount": 84,
    "page": 1,
    "pageSize": 20
  }
  ```

---

## 10. Staff & Employees (HR) Endpoints

### 10.1 GET `/api/v1/employees`
- **Purpose**: List tennis coaches, cricket coaches, front desk agents, and pavilion staff.
- **Permission**: `ADMIN`
- **Response (`200 OK`)**:
  ```json
  {
    "items": [
      {
        "id": "emp_01",
        "fullName": "Carlos Silva",
        "role": "Head Tennis Coach",
        "department": "ATHLETICS",
        "email": "carlos.s@championsclub.com",
        "phone": "+1 (555) 303-9911",
        "employmentStatus": "ACTIVE"
      },
      {
        "id": "emp_02",
        "fullName": "Vikram Nair",
        "role": "Head Cricket Coach",
        "department": "ATHLETICS",
        "email": "vikram.n@championsclub.com",
        "phone": "+1 (555) 303-9915",
        "employmentStatus": "ACTIVE"
      }
    ]
  }
  ```

### 10.2 GET `/api/v1/employees/shifts`
- **Purpose**: View current and scheduled shift rosters across facilities.
- **Permission**: `ADMIN`, `STAFF`
- **Response (`200 OK`)**:
  ```json
  {
    "shifts": [
      {
        "shiftId": "sh_10",
        "employeeId": "emp_01",
        "employeeName": "Carlos Silva",
        "facility": "Tennis Courts",
        "startTime": "2026-11-21T08:00:00Z",
        "endTime": "2026-11-21T16:00:00Z"
      }
    ]
  }
  ```

### 10.3 POST `/api/v1/employees/leave-requests`
- **Purpose**: Submit a time-off or vacation request.
- **Permission**: `ADMIN`, `STAFF`
- **Request Body (`application/json`)**:
  ```json
  {
    "employeeId": "emp_01",
    "startDate": "2026-12-01",
    "endDate": "2026-12-05",
    "leaveType": "PAID_VACATION",
    "reason": "Annual rest period"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "requestId": "lvr_504",
    "status": "PENDING_APPROVAL",
    "submittedAt": "2026-11-21T10:30:00Z"
  }
  ```

---

## 11. CRM & Member Enquiries Endpoints

### 11.1 GET `/api/v1/enquiries`
- **Purpose**: List leads, prospect facility tour requests, and member enquiries.
- **Permission**: `ADMIN`, `STAFF`
- **Response (`200 OK`)**:
  ```json
  {
    "items": [
      {
        "id": "enq_201",
        "name": "Sarah Jenkins",
        "email": "sarah.j@example.com",
        "phone": "+1 (555) 789-1029",
        "interest": "Junior Tennis Academy & Gold Family Plan",
        "status": "NEW",
        "createdAt": "2026-11-21T09:15:00Z"
      }
    ],
    "totalCount": 18
  }
  ```

### 11.2 POST `/api/v1/enquiries`
- **Purpose**: Record a prospective lead or front-desk enquiry.
- **Permission**: Public (`Anonymous`) or `STAFF`
- **Request Body (`application/json`)**:
  ```json
  {
    "name": "Jordan Bell",
    "email": "jordan.b@example.com",
    "phone": "+1 (555) 674-1188",
    "interest": "Weekend Cricket League & Turf Pitch Booking",
    "source": "WEBSITE_CONTACT_FORM",
    "message": "Interested in pitch bookings and private cricket coaching."
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "id": "enq_202",
    "status": "NEW",
    "assignedTo": null,
    "createdAt": "2026-11-21T10:30:00Z"
  }
  ```

### 11.3 POST `/api/v1/enquiries/{id}/follow-ups`
- **Purpose**: Add sales or tour follow-up interaction notes to a lead.
- **Permission**: `ADMIN`, `STAFF`
- **Request Body (`application/json`)**:
  ```json
  {
    "actionType": "PHONE_CALL",
    "notes": "Discussed cricket turf booking rates. Scheduled pitch tour for Saturday 11am with Coach Vikram.",
    "nextFollowUpDate": "2026-11-23",
    "newStatus": "TOUR_SCHEDULED"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "followUpId": "fup_882",
    "enquiryId": "enq_202",
    "newStatus": "TOUR_SCHEDULED",
    "recordedAt": "2026-11-21T10:30:00Z"
  }
  ```

---

## 12. Approval Sign-Off Block

| Role | Name | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Frontend Architect** | Asim Maji | **SUBMITTED** | Proposed interface contracts aligned to Champions Club, Tennis & Cricket facilities, and Gold/Silver/Junior tiers. |
| **Backend Architect** | Saran | **PENDING REVIEW** | Awaiting review and FastAPI endpoint confirmation. |
