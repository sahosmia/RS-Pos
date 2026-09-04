# Task List — Sequential + Priority-based

> এই ফাইল `docs/TASKS.md`-এ রাখুন। প্রতিটা task-এর ✅ বক্স টিক দিয়ে commit করুন, তারপর পরের task দিন।

## ব্যবহারের নিয়ম (Token কম রাখতে)

- **একবারে একটা task দিন।** পুরো ফাইল Claude Code-কে paste করবেন না
- Task দেওয়ার সময় শুধু এইটুকু লিখলেই যথেষ্ট: *"Task 3.2 করো"* — CLAUDE.md থেকে standard, আর docs থেকে logic নিজেই পড়ে নেবে
- প্রতিটা task-এ যে পর্ব নম্বর (`erp-master-reference.md`) লেখা আছে, Claude Code সেটাই পড়বে — পুরো ডকুমেন্ট নয়
- একটা task খুব বড় মনে হলে, "শুধু migration+model" আর "শুধু frontend" আলাদা করে দুই turn-এ দিন
- Task শেষ হলে: `php artisan test` চালিয়ে confirm করুন, তারপর commit

---

## Phase 0 — Setup (একবারই)

- [x] **0.1** `laravel new erp-app --react` দিয়ে project তৈরি, git init
- [x] **0.2** `docs/` ফোল্ডারে তিনটা ফাইল রাখা: `erp-master-reference.md`, `erp-database-schema.md`, `erp-design-decisions.md`
- [x] **0.3** Project root-এ `CLAUDE.md` রাখা
- [x] **0.4** Auth scaffold verify করা (starter kit-এই থাকে) — login/register কাজ করছে কিনা test

---

## Phase 1 — Settings (পর্ব ১৪)

- [x] **1.1** `settings` migration + model + `SettingsSeeder` (একটাই row, সব default value সহ)
- [x] **1.2** Settings Page (tab: Business/Invoice/Modules) + form
- [x] **1.3** Invoice numbering helper function (`generateInvoiceNumber()`)

---

## Phase 2 — Accounts (পর্ব ৬)

- [x] **2.1** `account_types`, `accounts` migration+model + seeder (Cash, Bank, Mobile Banking, Cheque default)
- [x] **2.2** `account_transactions` migration+model (⚠️ `operation_date` field ভুলবেন না)
- [x] **2.3** `AccountService` class (`record()`, `recordSplitPayment()`)
- [x] **2.4** Account List Page + Add/Edit Modal (CRUD)
- [x] **2.5** `fund_transfers` migration + `FundTransferAction` + Modal UI
- [x] **2.6** Cash Book (standalone): `cash_book`, `cash_book_entries`, `misc_transaction_categories` migration + Action + Page
- [x] **2.7** Account Statement Page (running balance)
- [x] **2.8** Feature test: split payment ২টা account-এ সঠিকভাবে ভাগ হয়

---

## Phase 3 — Inventory (পর্ব ১)

- [x] **3.1** `categories`, `units`, `brands` migration+model (সব ছোট lookup)
- [x] **3.2** `products` migration+model (পূর্ণ field list পর্ব ১ থেকে) + `stock_movements` migration+model
- [x] **3.3** `StockService` class (`increase()`, `decrease()`)
- [x] **3.4** Product accessor: `stockStatus`, `profitMargin` (পর্ব ১৭.৫)
- [x] **3.5** Product List Page (Datatable) + Add/Edit Page (৪ সেকশন ফর্ম)
- [x] **3.6** Stock Adjustment Modal + Action
- [x] **3.7** Opening Stock flow (একবারই সেট, `NoExistingMovementsRule` দিয়ে গার্ড করা)
- [x] **3.8** Category/Unit/Brand Modal CRUD + quick-add "+" পাশে
- [x] **3.9** Product image upload (`spatie/laravel-medialibrary`)
- [x] **3.10** Feature test: opening stock একবারের বেশি দেওয়া গেলে reject হয়

---

## Phase 4 — Contacts (পর্ব ২)

