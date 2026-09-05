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
- [x] **0.2** `docs/` ফোল্ডারে ফাইল রাখা: `erp-master-reference.md`, `erp-database-schema.md`, `erp-design-decisions.md`
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

⚠️ **এই Phase Chart of Accounts আসার আগে বানানো হয়েছিল — নিচের Phase 2.5 শেষে `FundTransferAction`-এ Journal posting retrofit করতে হবে (task 2.5.16), আর `StockService`-এ concurrency lock (task 2.5.10)।**

---

## Phase 2.5 — Chart of Accounts + Journal Entry, Architecture V2 (পর্ব ৬.৫ + Phase 35) ⭐⭐⭐ এখন সবচেয়ে জরুরি

> **এই Phase দুইবার আপডেট হয়েছে** — প্রথমে Chart of Accounts যোগ হলো (Phase 2/5/6 তার আগেই বানানো হয়ে গিয়েছিল), তারপর একটা external architecture review-এর পর আরও কিছু গুরুত্বপূর্ণ fix (V2) যোগ হলো। **এখনো এই Phase শুরুই হয়নি**, তাই বেশিরভাগ V2 fix সরাসরি বসিয়ে দেওয়া যাচ্ছে, কোনো retrofit-এর retrofit ছাড়াই — শুধু ৩টা জিনিস (Serial Number, Backup, `financing_type` rename) আগে থেকেই বানানো ছিল বলে retrofit লাগবে।

### ধাপ ০ — সবার আগে (V2 P0 fix, Chart of Accounts-এর আগেই করা উচিত)
- [x] **2.5.0a** RETROFIT — Phase 2/5/6-এ যত migration আছে, সবকটাতে টাকার সব column (amount, price, balance, total, subtotal, paid_amount, due_amount ইত্যাদি) float/double-এর বদলে decimal(19,4) কিনা check করুন, না থাকলে নতুন migration দিয়ে ঠিক করুন। এটা এখনই ঠিক না করলে পরে করাই কঠিন হয়ে যাবে — কোনো column float/double ছিল না, সবই decimal(15,2); একটা নতুন migration (`widen_money_columns_to_decimal_19_4`) দিয়ে MySQL-এ রॉ `MODIFY COLUMN` দিয়ে decimal(19,4)-এ widen করা হয়েছে (SQLite driver-এ no-op, ওখানে fixed-precision decimal নেই)। Phase 2/5/6-এর সাথে এই একই পাসে ইতিমধ্যে বানানো `chart_of_accounts.balance`/`journal_entry_lines.debit,credit`-ও widen করা হয়েছে (স্কোপের বাইরে না রেখে, যেহেতু ওগুলোও money এবং একই V1 পাসে বানানো)। `contacts.balance`/`contact_ledger.amount` (Phase 4) ইচ্ছাকৃতভাবে বাদ — task-এর স্কোপ শুধু Phase 2/5/6
- [x] **2.5.0b** php artisan migrate:fresh --seed (এই ধাপের পর, decimal fix reflect করতে) — reset করে column type verify করা হয়েছে ও পুরো test suite (১২৬টা) আবার pass করেছে

### ধাপ ১ — Chart of Accounts + Journal Entry কাঠামো
- [x] **2.5.1** chart_of_accounts migration+model + default seeder — সম্পূর্ণ তালিকা:
  - 1010 Cash in Hand (asset/debit), 1020 Bank Accounts parent (asset/debit)
  - 1100 Accounts Receivable (asset/debit), 1200 Inventory (asset/debit)
  - 1300 Staff Advances (asset/debit), 1400 Fixed Assets (asset/debit)
  - 2100 Accounts Payable (liability/credit), 2200 Loans Payable (liability/credit), 2300 Other Liabilities (liability/credit)
  - 3100 Owner's/Investor's Capital (equity/credit), 3200 Retained Earnings (equity/credit), 3300 Opening Balance Equity (equity/credit) — V2 নতুন
  - 4100 Sales Revenue (income/credit), 4200 Service/Installation Income (income/credit), 4150 Sales Returns & Allowances contra-income — V2 নতুন
  - 5100 Cost of Goods Sold (expense/debit), 5900 Interest Expense (expense/debit) — V2 নতুন, 5200+ প্রতি expense_category-র জন্য একটা sub-account (expense/debit) — নতুন ৩টা account (3300/4150/5900) `migrate:fresh --seed` দিয়ে যাচাই করা হয়েছে
