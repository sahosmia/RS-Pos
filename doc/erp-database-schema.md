# সম্পূর্ণ Database Schema — সব টেবিল একত্রে

এই ফাইলে প্রতিটা টেবিলের সব field একসাথে দেওয়া আছে (অনেক টেবিলের field ধাপে ধাপে যোগ হয়েছিল মূল ডকুমেন্টে — এখানে সব একত্র করা হলো)। বিস্তারিত ব্যাখ্যা ও business logic-এর জন্য `erp-design-decisions.md` দেখুন।

---

## Inventory

```
categories
- id
- name
- parent_id            (nullable, self-referencing — sub-category)

units
- id
- name                 (Pc, Kg, Box, Litre...)

brands
- id
- name

products
- id
- name
- sku                   (unique)
- barcode                (nullable, unique)
- category_id            (FK)
- brand_id                (nullable, FK)
- unit_id                  (FK)
- avg_cost                  (weighted average cost, cached)
- selling_price
- current_stock              (cached)
- minimum_stock_level
- manage_stock                boolean, default true
- is_for_sale                  boolean, default true
- is_active                     boolean, default true
- warranty_period_months        nullable
- has_installation_service       boolean, default false
- emi_available                   boolean, default false
- track_serial_number              boolean, default false
- created_by, created_at

stock_movements
- id
- product_id
- type                 enum('opening_stock','purchase','sale','sale_return','purchase_return','adjustment_increase','adjustment_decrease')
- quantity
- reason/note
- reference_id
- created_by, created_at
```
Product images/brochure use `spatie/laravel-medialibrary` (polymorphic `media` table from the package — no custom column needed).

---

## Contacts

```
customer_groups
- id
- name

contacts
- id
- name
- phone                 (mutator-normalized)
- email                  (mutator-normalized, nullable)
- address
- shipping_address        (nullable)
- type                     enum('customer','supplier','both')
- entity_type               enum('individual','business')
- business_name               (nullable)
- customer_group_id
- balance                       (cached, + = they owe us, − = we owe them)
- is_active
- created_by, created_at

contact_ledger
- id
- contact_id
- type                 enum('opening_balance','sale_invoice','purchase_bill','payment_received','payment_made','adjustment','sale_return','purchase_return','discount_waived','expense_due','sales_order_advance','credit_applied')
- amount
- reference_id
- note
- created_by, created_at
```
Contact documents use `spatie/laravel-medialibrary`; free-text notes use the polymorphic `notes` table (below).

---

## Purchase

```
purchases
- id
- supplier_id
- invoice_no
- purchase_date
- total_amount
- paid_amount
- due_amount
- payment_status        enum('due','partial','paid')
- status                 enum('draft','ordered','received','cancelled')
- created_by

purchase_items
- id
- purchase_id
- product_id
- quantity
- unit_price
- subtotal

purchase_returns
- id
- purchase_id
- supplier_id
- return_date
- total_amount
- reason
- created_by

purchase_return_items
- id
- purchase_return_id
- product_id
- quantity
- unit_price
- subtotal
```

---

## Sales

```
sales
- id
- customer_id
- invoice_no
- sale_date
- subtotal
- discount_type          enum('flat','percentage')
- discount_value
- discount_amount
- total_amount
- paid_amount
- due_amount
- payment_status          enum('due','partial','paid')
- status                   enum('draft','quotation','confirmed','cancelled')
- source                    enum('manual','imported')
- delivery_status             enum('pending','delivered')
- delivered_at
- valid_until                  (nullable — quotation validity)
- payment_type                  enum('cash','emi')
- sales_order_id                 (nullable, FK — if converted from a Sales Order)
- created_by

sale_items
- id
- sale_id
- product_id
- quantity
- original_price          (products.selling_price snapshot)
- unit_price
- discount_amount
- cost_at_sale               (avg_cost snapshot, for profit calc)
- subtotal
- installation_required
- installation_charge          (nullable, manual entry)
- warranty_expires_at            (nullable, snapshotted)
- note                             (nullable)

sale_item_serials
- id
- sale_item_id
- serial_number

sale_returns
- id
- sale_id
- customer_id
- return_date
- total_amount
- reason
- created_by

sale_return_items
- id
- sale_return_id
- product_id
- quantity
- unit_price
- subtotal

sales_orders
- id
- customer_id
- order_no
- order_date
- expected_delivery_date
- status              enum('pending','partial','completed','cancelled')
- total_amount
- advance_paid
- created_by

sales_order_items
- id
- sales_order_id
- product_id
- quantity
- unit_price
- subtotal

emi_installments
- id
- sale_id
- installment_number
- due_date
- amount
- paid_amount
- status               enum('pending','paid','overdue')
- paid_at
- account_id
```

