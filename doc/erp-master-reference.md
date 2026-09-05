# ERP System — সম্পূর্ণ Master Reference

**Stack:** Laravel 12 (পরে 13) + Inertia 2 + React 19 + TypeScript + MySQL + Tailwind 4 + shadcn/ui
**Scope:** Single shop, single database per install • Multi-tenancy নেই • Warehouse নেই
**Business Model:** প্রতিটা কাস্টমারের আলাদা install, বাৎসরিক subscription
**Target:** হোম অ্যাপ্লায়েন্স (ফ্রিজ/এসি), পরে স্যানিটারি/হার্ডওয়্যার

> এই ফাইলে প্রতিটা module-এর **Logic + Database + Frontend (Page/Modal)** একসাথে আছে।
> শুধু schema চাইলে → `erp-database-schema.md` • সিদ্ধান্তের কারণ ও ইতিহাস চাইলে → `erp-design-decisions.md`

---

# পর্ব ০ — সিস্টেমের মূল নীতি (সব module-এ প্রযোজ্য)

## ০.১ Hybrid Pattern — সব module একই নিয়ম মানে

প্রতিটা module-এ **দুই ধরনের টেবিল** থাকে:

| ধরন | কাজ | উদাহরণ |
|---|---|---|
| **Header/Master** | বর্তমান অবস্থা, cached — দ্রুত পড়ার জন্য | `products.current_stock`, `contacts.balance`, `accounts.current_balance` |
| **Ledger/Movement** | সম্পূর্ণ ইতিহাস, অপরিবর্তনীয় | `stock_movements`, `contact_ledger`, `account_transactions` |

**কেন এই দুটোই দরকার:**
- শুধু ledger থাকলে → "এই product-এ কত stock আছে" জানতে প্রতিবার হাজার হাজার row যোগ-বিয়োগ করতে হবে (list page ধীর হবে)
- শুধু cached value থাকলে → "stock কেন কমলো" এই প্রশ্নের উত্তর কখনো পাওয়া যাবে না (audit অসম্ভব)

**নিয়ম:** প্রতিটা পরিবর্তন একই `DB::transaction()`-এর ভিতরে দুটোই আপডেট করবে।

```php
DB::transaction(function () {
    StockMovement::create([...]);           // ইতিহাস
    $product->increment('current_stock', $qty);  // cached
});
```

## ০.২ Immutability — ইতিহাস কখনো মোছা/বদলানো হয় না

**ভুল হলে edit না করে, নতুন correction entry দেওয়া হয়** — ঠিক accounting-এর reverse entry-র মতো।

```
opening_stock        +10   ← ভুল entry ছিল
sale                  -7
adjustment_increase  +10   ← correction (reason: "opening stock ভুল ছিল")
─────────────────────────
current_stock = 13 ✓
```

## ০.৩ Balance Sign Convention — সব জায়গায় একই

| চিহ্ন | অর্থ |
|---|---|
| **Positive (+)** | ওরা আমাদের কাছে দেনা (Receivable) — customer মাল নিয়েছে, টাকা দেয়নি |
| **Negative (−)** | আমরা ওদের কাছে দেনা (Payable) — supplier থেকে মাল নিয়েছি, টাকা দেইনি |

এই একই নিয়ম `contacts.balance` আর `staff.balance` দুটোতেই।

## ০.৪ Opening Entry — একবারই সেট হয়

সব module-এ (Product opening stock, Contact/Account/Asset/Loan/Investor opening balance) একই নিয়ম:
- **কোনো movement না থাকলে** → সরাসরি opening entry দেওয়া যাবে
- **একবার movement হয়ে গেলে** → opening field disabled, শুধু Adjustment দিয়ে ঠিক করতে হবে

## ০.৫ Status Flow — Draft/Confirmed-এর পার্থক্য

| Status | Stock/Ledger-এ প্রভাব | Edit করা যায়? |
|---|---|---|
| `draft` / `quotation` / `ordered` | ❌ কোনো প্রভাব নেই | ✅ হ্যাঁ, স্বাধীনভাবে |
| `confirmed` / `received` | ✅ সব entry তৈরি হয়ে গেছে | ❌ না, শুধু correction/return |

---

# পর্ব ১ — Inventory (পণ্য ব্যবস্থাপনা)

## Logic

**Product-এর দুই ধরন:**
- `manage_stock = true` → সাধারণ পণ্য (ফ্রিজ, এসি) — stock track হয়
- `manage_stock = false` → সার্ভিস আইটেম (Installation Charge, Delivery Charge) — বিক্রি হয় কিন্তু stock নেই

**Cost হিসেব — Weighted Average:**
```
new_avg_cost = ((current_stock × current_avg_cost) + (new_qty × new_price)) / (current_stock + new_qty)
```
- শুধু **Purchase**-এ recalculate হয়
- Sale-এ `avg_cost` বদলায় না, শুধু `current_stock` কমে
- `current_stock = 0` হলে → `new_avg_cost = new_price` (division এড়াতে)

**Stock Movement Types:**
`opening_stock` · `purchase` · `sale` · `sale_return` · `purchase_return` · `adjustment_increase` · `adjustment_decrease`

## Database

```
categories       — id, name, parent_id (parent-child সাপোর্ট)
units            — id, name (Pc, Kg, Box)
brands           — id, name

products
- name, sku (unique), barcode (unique, nullable)
- category_id, brand_id, unit_id
- avg_cost              ← cached, weighted average
- selling_price         ← default দাম (বিক্রির সময় বদলানো যায়)
- current_stock         ← cached
- minimum_stock_level   ← এর নিচে গেলে Low Stock alert
- manage_stock          (default true)
- is_for_sale           (POS-এ দেখাবে কিনা)
- is_active             (সব জায়গায় দেখাবে কিনা)
- warranty_period_months, has_installation_service
- emi_available, track_serial_number

stock_movements
- product_id, type, quantity, reason/note
- reference_type, reference_id
- created_by, created_at
```

**Index:** `products`: sku, barcode(unique), category_id, brand_id, name | `stock_movements`: product_id, type, (product_id, created_at)

**ছবি/ব্রশিওর:** `spatie/laravel-medialibrary` — আলাদা column নেই, polymorphic media table

## Frontend

| স্ক্রিন | ধরন | বিস্তারিত |
|---|---|---|
| Product List | **Page** | Datatable — search, filter (category/brand/stock status), sort, pagination |
| Add/Edit Product | **Page** | অনেক field আছে (৪টা section), তাই full page — modal-এ ঠাসাঠাসি হবে |
| Product Quick View | **Modal** | List থেকে "View" — দ্রুত দেখার জন্য, navigate করতে হবে না |
| **Stock Adjustment** | **Modal** | Product Detail থেকে বাটন — শুধু ৩টা field (নতুন quantity, reason, note) |
| Stock Movement History | **Page** | পুরো ইতিহাস + running balance, Quantities In/Out summary |
| Category/Unit/Brand | **Modal** | ছোট CRUD — শুধু name field, page লাগে না |
| Print Labels | **Page** | Barcode label layout preview + print |