- [x] **2.5.2** journal_entries (id, entry_date, description, reference_type, reference_id, status enum(posted/reversed) default posted, reversed_at, reversed_by, reversal_of_id — V2, created_by) + journal_entry_lines (id, journal_entry_id, chart_of_account_id, debit, credit, note) migration+model
- [x] **2.5.3** JournalService::post(date, description, lines[], refType, refId) — SUM(debit) ≠ SUM(credit) হলে UnbalancedJournalEntryException থ্রো করবে; এবং assertPeriodOpen($date) চেক করবে — V2 (নিচে 2.5.4a দেখুন)
- [x] **2.5.3b** JournalService::reverse(JournalEntry $original, reason, userId) — V2 — mirrored debit/credit দিয়ে নতুন reversal entry বানাবে, original-কে status=reversed মার্ক করবে (কখনো edit/delete না)

### ধাপ ১.৫ — Accounting Period Lock (V2 নতুন)
- [x] **2.5.4a** accounting_periods migration+model (start_date, end_date, status enum(open/closed), closed_at, closed_by) + monthly seeder (fiscal_year_start_month অনুযায়ী)
- [x] **2.5.4b** Close Period Action (Admin-only) + Period List Page — এই প্রজেক্টে এখনো কোনো role/permission system নেই (সব route শুধু `auth` middleware দিয়ে গার্ড করা), তাই "Admin-only" আপাতত normal authenticated user-এর জন্যই খোলা রাখা হয়েছে, বাকি সব page-এর মতোই — role system যোগ হলে এখানে middleware বসাতে হবে
- [x] **2.5.4c** Feature test: closed period-এ journal post করতে গেলে ClosedPeriodException হয় (JournalServiceTest.php-এ ৩টা নতুন test: closed period reject, no-period allowed, reverse() behavior)

### ধাপ ২ — accounts ↔ chart_of_accounts Mapping (V2 নতুন)
- [x] **2.5.5** accounts.chart_of_account_id FK migration যোগ করুন (Phase 2.1-এ বানানো accounts table-এ)
- [x] **2.5.6** CreateAccountAction — নতুন account তৈরি হলে automatically একটা matching chart_of_accounts sub-account তৈরি হবে (Cash→1010-এর child, Bank/Mobile/Cheque→1020-এর child) এবং লিংক হবে — Phase 2.4-এ বানানো Account creation flow আপডেট করুন। `ChartOfAccountResolver::forAccount()`-ও এখন guess করার বদলে সরাসরি এই FK ব্যবহার করে। AccountFactory-তেও default `chart_of_account_id` (একটা standalone auto ChartOfAccount) যোগ করা হয়েছে যাতে factory দিয়ে সরাসরি বানানো ২৮টা পুরনো test call site না ভাঙে