- [x] **4.1** `customer_groups`, `contacts`, `contact_ledger` migration+model
- [x] **4.2** Phone/email mutator (normalize)
- [x] **4.3** `LedgerService` class (`recordContact()`)
- [x] **4.4** Contact List Page (`?type=` filter) + Add/Edit Modal
- [x] **4.5** Contact Detail Page (Tab: Ledger/Purchases/Sales/Documents/Payments)
- [x] **4.6** Pay Due Amount Modal
- [x] **4.7** Bulk select toolbar (Export, Delete guarded by history check)

---

## Phase 5 — Purchase (পর্ব ৩)

- [x] **5.1** `purchases`, `purchase_items` migration+model (status: draft/ordered/received/cancelled)
- [x] **5.2** `ConfirmPurchaseAction` (StockService + weighted avg_cost recalculation একসাথে)
- [x] **5.3** Purchase List Page + Add/Edit Page (multi-item form)
- [x] **5.4** Add Payment Modal + Supplier Credit Auto-apply logic
- [x] **5.5** Purchase Detail/Print Page
- [x] **5.6** Feature test: purchase confirm হলে avg_cost সঠিকভাবে recalculate হয়

---

## Phase 6 — Sales (পর্ব ৪) ⭐ সবচেয়ে গুরুত্বপূর্ণ module

- [x] **6.1** `sales`, `sale_items`, `sale_item_serials` migration+model
- [x] **6.2** `ConfirmSaleAction` (StockService + LedgerService + AccountService একসাথে, একই transaction-এ)
- [ ] **6.3** Sales List Page (draft/quotation/confirmed filter)
- [ ] **6.4** Add Sale Page — Customer সেকশন (বকেয়া দেখানো + সাম্প্রতিক কেনা)
- [ ] **6.5** Add Sale Page — Product সেকশন (`ProductSearchInput` shared component)
- [ ] **6.6** Add Sale Page — Payment সেকশন (`AccountPaymentRows` shared component)
- [ ] **6.7** ৩-স্তরের Discount (item/invoice/ledger)
- [ ] **6.8** Historical Record checkbox (`source = imported`, পর্ব ২১.১)
- [ ] **6.9** Keyboard shortcuts (F2/F4/Enter/Esc)
- [ ] **6.10** ৩০-সেকেন্ড Undo toast
- [ ] **6.11** Invoice Print Page (A4)
- [x] **6.12** Feature test: sale confirm করলে stock কমে, ledger+account একসাথে আপডেট হয়

---

## Phase 7 — Returns (পর্ব ৫)

- [ ] **7.1** `sale_returns`, `sale_return_items`, `purchase_returns`, `purchase_return_items` migration+model
- [ ] **7.2** `CreateSaleReturnAction` / `CreatePurchaseReturnAction` (`ReturnQuantityWithinSoldRule` দিয়ে validate)
- [ ] **7.3** Return List + Create Return Page
- [ ] **7.4** Refund Payment Modal

---

## Phase 8 — Sales Order (পর্ব ২১)

- [ ] **8.1** `sales_orders`, `sales_order_items` migration+model
- [ ] **8.2** `ConvertSalesOrderToSaleAction`
- [ ] **8.3** Sales Order List + Add Page

---

## Phase 9 — Expense 🟡 (design পুনর্বিবেচনার অপেক্ষায়)

- [ ] **9.1** `expense_categories`, `expenses` migration+model
- [ ] **9.2** Expense List Page + Add/Edit Modal + Payment Modal

---

## Phase 10 — Asset/Loan/Investor/Liability (পর্ব ৮)

- [ ] **10.1** `HasLedger` trait তৈরি (পর্ব ১৭.৩)
- [ ] **10.2** `assets`, `asset_transactions` migration+model (trait ব্যবহার করে)
- [ ] **10.3** `company_loans`, `loan_transactions` migration+model
- [ ] **10.4** `investors`, `investor_transactions` migration+model
- [ ] **10.5** `other_liabilities`, `other_liability_transactions` migration+model
- [ ] **10.6** চারটার জন্য একই প্যাটার্নের List+Detail+Add Transaction Page/Modal
- [ ] **10.7** Feature test: `HasLedger` trait সঠিকভাবে balance recalculate করে