**Quick-add "+" বাটন:** Product form-এ Category/Brand/Unit dropdown-এর পাশে ছোট "+" — ক্লিক করলে ছোট modal, page ছাড়তে হবে না

**Mobile:** Datatable → Card view (thumb + নাম + stock + দাম)

---

# পর্ব ২ — Contacts (Customer/Supplier)

## Logic

**একই টেবিলে তিন ধরন:** `type = customer | supplier | both` — একজন ব্যক্তি দুটোই হতে পারে

**Ledger আপডেট হয় যখন:**
- Sale confirm → `sale_invoice` (+due, receivable বাড়ে)
- Purchase confirm → `purchase_bill` (−due, payable বাড়ে)
- Payment → `payment_received` / `payment_made`
- Return → `sale_return` / `purchase_return`
- Discount মাফ → `discount_waived`

## Database

```
customer_groups  — id, name

contacts
- name, phone (normalized), email (normalized), address, shipping_address
- type            enum(customer/supplier/both)
- entity_type     enum(individual/business), business_name
- customer_group_id
- balance         ← cached (+receivable / −payable)
- is_active

contact_ledger
- contact_id, type, amount, reference_id, note, created_by
```

**Index:** `contacts`: phone, email, type, customer_group_id | `contact_ledger`: contact_id, type, created_at

## Frontend

| স্ক্রিন | ধরন | বিস্তারিত |
|---|---|---|
| Customer/Supplier List | **Page** | একই page, `?type=` দিয়ে filter • Checkbox multi-select |
| Add/Edit Contact | **Modal** | কম field — modal-ই যথেষ্ট, দ্রুত হয় |
| **Contact Detail** | **Page** | Tab layout: Ledger \| Purchases \| Sales \| Documents \| Payments \| Activities |
| Pay Due Amount | **Modal** | Contact Detail থেকে — account select + amount |
| Add Discount (ledger) | **Modal** | বকেয়া মাফ করার জন্য |
| Send Notification | **Modal** | Multi-select করে — message + channel (SMS/WhatsApp/Email) |
| Import Contacts | **Page** | File upload + column mapping |

**Bulk Actions (checkbox select করলে):** Send Notification · Export · Add to Group · Bulk Ledger PDF · Delete (transaction থাকলে blocked)

---

# পর্ব ৩ — Purchase (ক্রয়)

## Logic

**Status Flow:** `draft` → `ordered` (supplier-কে অর্ডার দেওয়া, মাল আসেনি) → `received` (মাল এসেছে) → stock বাড়ে

⚠️ **শুধু `received` হলেই stock বাড়ে** — draft/ordered-এ কিছুই হয় না

**Purchase Confirm হলে (এক transaction-এ):**
1. Header + items সেভ
2. প্রতি item → `StockService::increase()` + `avg_cost` recalculate
3. `contact_ledger` (purchase_bill, −due) + supplier balance কমে
4. Payment থাকলে → `account_transactions` (একাধিক account হতে পারে)

**Supplier Credit Auto-apply:** Supplier-এর balance positive থাকলে (আগে বেশি দিয়েছেন), নতুন purchase-এ সেটা auto-suggest হয় — cash নয়, শুধু ledger offset

## Database

```
purchases
- supplier_id, invoice_no, purchase_date
- total_amount, paid_amount, due_amount
- payment_status  enum(due/partial/paid)   ← auto-calculate
- status          enum(draft/ordered/received/cancelled)

purchase_items    — purchase_id, product_id, quantity, unit_price, subtotal
```

**Index:** `purchases`: invoice_no(unique), supplier_id, (purchase_date, status) | `purchase_items`: (purchase_id, product_id)

## Frontend

| স্ক্রিন | ধরন |
|---|---|
| Purchase List | **Page** — filter: date, supplier, status, payment status |
| Add/Edit Purchase | **Page** — multi-item form, বড় |
| Purchase Detail/Print | **Page** |
| Add Payment | **Modal** — account select (একাধিক row যোগ করা যায়) |
| Status Update | **Modal** — ordered → received |

**Mobile:** Multi-item form → cart-style (search → add → sticky footer-এ total)

---

# পর্ব ৪ — Sales (বিক্রয়)

## Logic

**Status:** `draft` (অসম্পূর্ণ) · `quotation` (দাম-প্রস্তাব, `valid_until` থাকে) · `confirmed` · `cancelled`

⚠️ **শুধু `confirmed` হলেই stock কমে**

**Sale Confirm হলে:**
1. Header + items (দাম snapshot: `original_price`, `unit_price`, `cost_at_sale`)
2. প্রতি item → `StockService::decrease()` — ⚠️ `avg_cost` বদলায় **না**
3. `contact_ledger` (sale_invoice, +due)
4. Payment → `account_transactions` (split payment সাপোর্ট)
5. Warranty থাকলে → `warranty_expires_at` snapshot
6. Service plan থাকলে → `sale_item_service_periods` তৈরি

**Discount তিন স্তরে:**
| স্তর | কোথায় | উদাহরণ |
|---|---|---|
| Item-level | `sale_items.discount_amount` | নির্দিষ্ট পণ্যে ছাড় |
| Invoice-level | `sales.discount_type/value` | পুরো বিলে ৫% |
| Ledger-level | `contact_ledger` (discount_waived) | বকেয়া মাফ (বিক্রির সাথে সম্পর্কহীন) |

**Profit:** `(unit_price − cost_at_sale) × quantity`

## Database

```
sales
- customer_id, invoice_no, sale_date
- subtotal, discount_type, discount_value, discount_amount, total_amount
- paid_amount, due_amount, payment_status
- status, source (manual/imported)
- delivery_status, delivered_at
- valid_until (quotation), payment_type (cash/emi)
- sales_order_id (nullable)

sale_items
- sale_id, product_id, quantity
- original_price, unit_price, discount_amount
- cost_at_sale          ← profit হিসেবের জন্য snapshot
- installation_required, installation_charge
- warranty_expires_at   ← snapshot

sale_item_serials — sale_item_id, serial_number (optional)
```

**Index:** `sales`: invoice_no(unique), customer_id, (sale_date, status), payment_status, delivery_status | `sale_items`: (sale_id, product_id)

## Frontend

| স্ক্রিন | ধরন | বিস্তারিত |
|---|---|---|
| Sales List | **Page** | Draft/Quotation আলাদা menu, কিন্তু একই টেবিল filter করে |
| Add Sale | **Page** | সবচেয়ে গুরুত্বপূর্ণ screen |
| Sale Detail | **Page** | Tab: Items \| Payments \| Service \| Warranty |
| Add Payment | **Modal** | |
| Invoice/Challan Print | **Page** | A4, আর thermal (settings-এ on থাকলে) |
| Import Sales | **Page** | Upload + column mapping |

### Add Sale Page — বিস্তারিত UX