### ধাপ ৩ — Frontend + Idempotency + Concurrency
- [x] **2.5.7** Chart of Accounts List Page (tree view, parent-child) + Add/Edit Modal — V1-এই বানানো হয়েছিল, এখনো ঠিকভাবে কাজ করছে
- [x] **2.5.8** Journal Entry List Page + Detail view (সব line + debit/credit + status/reversal দেখাবে) — list/detail দুটোতেই status badge যোগ করা হয়েছে; detail page-এ reversal_of link + reversed_at দেখায়; একটা posted entry-তে "Reverse" বাটন (reason নিয়ে ConfirmDialog) যোগ করা হয়েছে (নাহলে JournalService::reverse() UI থেকে কখনো reach-ই হতো না) — নতুন `POST journal-entries/{id}/reverse` route + `AlreadyReversedException` guard (একই entry দুইবার reverse করা যাবে না)
- [x] **2.5.9** General Ledger Page (প্রতি account-এর জন্য, running balance সহ) — V1-এই বানানো হয়েছিল, এখনো ঠিকভাবে কাজ করছে
- [x] **2.5.10** RETROFIT — StockService::decrease() (Phase 3.3-এ বানানো) — Product::lockForUpdate() যোগ করুন — V2 (concurrency safety) — নতুন `InsufficientStockException`, `manage_stock=false` হলে চেক স্কিপ হয়। এই ফিক্স-এর ফলে একটা পুরনো test (SalePagesTest) যেটা stock না দিয়েই sale confirm করছিল সেটাও ঠিক করতে হয়েছে (আগে silently negative stock allow হতো)
- [x] **2.5.11** Feature test: unbalanced lines দিয়ে post করতে গেলে exception হয় (V1-এই JournalServiceTest.php-এ ছিল)
- [x] **2.5.12** Feature test: balanced entry post হলে সব line ঠিকভাবে সেভ হয়, account balance আপডেট হয় (V1-এই JournalServiceTest.php-এ ছিল)
- [x] **2.5.13** Feature test: দুইটা simultaneous sale একই শেষ ১টা stock-এর জন্য প্রতিযোগিতা করলে একটাই সফল হয় (concurrency test) — SQLite in-memory single-connection হওয়ায় সত্যিকারের দুই-connection race টেস্ট করা যায় না, তাই sequential guard-behavior টেস্ট করা হয়েছে (StockServiceTest.php)

### ধাপ ৪ — stock_movements cost fields (V2 নতুন)
- [x] **2.5.14** RETROFIT — stock_movements (Phase 3.2-এ বানানো) — unit_cost, total_cost (nullable) column যোগ করুন
- [x] **2.5.15** RETROFIT — StockService — প্রতিটা movement তৈরির সময় এই দুটো field পূরণ করুন (purchase→unit_price, sale→cost_at_sale, adjustment→avg_cost) — `increase()`/`decrease()`-এ নতুন optional `unitCost` param; ConfirmPurchaseAction (unit_price), ConfirmSaleAction (cost_at_sale), AdjustStockAction (avg_cost), CancelSaleAction (আসল sale item-এর cost_at_sale, আজকের avg_cost না — reversal-টা সেই sale-এর cost basis-ই প্রতিফলিত করা উচিত) আপডেট করা হয়েছে। Opening stock movement-এ (Task-এ উল্লেখ নেই) ইচ্ছাকৃতভাবে cost বসানো হয়নি

### ধাপ ৫ — ইতিমধ্যে বানানো Action class-এ Journal + Idempotency Retrofit
- [x] **2.5.16** RETROFIT — FundTransferAction — journal lines: Dr {to_account COA}, Cr {from_account COA} — V1-এই ঠিকভাবে বানানো ছিল, status field না থাকায় (create-once record) idempotency guard এখানে প্রযোজ্য না
- [x] **2.5.17** RETROFIT — ConfirmPurchaseAction — journal lines: বাকিতে Dr Inventory, Cr Accounts Payable; নগদে Dr Inventory, Cr Cash/Bank + idempotency guard (if status==received, return) — V2 — journal lines V1-এই ছিল, idempotency guard এখন যোগ করা হয়েছে
- [x] **2.5.18** RETROFIT — ConfirmSaleAction — একই journal entry-তে দুই সেট line: Dr Accounts Receivable/Cash, Cr Sales Revenue এবং Dr Cost of Goods Sold, Cr Inventory + idempotency guard (if status==confirmed, return) — V2 — journal lines V1-এই ছিল, idempotency guard এখন যোগ করা হয়েছে (Imported/historical sale path-ও এই guard-এর আওতায় পড়ে)
- [x] **2.5.19** Feature test: ConfirmSaleAction চালানোর পর journal entry তৈরি হয়েছে ও balanced (V1-এই JournalPostingTest.php-এ ছিল)
- [x] **2.5.20** Feature test: ConfirmSaleAction দুইবার চালালে দ্বিতীয়বার কোনো নতুন entry তৈরি হয় না (idempotency) — নতুন
- [x] **2.5.21** Feature test: ConfirmPurchaseAction চালানোর পর journal entry তৈরি হয়েছে ও balanced (V1-এই JournalPostingTest.php-এ ছিল) + নতুন idempotency test
- [x] **2.5.22** Feature test: FundTransferAction চালানোর পর journal entry তৈরি হয়েছে ও balanced (V1-এই JournalPostingTest.php-এ ছিল)