---

## Accounts (Cash/Bank/Mobile Banking/Cheque)

```
account_types
- id
- name                 (Cash, Bank, Mobile Banking, Cheque — seeded defaults, extensible)

accounts
- id
- name
- account_type_id
- account_sub_type        (nullable, e.g. "Bkash Agent", "Nagad")
- account_number             (nullable, encrypted)
- opening_balance
- current_balance
- is_active                    boolean, default true — "Close" an account instead of deleting it once it holds transactions
- created_by

account_transactions
- id
- account_id
- type                 enum('opening_balance','sale_payment','purchase_payment','sale_return_refund','purchase_return_refund','expense','adjustment','transfer_in','transfer_out','loan_received','loan_repayment','asset_purchase','asset_sale','investment_received','profit_distribution','investor_withdrawal','sales_order_advance','service_charge','staff_salary_payment','staff_advance','staff_loan','emi_payment')
- amount
- reference_type, reference_id
- operation_date         (authoritative business date for all reports — distinct from created_at)
- note
- register_session_id    (nullable — deferred feature, not built now)
- created_by, created_at

fund_transfers
- id
- from_account_id
- to_account_id
- amount
- transfer_date
- note
- created_by
```

## Cash Book (fully standalone — excluded from Financial Position)

```
misc_transaction_categories
- id
- name                 ("Convence", "Lunch/Nasta", "Tips", "Extra Income")
- type                  enum('income','expense')

cash_book              -- single-row header, cached balance
- id (always 1)
- current_balance

cash_book_entries
- id
- type                 enum('opening_balance','income','expense')
- category_id           (nullable — null for opening_balance)
- amount
- note
- entry_date
- created_by
```
Does NOT tie to any `accounts` row or create `account_transactions` — deliberately excluded from Balance Sheet/Financial Position, an informal side-ledger only.

---

## Expense

```
expense_categories
- id
- name

expenses
- id
- expense_category_id
- contact_id             (nullable)
- total_amount
- paid_amount              (cached, derived from linked account_transactions)
- due_amount
- payment_status              enum('due','partial','paid')
- expense_date
- note
- created_by
```

---

## Assets, Loan, Investor, Other Liability

```
assets
- id
- name
- category               (nullable)
- opening_value
- current_value             (cached)
- purchase_date
- created_by

asset_transactions
- id
- asset_id
- type                 enum('opening_asset','purchase','addition','sold','disposal')
- amount
- account_id             (nullable)
- note
- created_by

company_loans
- id
- lender_name
- loan_amount
- interest_rate          (nullable, informational — no auto-calculation)
- outstanding_balance
- start_date
- created_by

loan_transactions
- id
- company_loan_id
- type                 enum('disbursement','repayment','interest_charge','adjustment')
- amount
- account_id             (nullable — null for interest_charge)
- note
- created_by

investors
- id
- name
- total_invested          (cached)
- created_by

investor_transactions
- id
- investor_id
- type                 enum('investment','profit_share','withdrawal','adjustment')
- amount
- account_id
- note
- created_by

other_liabilities
- id
- name
- opening_amount
- current_balance         (cached)
- created_by

other_liability_transactions
- id
- other_liability_id
- type                 enum('opening_liability','increase','payment','adjustment')
- amount
- account_id             (nullable)
- note
- created_by
```

---

## Staff & Access Control

```
staff
- id
- name
- phone
- address
- designation
- joining_date
- salary_amount
- status                 enum('active','inactive')
- investor_id              (nullable, FK)
- user_id                    (nullable, FK — not every staff member logs in)
- balance                      (cached)
- created_by

staff_transaction_types    -- lookup table, replaces fixed enum; seeded defaults: Salary Charge, Salary Payment, Advance Given, Loan Given, Adjustment
- id
- name
- effect_on_balance         enum('increase','decrease')

staff_ledger
- id
- staff_id
- staff_transaction_type_id     (FK)
- amount                          (always positive; sign applied via the type's effect_on_balance)
- account_id                        (nullable)
- reference_id
- note
- created_by

users
- id
- name, email, password
- theme_preference        enum('light','dark','system')
- sales_commission_percentage    (nullable)
- max_sales_discount_percent       (nullable)

roles
- id
- name

permissions
- id
- name                 (e.g. "sale.view_own", "sale.view_all", "product.create"...)
- module

role_permissions        (pivot)
- role_id, permission_id

user_roles              (pivot — many-to-many)
- user_id, role_id
```