```
┌─ Customer সেকশন ────────────────────────┐
│ [Customer dropdown ▾]  [+ নতুন customer]│
│ ⚠️ পূর্বের বাকি: ৳১২,০০০               │ ← select করলেই দেখাবে
│ 📋 সাম্প্রতিক কেনা: [Fridge][AC] +আবার  │ ← এক ক্লিকে যোগ
└──────────────────────────────────────────┘
┌─ Product সেকশন ─────────────────────────┐
│ [🔍 Search / Barcode scan (F2)]          │
│ ┌────────────────────────────────────┐  │
│ │ Product | Qty | Price | Disc | ✕  │  │
│ └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
┌─ Payment সেকশন ─────────────────────────┐
│ Subtotal / Discount / Total              │
│ [Account ▾][Amount] [+ আরেকটা account]   │
│ [Confirm (F4)]                           │
└──────────────────────────────────────────┘
```

**Keyboard shortcuts:** F2 = search · F4 = payment · Enter = confirm · Esc = cancel

**Undo Toast:** Confirm করার পর ৩০ সেকেন্ড "Undo" বাটন — চাপলে system নিজেই reversal entry বানাবে (ইতিহাস অক্ষত)

---

# পর্ব ৫ — Return (ফেরত)

## Logic

| | Sale Return | Purchase Return |
|---|---|---|
| Stock | বাড়ে | কমে |
| Ledger | customer due কমে | supplier due কমে |
| avg_cost | বদলায় না | বদলায় না |

**Validation:** ফেরতের পরিমাণ মূল বিক্রি/ক্রয়ের চেয়ে বেশি হতে পারবে না (আগের return বাদ দিয়ে)

⚠️ **প্রতিটা return নতুন record** — আগের return edit করা হয় না (immutability)

## Database
```
sale_returns / purchase_returns
- sale_id/purchase_id, contact_id, return_date, total_amount, reason

sale_return_items / purchase_return_items
- return_id, product_id, quantity, unit_price, subtotal
```

## Frontend
| স্ক্রিন | ধরন |
|---|---|
| Return List | **Page** |
| Create Return | **Page** — মূল invoice select → items পিক করে quantity দেওয়া |
| Refund Payment | **Modal** — কোন account থেকে টাকা ফেরত |

---

# পর্ব ৬ — Accounts (Cash/Bank/Cheque)

## Logic

**Account Type flexible:** `account_types` lookup table (Cash, Bank, Mobile Banking, Cheque — নতুন যোগ করা যায়)

**Multi-account Split Payment:** এক বিক্রিতে কিছু Cash, কিছু Bank — প্রতিটা আলাদা `account_transactions` row

**⚠️ `operation_date` — সবচেয়ে গুরুত্বপূর্ণ:**
- `operation_date` = আসলে কবে টাকা হাতবদল হলো → **সব report এটাই ব্যবহার করে**
- `created_at` = কবে system-এ entry দেওয়া হলো → শুধু audit

গতকালের লেনদেন আজ entry দিলে report-এ গতকালই দেখাবে।

**Fund Transfer:** নিজের দুই account-এর মধ্যে টাকা সরানো — একসাথে `transfer_out` (−) আর `transfer_in` (+)

**Cash Book (আলাদা):** ⚠️ এটা `accounts`-এর সাথে **যুক্ত নয়**, নিজের আলাদা balance — Financial Position-এ **ধরা হয় না**। শুধু ছোট দৈনন্দিন খরচ (চা, রিকশা) দ্রুত লিখে রাখার জন্য।

## Database
```
account_types    — id, name

accounts
- name, account_type_id, account_sub_type
- account_number  ← 🔒 ENCRYPTED
- opening_balance, current_balance

account_transactions
- account_id, type, amount
- reference_type, reference_id
- operation_date  ← report-এর জন্য authoritative
- note, created_by, created_at

fund_transfers   — from_account_id, to_account_id, amount, transfer_date

cash_book        — id(1), current_balance          ← আলাদা, accounts-এর সাথে যুক্ত নয়
cash_book_entries — type, category_id, amount, entry_date
misc_transaction_categories — name, type(income/expense)
```

**Index:** `accounts`: account_type_id | `account_transactions`: account_id, (reference_type, reference_id), operation_date

## Frontend
| স্ক্রিন | ধরন |
|---|---|
| Account List | **Page** — প্রতি row-এ: Edit · Account Book · Fund Transfer · Deposit · Close |
| Add/Edit Account | **Modal** |
| Fund Transfer | **Modal** — from/to/amount |
| Deposit | **Modal** |
| Account Statement | **Page** — running balance সহ |
| Cash Book | **Page** — quick add + category filter |
| Add Cash Book Entry | **Modal** — category, amount, note (দ্রুত entry) |

---

# পর্ব ৬.৫ — Double-Entry Bookkeeping (Chart of Accounts + Journal) ⭐ Professional-grade

## কেন এটা যোগ করা হলো

আগের Debit/Credit শুধু **presentation** ছিল (একটা signed amount থেকে বের করা) — সত্যিকারের double-entry না। বড় ব্যবসায়ী/audit-প্রয়োজনীয় customer-দের জন্য এটা যথেষ্ট না — ব্যাংক লোন, VAT filing, external audit-এ formal Chart of Accounts লাগে। যেহেতু এখনো কোনো কোড লেখা হয়নি, এখনই এটা ঠিক করার সঠিক সময়।

## মূল ধারণা — কিছুই বাদ যাচ্ছে না, শুধু একটা স্তর যোগ হচ্ছে

```
আগে থেকে যা আছে (Subsidiary Ledger — দ্রুত UI-এর জন্য, অক্ষত থাকবে):
  contact_ledger, account_transactions, stock_movements, staff_ledger...

নতুন (General Ledger — সরকারি/আনুষ্ঠানিক হিসাবের জন্য):
  chart_of_accounts, journal_entries, journal_entry_lines
```

এটাই real accounting-এর নিয়ম — "Accounts Receivable" একটা **control account**, যার ভিতরে প্রতিটা customer-এর হিসেব (আমাদের `contact_ledger`) subsidiary হিসেবে থাকে।

## Database

```
chart_of_accounts
- code, name
- type              enum(asset/liability/equity/income/expense)
- normal_balance     enum(debit/credit)
- parent_id          (nullable)

journal_entries
- entry_date (=operation_date), description
- reference_type, reference_id
- created_by

journal_entry_lines
- journal_entry_id, chart_of_account_id
- debit, credit, note
```

**Default Chart of Accounts (seeded):**
```
1010 Cash in Hand           1020 Bank Accounts (parent)
1100 Accounts Receivable ← contact_ledger (customer)-এর control account
1200 Inventory            ← stock value-এর control account
1300 Staff Advances         1400 Fixed Assets
2100 Accounts Payable      ← contact_ledger (supplier)-এর control account
2200 Loans Payable          2300 Other Liabilities
3100 Capital                 3200 Retained Earnings
4100 Sales Revenue            4200 Service Income
5100 Cost of Goods Sold         5200+ প্রতি expense_category-র জন্য একটা
```

## JournalService — সব Journal Entry এখান দিয়ে যাবে