---

## Phase 11 — Staff (পর্ব ৯)

- [ ] **11.1** `staff`, `staff_transaction_types` (seeded), `staff_ledger` migration+model
- [ ] **11.2** Staff List + Add/Edit Page + Ledger Detail Page
- [ ] **11.3** Add Transaction Modal

---

## Phase 12 — Warranty & Service (পর্ব ১০)

- [ ] **12.1** `service_plan_templates`, `sale_item_service_periods` migration+model
- [ ] **12.2** `warranty_claims`, `service_requests` migration+model
- [ ] **12.3** Service Plan Template — Product form-এর ভিতরে UI
- [ ] **12.4** `isCurrent` accessor + free-quota check logic
- [ ] **12.5** Service Request List/Create Page + Warranty Claims Page

---

## Phase 13 — EMI & Serial (পর্ব ১১)

- [ ] **13.1** Two-level toggle (`settings.emi_module_enabled` + `products.emi_available`)
- [ ] **13.2** `emi_installments` migration+model + কিস্তি জেনারেশন logic
- [ ] **13.3** `sale_item_serials` migration+model (optional entry)
- [ ] **13.4** EMI List Page + Payment Modal
- [ ] **13.5** Daily overdue-check scheduled job

---

## Phase 14 — Import Tools (পর্ব ২)

- [ ] **14.1** Import Products/Contacts (`maatwebsite/excel`)
- [ ] **14.2** Import Opening Stock
- [ ] **14.3** Import Sales (`source = imported`, stock/ledger touch হবে না)
- [ ] **14.4** Import file cleanup (job শেষে delete)

---

## Phase 15 — Dashboard & Reports (পর্ব ১২)

- [ ] **15.1** Dashboard Quick Actions (permission-filtered)
- [ ] **15.2** Dashboard Summary Cards
- [ ] **15.3** Profit & Loss Report + `INDEX(sale_date, status)` কম্পোজিট ইনডেক্স
- [ ] **15.4** Balance Sheet (quick) + Financial Position (full) + Trial Balance
- [ ] **15.5** Cash Flow, Stock Report, Due Report, Trending Products
- [ ] **15.6** Fiscal Year filter (`fiscal_year_start_month`)

---

## Phase 16 — UI Polish (পর্ব ১৬)

- [ ] **16.1** Light/Dark mode (design token setup)
- [ ] **16.2** Global Search (Cmd+K)
- [ ] **16.3** Mobile Datatable → Card view fallback
- [ ] **16.4** Mobile Sale form → cart-style flow

---

## Phase 17 — Notification, Activity Log, Backup, Marketing (পর্ব ১৫)

- [ ] **17.1** `activity_logs` (spatie/laravel-activitylog) + retention job (dropdown setting)
- [ ] **17.2** `notifications` + daily scheduled job (Low Stock/Due/EMI Overdue)
- [ ] **17.3** `message_logs`, `campaigns`, `campaign_recipients` migration+model
- [ ] **17.4** Contact bulk-select → Send Notification Modal
- [ ] **17.5** Backup Now বাটন (spatie/laravel-backup)

---

## Phase 18 — Role & Permission (পর্ব ১৩) ⚠️ সবার শেষে

- [ ] **18.1** `spatie/laravel-permission` setup + default role/permission seeder
- [ ] **18.2** Role/Permission Management Page (checkbox grid)
- [ ] **18.3** `view_own` / `view_all` scope enforcement (Sale/Purchase)
- [ ] **18.4** Sidebar dynamic filtering per permission

---

## পরে (Optional, এখন করবেন না)

- [ ] Invoice Template System (পর্ব ২১.২)
- [ ] AI Assistant (পর্ব ২১.৩)
- [ ] বহুভাষা (পর্ব ২১.৪)
- [ ] Register/Till Session
- [ ] Offline Mode / PWA