### ধাপ ৬ — অন্যান্য V2 Retrofit (আগে বানানো হয়ে গেছে বলে)
- [x] **2.5.23** RETROFIT — Serial Number Lifecycle — sale_item_serials বাদ দিয়ে serial_numbers (product_id, serial_number, status enum(in_stock/sold/returned/under_warranty_service/disposed), purchase_item_id, sale_item_id) migration+model বানান; ConfirmPurchaseAction-এ in_stock row জেনারেট করা, ConfirmSaleAction-এ নির্দিষ্ট serial পিক করে sold করা যোগ করুন — serial selection এখন confirm-time-এ হয় (Draft item creation-এ না, যেহেতু Draft পুরোপুরি reversible থাকা উচিত): purchase-এর জন্য নতুন `PurchaseConfirmController`-এর payment modal-এ serial input যোগ হয়েছে (প্রতি unit-এর জন্য একটা টেক্সট ফিল্ড), sale-এর এক-শটে create+confirm flow-এ আগের মতোই sale-form-এ typed serial_numbers ব্যবহার হয় কিন্তু persist হয় শুধু confirm সফল হলে (নতুন `SerialSelections::extract()` positional-zip helper দিয়ে)। ভুল count বা ইতিমধ্যে ব্যবহৃত/non-existent serial দিলে নতুন `InvalidSerialSelectionException`। `CancelSaleAction`-ও আপডেট হয়েছে যাতে sale cancel হলে sold serial আবার in_stock-এ ফিরে যায়। edit()-এ আর আগের serial re-populate হয় না (যেহেতু draft-এ persist হয় না) — এটা একটা ইচ্ছাকৃত UX trade-off
- [x] **2.5.24** RETROFIT — sales.payment_type → financing_type column rename migration (enum('cash','emi') → enum('one_time','emi')), ConfirmSaleAction-এ reference আপডেট — ConfirmSaleAction আসলে এই ফিল্ড read-ই করে না (এখনো কোনো EMI logic নেই, Phase ১১-এর জন্য reserved), তাই বাকি সব জায়গা (model, both Sale Action, both Form Request, controller, sale-form.tsx, types) আপডেট করা হয়েছে + MySQL column-এর DEFAULT clause raw SQL দিয়ে ঠিক করা হয়েছে (doctrine/dbal নেই), SaleFactory-তেও এখন explicit default যোগ করা হয়েছে
- [x] **2.5.25** RETROFIT — Backup — Scheduled backup:run cron যোগ, backup:clean retention, backup:monitor, আর পুরো Restore flow (permission gate + typed confirmation + auto-safety-backup + RestoreDatabaseJob) — যদি Phase 17.5 আগে করা হয়ে থাকে সেটাও আপডেট করুন — Phase 17.5 আগে বানানোই হয়নি, তাই পুরোটাই নতুন বানানো হয়েছে: `spatie/laravel-backup` install, `config/backup.php` কাস্টমাইজ (শুধু `storage/app/public` + DB dump — পুরো codebase না, সেটা git-tracked), `routes/console.php`-এ daily `backup:run`/`backup:clean`/`backup:monitor` schedule, `BackupController` (list/backup-now/download/delete/restore/upload-restore), typed "RESTORE" confirmation + auto safety-backup + queued `RestoreDatabaseJob` (mysqldump/mysql দিয়ে), `resources/js/pages/backups/index.tsx`। কোনো permission system না থাকায় (Close Period-এর মতোই) শুধু `auth` middleware দিয়ে গার্ড করা হয়েছে। ⚠️ Restore আসলে প্রসেস হতে `php artisan queue:work` চালু থাকতে হবে (QUEUE_CONNECTION=database)। XAMPP-এ mysqldump/mysql PATH-এ নেই বলে নতুন `DB_DUMP_BINARY_PATH` env var + `config/database.php`-এর mysql connection-এ `dump.dump_binary_path` যোগ করা হয়েছে
- [x] **2.5.26** UI label change: "Cash Book" মেনু/টাইটেল → "Petty Cash" (শুধু display label, DB table নাম বদলাবে না) — sidebar, breadcrumb, page title/heading, Add Entry modal title সব জায়গায় বদলানো হয়েছে; DB table (`cash_book`/`cash_book_entries`) ও route name (`cash-book.*`) অপরিবর্তিত