```php
class JournalService {
    public function post(Carbon $date, string $description, array $lines, ?string $refType = null, ?int $refId = null): JournalEntry {
        $totalDebit = array_sum(array_column($lines, 'debit'));
        $totalCredit = array_sum(array_column($lines, 'credit'));
        if (abs($totalDebit - $totalCredit) > 0.01) {
            throw new UnbalancedJournalEntryException();  // ⚠️ ভাঙা যাবে না
        }
        // ... journal_entry + lines তৈরি
    }
}
```

## উদাহরণ Posting (প্রতিটা existing Action-এ যোগ হবে, আগের logic-এর পাশাপাশি)

```
Sale (বাকিতে, total 1000, COGS 700):
  Dr Accounts Receivable  1000 | Cr Sales Revenue     1000
  Dr Cost of Goods Sold    700 | Cr Inventory           700

Payment গ্রহণ (500):
  Dr Cash/Bank             500 | Cr Accounts Receivable 500

Purchase (বাকিতে):
  Dr Inventory             600 | Cr Accounts Payable    600

Expense (নগদে):
  Dr Rent Expense         1000 | Cr Cash/Bank          1000

Fund Transfer:
  Dr Bank A               5000 | Cr Cash In Hand       5000

Investor Investment:
  Dr Cash/Bank          100000 | Cr Owner's Capital  100000
```

⚠️ **আগের StockService/LedgerService/AccountService কল বদলাচ্ছে না** — শুধু একই transaction-এর ভিতরে নতুন `JournalService::post()` কল যোগ হচ্ছে।

## Reports এখন Journal থেকে (সত্যিকারের গ্যারান্টিসহ)

```php
// Trial Balance — সত্যিই balanced, শুধু দেখতে না
JournalEntryLine::selectRaw('chart_of_account_id, SUM(debit), SUM(credit)')->groupBy('chart_of_account_id');
```

## ⚠️ Reconciliation Check — দুই স্তর মিলছে কিনা

```php
// দৈনিক scheduled job
$contactTotal = Contact::whereIn('type',['customer','both'])->sum('balance');
$glReceivable = ChartOfAccount::where('code','1100')->first()->balance;
if (abs($contactTotal - $glReceivable) > 0.01) {
    // 🚨 Alert — subsidiary আর General Ledger মিলছে না, তদন্ত দরকার
}
```
একই check Accounts Payable আর Inventory-তেও।

## Frontend
| স্ক্রিন | ধরন |
|---|---|
| Chart of Accounts List | **Page** — tree view (parent-child) |
| Add/Edit Account | **Modal** |
| Journal Entry List | **Page** — সব entry, filter by date/account |
| Journal Entry Detail | **Modal/Page** — সব line দেখাবে |
| General Ledger (per account) | **Page** — নির্দিষ্ট account-এর সব entry + running balance |
| Reconciliation Report | **Page** — subsidiary vs GL mismatch দেখাবে (থাকলে) |

---

# পর্ব ৭ — Expense 🟡

> **স্ট্যাটাস:** এটা নিয়ে আপনি পরে আবার ভাববেন বলেছিলেন — এখনকার design রাখা আছে

**Logic:** Purchase-এর মতোই due/partial/paid • Recurring খরচ (ভাড়া) = প্রতি মাসে **নতুন row** (একই row-এ payment যোগ করা নয়)

**⚠️ Profit/Loss-এ `total_amount` ধরা হয়, `paid_amount` নয়** (accrual accounting) — মার্চের ভাড়া না দিলেও মার্চের খরচ

```
expense_categories — id, name
expenses — category_id, contact_id(nullable), total_amount, paid_amount, due_amount, payment_status, expense_date
```

**Frontend:** List → **Page** · Add/Edit → **Modal** · Payment → **Modal** · Categories → **Modal**

---

# পর্ব ৮ — Asset, Loan, Investor, Liability

সবগুলো **একই pattern**: Header (cached balance) + Transaction ledger

| Module | Balance বাড়ে | Balance কমে | বিশেষত্ব |
|---|---|---|---|
| **Asset** | purchase, addition | sold, disposal | বিক্রি করলে asset কমে, **account বাড়ে**। Gain/Loss = বিক্রয়মূল্য − বইমূল্য |
| **Company Loan** | disbursement, interest_charge | repayment | ⚠️ interest_charge-এ **কোনো account movement নেই** (শুধু দেনা বাড়ে) |
| **Investor** | investment | withdrawal | ⚠️ `profit_share` দিলে **total_invested বদলায় না** (মূলধন থাকে, শুধু লাভ যায়) |
| **Other Liability** | increase | payment | Loan/Supplier-এর বাইরের দেনা (পুরনো ট্যাক্স ইত্যাদি) |

**Depreciation নেই** — Asset-এর মূল্য সময়ের সাথে automatic কমে না

## Frontend (চারটাই একই প্যাটার্ন)
| স্ক্রিন | ধরন |
|---|---|
| List | **Page** |
| Add/Edit | **Modal** |
| Detail + Ledger | **Page** — transaction history + running balance |
| Add Transaction | **Modal** — type, amount, account, note |

---

# পর্ব ৯ — Staff

## Logic

**Transaction Type configurable** — `staff_transaction_types` lookup (fixed enum নয়), প্রতিটার `effect_on_balance` (increase/decrease)

Default: Salary Charge (−) · Salary Payment (+) · Advance Given (+) · Loan Given (+) · Adjustment

**Advance auto-adjust:** পরের মাসের salary_charge হলে ledger-এর যোগফলেই net হয়ে যায় — আলাদা deduction logic লাগে না

**Staff = Investor হতে পারে:** `staff.investor_id` link
**Staff = User হতে পারে:** `staff.user_id` (nullable — Technician-এর login না-ও লাগতে পারে)

## Database
```
staff — name, phone, designation, joining_date, salary_amount, status, investor_id, user_id, balance
staff_transaction_types — name, effect_on_balance(increase/decrease)
staff_ledger — staff_id, staff_transaction_type_id, amount(always positive), account_id, note
```

## Frontend
List → **Page** · Add/Edit → **Modal** · Detail+Ledger → **Page** · Add Transaction → **Modal**

---

# পর্ব ১০ — Warranty & Service (হোম অ্যাপ্লায়েন্স-বিশেষ)

## Logic

**Installation** — বিক্রির সময়, দাম প্রতিবার manual (দূরত্ব/জটিলতা ভেদে আলাদা)

**Service Plan — Flexible Multi-period:**
```
AC:     Period 1: 12 মাস, 2টা ফ্রি  →  Period 2: 12 মাস, 0টা ফ্রি
Fridge: Period 1: 6 মাস, 1টা      →  Period 2: 6 মাস, 1টা  →  Period 3: 12 মাস, 0টা
```

বিক্রির সময় template থেকে **snapshot** হয়ে `sale_item_service_periods`-এ নির্দিষ্ট তারিখসহ বসে যায়