---

## Warranty & Service

```
service_plan_templates
- id
- product_id
- period_number         (1, 2, 3... sequential)
- period_months
- free_quota

sale_item_service_periods
- id
- sale_item_id
- period_number
- period_months
- free_quota
- period_start_date       (computed at sale time)
- period_end_date

service_requests
- id
- sale_item_id
- request_date
- service_date             (nullable)
- type                        enum('installation','service')
- is_free
- charge_amount
- account_id                   (nullable)
- staff_id                       (nullable)
- status                           enum('pending','scheduled','completed','cancelled')
- note
- created_by

warranty_claims
- id
- sale_item_id
- claim_date
- issue_description
- status                 enum('pending','in_progress','resolved','rejected')
- resolution_note
- created_by
```

---

## Notification, Marketing & Audit

```
notifications
- id
- type                 enum('low_stock','due_payment','loan_repayment','expense_due')
- title, message
- reference_type, reference_id
- is_read
- created_at

message_logs
- id
- contact_id
- channel                 enum('sms','whatsapp','email')
- subject                   (nullable, email only)
- message
- status                       enum('sent','failed','pending')
- reference_type, reference_id
- attachment_type              (nullable, e.g. 'ledger_pdf')
- attachment_path
- sent_at
- created_by

campaigns
- id
- title, message
- channel                 enum('sms','whatsapp','email')
- target_type               enum('all_customers','customer_group','custom_selection')
- target_group_id
- status                       enum('draft','sending','completed','failed')
- created_by, created_at

campaign_recipients
- id
- campaign_id
- contact_id
- status                 enum('pending','sent','failed')
- sent_at
- UNIQUE(campaign_id, contact_id)   -- prevents duplicate sends

notes                    (polymorphic — Contact, User, etc.)
- id
- notable_type, notable_id
- note
- created_by

activity_logs
- id
- user_id
- action                 enum('created','updated','deleted')
- model_type, model_id
- old_values, new_values    (JSON)
- ip_address
- created_at
```

---

## Settings (single row)

```
settings
- id (always 1)
- shop_name, shop_logo, shop_address, shop_phone
- currency_symbol
- invoice_prefix, invoice_next_number
- purchase_prefix, purchase_next_number
- thermal_printer_enabled          boolean, default false
- emi_module_enabled                 boolean, default false
- serial_number_module_enabled         boolean, default false
- fiscal_year_start_month                integer 1-12, default 7
- license_key                              (encrypted)
- license_status
- license_last_verified_at
- updated_by
```

---

## Invoice Template, AI Assistant, Multi-language

```
invoice_templates
- id
- name                    ("Classic", "Modern", "Minimal")
- type                     enum('a4','thermal')
- is_default
- show_logo, show_signature_line, show_terms, show_qr_code   (booleans)
- header_note, footer_note, terms_text                        (nullable)
- accent_color
- created_by

ai_conversations
- id
- user_id
- title                   (auto-generated from first question)
- created_at

ai_messages
- id
- ai_conversation_id
- role                    enum('user','assistant')
- content
- tool_calls               (nullable JSON — which tool was called, for audit)
- created_at

users
- ...
- locale                  enum('en','bn'), default 'bn'
```

---

## Deferred / Not Yet Built (designed, but intentionally postponed)

```
register_sessions          -- daily cash reconciliation, deferred (Phase 23)
- id, account_id, opened_by, closed_by
- opening_balance, expected_closing_balance, actual_closing_balance, discrepancy_amount
- status enum('open','closed'), opened_at, closed_at, note
```

## On the Vendor's Own License Server (NOT part of the ERP's own database)

```
licenses
- id, license_key, customer_name, domain, server_fingerprint
- status enum('pending','active','suspended','expired')
- issued_at, expires_at, last_checked_at
```

---

*এই ফাইলটা শুধু schema reference — business logic, transaction flow, ও কারণ-ব্যাখ্যার জন্য `erp-design-decisions.md` দেখুন।*
