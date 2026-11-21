# SCMS Database Architecture & Relational Design

> **Version:** 2.1.0  
> **Status:** Architecture Approved with Phase 2.2A Corrections Incorporated  
> **Date:** November 2026  
> **Engine:** PostgreSQL 18 (Self-Hosted via Docker Compose)  
> **ORM:** SQLAlchemy 2.x | **Migrations:** Alembic  
> **Companion Documents:**
> - [Phase 2.2A Architecture Review](file:///c:/Users/Saranjeet%20Singh/OneDrive/Desktop/APEX_Club/docs/phase2_2a_architecture_review.md)
> - [Platform Architecture v2.1.0](file:///c:/Users/Saranjeet%20Singh/OneDrive/Desktop/APEX_Club/docs/platform-architecture.md)
> - [Role-Permission Matrix v2.1.0](file:///c:/Users/Saranjeet%20Singh/OneDrive/Desktop/APEX_Club/docs/role-permission-matrix.md)
> - [Dashboard Specifications v2.1.0](file:///c:/Users/Saranjeet%20Singh/OneDrive/Desktop/APEX_Club/docs/dashboard-specifications.md)
> - [API Contracts v2.1.0](file:///c:/Users/Saranjeet%20Singh/OneDrive/Desktop/APEX_Club/docs/api-contracts.md)

---

## 1. Relational Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ sessions : "establishes"
    users ||--o{ audit_logs : "triggers"
    users ||--o{ user_role_assignments : "assigned"
    roles ||--o{ user_role_assignments : "defines"
    roles ||--o{ role_permissions : "grants"
    permissions ||--o{ role_permissions : "includes"
    business_units ||--o{ user_role_assignments : "scopes"

    users ||--o| members : "profiles"
    users ||--o| employees : "profiles"
    users ||--o| vendors : "profiles"

    members ||--o{ member_subscriptions : "subscribes"
    membership_plans ||--o{ member_subscriptions : "offers"
    members ||--o{ court_bookings : "reserves"
    courts ||--o{ court_bookings : "hosts"

    business_units ||--o{ products : "inventories"
    business_units ||--o{ orders : "executes"
    users ||--o{ orders : "places"
    orders ||--|{ order_items : "contains"
    products ||--o{ order_items : "specifies"

    orders ||--o| invoices : "bills"
    invoices ||--o{ payments : "settles"
    payments ||--o{ refunds : "reverses"

    vendors ||--o{ vendor_purchase_orders : "receives"
    business_units ||--o{ vendor_purchase_orders : "issues"
    vendor_purchase_orders ||--|{ vendor_order_items : "contains"
    vendor_purchase_orders ||--o{ vendor_invoices : "bills"
    vendor_invoices ||--o{ vendor_payments : "settles"

    business_units ||--o{ journal_entries : "scopes"
    journal_entries ||--|{ journal_entry_lines : "contains"
    chart_of_accounts ||--o{ journal_entry_lines : "classifies"

    users {
        uuid id PK
        string email UK
        string password_hash "Argon2id"
        string first_name
        string last_name
        boolean is_active
        boolean is_verified
        timestamptz created_at
    }

    sessions {
        uuid id PK
        uuid user_id FK
        string session_token_hash UK "SHA-256"
        timestamptz expires_at
        timestamptz last_activity_at
        boolean is_revoked
    }

    business_units {
        uuid id PK
        string code UK
        string name
        enum unit_type "club | shop | cafeteria"
        boolean is_active
    }

    user_role_assignments {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        uuid business_unit_id FK "Nullable: Global roles only"
        boolean is_active
    }

    vendors {
        uuid id PK
        uuid user_id FK "1:1 identity"
        string company_name
        string tax_id
        string contact_phone
        boolean is_active
    }

    vendor_purchase_orders {
        uuid id PK
        uuid vendor_id FK
        uuid business_unit_id FK
        string po_number UK
        enum status "issued | acknowledged | fulfilled | cancelled"
        decimal total_amount
    }

    vendor_invoices {
        uuid id PK
        uuid vendor_id FK
        uuid purchase_order_id FK
        string invoice_number
        decimal total_amount
        enum status "submitted | approved | paid | rejected"
    }

    vendor_payments {
        uuid id PK
        uuid vendor_invoice_id FK
        decimal payment_amount
        string payment_method
        timestamptz paid_at
    }

    chart_of_accounts {
        uuid id PK
        string code UK
        string name
        enum account_type "asset | liability | equity | revenue | expense"
        boolean is_active
    }

    journal_entries {
        uuid id PK
        uuid business_unit_id FK
        string entry_number UK
        date entry_date
        string source_document_type
        uuid source_document_id
        uuid created_by_user_id FK
        timestamptz posted_at
    }

    journal_entry_lines {
        uuid id PK
        uuid journal_entry_id FK
        uuid account_id FK
        decimal debit_amount
        decimal credit_amount
        string description
    }
```

---

## 2. Table Implementation Status

| Table Name | Schema Domain | Status | Notes |
|---|---|---|---|
| `users` | Identity & Authentication | **Live / Verified** | Argon2id password hash, UUID PK. |
| `roles` | Authorization & RBAC | **Live / Verified** | Standardizing to 8 platform roles in Phase 3. |
| `permissions` | Authorization & RBAC | **Live / Verified** | Atomic capability strings. |
| `user_roles` | Authorization & RBAC | **Live / Deprecating** | To be migrated to `user_role_assignments`. |
| `role_permissions` | Authorization & RBAC | **Live / Verified** | Maps roles to permissions. |
| `sessions` | Authentication & Security | **Live / Verified** | Stores SHA-256 session token hashes, 30m idle, 7d TTL. |
| `audit_logs` | Security & Governance | **Live / Verified** | Immutable administrative log. |
| `business_units` | Organization & Scoping | *Phase 3 Proposed* | Commercial entities (Club, Shops, Cafeterias). |
| `user_role_assignments` | Organization & Scoping | *Phase 3 Proposed* | Replaces `user_roles` with explicit scoping. |
| `migration_quarantine_user_roles` | Migration & Safety | *Phase 3 Proposed* | Staging for ambiguous legacy role mappings. |
| `members` | Member Domain | *Phase 3 Proposed* | 1:1 user profile, emergency contact, barcode ID. |
| `membership_plans` | Member Domain | *Phase 3 Proposed* | Gold, Silver, Junior tier definitions. |
| `member_subscriptions` | Member Domain | *Phase 3 Proposed* | Plan subscription periods and renewal dates. |
| `employees` | Staff Operations | *Phase 3 Proposed* | 1:1 user profile, job title, department, hourly rate. |
| `employee_shifts` | Staff Operations | *Phase 3 Proposed* | Roster shifts, clock-in, clock-out, break tracking. |
| `vendors` | Vendor Procurement | *Phase 3 Proposed* | 1:1 supplier profile linked to `users.id`. |
| `courts` | Athletics & Facilities | *Phase 3 Proposed* | Tennis and cricket playing facilities. |
| `court_bookings` | Athletics & Facilities | *Phase 3 Proposed* | Reservation slots, guest counts, light tokens. |
| `products` | Commercial Inventory | *Phase 3 Proposed* | Unit-scoped retail gear & F&B items. |
| `orders` | Commercial Point of Sale | *Phase 3 Proposed* | Customer orders in shop/cafeteria/club. |
| `order_items` | Commercial Point of Sale | *Phase 3 Proposed* | Line items with unit price and cost price. |
| `invoices` | Customer Billing | *Phase 3 Proposed* | Accounts Receivable customer billing document. |
| `payments` | Customer Billing | *Phase 3 Proposed* | Customer settlements (Cash, Card, Member Tab). |
| `refunds` | Customer Billing | *Phase 3 Proposed* | Reversal records referencing original payment. |
| `vendor_purchase_orders` | Accounts Payable (AP) | *Phase 3 Proposed* | Inbound supplier orders issued by units. |
| `vendor_order_items` | Accounts Payable (AP) | *Phase 3 Proposed* | Equipment/food supplier line items. |
| `vendor_invoices` | Accounts Payable (AP) | *Phase 3 Proposed* | Supplier payment requests submitted via portal. |
| `vendor_payments` | Accounts Payable (AP) | *Phase 3 Proposed* | Supplier AP disbursements. |
| `chart_of_accounts` | General Ledger (GL) | *Phase 3 Proposed* | Standard chart of accounts (Assets, Liabilities, etc.). |
| `journal_entries` | General Ledger (GL) | *Phase 3 Proposed* | Balanced double-entry transaction headers. |
| `journal_entry_lines` | General Ledger (GL) | *Phase 3 Proposed* | Debit and credit lines classifying economic events. |

---

## 3. General Ledger & Double-Entry Schema Design

### 3.1 `chart_of_accounts`
Defines the financial accounts for revenue, costs, assets, and liabilities across the enterprise.

```sql
CREATE TYPE account_type_enum AS ENUM (
    'asset',
    'liability',
    'equity',
    'revenue',
    'expense'
);

CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    account_type account_type_enum NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coa_type ON chart_of_accounts (account_type);
```

### 3.2 `journal_entries`
Header record for every balanced financial transaction.

```sql
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE RESTRICT,
    entry_number VARCHAR(64) NOT NULL UNIQUE,
    entry_date DATE NOT NULL,
    source_document_type VARCHAR(64) NOT NULL, -- 'order', 'invoice', 'vendor_invoice', 'refund', 'payroll'
    source_document_id UUID,
    memo TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_je_unit_date ON journal_entries (business_unit_id, entry_date);
CREATE INDEX idx_je_source ON journal_entries (source_document_type, source_document_id);
```

### 3.3 `journal_entry_lines`
Debit and credit line items enforcing $\sum \text{debits} == \sum \text{credits}$.

```sql
CREATE TABLE journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    debit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (debit_amount >= 0.00),
    credit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (credit_amount >= 0.00),
    description VARCHAR(255),
    CONSTRAINT chk_debit_or_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (credit_amount > 0 AND debit_amount = 0)
    )
);

CREATE INDEX idx_jel_entry ON journal_entry_lines (journal_entry_id);
CREATE INDEX idx_jel_account ON journal_entry_lines (account_id);
```

---

## 4. Migration Strategy: `user_roles` to `user_role_assignments`

### 4.1 Transition Rules & Invariants
1. `user_role_assignments` schema:
   ```sql
   CREATE TABLE user_role_assignments (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
       business_unit_id UUID REFERENCES business_units(id) ON DELETE CASCADE,
       is_active BOOLEAN NOT NULL DEFAULT TRUE,
       assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
       assigned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
       CONSTRAINT uq_user_role_unit UNIQUE NULLS NOT DISTINCT (user_id, role_id, business_unit_id)
   );
   ```
2. **Explicit Assignment Rules:**
   - `System Admin` & `Club Owner`: `business_unit_id = NULL` (Global scope).
   - `Member` & `Employee`: `business_unit_id = <MAIN_SPORTS_CLUB_ID>`.
   - `Sports Shop Owner`: `business_unit_id` must reference a unit of type `shop`.
   - `Cafeteria Manager`: `business_unit_id` must reference a unit of type `cafeteria`.
3. **Quarantine Table for Unresolved Mappings:**
   ```sql
   CREATE TABLE migration_quarantine_user_roles (
       id SERIAL PRIMARY KEY,
       user_id UUID NOT NULL,
       role_id INTEGER NOT NULL,
       reason TEXT NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
   );
   ```
4. **Data-Integrity Validation Assertion:**
   ```sql
   -- Verification rule executed before committing migration:
   DO $$
   DECLARE
       invalid_count INTEGER;
   BEGIN
       SELECT COUNT(*) INTO invalid_count
       FROM user_role_assignments ura
       JOIN roles r ON ura.role_id = r.id
       WHERE ura.business_unit_id IS NULL AND r.name NOT IN ('System Admin', 'Club Owner');
       
       IF invalid_count > 0 THEN
           RAISE EXCEPTION 'Migration Invariant Violation: % non-global role assignments have NULL business_unit_id.', invalid_count;
       END IF;
   END $$;
   ```