**Free কিনা যাচাই:**
```php
$currentPeriod = নির্দিষ্ট sale_item-এর যে period এখন চলছে
$usedInPeriod = ঐ period-এ কতগুলো free service নেওয়া হয়েছে
$isFree = $usedInPeriod < $currentPeriod->free_quota
```
⚠️ **Carry-over নেই** — period শেষ হলে অব্যবহৃত quota হারিয়ে যায়
⚠️ **Installation কখনো free quota-র অংশ নয়**

## Database
```
service_plan_templates    — product_id, period_number, period_months, free_quota
sale_item_service_periods — sale_item_id, period_number, period_months, free_quota, period_start_date, period_end_date
service_requests          — sale_item_id, type(installation/service), is_free, charge_amount, account_id, staff_id, status
warranty_claims           — sale_item_id, claim_date, issue_description, status, resolution_note
```

**Index:** সবগুলোতে `sale_item_id` | `sale_item_service_periods`: (sale_item_id, period_start_date, period_end_date)

## Frontend
| স্ক্রিন | ধরন |
|---|---|
| Service Requests List | **Page** — filter: status, type, date |
| Create Service Request | **Page** — invoice/customer খুঁজে → sale_item select → free/paid auto-detect |
| Warranty Claims | **Page** |
| Service Plan Template | **Product form-এর ভিতরে** — আলাদা menu নয় |
| Installation | **Add Sale form-এর ভিতরে** — checkbox + charge |

---

# পর্ব ১১ — EMI ও Serial Number

## Logic — দুই স্তরের Toggle ⭐

```
Level 1 (Settings): emi_module_enabled = false → Furniture shop-এ কোথাও দেখাবেই না
Level 2 (Product):  emi_available = true       → শুধু AC/Fridge-এ, accessories-এ নয়
```
Serial Number-ও ঠিক একই দুই স্তরে

**EMI:** Down payment বাদে বাকি টাকা N কিস্তিতে ভাগ → প্রতিটার `due_date` • Overdue হলে daily job notification পাঠায়

## Database
```
emi_installments — sale_id, installment_number, due_date, amount, paid_amount, status, paid_at, account_id
sale_item_serials — sale_item_id, serial_number (optional, quantity-র সাথে না মিললেও চলবে)
```
**Index:** `emi_installments`: sale_id, status, due_date

## Frontend
EMI Installments List → **Page** (due/paid/overdue filter) · কিস্তি Payment → **Modal** · Serial input → Add Sale form-এর ভিতরে (product-এ toggle থাকলে)

---

# পর্ব ১২ — Dashboard ও Reports

## Dashboard Layout

```
┌─ Quick Actions ────────────────────────────┐  ← সবার উপরে
│ [+বিক্রি] [+ক্রয়] [টাকা জমা] [+খরচ]      │     Permission অনুযায়ী দেখাবে
├─ Summary Cards ────────────────────────────┤
│ আজকের বিক্রি │ পাওনা │ দেনা │ Cash+Bank  │
├─ Charts ───────────────────────────────────┤
│ গত ৩০ দিনের বিক্রি (line chart)           │
├─ Alerts ───────────────────────────────────┤
│ Low Stock (৬২) │ Due Payment │ EMI Overdue │
└────────────────────────────────────────────┘
```

## Reports — সবগুলো Page

| Report | হিসেব |
|---|---|
| **Profit & Loss** | Revenue − COGS − Expenses (সবই `total_amount`, accrual) |
| **Balance Sheet (quick)** | Liability: Supplier Due \| Assets: Customer Due + Stock + Account Balances |
| **Financial Position (full)** | Liability: Capital + Loan + Creditors + Other + **Gross Profit** \| Assets: Stock + Debtors + **Staff Advance** + Cash + Other Assets |
| **Trial Balance** | একই data, Debit/Credit column-এ |
| **Cash Flow** | সব account-এর transaction timeline + combined balance |
| Stock Report | Current stock, low stock highlight |
| Due/Sundry Report | কে কত পাবে/দিবে |
| Trending Products | সবচেয়ে বেশি বিক্রি |
| Product Purchase/Sell Report | পণ্যভিত্তিক |
| Activity Log | কে কখন কী করলো |

**⚠️ Fiscal Year:** `settings.fiscal_year_start_month` (default 7 = জুলাই) — report-এ "Financial Year" filter

**⚠️ Cash Book Financial Position-এ ধরা হয় না** (ইচ্ছাকৃত)

---

# পর্ব ১৩ — Role & Permission

## Logic

**Spatie Laravel-permission** ব্যবহার • একজন user **একাধিক role** পেতে পারে

**Permission naming:** `module.action` — যেমন `sale.create`, `product.edit`

**⚠️ Row-level scoping:** `sale.view_own` vs `sale.view_all` — Sales staff শুধু নিজের বিক্রি দেখবে

**Default Roles:** Admin (সব) · Manager (Inventory/Purchase/Sales/Reports) · Cashier (শুধু sale.create + product.view) · Staff

**Sidebar নিজেই filter হয়** — permission না থাকলে menu দেখাবেই না

## Frontend
User List → **Page** · Add/Edit User → **Page** (অনেক field) · Role List → **Page** · Role Permission Edit → **Page** (বড় checkbox grid, module-wise "Select all")

---

# পর্ব ১৪ — Settings

```
settings (একটাই row)
- shop_name, shop_logo, shop_address, shop_phone
- currency_symbol
- invoice_prefix, invoice_next_number
- purchase_prefix, purchase_next_number
- fiscal_year_start_month           (default 7)
- thermal_printer_enabled           (default false)
- emi_module_enabled                (default false)  ⭐ পুরো module on/off
- serial_number_module_enabled      (default false)  ⭐
- activity_log_retention_months     (dropdown: 3/6/12/18, default 18)
- ai_assistant_enabled              (default false)  ⭐ AI চালু/বন্ধ
- license_key 🔒 encrypted, license_status
```

**Invoice numbering:** `INV-` + `str_pad(next_number, 4, '0')` → `INV-0001`

**Frontend:** Settings → **Page** (tab: Business \| Invoice \| Modules \| Users \| Roles \| Backup)

---

# পর্ব ১৫ — Notification, Marketing, Backup

## Notification
Daily scheduled job → Low Stock · Due Payment · EMI Overdue · Loan Repayment → in-app bell + optional SMS/WhatsApp/Email

## Marketing (Contacts page থেকে)
Checkbox select → "Send Notification" → **Modal** (message + channel) → queued job
⚠️ `UNIQUE(campaign_id, contact_id)` — একই মেসেজ দুইবার যাবে না

## Ledger PDF পাঠানো
Contact Detail → "Send Ledger PDF" → WhatsApp/Email — PDF generate হয়ে পাঠানোর পর ২ দিনে auto-delete

## Backup
**একটাই বাটন** "Backup Now" → পুরো DB backup + download option
⚠️ Restore নেই (scope-এর বাইরে রাখা হয়েছে) · Scheduled backup নেই

---

# পর্ব ১৬ — Design System ও Mobile

## Light/Dark Mode
CSS variable (design token) — Light/Dark-এ spacing/typography **এক**, শুধু color বদলায়