### ধাপ ৭ — সব শেষে
- [ ] **2.5.27** php artisan migrate:fresh --seed দিয়ে আবার test data রিসেট করুন, তারপর Phase 2/5/6-এর manual flow আবার টেস্ট করুন — journal entry, serial number, financing_type সব ঠিকভাবে কাজ করছে কিনা যাচাই করুন

⚠️ সব ধাপ (২.৫.০ থেকে ২.৫.২৭) শেষ না করে Phase 7 (Returns)-এ যাবেন না। Return-এর Action class প্রথম থেকেই Journal posting সহ বানানো হবে (Dr Sales Returns & Allowances/Cr AR-Cash + Dr Inventory/Cr COGS প্যাটার্নে), তাই আলাদা retrofit লাগবে না — কিন্তু Chart of Accounts, 4150 account, আর idempotency pattern আগে থেকে না থাকলে সেটাও ঠিকভাবে বানানো যাবে না।


⚠️ **সব ধাপ (২.৫.১ থেকে ২.৫.১৫) শেষ না করে Phase 7 (Returns)-এ যাবেন না।**

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
- [x] **5.2** `ConfirmPurchaseAction` (StockService + weighted avg_cost recalculation একসাথে) — ⚠️ Journal posting এখনো বাকি, দেখুন 2.5.17
- [x] **5.3** Purchase List Page + Add/Edit Page (multi-item form)
- [x] **5.4** Add Payment Modal + Supplier Credit Auto-apply logic
- [x] **5.5** Purchase Detail/Print Page
- [x] **5.6** Feature test: purchase confirm হলে avg_cost সঠিকভাবে recalculate হয়

---

## Phase 6 — Sales (পর্ব ৪) ⭐ সবচেয়ে গুরুত্বপূর্ণ module

- [x] **6.1** `sales`, `sale_items`, `sale_item_serials` migration+model
- [x] **6.2** `ConfirmSaleAction` (StockService + LedgerService + AccountService একসাথে, একই transaction-এ) — ⚠️ Journal posting এখনো বাকি, দেখুন 2.5.18
- [x] **6.3** Sales List Page (draft/quotation/confirmed filter)
- [x] **6.4** Add Sale Page — Customer সেকশন (বকেয়া দেখানো + সাম্প্রতিক কেনা)
- [x] **6.5** Add Sale Page — Product সেকশন (`ProductSearchInput` shared component)
- [x] **6.6** Add Sale Page — Payment সেকশন (`AccountPaymentRows` shared component)
- [x] **6.7** ৩-স্তরের Discount (item/invoice/ledger)
- [x] **6.8** Historical Record checkbox (`source = imported`, পর্ব ২১.১)
- [x] **6.9** Keyboard shortcuts (F2/F4/Enter/Esc)
- [x] **6.10** ৩০-সেকেন্ড Undo toast
- [x] **6.11** Invoice Print Page (A4)
- [x] **6.12** Feature test: sale confirm করলে stock কমে, ledger+account একসাথে আপডেট হয়

---

## Phase 7 — Returns (পর্ব ৫)