## Global Search (Cmd+K)
এক search-এ Product + Contact + Sale + Purchase — module অনুযায়ী গ্রুপ করে দেখাবে

## Mobile
| Desktop | Mobile |
|---|---|
| Datatable (১০ column) | **Card list** — ২-৩টা মূল তথ্য |
| Inline filter bar | **Bottom sheet** |
| Top bulk-action bar | **Bottom fixed bar** (থাম্ব-friendly) |
| Multi-item table form | **Cart-style** (search → add → sticky total) |
| Sidebar | **Hamburger** |

---

# পর্ব ১৭ — Technical Architecture

## ১৭.১ Laravel 12 — প্রকল্প শুরু করা

**Official React Starter Kit** ব্যবহার করুন — Inertia 2 + React 19 + Tailwind 4 + shadcn/ui সব pre-configured:
```bash
laravel new erp-app --react
```
এটা দিলে যা পাবেন: Auth (login/register/reset/2FA via Fortify), Sidebar layout (৩ variant), shadcn/ui components, TypeScript setup, dark mode — সব ready।

> **Laravel 13-এ যাওয়ার পরিকল্পনা:** Laravel-এর upgrade path সাধারণত মসৃণ। এখন থেকেই deprecated API এড়িয়ে চলুন এবং test লিখুন — upgrade-এর সময় test-ই সবচেয়ে বড় safety net।

## ১৭.২ Folder Structure

```
app/
├── Actions/                    ← আসল business logic (DB::transaction)
│   ├── Sale/ConfirmSaleAction.php
│   ├── Purchase/ConfirmPurchaseAction.php
│   └── Stock/AdjustStockAction.php
├── Services/                   ← Reusable cross-module service
│   ├── StockService.php
│   ├── LedgerService.php
│   └── AccountService.php
├── Http/
│   ├── Controllers/            ← পাতলা, শুধু validate + action call
│   └── Requests/               ← FormRequest (validation + authorize)
├── Models/
├── Traits/                     ← HasLedger, HasOpeningBalance
└── Rules/                      ← Custom validation rules

resources/js/
├── components/
│   ├── ui/                     ← shadcn base (Button, Input, Dialog...)
│   └── shared/                 ← আমাদের নিজস্ব reusable
├── hooks/                      ← useConfirm, useDatatable...
├── layouts/
├── pages/                      ← Inertia page components
├── lib/                        ← helper functions
└── types/                      ← TypeScript definitions
```

## ১৭.৩ Backend — Reusable Services ⭐

### StockService — সব stock পরিবর্তন এক জায়গায়
```php
class StockService {
    public function increase(Product $product, float $qty, string $type, ?string $refType = null, ?int $refId = null, ?string $note = null): void {
        StockMovement::create([...]);
        $product->increment('current_stock', $qty);
    }
    public function decrease(Product $product, float $qty, string $type, ...): void { /* mirror */ }
}
```
ব্যবহার: Purchase, Sale, Return, Adjustment — সবাই এটাই ডাকে, নিজে নিজে movement তৈরি করে না।

### LedgerService — Contact/Staff balance পরিবর্তন
```php
class LedgerService {
    public function recordContact(Contact $contact, string $type, float $amount, ?string $refType = null, ?int $refId = null): void {
        ContactLedger::create([...]);
        $contact->increment('balance', $amount);  // amount নিজেই signed (+/−)
    }
}
```

### AccountService — টাকার লেনদেন + split payment
```php
class AccountService {
    public function record(Account $account, string $type, float $amount, Carbon $operationDate, ...): void {
        AccountTransaction::create([..., 'operation_date' => $operationDate]);
        $account->increment('current_balance', $amount);
    }

    public function recordSplitPayment(array $payments, string $type, string $refType, int $refId, Carbon $date): float {
        foreach ($payments as $p) { $this->record(Account::find($p['account_id']), $type, $p['amount'], $date, $refType, $refId); }
        return array_sum(array_column($payments, 'amount'));
    }
}
```

### Trait — HasLedger (Asset/Loan/Investor/Liability সবাই share করে)
```php
trait HasLedger {
    public function recalculateBalance(): void {
        $this->update(['current_balance' => $this->transactions()->sum('amount')]);
    }
    public function addTransaction(string $type, float $amount, ?int $accountId = null, ?string $note = null) {
        $txn = $this->transactions()->create([...]);
        $this->increment('current_balance', $amount);
        return $txn;
    }
}
```
Asset, CompanyLoan, Investor, OtherLiability — চারটাই এই একই trait ব্যবহার করবে, আলাদা করে একই কোড লিখতে হবে না।

### Action Class Pattern — উদাহরণ
```php
class ConfirmSaleAction {
    public function __construct(
        private StockService $stock,
        private LedgerService $ledger,
        private AccountService $account,
    ) {}

    public function execute(Sale $sale, array $payments): Sale {
        return DB::transaction(function () use ($sale, $payments) {
            foreach ($sale->items as $item) {
                if ($item->product->manage_stock) {
                    $this->stock->decrease($item->product, $item->quantity, 'sale', 'sale', $sale->id);
                }
            }
            $paid = $this->account->recordSplitPayment($payments, 'sale_payment', 'sale', $sale->id, $sale->sale_date);
            $sale->update(['paid_amount' => $paid, 'due_amount' => $sale->total_amount - $paid, 'status' => 'confirmed']);
            $this->ledger->recordContact($sale->customer, 'sale_invoice', +$sale->due_amount, 'sale', $sale->id);
            return $sale;
        });
    }
}
```

## ১৭.৪ Frontend — Reusable Components ⭐

### Base UI (shadcn থেকে — publish করে নিতে হয়)
```bash
npx shadcn@latest add button input select dialog table badge card tabs
```

### আমাদের নিজস্ব Shared Components
| Component | কাজ |
|---|---|
| `<DataTable />` | TanStack Table wrapper — search, sort, filter, pagination, bulk-select, mobile card fallback — **একবার বানিয়ে সব list page-এ** |
| `<FormModal />` | Dialog + form + submit/cancel — Category, Brand, Unit, Account সব ছোট CRUD-এ |
| `<ConfirmDialog />` | "নিশ্চিত?" — delete/confirm action-এ |
| `<ProductSearchInput />` | Barcode scan + fuzzy search + dropdown — Sale ও Purchase দুটোতেই |
| `<ContactSelect />` | Customer/Supplier picker + **বকেয়া badge** + সাম্প্রতিক কেনাকাটা |
| `<AccountPaymentRows />` | Split payment — একাধিক account+amount row যোগ/বাদ |
| `<MoneyInput />` | ৳ prefix, 2-decimal, thousand separator |
| `<StatusBadge />` | paid/due/partial · draft/confirmed — রঙসহ |
| `<LedgerTable />` | Debit/Credit/Running balance — Contact, Account, Asset, Loan, Staff সবখানে |
| `<EmptyState />` | "এখনো কিছু নেই" + action বাটন |
| `<PageHeader />` | Title + breadcrumb + primary action বাটন |

### Custom Hooks
| Hook | কাজ |
|---|---|
| `useDatatable()` | server-side pagination/sort/filter state ব্যবস্থাপনা |
| `useConfirm()` | promise-based confirm dialog |
| `useMoneyFormat()` | ৳ format + Bengali numeral option |
| `useKeyboardShortcut()` | F2/F4/Enter binding |
| `useUndoToast()` | ৩০ সেকেন্ডের undo window |

### TypeScript Types — Backend-এর সাথে মিলিয়ে
```typescript
// types/models.d.ts
export interface Product {
  id: number; name: string; sku: string;
  current_stock: number; avg_cost: number; selling_price: number;
  manage_stock: boolean; stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}
export type PaymentStatus = 'due' | 'partial' | 'paid';
export type SaleStatus = 'draft' | 'quotation' | 'confirmed' | 'cancelled';
```
> **টিপস:** Backend enum আর TypeScript type হাতে হাতে sync রাখা কঠিন — একটা artisan command লিখে PHP enum থেকে `.d.ts` auto-generate করে নিতে পারেন।

## ১৭.৫ Accessor / Mutator / Scope
| ধরন | ব্যবহার | উদাহরণ |
|---|---|---|
| Accessor | display-only derived | `stockStatus`, `balanceLabel`, `isOverdue` |
| Mutator | save করার আগে normalize | phone, email, SKU |
| Local Scope | reusable query | `lowStock()`, `customers()`, `overdue()` |
| Global Scope | ⚠️ শুধু `is_active` filter | cancelled sale-এ **ব্যবহার করবেন না** |

⚠️ `current_stock`, `balance`, `due_amount` — **column**, accessor নয় (নইলে filter/sort করা যাবে না)

## ১৭.৬ Packages

**Backend (composer):**
```
spatie/laravel-permission        — Role & Permission
spatie/laravel-activitylog       — Audit trail (trait যোগ করলেই auto)
spatie/laravel-backup            — DB backup
spatie/laravel-medialibrary      — Product image, documents
barryvdh/laravel-dompdf          — Invoice/Challan/Ledger PDF
picqer/php-barcode-generator     — Barcode label
maatwebsite/excel                — Import/Export (chunking সহ)
intervention/image               — Shop logo resize
```

**Frontend (npm):**
```
@tanstack/react-table    — Datatable (headless, নিজের design দেওয়া যায়)
react-hook-form + zod    — Form + validation
date-fns                 — তারিখ
recharts                 — Dashboard chart
lucide-react             — Icon
```

**লাগবে না:** Scheduled job/Queue — Laravel-এর built-in যথেষ্ট

## ১৭.৭ Testing (Laravel 13 upgrade-এর জন্যও জরুরি)
```php
// Feature test — সবচেয়ে গুরুত্বপূর্ণ: multi-table transaction ঠিক আছে কিনা
it('confirms sale and updates stock, ledger, account together', function () {
    $sale = Sale::factory()->draft()->create();
    app(ConfirmSaleAction::class)->execute($sale, [['account_id' => 1, 'amount' => 5000]]);

    expect($sale->fresh()->status)->toBe('confirmed')
        ->and(StockMovement::where('reference_id', $sale->id)->count())->toBe(1)
        ->and($sale->customer->fresh()->balance)->toBe(...);
});
```
প্রতিটা Action class-এর জন্য অন্তত একটা feature test — এটাই ভবিষ্যতে refactor/upgrade-এর সময় সবচেয়ে বড় ভরসা।

## ১৭.৮ Encryption 🔒
Encrypt: `accounts.account_number`, `settings.license_key`
`.env`-এ: API keys
**কখনোই store করবেন না:** Card number, CVV, PIN, OTP
Encrypt **করা হয় না**: phone/email (search ভেঙে যাবে)

---

# পর্ব ১৮ — Scale ও Performance (১০ বছরের হিসেব)

## ডেটা ভলিউম (দৈনিক ৩০ বিক্রির দোকান, ১০ বছর)

| টেবিল | Rows |
|---|---|
| stock_movements | ~৪,০৪,০০০ |
| contact_ledger | ~২,৩৮,০০০ |
| sale_items | ~২,১০,০০০ |
| account_transactions | ~১,৫৭,০০০ |
| **activity_logs** | **~১৩,৬৫,০০০** ⚠️ |
| **মোট** | **~২৭ লাখ** |

## ✅ উত্তর: System crash করবে না, ৫ লাখ ডেটায় দিব্যি চলবে
MySQL-এর জন্য ২৭ লাখ row মোটেও বড় না। তবে **দুটো জিনিস অবশ্যই করতে হবে:**

### ১. Composite Index (P&L report দ্রুত রাখতে)
```sql
sales:        INDEX(sale_date, status)
sale_items:   INDEX(sale_id, product_id)
purchases:    INDEX(purchase_date, status)
```
কারণ `sale_items`-এ date নেই (date আছে `sales`-এ), তাই প্রতি P&L-এ JOIN হয়

### ২. Activity Log Retention ⭐
সবচেয়ে বড় টেবিল, JSON ভারী। `settings.activity_log_retention_months` — Settings-এ **dropdown** (৩ / ৬ / ১২ / ১৮ মাস, default ১৮) — monthly job পুরনো log মুছবে।
⚠️ **শুধু audit log মোছে** — financial data (sale, ledger, stock) কখনো মোছা হয় না

### ৩. Dashboard Cache (২-৩ বছর পর লাগবে) 🟡
`daily_summaries` টেবিল — প্রতিদিনের total আগে থেকে হিসেব করে রাখা। এখন দরকার নেই, মনে রাখলেই হবে।

## Deduplication — কোনো সমস্যা নেই ✅
যেগুলো "duplicate" মনে হয়, সেগুলো **ইচ্ছাকৃত ও অপরিহার্য**:
- `cost_at_sale` — avg_cost বদলালেও পুরনো profit ঠিক থাকতে
- `current_stock`/`balance` — cached (read speed)
- `sale_item_service_periods` — template বদলালেও পুরনো বিক্রির শর্ত অক্ষত

---

# পর্ব ১৯ — Build Order

```
১.  Basic Auth + Settings
২.  Accounts (+ Account Types, Fund Transfer, Cash Book)
৩.  ⭐ Chart of Accounts + Journal Entry + JournalService   ← নতুন, Accounts-এর ঠিক পরেই
৪.  Inventory (Product, Category, Unit, Brand)
৫.  Contacts
৬.  Purchase (+ Journal posting)
৭.  Sales (+ Draft, Quotation, Journal posting)
৮.  Returns (+ Journal posting)
৯.  Sales Order
১০. Expense (+ Journal posting)
১১. Assets, Loan, Other Liability, Investor (+ Journal posting)
১২. Staff (+ Journal posting)
১৩. Warranty & Service
১৪. EMI + Serial
১৫. Import Tools
১৬. Dashboard + Reports (Trial Balance/P&L/Balance Sheet এখন Journal থেকে)
১৭. UI Polish (Datatable, Global Search, Dark mode)
১৮. Notification, Activity Log, Backup, Marketing
১৯. Reconciliation Check (scheduled job)
২০. Role & Permission (granular) ← সবার শেষে
```