- [ ] **7.1** `sale_returns`, `sale_return_items`, `purchase_returns`, `purchase_return_items` migration+model
- [ ] **7.2** `CreateSaleReturnAction` / `CreatePurchaseReturnAction` (`ReturnQuantityWithinSoldRule` দিয়ে validate + **JournalService::post()** প্রথম থেকেই যোগ করা — Sale Return: `Dr Sales Returns & Allowances(4150)/Cr AR-Cash` + `Dr Inventory/Cr COGS`; Purchase Return: `Dr Accounts Payable-Cash/Cr Inventory`; idempotency guard-ও প্রথম থেকেই — retrofit লাগবে না)
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
- [ ] **9.2** Expense List Page + Add/Edit Modal + Payment Modal (⭐ Journal posting: Dr Expense account, Cr Cash/Bank বা Accounts Payable)

---

## Phase 10 — Asset/Loan/Investor/Liability (পর্ব ৮)

- [ ] **10.1** `HasLedger` trait তৈরি (পর্ব ১৭.৩)
- [ ] **10.2** `assets`, `asset_transactions` migration+model (trait ব্যবহার করে, ⭐ প্রতিটা transaction-এ JournalService posting যোগ)
- [ ] **10.3** `company_loans`, `loan_transactions` migration+model (⭐ Journal posting)
- [ ] **10.4** `investors`, `investor_transactions` migration+model (⭐ Journal posting)
- [ ] **10.5** `other_liabilities`, `other_liability_transactions` migration+model (⭐ Journal posting)
- [ ] **10.6** চারটার জন্য একই প্যাটার্নের List+Detail+Add Transaction Page/Modal
- [ ] **10.7** Feature test: `HasLedger` trait সঠিকভাবে balance recalculate করে

---

## Phase 11 — Staff (পর্ব ৯)

- [ ] **11.1** `staff`, `staff_transaction_types` (seeded), `staff_ledger` migration+model
- [ ] **11.2** Staff List + Add/Edit Page + Ledger Detail Page (⭐ salary charge/payment-এ JournalService posting)
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
- [ ] **14.3** Import Sales (`source = imported`, stock/ledger/journal touch হবে না)
- [ ] **14.4** Import file cleanup (job শেষে delete)

---

## Phase 15 — Dashboard & Reports (পর্ব ১২)

- [ ] **15.1** Dashboard Quick Actions (permission-filtered)
- [ ] **15.2** Dashboard Summary Cards
- [ ] **15.3** Profit & Loss Report + `INDEX(sale_date, status)` কম্পোজিট ইনডেক্স (⭐ এখন Journal থেকে সোর্স করা)
- [ ] **15.4** Balance Sheet (quick) + Financial Position (full) + Trial Balance (⭐ `journal_entry_lines` থেকে সোর্স, পর্ব ৬.৫)
- [ ] **15.5** Cash Flow, Stock Report, Due Report, Trending Products
- [ ] **15.6** Fiscal Year filter (`fiscal_year_start_month`)
- [ ] **15.7** Reconciliation Check scheduled job (Contact balance vs Accounts Receivable/Payable GL, Stock value vs Inventory GL) — পর্ব ৬.৫

---

## Phase 16 — UI Polish (পর্ব ১৬)

- [ ] **16.1** Light/Dark mode (design token setup)
- [ ] **16.2** Global Search (Cmd+K)
- [ ] **16.3** Mobile Datatable → Card view fallback
- [ ] **16.4** Mobile Sale form → cart-style flow

---

## Phase 17 — Notification, Activity Log, Backup, Marketing (পর্ব ১৫)

- [ ] **17.1** `activity_logs` (spatie/laravel-activitylog) + retention job (dropdown setting: 3/6/12/18 মাস)
- [ ] **17.2** `notifications` + daily scheduled job (Low Stock/Due/EMI Overdue)
- [ ] **17.3** `message_logs`, `campaigns`, `campaign_recipients` migration+model
- [ ] **17.4** Contact bulk-select → Send Notification Modal
- [x] **17.5** Backup Now বাটন (spatie/laravel-backup) — Phase 2.5 V2 task 2.5.25-এ পুরো Backup+Restore flow-এর অংশ হিসেবে বানানো হয়েছে

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