**কেন এই ক্রম:** Settings আগে (invoice numbering লাগে) → Accounts (সবাই `account_id` reference করে) → **Chart of Accounts এখনই** কারণ এর পরের সব transaction module (Purchase/Sale/Expense...) journal entry post করবে → তারপর Product/Contact → তারপর transaction module → Reports সবার ডেটা লাগে বলে শেষে → Role শেষে (development-এ একটা admin login-ই যথেষ্ট)

---

# পর্ব ২০ — Invoice Template, AI Assistant, বহুভাষা

## ২০.১ পুরনো Sale entry (Historical Record) ⭐

দুই বছরের পুরনো বিক্রি record হিসেবে রাখতে চান, কিন্তু stock/balance-এ প্রভাব চান না?

**Add Sale form-এ checkbox:** ☐ **পুরনো রেকর্ড** (stock/ব্যালেন্সে প্রভাব ফেলবে না)

- চেক করলে → `sales.source = 'imported'` → **কোনো** stock_movement, contact_ledger, বা account_transaction তৈরি হবে **না**
- কিন্তু sale history আর customer-এর কেনাকাটার তালিকায় দেখাবে (proof হিসেবে থাকবে)

⚠️ **কেন এই নিয়ম:** আপনার Opening Stock তো আজকের বাস্তব stock (পুরনো বিক্রি বাদ দিয়েই) — পুরনো sale আবার stock কমালে **দুইবার** কমে যেত

**UI সতর্কতা:** এই checkbox "Advanced" section-এ folded থাকবে, যাতে দৈনন্দিন বিক্রিতে ভুলে টিক না পড়ে

## ২০.২ Invoice Template

```
invoice_templates
- name ("Classic"/"Modern"/"Minimal"), type(a4/thermal), is_default
- show_logo, show_signature_line, show_terms, show_qr_code   ← checkbox
- header_note, footer_note, terms_text                        ← নিজে লেখা
- accent_color
```

**২-৩টা ready design + toggle/text customization** — সম্পূর্ণ HTML editor **ইচ্ছাকৃতভাবে দেওয়া হয়নি**, কারণ non-technical owner একবার ভুল করলে সব invoice ভেঙে যাবে, ফেরার পথ থাকবে না

**Frontend:** Settings → Invoice Templates → **Page** (live preview সহ)

## ২০.৩ AI Assistant (Optional)

**কীভাবে কাজ করে:** আপনি লিখবেন "নুর নবীর কাছে কত পাওনা?" → Claude নিজে ঠিক করে কোন function ডাকতে হবে → আপনার Laravel app আসল query চালায় → Claude বাংলায় উত্তর দেয়

**Tool (function) গুলো:** `get_contact_balance` · `get_account_balance` · `get_low_stock_products` · `get_sales_summary`

**Chat-এর মতো** — আগের প্রশ্নের context মনে রাখে ("ওর গত মাসের বিক্রি কত?" — "ওর" মানে বুঝে নেবে)

```
ai_conversations — user_id, title, created_at
ai_messages      — conversation_id, role(user/assistant), content, tool_calls(JSON)
```

**৩টা অপরিহার্য শর্ত:**
1. ⚠️ **Permission check tool-এর ভিতরে হবে** — Cashier AI দিয়ে supplier due জিজ্ঞেস করলেও একই permission check হবে, AI কখনো bypass-এর রাস্তা হবে না
2. নাম fuzzy match — একাধিক মিললে Claude নিজেই জিজ্ঞেস করবে কোনটা
3. **Default off** — প্রতি প্রশ্নে ~৳০.৫০ খরচ, তাই `settings.ai_assistant_enabled`

**Frontend:** নিচে ডানে floating chat bubble → **Panel** (off থাকলে দেখাবেই না)

## ২০.৪ বহুভাষা (বাংলা/ইংরেজি)

```
users.locale    enum('en','bn'), default 'bn'
```
**Per-user setting** — staff বাংলা, owner ইংরেজি চাইতে পারেন

Laravel localization (`lang/bn/*.php`) + Inertia shared props দিয়ে React-এও একই translation

⚠️ **শুধু UI label/button/message অনুবাদ হবে** — product/customer-এর নাম যেভাবে লেখা সেভাবেই থাকবে

**বাংলা সংখ্যা:** `settings.bengali_numerals_enabled` (default false) — চালু করলে ৳১২,০০০ দেখাবে, নাহলে ৳12,000। আলাদা toggle কারণ বাংলাভাষী সবাই বাংলা সংখ্যা পছন্দ করেন না।

---

# পর্ব ২১ — Competitor Gap (বাংলাদেশ মার্কেট)

## আপনার যা নেই (competitor-দের আছে)
| Feature | অবস্থা |
|---|---|
| Payment Gateway (bKash/Nagad/SSLCommerz) | ⏳ পরে |
| **Offline Mode** | ⏳ সবচেয়ে বড় practical ঝুঁকি — ইন্টারনেট গেলে দোকান বন্ধ |
| Mobile App / PWA | ⏳ Candidate |
| ~~Bengali UI~~ | ✅ যোগ করা হয়েছে (পর্ব ২০.৪) |

## আপনার যা আছে (competitor-দের নেই) ⭐
- **Multi-period Service Plan** — "১ম বছর ২টা ফ্রি, ২য় বছর ০টা" — হোম অ্যাপ্লায়েন্স-বিশেষ, generic POS-এ নেই
- **দুই স্তরের Feature Toggle** — Furniture shop-এ EMI/Serial একদম দেখাবেই না
- **Modern UI + Dark Mode + Global Search** — বেশিরভাগ local tool পুরনো jQuery-ভিত্তিক
- **Weighted Average Costing** — সস্তা tool গুলো last-purchase-price ব্যবহার করে (ভুল profit দেখায়)
- **Single-tenant self-hosted** — দোকানের financial data নিজের server-এ থাকে

---

# পর্ব ২২ — এখনো বাকি / ভবিষ্যতের জন্য

| Item | অবস্থা |
|---|---|
| Expense module | 🟡 আপনি পুনর্বিবেচনা করবেন |
| Supplier/Customer Contract (credit limit, due days) | ⏳ Deferred |
| Register/Till Session (দৈনিক cash মেলানো) | ⏳ Designed, পরে |
| **Offline Mode** | ⏳ সবচেয়ে বড় practical gap |
| Payment Gateway (bKash/Nagad) | ⏳ Candidate |
| Mobile App / PWA | ⏳ Candidate |
| Import Revert, User Impersonation, Payroll Run, Onboarding Wizard | ⏳ Candidate |
| Sales Representative Report | ⏳ Commission staff লাগবে কিনা অনিশ্চিত |
| Dashboard cache (`daily_summaries`) | 🟡 ২-৩ বছর পর লাগবে |

---

*সিদ্ধান্তের বিস্তারিত কারণ ও বিকল্পসমূহ → `erp-design-decisions.md` • শুধু schema → `erp-database-schema.md`*
