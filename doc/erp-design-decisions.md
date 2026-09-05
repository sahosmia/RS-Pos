# ERP System — Design Decisions

**Stack:** Laravel + Inertia.js + React + TypeScript
**Scope:** Single shop, single database per install (no multi-tenancy), no warehouse module (for now)
**Purpose:** System design learning project — now also a commercial product, sold as a separate install per customer (single-tenant), annual subscription/update-fee pricing. Initial target market: home appliance sellers, then sanitary/hardware businesses.

Status legend: ✅ Final &nbsp; 🟡 Under discussion &nbsp; ⏳ Not yet discussed

---

## সূচিপত্র (Table of Contents)

**Part I — মূল ব্যবসায়িক মডিউল (Core Business Modules)**
- Phase 1: Inventory + Product Management
- Phase 2: Contact (Supplier/Customer) & Due Tracking
- Phase 3: Purchase Module
- Phase 4: Sales Module
- Phase 5: Sales Return / Purchase Return

**Part II — আর্থিক ও হিসাব ব্যবস্থাপনা (Financial & Accounting)**
- Phase 6: Accounts Module (Cash/Bank/Cheque)
- Phase 7: Expense Module 🟡
- Phase 8: Assets Module
- Phase 9: Company Loan Module
- Phase 10: Investor Module
- Phase 11: Other Liability Module

**Part III — মানুষ, রিপোর্ট ও UX (People, Reporting & UX)**
- Phase 12: Role & Permission Module
- Phase 13: Staff / Employee Module
- Phase 14: Dashboard / Reports Module
- Phase 15: Common UI/UX Features
- Phase 16: Polish Features (Notifications, Audit, Backup, Marketing, Barcode)

**Part IV — প্রযুক্তিগত ভিত্তি (Technical Foundation)**
- Phase 17: Technology Stack & Rationale
- Phase 18: Consolidated Enum Reference
- Phase 19: Settings Module
- Phase 20: Design System / UI Architecture

**Part V — অতিরিক্ত ব্যবসায়িক ফিচার (Feature Extensions)**
- Phase 21: Sales Order & Warranty
- Phase 22: Draft, Quotation & Import Sales
- Phase 23: Additional Reports & Business Model Clarification
- Phase 24: Final Sidebar Structure (consolidated)
- Phase 25: Installation & Service Tracking
- Phase 26: EMI/Installment Sale & Serial Number Tracking
- Phase 27: Market Differentiation & Competitive Positioning

**Part VI — ইঞ্জিনিয়ারিং ও নিরাপত্তা (Engineering & Security)**
- Phase 28: Controller Architecture & Database Indexing
- Phase 29: Data Encryption & Sensitive Data Handling

**Part VII — বাস্তব-জগৎ পরিমার্জন ও ব্যবসায়িক কৌশল (Real-World Refinements & Strategy)**
- Phase 30: Refinements from Real-World Reference System
- Phase 31: Software Licensing / Piracy Protection

---

## Suggested Build Order (by dependency, not by discussion order)

```
1.  Basic Auth (simple login, no full RBAC yet — just a users table)
2.  Settings (shop info + invoice/purchase numbering)   ← needed early since Sales/Purchase generate invoice_no from this
3.  Accounts (+ flexible Account Types, Fund Transfer, Cash Book)  ← foundational, referenced by almost every other module
4.  Inventory/Product (+ Brands, Units, Categories, minimum_stock_level, warranty_period_months, has_installation_service)
5.  Contact (Customer/Supplier)
6.  Purchase
7.  Sales (+ Draft/Quotation status, delivery_status)
8.  Sales/Purchase Return
9.  Sales Order                                          ← depends on Sales existing (converts into a Sale on fulfillment)
10. Expense
11. Assets
12. Company Loan
13. Other Liability
14. Investor
15. Staff                                                ← after Investor, since staff.investor_id links to it
16. Warranty & Installation/Service Tracking             ← depends on Sales + Products existing
17. EMI/Installment & Serial Number Tracking              ← extends Sales module, build alongside/after Sales
18. Import Tools (Products, Contacts, Opening Stock, Sales)
19. Dashboard/Reports                                    ← needs data from every module above
20. UI/UX Polish (Datatable, Global Search, Design System/Light-Dark mode)
21. Notifications, Activity Log, Backup, SMS Reminder, Barcode Label
22. Role & Permission (full granular)                    ← last; single admin login suffices during earlier development
```

Rationale: Settings comes early because invoice numbering is used from the first Sale/Purchase. Accounts comes right after because Purchase/Sale/Expense/Asset/Loan/Investor/Staff all reference `account_id` when money moves — building those forms is blocked without it. Returns and Sales Order need an existing Sale/Purchase to reference. Warranty/Service needs Sales+Products in place first. Import tools are naturally built after their target modules exist. Dashboard/Reports aggregates everything, so it comes near the end. UI polish and notification-type features can be layered on at any point but are lowest-risk to defer. Role/Permission can safely be last since a single Admin/Owner login is enough while building the rest; granular roles matter once Staff/Cashier users are added.

---

# Part I — মূল ব্যবসায়িক মডিউল

## Phase 1: Inventory + Product Management

### Core Entities ✅
- **Category** — product grouping, can be parent-child (e.g. Electronics → Mobile)
- **Product** — name, SKU/code, category, unit, buying price, selling price, current_stock, `is_active` (boolean, default true — added later, Phase 28, to support "mark inactive instead of delete" from Phase 15's bulk-delete guard)
- **Unit** — pcs, kg, box, etc.
- **StockMovement** — full audit log of every stock change

### Stock Quantity Strategy ✅
**Hybrid approach** — not pure sum-of-movements (too slow for list/dashboard pages at scale).

- `products.current_stock` — source of truth for fast reads (list pages, dashboard)
- `stock_movements` — full history/audit trail (never edited, only appended to)
- Every stock change happens inside a **DB transaction**: insert movement row + update `current_stock` together

```php
DB::transaction(function () use ($product, $qty, $type) {
    StockMovement::create([...]);
    $product->increment('current_stock', $type === 'in' ? $qty : -$qty);
});
```

### Stock Movement Types ✅
```
opening_stock
purchase
sale
sale_return
purchase_return
adjustment_increase
adjustment_decrease
```
(`sale_return` and `purchase_return` kept as separate types rather than a generic `return`, since they move stock in opposite directions — keeps movement history self-explanatory.)
Each movement row stores: `product_id`, `type`, `quantity`, `reason`/`note`, `created_by`.

**Rule: movements are immutable.** Never edit a past movement — always correct via a new movement (like accounting reversal entries). Preserves audit trail integrity.

### Opening Stock Rules ✅
- Set once, at product creation, via an "Opening Stock" field in the product form.
- If missed at creation time, allowed to be added **later** — but only if the product has **zero movements so far** (`current_stock` still effectively untouched).
- Once ANY movement exists for a product (including the opening_stock entry itself), the Opening Stock field becomes disabled/hidden. Further corrections must go through Stock Adjustment.

```php
$hasMovements = StockMovement::where('product_id', $product->id)->exists();
// false → show Opening Stock field
// true  → show Stock Adjustment option only
```

### Stock Adjustment — UI Placement ✅
- **Not** part of the product create/edit form.
- Separate **"Stock Adjustment"** button on the Product Detail page (or product list row).
- Clicking opens a **modal** to enter adjustment info (new actual quantity or +/- amount, reason).
- System calculates the difference and creates an `adjustment_increase` / `adjustment_decrease` movement automatically — user doesn't need to do the math manually.

### Product Images ✅ (new — gap identified and fixed)
No raw `image` column on `products` — uses `spatie/laravel-medialibrary`'s polymorphic media table instead, so any model (Product now, potentially others later) can attach images without a dedicated schema column per model:
```php
class Product extends Model implements HasMedia {
    use InteractsWithMedia;
    public function registerMediaConversions(?Media $media = null): void {
        $this->addMediaConversion('thumb')->width(150)->height(150);   // list pages, mobile cards
        $this->addMediaConversion('detail')->width(600)->height(600);  // detail page
    }
}
// $product->addMedia($request->file('image'))->toMediaCollection('images');
// $product->getFirstMediaUrl('images', 'thumb');
```

### Non-stock Products — `manage_stock` toggle ✅ (new — gap identified from reference system)
Some sellable items have no stock at all — e.g. "Installation Charge", "Repairing/Maintenance", "Delivery Charge" — these should be sellable via the normal Sale flow without ever touching stock:
```
products
- ...
- manage_stock    boolean, default: true
```
```php
if ($product->manage_stock) {
    // normal flow — stock_movements created, current_stock/avg_cost updated
} else {
    // service/non-stock item — sale_item created, but no stock_movements, no avg_cost impact
}
```
This gives a simpler alternative path for small service-type charges alongside the fuller Installation & Service Plan system (Phase 25) — Phase 25's structured service plans remain for warranty-linked servicing with free-quota tracking; `manage_stock = false` products are for simple one-off charges with no such tracking needed (e.g. "Delivery Charge", ad-hoc "Repairing").

### Not For Sale — `is_for_sale` ✅ (new, distinct from `is_active`)
```
products
- ...
- is_for_sale    boolean, default: true
```
Different from `is_active` (Phase 28's soft-delete-style flag): a product can remain fully active/in-stock (e.g. kept for inventory/reporting) while being hidden from the POS/Add Sale product picker specifically — `is_active` controls visibility everywhere, `is_for_sale` controls only sellability.

### Duplicate Product ✅ (new)
A one-click "Duplicate Product" action (Product list/detail page) copies a product's fields into a new draft product form — a practical workaround for near-identical products, consistent with the earlier "no product variants" decision (Phase 1 core scope) rather than reopening that decision.

### Product Brochure ✅ (new)
A separate document (PDF/spec sheet) attachable per product — added as another `spatie/laravel-medialibrary` collection alongside `images`:
```php
// $product->addMedia($request->file('brochure'))->toMediaCollection('brochure');
```

---

## Phase 2: Contact (Supplier/Customer) & Due Tracking

### Unified Contact Table ✅
Supplier and Customer are **not separate tables** — a single party can be both, so they live in one `contacts` table with a `type` field.

```
contacts
- id
- name
- phone
- address
- type       enum('customer', 'supplier', 'both')
- balance    decimal, default 0   -- cached running balance
- is_active  boolean, default true   -- added later (Phase 28) to support the "mark inactive instead of delete" rule from Phase 15's bulk-delete guard
```

Decision: went with **enum** (`customer` / `supplier` / `both`) over a separate role-pivot table — simpler, and sufficient for single-shop scope. Filtering customers = `WHERE type IN ('customer','both')`.

### Customer Group ✅ (kept)
Kept for now — useful even without differing prices, for filtering/segmentation. Later can extend into pricing tiers, group-level credit limits, or discount rules.

### Balance Sign Convention ✅
Same convention applies to both customers and suppliers — balance represents "net owe":
- **Positive (+)** → they owe *us* (receivable) — e.g. customer took goods, hasn't paid
- **Negative (−)** → *we* owe them (payable) — e.g. we took goods from supplier but haven't paid, or a customer overpaid (advance)

### Contact Ledger ✅
Same pattern as `stock_movements` — immutable history + cached running total on `contacts.balance`.

```
contact_ledger
- id
- contact_id
- type          (opening_balance, sale_invoice, purchase_bill, payment_received, payment_made, adjustment)
- amount        (+ or −)
- reference_id  (linked invoice/bill)
- note
- created_by
```

Every transaction updates `contact_ledger` + `contacts.balance` together inside a DB transaction — same as stock movements.

**Opening Balance rule**: same as opening stock — settable once at contact creation; once any ledger entry exists, further correction must go through an `adjustment` entry, not direct edit.

---

## Phase 3: Purchase Module

### Core Entities ✅
Header-detail pattern (one purchase can have many product line items):

```
purchases (purchase_bills)
- id
- supplier_id       (contacts, type = supplier/both)
- invoice_no
- purchase_date
- total_amount
- paid_amount
- due_amount
- status            enum('draft', 'ordered', 'received', 'cancelled')
- created_by

purchase_items
- id
- purchase_id
- product_id
- quantity
- unit_price        (cost at time of this purchase)
- subtotal
```

### Purchase Order — "ordered" status ✅ (new, mirrors Sales Order's advance-booking concept)
A purchase order sent to the supplier, goods not yet arrived — stock is untouched at this stage, same as `draft`. Only when status moves to `received` does stock actually increase (see below). This gives a real distinction between "not yet finalized internally" (draft) and "sent to supplier, awaiting delivery" (ordered) — useful for tracking what's incoming.

### On Purchase Confirm (single DB transaction) ✅
1. Create purchase header + purchase_items
2. For each item → create `stock_movements` (type: purchase) + increment `products.current_stock` + recalculate `avg_cost` (see Weighted Average below)
3. Create `contact_ledger` entry (type: purchase_bill, amount = −due_amount, i.e. payable) + decrement `contacts.balance`

### Purchase Edit/Correction Rule ✅
Same immutability principle as stock/opening-stock:
- **Draft/Pending** (not yet confirmed, no stock movement created yet) → free edit/delete, no side effects.
- **Confirmed/Received** (stock movement + ledger already created) → direct edit locked. Corrections go through an `adjustment_increase`/`adjustment_decrease` stock movement referencing the original purchase, with a reason note. `purchase_items.quantity` can still be updated for display accuracy, but the movement history keeps the original + correction entries intact.

### Payment (separate from purchase confirm) ✅
Paying off due later is a separate ledger-only transaction — no stock effect:
```php
ContactLedger::create(['type' => 'payment_made', 'amount' => +$amountPaid, ...]);
Contact::increment('balance', $amountPaid);
```

### Supplier Credit Auto-apply ✅ (new)
If a supplier's `contacts.balance` is currently **positive** (meaning, per the established sign convention, we previously overpaid them and they now owe us — a credit), the "Record Payment" form for a new purchase against that supplier auto-suggests applying this credit against the new due amount, rather than requiring a fresh cash payment.
```php
$supplierCredit = max($supplier->balance, 0);
$suggestedCreditApplied = min($supplierCredit, $purchase->due_amount);
```
Applying the credit does not move any real cash (no `account_transactions` row) — it's purely a ledger offset:
```php
ContactLedger::create(['contact_id'=>$supplier->id, 'type'=>'credit_applied', 'amount'=>-$creditApplied, 'reference_id'=>$purchase->id]);
Contact::decrement('balance', $creditApplied);
$purchase->increment('paid_amount', $creditApplied); // reduces purchase.due_amount accordingly
```

### Product Cost Pricing — Weighted Average Cost ✅ (final, chosen over Last Purchase Price)
Rationale: buying price varies per purchase; Last Purchase Price would misstate cost/profit when old and new stock have different costs. Weighted Average gives accurate ongoing cost — standard ERP/accounting approach. Chosen as final/fixed since the user does not want to change this logic later.

```
products.avg_cost   -- new field, cached weighted average cost
products.selling_price  -- fixed, set by owner, unaffected by purchases
```

Formula (recalculated only on purchase, not on sale):
```
new_avg_cost = ((current_stock × current_avg_cost) + (new_qty × new_purchase_price))
               / (current_stock + new_qty)
```
Edge case: if current_stock == 0, new_avg_cost = new_purchase_price (skip division).

`avg_cost` does NOT change on sale — sale only reduces `current_stock`. It only recalculates on new purchases (and stays unchanged on stock-decrease adjustments).

### Profit Calculation (future Sales module) ✅
Snapshot `avg_cost` onto each sale item at the moment of sale, so historical profit stays accurate even if `avg_cost` changes later:
```
sale_items.cost_at_sale = avg_cost at time of sale
profit = (unit_price - cost_at_sale) × quantity
```

---

## Phase 4: Sales Module

### Core Entities ✅
Header-detail pattern, mirroring Purchase:

```
sales (sale_invoices)
- id
- customer_id       (contacts, type = customer/both)
- invoice_no
- sale_date
- subtotal           (sum of item subtotals, after item-level discount)
- discount_type       enum('flat', 'percentage')   -- invoice-level discount
- discount_value
- discount_amount      (computed)
- total_amount         = subtotal - discount_amount
- paid_amount
- due_amount
- status             (draft, confirmed, cancelled)
- created_by

sale_items
- id
- sale_id
- product_id
- quantity
- original_price     (products.selling_price at time of sale, reference)
- unit_price          (actual sold price, can differ from selling_price)
- discount_amount      = original_price - unit_price
- cost_at_sale          (avg_cost snapshot at time of sale, for profit calc)
- subtotal
```

### Discount — 3 Levels ✅ (all kept)
| Level | Affects | Use case |
|---|---|---|
| **Item-level** | `sale_items.unit_price` vs `original_price` | Special price on a specific product |
| **Invoice-level** | `sales.discount_type`/`discount_value` on subtotal | Overall discount on the whole bill |
| **Ledger-level** | `contacts.balance` directly, via `contact_ledger` | Due/balance waived off, unrelated to a specific sale (loyalty, goodwill) |

Item-level and invoice-level discounts can combine within the same sale (invoice discount applies to the post-item-discount subtotal). Ledger-level discount is a separate `contact_ledger` entry (new type: `discount_waived`, amount positive → reduces receivable) — not tied to any sale row.

### On Sale Confirm (single DB transaction) ✅
Mirrors Purchase confirm:
1. Create sale header + sale_items (with original_price, unit_price, discount_amount, cost_at_sale snapshot)
2. For each item → create `stock_movements` (type: sale) + decrement `products.current_stock`. `avg_cost` is NOT recalculated on sale.
3. Create `contact_ledger` entry (type: sale_invoice, amount = +due_amount, i.e. receivable) + increment `contacts.balance`

### Sale Edit/Correction Rule ✅
Same immutability principle as Purchase — Draft freely editable; Confirmed sales locked, corrected via adjustment stock movement + ledger adjustment referencing the original sale.

### Profit Calculation ✅
```
profit = (sale_items.unit_price - sale_items.cost_at_sale) × quantity
```

---

## Phase 5: Sales Return / Purchase Return

### Sales Return (customer returns goods) ✅
Effects: stock **increases**, customer's due (receivable) **decreases**.

```
sale_returns
- id
- sale_id           (reference to original sale)
- customer_id
- return_date
- total_amount
- reason
- created_by

sale_return_items
- id
- sale_return_id
- product_id
- quantity          -- validated against original sale_items.quantity, can't exceed it
- unit_price          (from original sale_items)
- subtotal
```

On confirm (single DB transaction):
1. Create return header + items
2. `stock_movements` (type: sale_return) + increment `products.current_stock` — `avg_cost` NOT recalculated (returned stock's cost is represented by the original `cost_at_sale` snapshot, not a new purchase)
3. `contact_ledger` (type: sale_return, amount = −total_amount, receivable decreases) + decrement `contacts.balance`

### Purchase Return (we return goods to supplier) ✅
Mirror logic. Effects: stock **decreases**, our payable to supplier **decreases**.

```
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

On confirm (single DB transaction):
1. Create return header + items
2. `stock_movements` (type: purchase_return) + decrement `products.current_stock`
3. `contact_ledger` (type: purchase_return, amount = +total_amount, payable decreases) + increment `contacts.balance`

---

# Part II — আর্থিক ও হিসাব ব্যবস্থাপনা

## Phase 6: Accounts Module (Cash / Bank / Cheque)

### Core Concept ✅
An Account is a "money-holding entity" — same hybrid pattern as Product/Contact: cached balance for fast reads + immutable transaction ledger for history.

```
accounts
- id
- name              (e.g. "Cash Drawer", "City Bank - 1234", "Cheque in Hand")
- type               enum('cash', 'bank', 'cheque')
- opening_balance
- current_balance     -- cached, same pattern as products.current_stock
- created_by

account_transactions
- id
- account_id
- type               (opening_balance, sale_payment, purchase_payment, sale_return_refund, purchase_return_refund, expense, adjustment, transfer_in, transfer_out)
- amount              (+ or −)
- reference_type       (sale, purchase, sale_return, purchase_return, expense, manual)
- reference_id
- operation_date        (new field, added later — the authoritative business date for all reports; distinct from `created_at`, which is only the system-entry audit timestamp. Defaults to today, or to the linked source record's own date — sale_date/purchase_date/expense_date — when available, so it's not extra manual effort on every entry)
- note
- created_by
```

Opening balance rule: same as products/contacts — set once at account creation, corrected via adjustment afterward, never direct-edited once transactions exist.

### Cheque — kept simple for now ✅
Treated as a regular account type; bounce/clear status tracking (pending/cleared/bounced) is deferred — can extend `account_transactions` with a `status` field later if needed. Not in current scope.

### Contact Ledger vs Account Ledger — key distinction ✅
| | Contact Ledger | Account Ledger |
|---|---|---|
| Tracks | Who owes whom (receivable/payable) | Where actual money moved (cash/bank/cheque) |
| Updates on | Sale/Purchase **due amount** | Only the **actual paid/received amount** |

Both are updated together in the same transaction whenever a payment happens, but they answer different questions and must not be conflated.

### Payment Status ✅
Derived from `paid_amount` vs `total_amount`, not manually set:
```php
'due'      if paid_amount == 0
'partial'  if 0 < paid_amount < total_amount
'paid'     if paid_amount == total_amount
```
Applies uniformly to `sales` and `purchases`. Negative `due_amount` (customer overpaid) is handled naturally by the existing balance sign convention — can be labeled "Advance" in UI, no schema change needed.

### Multi-account Split Payment ✅ (final — chosen over single-account-per-transaction)
Rationale: a single sale/purchase can be paid using more than one account (e.g. part cash, part bank), so payment is NOT a single field on `sales`/`purchases` — each payment is its own `account_transactions` row referencing the sale/purchase.

```php
DB::transaction(function () use ($sale, $payments) {
    // $payments = [['account_id'=>1,'amount'=>300], ['account_id'=>2,'amount'=>200]]
    foreach ($payments as $p) {
        AccountTransaction::create([
            'account_id' => $p['account_id'],
            'type' => 'sale_payment',
            'amount' => +$p['amount'],
            'reference_type' => 'sale',
            'reference_id' => $sale->id,
        ]);
        Account::increment('current_balance', $p['amount']); // per account
    }
    $totalPaid = array_sum(array_column($payments, 'amount'));
    $sale->update([
        'due_amount' => $sale->total_amount - $totalPaid,
        'payment_status' => /* due/partial/paid logic */,
    ]);
});
```

`sales.paid_amount` / `purchases.paid_amount` cached (recalculated on save) for fast reads, same hybrid pattern as stock — but the account-wise breakdown always comes from `account_transactions`.

### Integration Points — every module that moves money creates an account_transactions row ✅
- **Sale** → `sale_payment` (+amount to account)
- **Purchase** → `purchase_payment` (−amount from account)
- **Sale Return refund** → `sale_return_refund` (−amount, money goes back to customer)
- **Purchase Return refund** → `purchase_return_refund` (+amount, supplier refunds us)
- **Standalone due payment received/made** → same `payment_received`/`payment_made` pattern as contact_ledger, mirrored on the account side

Every form involving payment (Sale, Purchase, standalone Payment, Return refund) needs an account selector (dropdown: which Cash/Bank/Cheque account), and can accept multiple account+amount pairs for split payment.

### Flexible Account Type/Sub Type ✅ (revised — real-world reference showed a fixed 3-value enum is too rigid)
```
account_types    -- lookup table, seedable defaults: Cash, Bank, Mobile Banking, Cheque
- id
- name

accounts
- ...
- account_type_id     (FK, replaces the earlier fixed enum('cash','bank','cheque'))
- account_sub_type      (nullable free text — e.g. "Bkash Agent", "Bkash Personal", "Nagad")
```
Lets a shop owner add new account types later (e.g. a new mobile banking provider) without a schema change. Default types seeded via `DatabaseSeeder` (Phase 28).

### Fund Transfer — moving money between the shop's own accounts ✅ (new)
Distinct from Sale/Purchase/Expense payments — this moves money between two of the shop's own accounts (e.g. Cash → Bank), with no external contact/invoice reference.
```
fund_transfers
- id
- from_account_id
- to_account_id
- amount
- transfer_date
- note
- created_by
```
```php
DB::transaction(function () use ($fromAccount, $toAccount, $amount) {
    $transfer = FundTransfer::create([...]);
    AccountTransaction::create(['account_id'=>$fromAccount->id, 'type'=>'transfer_out', 'amount'=>-$amount, 'reference_type'=>'fund_transfer', 'reference_id'=>$transfer->id]);
    Account::decrement('current_balance', $amount);
    AccountTransaction::create(['account_id'=>$toAccount->id, 'type'=>'transfer_in', 'amount'=>+$amount, 'reference_type'=>'fund_transfer', 'reference_id'=>$transfer->id]);
    Account::increment('current_balance', $amount);
});
```
Reuses the `transfer_in`/`transfer_out` account_transactions types already defined (Phase 18) — this just defines the full flow around them.

### Trial Balance ✅ (un-skipped — earlier decision revised)
Previously deferred as "needs a full double-entry chart of accounts" — a real-world reference showed it's actually just the existing Quick Balance Sheet data (Phase 14, 3a) rearranged into Debit/Credit columns, not a separate accounting model:
```php
$trialBalance = [
    'debit'  => customer_due + each account's current_balance (shown as-is, including negative/overdrawn accounts),
    'credit' => supplier_due,
];
```
No new tables — a report reusing the same Quick Balance Sheet data source with a different column layout.

### Cash Book / Petty Cash — fully standalone, excluded from Financial Position ✅ (revised)
A lightweight, free-category quick-entry ledger for genuinely small, miscellaneous transactions (tea, rickshaw fare, tips) that don't warrant the full Expense workflow. **Not a replacement** for structured Staff Advance or Company Loan entries — those still go through their own modules.

**Revised, final: Cash Book is entirely separate from the `accounts`/`account_transactions` system** — it does NOT tie to any real Account, does NOT create an `account_transactions` row, and is **deliberately excluded from Balance Sheet / Financial Position** calculations (Phase 14). It's an informal side-ledger for tracking small day-to-day cash movement, not part of the formal accounting picture.

```
misc_transaction_categories
- id
- name      -- e.g. "Convence", "Lunch/Nasta", "Tips", "Extra Income"
- type       enum('income', 'expense')

cash_book                 -- single-row header, cached running balance (same header+ledger pattern used elsewhere)
- id (always 1)
- current_balance          (cached)

cash_book_entries
- id
- type            enum('opening_balance', 'income', 'expense')
- category_id       (nullable — null for opening_balance)
- amount
- note
- entry_date
- created_by
```
```php
DB::transaction(function () use ($data) {
    CashBookEntry::create([...]);
    $delta = $data['type'] === 'expense' ? -$data['amount'] : +$data['amount'];
    CashBook::first()->increment('current_balance', $delta);
});
```
Opening balance follows the same one-time-entry rule as every other module (Phase 1's opening stock pattern) — set once, corrected via adjustment afterward.

---

## Phase 7: Expense Module 🟡 (needs revisiting — kept as-is for now, user wants to re-clarify later)

### Core Entities ✅
Follows the same due/partial/paid pattern as Purchase (chosen since expenses can have unpaid dues, e.g. a bill recorded before it's paid).

```
expense_categories
- id
- name              (Rent, Utility, Salary, Transport, Others...)

expenses
- id
- expense_category_id
- contact_id          (nullable — landlord/vendor, only if this expense is owed to someone)
- total_amount
- paid_amount          -- cached, derived from linked account_transactions (multi-account split, same pattern as sales/purchases)
- due_amount           = total_amount - paid_amount
- payment_status        enum('due', 'partial', 'paid')
- expense_date
- note
- created_by
```

Note: `contacts.type` enum may need a `vendor`-like value for landlords/utility providers, or these can be treated as `supplier` for now (conceptually similar — party owed money for goods/services).

### Payment — Multi-account split ✅
Same pattern as Sales/Purchase payments — each payment is its own `account_transactions` row (type: expense, negative amount, reference_type: expense), supporting split across Cash/Bank/Cheque. `paid_amount`/`due_amount`/`payment_status` recalculated from these.

If `contact_id` is set and `due_amount > 0`, a `contact_ledger` entry (type: expense_due, amount = −due_amount, payable) is also created — same integration pattern as Purchase.

**Note — splitting a payment over time is just usage of this same design, not a separate feature:** whether an expense (e.g. rent) is paid in 3 parts on the same day, or in 3 installments across different days, both are handled identically — each installment is its own `account_transactions` row referencing the same expense. `payment_status` naturally moves `due → partial → paid` as rows accumulate; no schema difference between "split at once" and "split over time".

### Recurring Expense ✅ (deferred, but structure clarified)
**Key clarification:** a recurring cost (e.g. monthly room rent) is NOT one expense with multiple payment transactions added over time — that pattern is only for splitting payment of a single one-time obligation (see note above). A recurring cost creates a **new, separate `expenses` row each period** (same `expense_category_id`, different `expense_date`), because each month is a distinct new liability:
```
expenses: id:1, category: Room Rent, month: Jan, total_amount: 3000, status: paid
expenses: id:2, category: Room Rent, month: Feb, total_amount: 3000, status: partial
expenses: id:3, category: Room Rent, month: Mar, total_amount: 3000, status: due
```
For now these are created manually each month. Later, auto-generation via a `recurring_expenses` template table + scheduled job can create these rows automatically — without changing this underlying structure.

### Due Tracking vs Profit/Loss — two different reports from the same data ✅
This distinction applies system-wide (not just expenses) and must be kept clear when building reports:

| Report | Computed from | Answers |
|---|---|---|
| **Profit/Loss (accrual)** | `total_amount`, grouped by date — regardless of payment_status | Is the business actually profitable this period? |
| **Due/Payable report (cash flow)** | `due_amount`, summed across unpaid records | How much money is still owed, right now? |

Gross/Net Profit formula (accrual — uses total_amount, not paid_amount):
```
Revenue      = SUM(sales.total_amount) for period
COGS         = SUM(sale_items.cost_at_sale × quantity) for period
Expenses     = SUM(expenses.total_amount) for period   ← counted whether paid or still due
Profit       = Revenue − COGS − Expenses
```
Total due (any time) = `SUM(due_amount)` across expenses/purchases/sales, optionally filtered by category/contact.

---

## Phase 8: Assets Module

### Core Concept ✅
An Asset is a value-holding entity, similar pattern to Product (stock) and Account (balance) — cached `current_value` + immutable `asset_transactions` history.

```
assets
- id
- name              (Shop Fridge, Delivery Van, Furniture...)
- category           (optional — Equipment, Vehicle, Furniture...)
- opening_value
- current_value       -- cached, same hybrid pattern
- purchase_date
- created_by

asset_transactions
- id
- asset_id
- type               enum('opening_asset', 'purchase', 'addition', 'sold', 'disposal')
- amount              (+ or −)
- account_id           (nullable — which account money moved to/from)
- note
- created_by
```

Opening value rule: same as products/contacts/accounts — set once, corrected via adjustment afterward, never direct-edited once transactions exist.

### Four Transaction Types ✅

**1. Opening Asset** (pre-existing asset entered into system) — `type: opening_asset`, sets `current_value`, no account movement.

**2. New Asset Purchase** — `type: purchase`, increments `current_value`; paired `account_transactions` (type: asset_purchase, negative) decrements the paying account. Single DB transaction.

**3. Addition/Upgrade to existing asset** (e.g. adding GPS/AC to a delivery van, increasing its value) — `type: addition`, increments `current_value` of the existing asset; same account-deduction pairing as purchase.

**4. Asset Sold** — `type: sold`, asset's `current_value` reduces to 0 (or by the sold portion); paired `account_transactions` (type: asset_sale, **positive**) increments the receiving account by the sale price. Important: asset value decreases, NOT increases, on sale — the account balance is what increases.

```php
// Sold — asset value drops, account balance rises
AssetTransaction::create(['asset_id'=>$id, 'type'=>'sold', 'amount'=>-$asset->current_value, 'account_id'=>$accId]);
$asset->update(['current_value' => 0]);
AccountTransaction::create(['account_id'=>$accId, 'type'=>'asset_sale', 'amount'=>+$salePrice, 'reference_type'=>'asset', 'reference_id'=>$id]);
Account::increment('current_balance', $salePrice);
```

### Gain/Loss on Sale ✅
```
Gain/Loss = Sale Price − Asset's book value (current_value) before sale
```
To be included in future Profit/Loss reporting.

### Depreciation — explicitly out of scope ✅
Not tracked for now (no automatic value reduction over time). `current_value` only changes via purchase/addition/sold/disposal/adjustment — never automatically by age. Can be added later as a separate scheduled recalculation without changing this core schema.

### Comparison with Product (for mental model) ✅
| | Product | Asset |
|---|---|---|
| Buy | stock increases | value increases |
| Sell | stock decreases, account increases | value decreases, account increases |
| Upgrade/addition | n/a (no variants) | value increases |
| Cost tracking | avg_cost | current_value (cached) |

---

## Phase 9: Company Loan Module

### Core Concept ✅
Same cached-balance + immutable-transaction-log pattern as Assets/Accounts, but direction is reversed — a loan is a liability that grows on disbursement/interest and shrinks on repayment.

```
company_loans
- id
- lender_name          (bank/person — or link to contacts if lender is a known contact)
- loan_amount            (original principal)
- interest_rate           (nullable, informational only — no automatic calculation)
- outstanding_balance     -- cached, current amount still owed
- start_date
- created_by

loan_transactions
- id
- company_loan_id
- type               enum('disbursement', 'repayment', 'interest_charge', 'adjustment')
- amount              (+ or −)
- account_id           (nullable — which account money moved to/from; null for interest_charge)
- note
- created_by
```

### Interest — manual entry only, no auto-calculation ✅
`interest_rate` is informational; actual interest amounts are added manually via `interest_charge` transactions when the user decides to record them (no scheduled/automatic interest calculation logic).

### Transaction Types Summary ✅
| Type | Effect on outstanding_balance | Effect on Account |
|---|---|---|
| `disbursement` | increases (new loan received) | account balance increases |
| `repayment` | decreases (paid back) | account balance decreases |
| `interest_charge` | increases (interest accrued) | **no account effect** — no real cash moved, purely accrual |
| `adjustment` | correction | situational |

```php
// Disbursement
LoanTransaction::create(['type'=>'disbursement', 'amount'=>+100000, 'account_id'=>$bankId]);
$loan->update(['outstanding_balance' => 100000]);
AccountTransaction::create(['account_id'=>$bankId, 'type'=>'loan_received', 'amount'=>+100000, ...]);
Account::increment('current_balance', 100000);

// Repayment
LoanTransaction::create(['type'=>'repayment', 'amount'=>-5000, 'account_id'=>$bankId]);
$loan->decrement('outstanding_balance', 5000);
AccountTransaction::create(['account_id'=>$bankId, 'type'=>'loan_repayment', 'amount'=>-5000, ...]);
Account::decrement('current_balance', 5000);

// Interest charge — no account_transactions row
LoanTransaction::create(['type'=>'interest_charge', 'amount'=>+2000, 'account_id'=>null]);
$loan->increment('outstanding_balance', 2000);
```

---

## Phase 10: Investor Module

### Core Concept ✅
Conceptually resembles Company Loan (cached balance + transaction log) but semantically opposite: a loan is a **liability** (must be repaid, often with interest); an investor's money is **equity** — not "repaid" on a schedule, instead earns profit share and can be withdrawn at the investor's discretion.

```
investors
- id
- name
- total_invested          -- cached, current capital still in the business
- created_by

investor_transactions
- id
- investor_id
- type               enum('investment', 'profit_share', 'withdrawal', 'adjustment')
- amount              (+ or −)
- account_id           (which account money moved to/from)
- note
- created_by
```

`ownership_percentage` explicitly **not** included — profit share amounts are always entered manually per distribution, no automatic percentage-based calculation.

### Three Transaction Types ✅

**1. Investment** (new capital in) — increments `total_invested`; paired `account_transactions` (positive) increments the receiving account. Same shape as loan disbursement, different meaning.

**2. Profit Share / Dividend** (paying out profit) — **`total_invested` does NOT change** — this is the key distinction from loan repayment, since the capital itself stays invested; only cash leaves via a negative `account_transactions` entry.

**3. Withdrawal** (investor pulls out capital) — **this is where `total_invested` decreases**, along with a negative `account_transactions` entry.

```php
// Investment
InvestorTransaction::create(['type'=>'investment', 'amount'=>+100000, 'account_id'=>$bankId]);
$investor->increment('total_invested', 100000);
AccountTransaction::create(['account_id'=>$bankId, 'type'=>'investment_received', 'amount'=>+100000, ...]);
Account::increment('current_balance', 100000);

// Profit share — total_invested untouched
InvestorTransaction::create(['type'=>'profit_share', 'amount'=>-5000, 'account_id'=>$bankId]);
AccountTransaction::create(['account_id'=>$bankId, 'type'=>'profit_distribution', 'amount'=>-5000, ...]);
Account::decrement('current_balance', 5000);

// Withdrawal — total_invested decreases
InvestorTransaction::create(['type'=>'withdrawal', 'amount'=>-50000, 'account_id'=>$bankId]);
$investor->decrement('total_invested', 50000);
AccountTransaction::create(['account_id'=>$bankId, 'type'=>'investor_withdrawal', 'amount'=>-50000, ...]);
Account::decrement('current_balance', 50000);
```

### Loan vs Investor — comparison ✅
| | Company Loan | Investor |
|---|---|---|
| Nature | Liability | Equity |
| Return of money | Mandatory scheduled repayment | Withdrawal is optional, no fixed schedule |
| Interest/Profit | Interest charge → balance increases | Profit share → total_invested unaffected |
| Balance meaning | How much is still owed | How much capital is still in the business |

---

---

## Phase 11: Other Liability Module

### Core Concept ✅
A catch-all liability entity for debts that don't fit Company Loan, Supplier due, or Expense due (e.g. an old unpaid tax, a personal/informal loan not tracked as a formal Company Loan, or a pre-system-startup debt with unclear origin). Structurally a mirror of the Asset module — same cached-balance + immutable-transaction pattern, but increases represent liability growing rather than value growing.

```
other_liabilities
- id
- name              (e.g. "Unpaid Tax 2024", "Personal loan from brother")
- opening_amount
- current_balance     -- cached
- created_by

other_liability_transactions
- id
- other_liability_id
- type               enum('opening_liability', 'increase', 'payment', 'adjustment')
- amount              (+ or −)
- account_id           (nullable — set when a real cash movement occurs, e.g. payment)
- note
- created_by
```

Behavior mirrors Assets: `opening_liability` sets the starting balance (same one-time rule as opening stock/asset); `increase` grows the balance (paired with account decrement if cash was received); `payment` reduces the balance (paired with account decrement, cash going out to settle it).

## Clarification — Liability sources ✅
"Liability" as a whole is a derived reporting concept (Assets = Liabilities + Equity), pulled from multiple sources — most are automatic byproducts of their owning module, one is a direct-entry catch-all:
```
Total Liability = SUM(company_loans.outstanding_balance)                            -- from Loan module
                 + SUM(contacts.balance) WHERE balance<0 AND type IN (supplier,both)   -- from Purchase/Contact module
                 + SUM(expenses.due_amount) WHERE payment_status != 'paid'             -- from Expense module
                 + |SUM(contacts.balance)| WHERE balance<0 AND type IN (customer,both) -- customer advances
                 + SUM(other_liabilities.current_balance)                              -- direct entry, Phase 11
```
Assets side = `assets.current_value` + `accounts.current_balance` + inventory value (stock × avg_cost) + receivables (contacts.balance > 0).
Equity side = `investors.total_invested` + accumulated profit.

This full picture (Balance Sheet) will be a computed report in the future Dashboard/Reports phase — not new data-entry tables beyond `other_liabilities`.

---

# Part III — মানুষ, রিপোর্ট ও UX

## Phase 12: Role & Permission Module

### Implementation Note ✅
Use **Spatie Laravel-permission** package rather than building RBAC from scratch — standard practice for Laravel. Schema below reflects the underlying concept the package implements.

### Core Entities ✅
```
users
- id, name, email, password, ...

roles
- id
- name              (Admin, Manager, Cashier, Staff...)

permissions
- id
- name              (product.create, product.edit, sale.create, expense.view...)
- module             (grouping — Inventory, Sales, Accounts, Reports...)

role_permissions   (pivot)
- role_id, permission_id

user_roles          (pivot — many-to-many)
- user_id, role_id
```

### Permission Naming Convention ✅
`module.action` format for granularity: `product.view`, `product.create`, `product.edit`, `product.delete`, `sale.view`, `sale.create`, `purchase.view`, `expense.view`, `report.view`, `account.view`, `account.transfer`, `role.manage`, etc.

### Default Roles (starting point) ✅
- **Admin/Owner** — all permissions
- **Manager** — Inventory, Purchase, Sales, Reports; limited access to sensitive areas (Accounts/Loan/Investor)
- **Cashier** — sale.create + product.view only
- **Staff** — view/create only on specific modules, no edit/delete

### Multiple Roles Per User ✅ (final — chosen over single-role)
A user can hold more than one role simultaneously (e.g. "Cashier" + "Inventory Staff"). Handled via the `user_roles` many-to-many pivot table — no extra schema needed beyond what's above.

---

## Phase 13: Staff / Employee Module

### Core Entity ✅
Staff resembles Contact (same cached-balance + ledger pattern) but for employees — with an optional link to Investor if a staff member has also invested in the business.

```
staff
- id
- name
- phone
- address
- designation
- joining_date
- salary_amount        (monthly fixed salary)
- status                enum('active', 'inactive')
- investor_id           (nullable — links to investors table if this staff member is also an investor)
- balance                -- cached, same sign convention as contacts
- created_by
```

### Staff-as-Investor ✅
No new structure needed — just link `staff.investor_id` to an existing `investors` record. All investment/profit-share/withdrawal logic reuses the Investor module (Phase 10) as-is.

### Staff Ledger — configurable transaction types ✅ (revised — mirrors Account Type's flexibility, Phase 6)
Rather than a fixed enum, transaction types are admin-manageable, each declaring its own effect on `staff.balance` — lets new types be added later (e.g. a new allowance category) without a schema change.
```
staff_transaction_types    -- lookup table, seeded with defaults below
- id
- name                       -- "Salary Charge", "Salary Payment", "Advance Given", "Loan Given", "Adjustment"...
- effect_on_balance            enum('increase', 'decrease')   -- whether this type increases or decreases staff.balance

staff_ledger
- id
- staff_id
- staff_transaction_type_id     (FK, replaces the earlier fixed 'type' enum)
- amount                          (always entered as a positive number; sign applied via the type's effect_on_balance)
- account_id                        (nullable)
- reference_id
- note
- created_by
```
```php
$type = StaffTransactionType::find($data['staff_transaction_type_id']);
$delta = $type->effect_on_balance === 'increase' ? +$data['amount'] : -$data['amount'];
StaffLedger::create([...]);
Staff::increment('balance', $delta); // or decrement, per sign
```

### Balance Sign Convention ✅ (same as contacts)
- **Negative (−)** → company owes staff (salary due, payable)
- **Positive (+)** → staff owes company (advance/loan taken, not yet earned/repaid)

### Default Seeded Transaction Types ✅ (behavior unchanged from the original four)

**1. Salary Charge** — `effect_on_balance: decrease` (monthly accrual, same pattern as recurring expenses — a new charge each month):
```php
StaffLedger::create(['staff_id'=>$id, 'staff_transaction_type_id'=>$salaryChargeTypeId, 'amount'=>15000]);
Staff::decrement('balance', 15000);
```
Also recorded as an `expenses` row (category: Salary) so it flows into Profit/Loss.

**2. Salary Payment** — `effect_on_balance: increase`:
```php
StaffLedger::create(['staff_transaction_type_id'=>$salaryPaymentTypeId, 'amount'=>15000, 'account_id'=>$bankId]);
Staff::increment('balance', 15000);
AccountTransaction::create(['amount'=>-15000, ...]); Account::decrement('current_balance', 15000);
```

**3. Advance Given** — `effect_on_balance: increase` (paid ahead of salary, offsets against future salary_charge automatically via the ledger sum — no separate deduction logic needed):
```php
StaffLedger::create(['staff_transaction_type_id'=>$advanceGivenTypeId, 'amount'=>5000, 'account_id'=>$cashId]);
Staff::increment('balance', 5000);
AccountTransaction::create(['amount'=>-5000, ...]);
```

**4. Loan Given** — `effect_on_balance: increase` (same underlying behavior as advance, just a distinct type value for reporting separation. No interest, no separate schedule — consistent with Company Loan's manual-interest-only approach):
```php
StaffLedger::create(['staff_transaction_type_id'=>$loanGivenTypeId, 'amount'=>X, 'account_id'=>$accId]);
Staff::increment('balance', X);
```
Rationale: advance and loan behave identically (money given to staff, staff owes it back, net-settles naturally through the ledger sum); keeping them as separate `type` values (not separate tables/logic) gives reporting distinction without duplicating logic. If interest/scheduling is ever needed for loans specifically, extend via a new ledger type rather than restructuring.

---

## Phase 14: Dashboard / Reports Module

### Core Principle ✅
No new core tables needed (one small schema addition below) — this phase reads/aggregates data from every module already designed. All reports are computed views, not new data-entry.

### Schema Addition — Low Stock Threshold ✅
```
products
- ...
- minimum_stock_level    (new field — triggers "Low Stock" when current_stock falls to/below this)
```
```php
Product::where('current_stock', '<=', DB::raw('minimum_stock_level'))->get();
```

### Reports List ✅
All account-based reports below (Cash Flow, Account Statement, Financial Position as-of-date filters) filter/sort by `account_transactions.operation_date` (the business date), not `created_at` (the system-entry timestamp) — this keeps reports accurate even when data entry happens later than the actual transaction date.

**1. Dashboard Summary** — today's sales, today's expenses, total receivable vs payable, combined Cash+Bank balance, low stock alerts.

### Dashboard Quick Actions ✅ (new — UX addition for non-technical daily use)
A row of prominent large action buttons sits **above** the summary widgets on the Dashboard, so common daily tasks don't require navigating the sidebar every time. No new schema — these are just permission-filtered links to existing create routes.

```
Default set: + New Sale · + New Purchase · + Receive Payment · + Make Payment · + New Expense · + New Contact
```

**Filtered by Role & Permission (Phase 12)** — each button checks the corresponding permission, so a Cashier sees only what their role allows (e.g. just "New Sale"), while Admin/Owner sees all:
```php
$quickActions = collect([
    ['label' => 'New Sale', 'route' => 'sales.create', 'permission' => 'sale.create', 'icon' => 'plus-circle'],
    ['label' => 'New Purchase', 'route' => 'purchases.create', 'permission' => 'purchase.create', 'icon' => 'shopping-cart'],
    ['label' => 'Receive Payment', 'route' => 'payments.receive', 'permission' => 'contact.payment', 'icon' => 'wallet'],
    ['label' => 'New Expense', 'route' => 'expenses.create', 'permission' => 'expense.create', 'icon' => 'receipt'],
    ['label' => 'New Contact', 'route' => 'contacts.create', 'permission' => 'contact.create', 'icon' => 'user-plus'],
])->filter(fn($action) => auth()->user()->can($action['permission']));
```

**Layout**: Desktop shows a button grid (icon + label); mobile shows a horizontally-scrollable row or 2-column grid with large thumb-friendly tap targets. Dashboard page order: Quick Actions (top) → Summary Cards → Charts/Recent Activity (below).

Fixed list for now (not user-customizable) — kept simple; a future "choose your own quick actions" preference could be added without restructuring.

**2. Profit & Loss Report** (accrual, date-range selectable):
```
Revenue  = SUM(sales.total_amount) for period
COGS     = SUM(sale_items.cost_at_sale × quantity) for period
Expenses = SUM(expenses.total_amount) for period   (includes staff salary_charge rows)
Profit   = Revenue − COGS − Expenses
```

**3. Balance Sheet — two distinct reports** ✅ (refined after reviewing reference screenshots from a real-world similar ERP):

**3a. Quick Balance Sheet** (day-to-day snapshot):
```
Liability = Supplier Due (contacts.balance < 0, type IN supplier/both)
Assets    = Customer Due (contacts.balance > 0, type IN customer/both)
          + Closing Stock (inventory value: stock × avg_cost)
          + Account Balances (accounts.current_balance, listed per individual account)
```

**3b. Full Financial Position** (proper double-entry-style statement, matching standard Liabilities/DR vs Assets/CR presentation):
```
Liabilities/DR = Capital (investors.total_invested)
               + Company Loan (company_loans.outstanding_balance)
               + Sundry Creditors (supplier dues)
               + Other Liabilities (other_liabilities.current_balance)
               + Gross/Net Profit (accumulated profit — balancing figure; shown negative/red if a loss, since it reduces owner's equity)

Assets/CR      = Closing Stock (inventory value)
               + Sundry Debtors (customer dues/receivables)
               + Company/Staff Advances (staff.balance where positive — staff owes company; shown as a receivable/asset, can appear negative if net staff balance favors staff)
               + Cash at Bank (accounts.current_balance, summed)
               + Other Assets (assets.current_value)
```
Note: **Staff advance/loan balances belong on the Assets side** (staff owing the company is a receivable) — this was missing from the original single-formula version and is now folded in explicitly. Profit is placed on the Liabilities/DR side as the balancing item, per standard accounting treatment (retained profit increases what the business "owes" its owner).

**4. Stock Report** — current stock list (low stock highlighted via `minimum_stock_level`), per-product movement history (from `stock_movements`).

**5. Due/Payable Report** — customer-wise receivable list, supplier-wise payable list (from `contacts`/`contact_ledger`), staff advance/loan balances (from `staff`/`staff_ledger`).

**6. Account Statement** — per-account (Cash/Bank/Cheque) transaction history, bank-statement style (from `account_transactions`).

**7. Sales/Purchase Report** — date-range, product-wise, customer/supplier-wise summaries.

### Performance Note — deferred optimization ✅
Reports query live data directly for now (fine at current scale). If aggregation becomes slow as data grows (per the earlier stock_movements performance discussion), a future `daily_summaries` cache table (pre-computed daily totals for sales/expenses/profit) can be added without changing the underlying schema — not needed at this stage.

---

## Phase 15: Common UI/UX Features

### List-Page Features ✅ (applies to every module — Product, Sale, Purchase, Contact, Expense, etc.)
Reusable pattern, not per-module schema — build once, reuse everywhere:
- **Search** — by name/invoice_no/phone
- **Filter** — date range, category, status (paid/due/partial), customer/supplier
- **Sort** — click column header, ascending/descending
- **Pagination** — server-side, standard Laravel pagination
- **Datatable** — combines the above (Inertia + TanStack Table or server-side paginated table)

### Bulk Actions / Multi-select Toolbar ✅ (new — generalizes the Contacts "select + Send Notification" flow)
Any Datatable supports row checkboxes; selecting one or more rows shows a contextual toolbar with actions relevant to that page. Reusable pattern, not a per-page rebuild.

- **Contacts**: Send Notification (Phase 16 #5), Export Selected, Add to Customer Group, Export Ledger PDF (bulk), Bulk Delete (guarded — see below)
- **Products**: Export Selected, Bulk Print Labels (barcode, Phase 16 #7), Bulk Category/Brand Assign
- **Sales/Purchase**: Export Selected, Bulk Print Invoices, Bulk Mark as Delivered (sales only, sets `delivery_status`)

**Export Selected** on any page filters the existing Export logic (`maatwebsite/excel`, Import/Export above) down to just the selected row IDs — no new export mechanism needed.

**Bulk Delete — guarded by transaction history ✅**: consistent with the immutability principle used throughout (stock movements, ledgers are never deleted), a contact/product can only be hard-deleted if it has no history:
```php
if ($contact->ledgerEntries()->exists() || $contact->sales()->exists()) {
    // block hard delete — offer "mark inactive" instead
}
```
Records with no transaction history (e.g. accidentally created duplicates) can be safely deleted; anything with history is soft-deleted/marked inactive instead.

### Import/Export ✅
- **Export** — CSV/Excel/PDF for any report/list (e.g. monthly sales list)
- **Import** — bulk product/contact upload via CSV/Excel — most useful for initial data migration from old records

### Invoice ✅
No new schema — already fully supported by existing `sales`/`purchases` tables. Just needs a print/PDF view (e.g. Laravel DomPDF or browser print).

### Delivery Tracking / Delivery Challan ✅
Delivery timing is mixed (sometimes instant, sometimes later) — chosen approach: extend `sales` directly rather than a separate `delivery_challans` entity, since every delivery here is tied to an existing sale (no separate consignment/sample use case).

```
sales
- ...
- delivery_status    enum('pending', 'delivered')
- delivered_at        (nullable timestamp)
```

- Defaults to `pending` on sale creation; can be set to `delivered` immediately at creation (e.g. a toggle) if delivered on the spot.
- Otherwise, marked `delivered` later via a "Mark as Delivered" action on the sale, which also sets `delivered_at`.
- **Invoice** and **Delivery Challan** are both printed from the same `sale_items` data — Challan is just a print template variant that omits price/amount, showing only product + quantity. No separate data or table needed.

---

## Phase 16: Polish Features (Notifications, Audit, Backup, Reminders, Barcode)

### 1. Notification/Alert System ✅
```
notifications
- id
- type              enum('low_stock', 'due_payment', 'loan_repayment', 'expense_due')
- title
- message
- reference_type      (product, sale, company_loan, expense...)
- reference_id
- is_read
- created_at
```
Driven by a daily scheduled job (Laravel Task Scheduling) checking:
- `products.current_stock <= minimum_stock_level` → low_stock
- `sales.due_date < today AND payment_status != 'paid'` → due_payment
- similarly for loan repayment / expense due dates

### 2. Activity Log / Audit Trail ✅
```
activity_logs
- id
- user_id
- action             (created, updated, deleted)
- model_type          (Product, Sale, Expense...)
- model_id
- old_values           (JSON)
- new_values           (JSON)
- ip_address
- created_at
```
**Implementation note:** use **Spatie Laravel-activitylog** package rather than building from scratch — add a trait to models to auto-track changes.

### 3. Backup / Data Export ⚠️ SUPERSEDED by Phase 35 §13 — Scheduled + Restore reinstated
~~A single **"Backup Now"** button in Settings — click it, a full DB backup is generated immediately. Nothing automatic, nothing scheduled.~~
- **Implementation note:** use **Spatie Laravel-backup** package for backup creation (`backup:run`) — standard practice, saves hand-rolling a `mysqldump` wrapper.
- Backup list shown in Settings → Backup page comes directly from the storage disk (filename, `created_at`, size) — no separate DB table needed.
- **Download Backup** — a `backup.manage`-gated download link lets the owner keep an off-site copy (own Google Drive/pendrive).
- ~~Restore is explicitly out of scope for now~~ — this was simplified early on for a small-shop-only target; once larger, audit-needing clients entered scope, that trade-off no longer held. **See Phase 35 §13 for the current, authoritative design** (scheduled automatic backup, retention, health monitoring, and a fully guarded self-service restore flow).

### 4. Customer-facing Notification — multi-channel (SMS/WhatsApp/Email) ✅
Generalized from SMS-only to support choosing the channel per message, since not every contact has every channel (e.g. no email on file) and the sender wants to pick WhatsApp vs SMS vs Email at the time of sending.

```
contacts
- ...
- email    (nullable, new field)
```

```
message_logs   -- renamed/generalized from sms_logs
- id
- contact_id
- channel             enum('sms', 'whatsapp', 'email')
- subject              (nullable — email only)
- message
- status              enum('sent', 'failed', 'pending')
- reference_type        (sale, contact_ledger, campaign...)
- reference_id
- sent_at
- created_by
```

**Channel picker at send time**: on the "Send Due Reminder" action (contact/sale detail page), the user sees buttons/dropdown for whichever channels are available for that contact (Email option disabled if `contacts.email` is empty) — WhatsApp / SMS / Email, chosen per send, not fixed per contact.

Manual trigger only for now (same as before) — automatic scheduled reminders can be added later once manual sending/API integration works.

### 5. Marketing Broadcast — entry point: Contacts page checkbox selection ✅ (refined)
Rather than a standalone campaign-creation form, the primary entry point is the **Contacts list page**: each row gets a checkbox, the user selects any number of contacts, and a "Send Notification" bulk action appears. Clicking it opens a compose modal (message text + channel choice — WhatsApp/SMS/Email, filtered to what each selected contact actually has available) and sends to just that selection. This still uses the same underlying structure as a broader campaign (all-customers or a customer-group send), just scoped differently:

```
campaigns
- id
- title
- message
- channel              enum('sms', 'whatsapp', 'email')
- target_type            enum('all_customers', 'customer_group', 'custom_selection')
- target_group_id         (nullable — if target_type = customer_group)
- status                 enum('draft', 'sending', 'completed', 'failed')
- created_by
- created_at

campaign_recipients
- id
- campaign_id
- contact_id
- status    enum('pending', 'sent', 'failed')
- sent_at

UNIQUE(campaign_id, contact_id)
```

**Duplicate-send prevention ✅**: the `UNIQUE(campaign_id, contact_id)` constraint means a contact can only appear once per campaign — even if the UI selection has an accidental duplicate or the send action is double-submitted, recipient rows are built with `firstOrCreate`/insert-ignore, so no one receives the same campaign message twice. The compose modal also shows a recipient count ("Sending to 12 contacts") before confirming, so an oversized or accidental selection is visible before it goes out.

**Sending flow**: a queued job iterates the recipient list, sends via the chosen channel, logs each send into `message_logs` (unified history alongside due reminders) and updates `campaign_recipients.status`. Reuses the same channel APIs (SMS gateway, WhatsApp Business API, Laravel Mail) as the due reminder feature.

### 6. Send Document via Channel — e.g. Ledger PDF to WhatsApp/Email ✅ (new)
One-click send of a generated document (starting with a contact's Ledger statement) directly to their WhatsApp or Email, from the Contact detail page.

```
message_logs
- ...
- attachment_type    (nullable, e.g. 'ledger_pdf', 'invoice_pdf')
- attachment_path     (nullable — generated PDF file path used for sending)
```

**Flow:**
```php
// "Send Ledger PDF" action on Contact detail page
$pdf = Pdf::loadView('ledger-pdf', ['contact' => $contact, 'ledger' => $contact->ledgerEntries])->output();
$path = Storage::put("ledger-pdfs/{$contact->id}-" . now()->timestamp . ".pdf", $pdf);

MessageLog::create([
    'contact_id' => $contact->id,
    'channel' => $selectedChannel,   // whatsapp or email
    'message' => 'Your account ledger statement',
    'attachment_type' => 'ledger_pdf',
    'attachment_path' => $path,
    'status' => 'pending',
]);
// queued job sends the attachment via the chosen channel's API (WhatsApp media message / Email attachment)
```
Same pattern can extend to other documents later (e.g. sending a specific Invoice PDF) by reusing `attachment_type`/`attachment_path` with a different generating view.

### 7. Barcode Label Print ✅
```
products
- ...
- barcode            (nullable, unique — new field)
```
Needs a barcode-generation library (e.g. `picqer/php-barcode-generator`) and a print template (product name, price, barcode image) laid out for label or A4 printing.

---

# Part IV — প্রযুক্তিগত ভিত্তি

## Phase 17: Technology Stack & Rationale

### Laravel version ✅
**Laravel 12** for now, with a planned move to 13 later. Start via the official React starter kit (`laravel new erp-app --react`) — ships Inertia 2 + React 19 + Tailwind 4 + shadcn/ui + Fortify auth pre-configured, matching this project's chosen stack exactly rather than wiring it up manually. To keep the future 13 upgrade smooth: avoid deprecated APIs and maintain feature tests around each Action class (the tests are the real safety net during a framework upgrade).

### Reusable Services ✅ (extracted to avoid duplicating multi-table logic across modules)
- **StockService** — `increase()` / `decrease()`: the only place that writes `stock_movements` + adjusts `products.current_stock`. All of Purchase, Sale, Returns, Adjustment call it.
- **LedgerService** — `recordContact()` / `recordStaff()`: writes the ledger row + adjusts the cached balance together.
- **AccountService** — `record()` and `recordSplitPayment()`: writes `account_transactions` (with `operation_date`) + adjusts `accounts.current_balance`; the split variant loops multiple account/amount pairs for one source document.
- **HasLedger trait** — shared by Asset, CompanyLoan, Investor, OtherLiability, since all four use the identical header + ledger + cached-balance shape.

Action classes (`app/Actions/`) compose these services inside a single `DB::transaction()`; controllers stay thin (validate → call action).

### Why this stack — reasoning behind each core choice ✅
- **Laravel** — existing 3+ years of experience with it; its `DB::transaction()` handling fits this system's core pattern (stock/ledger/account updates happening atomically together throughout every phase); built-in Task Scheduling covers Notifications, Backup, EMI overdue checks with no extra tooling.
- **MySQL** — mature with Laravel, cheap/available on Bangladesh hosting; InnoDB's ACID guarantees are essential since the whole financial design (Sale, Purchase, Accounts, Ledger) depends on atomic multi-table writes never partially completing.
- **Inertia.js** — since the product is single-tenant (one install per shop, Phase 23) with no mobile app or third-party API consumer needed, a separate REST API layer would be unnecessary complexity. Inertia lets Laravel controllers hand data straight to React pages — SPA feel without API versioning/token overhead.
- **React + TypeScript** — prior experience; TypeScript's compile-time checking helps catch mistakes early across a schema this large (30+ enum types, deeply interlinked modules) — e.g. an invalid enum value gets caught before runtime.
- **Tailwind CSS** — utility-first, and its `dark:` class strategy maps directly onto the CSS-variable design-token approach chosen for Light/Dark mode (Phase 20).
- **shadcn/ui** — copy-into-codebase components (not a locked black-box library) that can be fully customized to the design tokens — matches Phase 20's "reusable component library" requirement.

### Backend (Composer)
```
laravel/breeze                    -- auth scaffold
spatie/laravel-permission          -- Role & Permission (Phase 12) — RBAC edge cases (multi-role, caching) are easy to get wrong hand-rolled; this is battle-tested
spatie/laravel-activitylog         -- Activity Log (Phase 16) — a trait auto-tracks changes instead of manual logging in every controller
spatie/laravel-backup              -- Backup/Export (Phase 16) — handles cloud storage integration/scheduling that's hard to maintain hand-rolled
barryvdh/laravel-dompdf            -- Invoice/Delivery Challan PDF generation — renders PDFs straight from Blade views, no headless browser needed
picqer/php-barcode-generator       -- Barcode Label Print (Phase 16)
maatwebsite/excel                  -- Import/Export CSV/Excel (Phase 15) — handles chunking for large files, avoiding memory issues
spatie/laravel-medialibrary        -- Product Images — polymorphic media table + automatic thumbnail conversions (uses intervention/image internally), consistent with the existing Spatie ecosystem
intervention/image                 -- Shop Logo resize (Settings) — used directly for this single-image field; the full media library is unnecessary overhead for one field
```
Multi-channel notifications (Phase 16): no universal package for SMS/WhatsApp — Bangladesh SMS providers (SSL Wireless, Bulk SMS BD, Alpha SMS) and WhatsApp Business API expose their own REST APIs, called via Laravel's `Http` facade once a provider is chosen. Email uses Laravel's built-in Mail facade (SMTP) — no extra package.

### Frontend (npm)
```
@inertiajs/react, react, react-dom, typescript   -- core stack
@tanstack/react-table                             -- Datatable (search/sort/pagination) — headless, so it can be styled exactly to the design tokens rather than fighting a themed library
date-fns                                          -- date filtering/formatting
react-hook-form, zod                              -- forms + validation
lucide-react                                      -- icons
tailwindcss                                       -- styling
recharts                                          -- Dashboard charts (Phase 14)
```

### No package needed
Scheduled jobs (Notifications, Backup triggers, Recurring Expense generation) use Laravel's built-in Task Scheduling + Queue — no extra package required.

### Deployment note ✅
Since the business model is single-tenant (Phase 23 — one install per customer shop), hosting stays simple: ordinary shared hosting or a small VPS is sufficient per install. No Kubernetes, load balancer, or multi-tenant infrastructure needed — keeps hosting cost low and deployment straightforward (one standard Laravel app, a fresh database per customer).

---

## Phase 18: Consolidated Enum Reference
All enum/status fields used across the schema, gathered in one place for quick lookup during implementation.

```
stock_movements.type        opening_stock, purchase, sale, sale_return, purchase_return, adjustment_increase, adjustment_decrease

contacts.type                customer, supplier, both
contact_ledger.type          opening_balance, sale_invoice, purchase_bill, payment_received, payment_made, adjustment, sale_return, purchase_return, discount_waived, expense_due, sales_order_advance, credit_applied

purchases.status              draft, ordered, received, cancelled
sales.status                  draft, quotation, confirmed, cancelled
sales.source                  manual, imported
purchases.source              manual, imported
invoice_templates.type        a4, thermal
ai_messages.role              user, assistant
sales.discount_type           flat, percentage
sales.delivery_status         pending, delivered
sales.financing_type          one_time, emi   -- renamed from payment_type (Phase 35)

sales_orders.status           pending, partial, completed, cancelled

emi_installments.status       pending, paid, overdue

payment_status                due, partial, paid   -- shared across sales, purchases, expenses

accounts.type                 (moved to account_types lookup table — Cash, Bank, Mobile Banking, Cheque as seeded defaults, extensible)
misc_transaction_categories.type   income, expense
cash_book_entries.type             opening_balance, income, expense   -- standalone ledger, does NOT touch account_transactions (Phase 6, revised)

chart_of_accounts.type              asset, liability, equity, income, expense
chart_of_accounts.normal_balance     debit, credit
journal_entries.status               posted, reversed
accounting_periods.status            open, closed
serial_numbers.status                 in_stock, sold, returned, under_warranty_service, disposed
account_transactions.type     opening_balance, sale_payment, purchase_payment, sale_return_refund, purchase_return_refund, expense, adjustment, transfer_in, transfer_out, loan_received, loan_repayment, asset_purchase, asset_sale, investment_received, profit_distribution, investor_withdrawal, sales_order_advance, service_charge, staff_salary_payment, staff_advance, staff_loan, emi_payment

asset_transactions.type       opening_asset, purchase, addition, sold, disposal

loan_transactions.type        disbursement, repayment, interest_charge, adjustment

investor_transactions.type    investment, profit_share, withdrawal, adjustment

other_liability_transactions.type   opening_liability, increase, payment, adjustment

staff.status                  active, inactive
staff_transaction_types.effect_on_balance   increase, decrease   -- lookup table (Phase 13, revised), not a fixed enum; default seeded types: Salary Charge, Salary Payment, Advance Given, Loan Given, Adjustment

warranty_claims.status        pending, in_progress, resolved, rejected
service_requests.type         installation, service
service_requests.status       pending, scheduled, completed, cancelled

notifications.type            low_stock, due_payment, loan_repayment, expense_due
activity_logs.action          created, updated, deleted
message_logs.channel           sms, whatsapp, email
message_logs.status            sent, failed, pending
campaigns.channel              sms, whatsapp, email
campaigns.target_type           all_customers, customer_group, custom_selection
campaigns.status                draft, sending, completed, failed
campaign_recipients.status      pending, sent, failed

invoice_templates.type          a4, thermal
ai_messages.role                user, assistant
users.locale                    en, bn
settings.activity_log_retention_months   3, 6, 12, 18   -- dropdown values, default 18
```

Note: Phase 13's Staff module `account_transactions` rows (salary payment, advance given, loan given) use the explicit types `staff_salary_payment`, `staff_advance`, `staff_loan` respectively — this wasn't spelled out in Phase 13's code snippets but is now made explicit here for consistency.

---

## Phase 19: Settings Module

### Design — Single Settings Row ✅ (chosen over key-value table)
Since this is single-shop scope with fixed, known fields (not multi-tenant, no need for dynamic user-defined settings), a single-row table with typed columns is simpler and gives type-safety, versus a flexible key-value table which adds unneeded complexity here.

```
settings
- id (always 1)
- shop_name
- shop_logo
- shop_address
- shop_phone
- currency_symbol       (৳)
- invoice_prefix          (e.g. "INV-")
- invoice_next_number      (auto-increment tracker)
- purchase_prefix          (e.g. "PUR-")
- purchase_next_number
- thermal_printer_enabled  boolean (default: false)
- emi_module_enabled        boolean (default: false)
- serial_number_module_enabled  boolean (default: false)
- ai_assistant_enabled          boolean (default: false)
- bengali_numerals_enabled       boolean (default: false)
- activity_log_retention_months  integer (dropdown: 3/6/12/18, default 18)
- fiscal_year_start_month        integer 1-12 (default 7)
- updated_by
```

Tax/VAT fields explicitly **excluded** — not needed now, can be added later as nullable columns without restructuring.

### Invoice Numbering Logic ✅
```php
$nextNumber = Settings::first()->invoice_next_number;
$invoiceNo = Settings::first()->invoice_prefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
// e.g. INV-0001

DB::transaction(function () {
    // create sale with this invoice_no
    Settings::first()->increment('invoice_next_number');
});
```
Same pattern applies to Purchase with its own prefix/counter.

---

## Phase 20: Design System / UI Architecture

### Light/Dark Mode ✅
- Tailwind `dark` class strategy (`darkMode: 'class'` in tailwind.config)
- **Design tokens** as CSS variables (colors, spacing, radius) — not hardcoded per-component — so Light/Dark share identical spacing/typography and only color tokens swap:
```css
:root { --color-primary: ...; --color-bg: ...; --radius: ...; }
.dark { --color-primary: ...; --color-bg: ...; }
```

### Theme Preference Persistence ✅
```
users
- ...
- theme_preference    enum('light', 'dark', 'system')    -- nullable, new field
```
Immediate toggle via `localStorage` (avoids flicker on reload); optionally persisted to `users.theme_preference` for cross-device consistency on login.

### Reusable Component Library ✅
- Base component library using **shadcn/ui** (Button, Input, Select, Modal, Table, Badge, Card, etc.) — built once, reused everywhere.
- All components pull styling from design tokens (CSS variables), not hardcoded values — ensures automatic correctness across Light/Dark.
- Folder structure: `resources/js/Components/ui/` (base/reusable) + `resources/js/Components/` (business-specific, e.g. ProductCard, InvoiceTable).

### Global Search ✅
Only piece requiring backend logic — a command-palette style search (Ctrl+K/Cmd+K) querying multiple modules at once:
```php
// Route: /api/global-search?q=...
$products = Product::where('name','like',"%$q%")->limit(5)->get();
$contacts = Contact::where('name','like',"%$q%")->limit(5)->get();
$sales    = Sale::where('invoice_no','like',"%$q%")->limit(5)->get();
// similarly Purchase, Expense
return response()->json(['products'=>..., 'contacts'=>..., 'sales'=>...]);
```
Frontend: debounced search input, results grouped by module, click navigates directly to that record's page.

### Mobile Responsive Patterns ✅ (new — the two hardest screens to get right on mobile)

**Mobile Datatable — card view fallback**: below a breakpoint (Tailwind `md:` ~768px), any Datatable (Phase 15) switches from a `<table>` to a stacked **card list** — same underlying data/sort/filter state from `@tanstack/react-table` (headless, so this is just a different render), each card showing only the 2-3 most important fields prominently (e.g. for Sales: invoice_no + total_amount, customer + due, date + status badges), tapping a card navigates to the detail page just like clicking a row on desktop.
```tsx
{isMobile ? (
  <div className="space-y-2">{rows.map(row => <SaleCard key={row.id} sale={row.original} />)}</div>
) : (
  <table>...</table>
)}
```
Filters that sit inline on desktop become a "Filter" button opening a bottom sheet/drawer on mobile. Bulk-select toolbars (Phase 15) move from a top bar to a **fixed bottom bar** on mobile — thumb-reachable.

**Mobile multi-item forms (Add Sale/Purchase) — cart-style flow**: the desktop pattern (one large editable table with all line items inline) doesn't fit mobile screens. Mobile instead uses a search→add→confirm cycle:
1. Product search/barcode input at top
2. Selecting a product opens a small bottom sheet for Quantity/Price/Discount
3. Confirming adds it to a cart-style list below (compact card: name, qty×price=subtotal, edit/remove)
4. Running total shown in a **sticky footer**, always visible while scrolling
5. The final submit action ("Complete Sale") also sits in that sticky footer

Both desktop and mobile forms share the same underlying state/validation logic — only the presentation layer differs by breakpoint, no schema or business-logic impact.

---

# Part V — অতিরিক্ত ব্যবসায়িক ফিচার

## Phase 21: Sales Order & Warranty (Sidebar-driven additions)

### Brands ✅
```
products
- ...
- brand_id    (nullable, FK to a simple brands table: id, name)
```

### Sales Order ✅
Represents an advance booking/reservation — NOT a confirmed sale, so it does **not** touch `stock_movements`. Can optionally take an advance payment, which does touch Accounts and Contact ledger.

```
sales_orders
- id
- customer_id
- order_no
- order_date
- expected_delivery_date
- status               enum('pending', 'partial', 'completed', 'cancelled')
- total_amount
- advance_paid
- created_by

sales_order_items
- id, sales_order_id, product_id, quantity, unit_price, subtotal
```

**On order creation:** no stock movement. If advance is taken:
```php
AccountTransaction::create(['type'=>'sales_order_advance', 'amount'=>+$advancePaid, ...]);
Account::increment('current_balance', $advancePaid);
ContactLedger::create(['type'=>'sales_order_advance', 'amount'=>-$advancePaid, ...]);
Contact::decrement('balance', $advancePaid);  // company now "owes" the customer (goods or refund)
```

**On fulfillment:** a real `Sale` is created (referencing `sales_order_id`), which runs the normal Sale flow (Phase 4) — stock decrements, ledger finalizes. The `advance_paid` already collected is carried into the Sale's `paid_amount`, so it isn't double-counted.

**On cancellation with advance already taken:** refund via a reversal transaction (same shape as Sales Return refund, Phase 5).

### Warranty ✅
```
products
- ...
- warranty_period_months    (nullable, e.g. 12)

sale_items
- ...
- warranty_expires_at        (nullable — snapshotted at sale time: sale_date + warranty_period_months, so later changes to the product's warranty setting don't affect past sales)
```
```php
if ($product->warranty_period_months) {
    $saleItem->warranty_expires_at = $sale->sale_date->addMonths($product->warranty_period_months);
}
```

**Warranty Claim Tracking:**
```
warranty_claims
- id
- sale_item_id          (links to product + customer via the sale)
- claim_date
- issue_description
- status                 enum('pending', 'in_progress', 'resolved', 'rejected')
- resolution_note
- created_by
```

---

## Phase 22: Draft, Quotation & Import Sales

### Draft & Quotation ✅ (Proforma explicitly not needed)
Both fit within `sales.status` — no new table needed.
```
sales
- ...
- status              enum('draft', 'quotation', 'confirmed', 'cancelled')
- valid_until          (nullable — for quotation only, how long the quoted price holds)
```
- **Draft**: incomplete sale, expected to finish same session. No stock/ledger impact until confirmed.
- **Quotation**: a price proposal with no commitment, decision may come days/weeks later; has a validity period (`valid_until`). No stock/ledger impact until confirmed.
- Converting quotation/draft → confirmed runs the normal Sale flow (Phase 4) for the first time — that's when stock_movements and contact_ledger entries are created.
- Sidebar: **Add Draft / List Drafts** and **Add Quotation / List Quotations** as separate menu entries (same underlying table, filtered by status).

### Import Sales ✅
For migrating historical sales data (e.g. from a prior system/manual records).

**Import fields → schema mapping:**
| Import Field | Maps to | Note |
|---|---|---|
| Invoice No | `sales.invoice_no` | groups rows into one Sale |
| Customer name/phone/email | `contacts` | matched by phone/email, created if not found |
| Sale Date | `sales.sale_date` | format Y-m-d H:i:s |
| Product Name / SKU | `products.name` / `products.sku` | matched by either; not found = skip/error, not auto-created |
| Quantity | `sale_items.quantity` | required |
| Unit Price | `sale_items.unit_price` | |
| Item Discount | `sale_items.discount_amount` | |
| Item Description | `sale_items.note` (new optional field) | |
| Item Tax | excluded | Tax/VAT not used (Phase 19) |
| Order Total | validation only | cross-checked against calculated total, not stored separately |

**Critical decision — imported sales do NOT touch stock or accounts:** since Opening Stock (Phase 1) is set as a snapshot of what exists *now* (already net of all historical sales), importing old sales and also decrementing stock would double-count the reduction. So:
```
sales
- ...
- source            enum('manual', 'imported')    -- new field
```
- `source: imported` → creates `sales`/`sale_items` rows for historical reporting (customer purchase history, past sales trends) **only** — no `stock_movements`, no `contact_ledger`, no `account_transactions` created.
- `source: manual` → full normal flow as already designed.

---

## Phase 23: Additional Reports & Business Model Clarification

### Business Model — Single-tenant per customer ✅ (confirms Phase-1 decision holds)
Selling plan is **one install/hosting per customer shop** (single-tenant), not a centrally-hosted SaaS with subscription billing. This confirms the original "single shop, single database, no multi-tenancy" decision (Phase 1) applies as-is to the sellable product — each customer gets their own instance. "Package Subscription" (SaaS billing) is therefore **not applicable** and excluded.

### Additional Reports — all computed from existing data, no new core tables ✅
- **Cash Flow Statement** — grouped from `account_transactions` by type (money in/out trend over a period)
- **Cash Book** — Account Statement (Phase 14) filtered to the Cash-type account specifically
- **Trending Products** — best-selling products by quantity/revenue over a period, aggregated from `sale_items`
- **Product Purchase Report** — per-product purchase history, aggregated from `purchase_items`
- **Product Sell Report** — per-product sales history, aggregated from `sale_items`
- **Purchase Payment Report / Sell Payment Report** — from `account_transactions` filtered by `reference_type` (purchase/sale)
- **Customer Groups Report** — sales aggregated by `customer_group`

### Excluded — conflicts with earlier decisions ✅
- **Trial Balance** — requires a formal double-entry chart-of-accounts model, which this system doesn't use (balance+ledger pattern per module instead); would need significant restructuring. Skipped — Balance Sheet + P&L cover the need at this scale.
- **Business Locations** — conflicts with the single-shop, no-warehouse/multi-location decision (Phase 1).
- **Tax Report / Tax Rates** — conflicts with the no-Tax/VAT decision (Phase 19).

### Deferred — designed but not built now ✅
**Register/Till Session** (daily cash reconciliation per cashier — opening cash count vs expected vs actual closing count, discrepancy tracking) was fully designed but deferred at the user's request:
```
register_sessions
- id, account_id, opened_by, closed_by
- opening_balance, expected_closing_balance, actual_closing_balance, discrepancy_amount
- status enum('open','closed'), opened_at, closed_at, note

account_transactions
- ... + register_session_id (nullable FK)
```
Rationale for deferring: `created_by` on every transaction already tracks *who entered what in the system* (data integrity), which is distinct from *physical cash reconciliation* (does the cash drawer match the records) — the latter matters more with multiple cashiers handling physical cash, which isn't an immediate need. Can be added later without disrupting the existing Accounts schema — just an additional nullable FK plus a new table.

### Printing — A4 default, Thermal Receipt toggleable ✅
Both formats supported, rendered from the same `sale`/`sale_items` data — thermal is optional/toggleable, not a default requirement. Controlled by `settings.thermal_printer_enabled` (see Phase 19 schema):
- Off (default): only "Print A4 Invoice" shown.
- On: adds a "Print Thermal Receipt (58mm/80mm)" option alongside A4 — a separate, narrow-width print template (smaller font, minimal fields — item/quantity/price/total only) for thermal POS printers.
- No thermal-specific data storage needed — same underlying sale data, just a different print view.

### Sales Representative Report — not yet decided ⏳
Would require linking a sale to a staff member (e.g. `sales.sales_rep_id`) for commission/target tracking — not yet clarified whether this business needs commission-based sales staff.

---

## Phase 24: Final Sidebar Structure (consolidated)

```
📊 Dashboard

📦 Inventory
   ├─ Products
   ├─ Add Product
   ├─ Categories
   ├─ Units
   ├─ Brands
   ├─ Print Labels (Barcode)
   ├─ Stock Adjustment
   ├─ Stock Movement History
   ├─ Import Products
   └─ Import Opening Stock

👥 Contacts
   ├─ Customers                 (checkbox-select → bulk Send Notification)
   ├─ Suppliers
   ├─ Customer Groups
   └─ Import Contacts

🛒 Purchase
   ├─ List Purchases
   ├─ Add Purchase
   └─ Purchase Return

💰 Sales
   ├─ All Sales
   ├─ Add Sale
   ├─ Drafts (Add/List)
   ├─ Quotations (Add/List)
   ├─ Sales Return
   ├─ Sales Order
   ├─ EMI Installments (due/paid list)
   └─ Import Sales

🏦 Payment Accounts
   ├─ List Accounts
   ├─ Fund Transfer
   ├─ Cash Book (petty cash quick entry)
   ├─ Account Statement
   ├─ Balance Sheet (quick)
   ├─ Financial Position (full)
   ├─ Trial Balance
   ├─ Cash Flow
   └─ Payment Account Report

🧾 Expenses
   ├─ Expense List
   └─ Expense Categories

🏢 Asset & Liabilities
   ├─ Assets
   ├─ Company Loan
   └─ Other Liability

💼 Investor
   └─ Investor List

👨‍💼 Staff
   ├─ Staff List
   └─ Salary / Advance / Loan

🛠️ Service & Warranty
   ├─ Service Requests (Installation/Service log)
   └─ Warranty Claims

📈 Reports
   ├─ Profit / Loss Report
   ├─ Purchase & Sale Report
   ├─ Sundry Report
   ├─ Supplier & Customer Report
   ├─ Customer Groups Report
   ├─ Stock Report
   ├─ Trending Products
   ├─ Product Purchase Report
   ├─ Product Sell Report
   ├─ Purchase Payment Report
   ├─ Sell Payment Report
   ├─ Sales Representative Report (pending decision, Phase 23)
   └─ Activity Log

📣 Marketing
   └─ Campaign History (past sends log — primary sending happens from Contacts page)

💾 Database Backup

⚙️ Settings
   ├─ Business Settings (Shop Info)
   ├─ Invoice Settings
   ├─ Barcode Settings
   ├─ Thermal Printer (on/off toggle)
   ├─ Users
   └─ Roles & Permissions
```

Excluded (per earlier decisions): Trial Balance, Business Locations, Tax Report/Tax Rates, Package Subscription, Register Report (deferred), Proforma (folded into Quotation).

Note: `service_plan_templates` (Phase 25's per-product free-service schedule) is configured within the Product Add/Edit form itself (Inventory → Products), not as a separate top-level sidebar item — it's product-level setup, not a transactional log.

Sidebar rendering respects Role & Permission (Phase 12) — menu items are filtered per logged-in user's permissions (e.g. a Cashier role sees only Sales + Products-view, other items hidden).

---

## Phase 25: Installation & Service Tracking (Home Appliance-specific)

### Entry Points ✅
- **Installation** — entered directly within the Add Sale form (optional section, since it's tied to the moment of sale).
- **Servicing** — entered from a separate **Service** module (search by customer/invoice/product), since service visits happen months/years later, unknown at sale time.

### Not Every Product Has This ✅
```
products
- ...
- has_installation_service    boolean (default: false)   -- controls whether the Installation/Service section shows in Add Sale
```
When `false`, the Add Sale form simply omits this section for that product.

### Charges Are Manual, Not Fixed ✅
Installation/service pricing varies by situation (distance, complexity), so it's entered per-sale, not stored as a fixed product price:
```
sale_items
- ...
- installation_required     boolean (chosen at sale time)
- installation_charge        (nullable, manual entry each time)
```

### Service Plan — flexible, multi-period schedule ✅ (final — replaces the earlier single "free_services_included" number)
Rationale: free-service cycles vary by product (3 months, 6 months, 1 year) and by period within the same product's lifetime (e.g. year 1 gets 2 free services, year 2 gets 0) — a single fixed quota number can't express this, so it's modeled as an ordered sequence of periods per product.

```
service_plan_templates
- id
- product_id
- period_number       (1, 2, 3... in sequence)
- period_months         (length of this period, e.g. 3, 6, or 12)
- free_quota             (free services available during this period)
```
Example — AC: `Period 1: 12 months, quota 2` then `Period 2: 12 months, quota 0`.
Example — Fridge: `Period 1: 6 months, quota 1` → `Period 2: 6 months, quota 1` → `Period 3: 12 months, quota 0`.

**Snapshotted per sale** (so later template edits don't affect past sales), with computed date ranges:
```
sale_item_service_periods
- id
- sale_item_id
- period_number
- period_months
- free_quota
- period_start_date     (computed: sale_date + sum of prior periods' months)
- period_end_date         (period_start_date + period_months)
```
```php
$startDate = $sale->sale_date;
foreach ($product->servicePlanTemplates as $template) {
    SaleItemServicePeriod::create([..., 'period_start_date'=>$startDate, 'period_end_date'=>$startDate->copy()->addMonths($template->period_months)]);
    $startDate = $startDate->copy()->addMonths($template->period_months);
}
```

**No carry-over between periods** — an unused free service in one period is lost when that period ends; each period's quota is counted independently.

### Service Requests ✅
```
service_requests
- id
- sale_item_id           (links to the specific sold unit — customer + product both derivable via the sale)
- request_date
- service_date             (nullable, set once scheduled)
- type                     enum('installation', 'service')
- is_free                  boolean
- charge_amount             (0 if free)
- account_id                 (nullable — which account received the charge, if any)
- staff_id                   (nullable — assigned technician)
- status                     enum('pending', 'scheduled', 'completed', 'cancelled')
- note
- created_by
```

### Free Quota Logic — resolved against the active period ✅
**Installation is never part of any period's free quota** — always a separate, one-time chargeable event.
```php
$currentPeriod = SaleItemServicePeriod::where('sale_item_id', $saleItemId)
    ->where('period_start_date', '<=', now())
    ->where('period_end_date', '>', now())
    ->first();

if (!$currentPeriod) {
    $isFree = false;   // plan has ended entirely, always paid
} else {
    $usedInThisPeriod = ServiceRequest::where('sale_item_id', $saleItemId)
        ->where('type', 'service')->where('is_free', true)
        ->whereBetween('service_date', [$currentPeriod->period_start_date, $currentPeriod->period_end_date])
        ->count();
    $isFree = $usedInThisPeriod < $currentPeriod->free_quota;
}
```

### Charging for a Paid Service ✅
Same Account integration pattern as every other money-in event:
```php
if (!$isFree) {
    AccountTransaction::create(['type'=>'service_charge', 'amount'=>+$chargeAmount, 'reference_type'=>'service_request', 'reference_id'=>$serviceRequest->id, 'account_id'=>$accountId]);
    Account::increment('current_balance', $chargeAmount);
}
```

### Sale Item Detail View ✅
Shows: current period + free services used/remaining in it, warranty expiry (Phase 21), installation status/date — all scoped to that specific sold unit via `sale_item_id`.

---

## Phase 26: EMI/Installment Sale & Serial Number Tracking

### Two-Level Toggle System ✅ (final — refined from a product-only toggle)
Rationale: a product-only toggle would still show EMI/Serial checkboxes on every product form even for businesses (e.g. furniture shops) that never use these features at all — pointless friction. So there are now two levels: a global Settings switch (per business type) gating whether the feature exists in the system at all, and a per-product switch (for businesses where it applies to some products but not others, e.g. AC/Fridge need it, small accessories don't).

**Level 1 — global, in Settings (Phase 19):**
```
settings
- ...
- emi_module_enabled              boolean (default: false)
- serial_number_module_enabled     boolean (default: false)
```
If `false`, the corresponding fields/options are hidden everywhere (Product form, Sale form) — never shown, not even as an unused checkbox.

**Level 2 — per product, only relevant if the global switch is on:**
```
products
- ...
- emi_available              boolean (default: false)   -- checkbox only shown if settings.emi_module_enabled = true
- track_serial_number         boolean (default: false)   -- checkbox only shown if settings.serial_number_module_enabled = true
```

**UI logic:**
```php
// Product Add/Edit Form
if (Settings::first()->emi_module_enabled) { /* show "EMI Available" checkbox */ }
if (Settings::first()->serial_number_module_enabled) { /* show "Track Serial Number" checkbox */ }

// Add Sale Form
if (Settings::first()->emi_module_enabled && $cartHasEmiProduct) { /* show EMI payment option */ }
if (Settings::first()->serial_number_module_enabled && $product->track_serial_number) { /* show serial number input */ }
```
A furniture-shop install with both settings off never surfaces EMI or Serial Number anywhere in the UI — no unnecessary prompts.

### EMI Schedule ✅
```
sales
- ...
- payment_type    enum('cash', 'emi')   default 'cash'

emi_installments
- id
- sale_id
- installment_number
- due_date
- amount
- paid_amount
- status            enum('pending', 'paid', 'overdue')
- paid_at
- account_id          (nullable — which account received this installment payment)
```

**On EMI sale creation** (after any down payment collected via the normal Sale payment flow):
```php
$remaining = $sale->total_amount - $downPayment;
$installmentAmount = $remaining / $numberOfInstallments;
for ($i = 1; $i <= $numberOfInstallments; $i++) {
    EmiInstallment::create(['sale_id'=>$sale->id, 'installment_number'=>$i, 'due_date'=>$sale->sale_date->copy()->addMonths($i), 'amount'=>$installmentAmount, 'status'=>'pending']);
}
```

**On installment payment:**
```php
DB::transaction(function () use ($installment, $accountId, $amount) {
    $installment->update(['paid_amount'=>$amount, 'status'=>'paid', 'paid_at'=>now(), 'account_id'=>$accountId]);
    AccountTransaction::create(['type'=>'emi_payment', 'amount'=>+$amount, 'reference_type'=>'sale', 'reference_id'=>$installment->sale_id, 'account_id'=>$accountId]);
    Account::increment('current_balance', $amount);
    ContactLedger::create(['type'=>'payment_received', 'amount'=>+$amount, ...]);
    Contact::increment('balance', $amount);
    // sale.paid_amount/due_amount/payment_status recalculated accordingly
});
```

**Overdue detection**: reuses the Phase 16 daily scheduled job pattern — `due_date < today AND status = 'pending'` → mark `overdue`, trigger a notification (extends the existing `due_payment` notification type).

### Serial Number Tracking — optional, not required ✅ ⚠️ SUPERSEDED by Phase 35 (full lifecycle table)
~~A separate table (not a single field on `sale_items`) since a line item's quantity may exceed 1, needing multiple serials per row:~~
```
sale_item_serials    -- ⚠️ superseded, see Phase 35 §12 — replaced by `serial_numbers` with full purchase→sale→return lifecycle
- id
- sale_item_id
- serial_number
```
~~Entry is fully optional — no validation requiring the count to match `quantity`; can be zero, partial, or complete.~~
This lightweight design was later upgraded to a full lifecycle model once the target market was confirmed to benefit from purchase-through-warranty serial traceability — see Phase 35 §12 for the current, authoritative design.

---

## Phase 27: Market Differentiation & Competitive Positioning (business notes, not schema)

### Already-designed strengths vs typical local competitors ✅
| Feature | Why it's a differentiator |
|---|---|
| Modern tech stack (Inertia+React+TS) | Most local POS/ERP tools run on older jQuery/PHP stacks — this is faster and more responsive |
| Global Search (Cmd+K, Phase 20) | Cross-module search UX pattern rarely present in local tools |
| Light/Dark Mode + Design System (Phase 20) | Reference screenshots show competitors with dated, purely-utilitarian UI |
| Multi-period Service Plan (Phase 25) | Flexible free-service scheduling ("year 1 gets 2, year 2 gets 0") is uniquely tailored to Home Appliance business, not found in generic POS |
| Two-level Feature Toggle (Phase 26) | Business-type-aware — competitors show all features to everyone regardless of relevance, causing clutter |
| EMI built-in with toggle (Phase 26) | Bangladesh-market-specific, but stays out of the way for businesses that don't need it |
| Weighted Average Costing (Phase 3) | Many cheaper tools only track last-purchase-price, which misstates profit |
| Immutable audit trail throughout | Builds owner trust that historical figures were never silently altered |
| Single-tenant, self-hosted (Phase 23) | Shop's financial data stays on its own server, not a third party's |

### Candidate additions to widen the gap further — not yet decided ⏳
- **Offline Mode** — POS keeps working without internet, syncing sales once reconnected; addresses a real Bangladesh small-shop pain point but is a significant technical undertaking
- **PWA/Mobile Dashboard** — owner checks shop summary from phone without a separate app install
- **Bengali numeral/date formatting option** in reports
- **Guided onboarding wizard** for non-technical shop owners (Settings → first product → opening stock, step by step)
- **Pricing model** — cheaper/local-currency pricing vs USD-licensed competitors (a business decision, not a technical one)

---

# Part VI — ইঞ্জিনিয়ারিং ও নিরাপত্তা

## Phase 28: Controller Architecture & Database Indexing

### Controller Pattern ✅
Two controller types: **Resource Controllers** (standard CRUD — index/create/store/edit/update/destroy) for simple list/add/edit pages, and **Invokable Controllers** (single `__invoke` method) for business actions that don't fit CRUD verbs (confirm, pay, export, etc.).

**Design principle**: controllers stay thin — the actual multi-table transaction logic (`DB::transaction`) lives in dedicated **Action classes** (`app/Actions/`); controllers validate input and call the action.

### Resource Controllers (Standard CRUD)
```
ProductController, CategoryController, UnitController, BrandController
ContactController (type=customer/supplier via query param)
CustomerGroupController
PurchaseController, SaleController
ExpenseController, ExpenseCategoryController
AssetController, CompanyLoanController, OtherLiabilityController, InvestorController
StaffController, AccountController
UserController, RoleController
SalesOrderController, WarrantyClaimController, ServiceRequestController
```

### Invokable Controllers (Business Actions)
```
ConfirmSaleController              -- draft/quotation → confirmed (triggers stock+ledger)
ConfirmPurchaseController          -- draft → received
ConvertSalesOrderToSaleController
MarkSaleDeliveredController
StockAdjustmentController
RecordPaymentController            -- multi-account split payment against sale/purchase/expense
CreateSaleReturnController / CreatePurchaseReturnController
SendNotificationController         -- from Contacts bulk-select
SendLedgerPdfController
ExportSelectedController           -- bulk export for any Datatable
GlobalSearchController
DashboardController
BackupNowController
ImportProductsController / ImportContactsController / ImportSalesController / ImportOpeningStockController
BarcodeLabelPrintController
InvoicePdfController / DeliveryChallanPdfController / QuotationPdfController
EmiInstallmentPaymentController
ServiceChargeController            -- checks free/paid quota, then charges
ProfitLossReportController, BalanceSheetController, StockReportController,
DueReportController, TrendingProductsController, ... (one invokable per report type)
```

### Database Indexes — key tables ✅
```sql
-- Products
INDEX(sku), UNIQUE(barcode), INDEX(category_id), INDEX(brand_id), INDEX(name)

-- Contacts
INDEX(phone), INDEX(email), INDEX(type), INDEX(customer_group_id)

-- Sales
UNIQUE(invoice_no), INDEX(customer_id), INDEX(sale_date), INDEX(status), INDEX(payment_status), INDEX(delivery_status)

-- Sale Items
INDEX(sale_id), INDEX(product_id)

-- Purchases
UNIQUE(invoice_no), INDEX(supplier_id), INDEX(purchase_date), INDEX(status)

-- Purchase Items
INDEX(purchase_id), INDEX(product_id)

-- Stock Movements (likely the largest table over time)
INDEX(product_id), INDEX(type), COMPOSITE(product_id, created_at)

-- Contact Ledger
INDEX(contact_id), INDEX(type), INDEX(created_at)

-- Account Transactions
INDEX(account_id), COMPOSITE(reference_type, reference_id), INDEX(created_at)

-- Expenses
INDEX(expense_category_id), INDEX(contact_id), INDEX(expense_date), INDEX(payment_status)

-- Asset/Loan/Investor/Other Liability Transactions
INDEX(asset_id) / INDEX(company_loan_id) / INDEX(investor_id) / INDEX(other_liability_id)

-- Staff / Staff Ledger
INDEX(investor_id) on staff; INDEX(staff_id) on staff_ledger

-- Sales Orders
UNIQUE(order_no), INDEX(customer_id), INDEX(status)

-- Warranty/Service
INDEX(sale_item_id)  -- on warranty_claims, service_requests, sale_item_service_periods
COMPOSITE(sale_item_id, period_start_date, period_end_date)  -- critical for "current active period" lookup

-- EMI Installments (critical for the daily overdue-check scheduled job)
INDEX(sale_id), INDEX(status), INDEX(due_date)

-- Message Logs / Campaign Recipients
INDEX(contact_id), INDEX(status)
UNIQUE(campaign_id, contact_id)  -- duplicate-send prevention, Phase 16 #5

-- Activity Logs
INDEX(user_id), COMPOSITE(model_type, model_id), INDEX(created_at)

-- Users / Roles / Permissions
UNIQUE(email) on users; UNIQUE(name) on roles/permissions
```
Small reference/config tables (units, categories, brands, customer_groups, expense_categories) don't need indexes beyond PK/FK — low data volume.

### Model Accessors — where they belong ✅
Accessors are for **display-only derived values**, never for values needed in `WHERE`/`ORDER BY`/filtering — those stay as real stored columns (per the hybrid cached-value pattern used throughout: `current_stock`, `due_amount`, `balance`, `payment_status`). An accessor recomputes in PHP on every access and isn't queryable in SQL, so using one for a filterable/sortable field would break list-page filtering and add needless recomputation.

**Good accessor candidates:**
```php
// Product — stock_status: 'low_stock' / 'in_stock' / 'out_of_stock'
protected function stockStatus(): Attribute {
    return Attribute::make(get: fn () => $this->current_stock <= 0 ? 'out_of_stock'
        : ($this->current_stock <= $this->minimum_stock_level ? 'low_stock' : 'in_stock'));
}

// Product — profit_margin display
protected function profitMargin(): Attribute {
    return Attribute::make(get: fn () => $this->selling_price > 0
        ? round((($this->selling_price - $this->avg_cost) / $this->selling_price) * 100, 2) : 0);
}

// Contact / Staff — balance_label, interprets the +/- sign convention (Phase 2) into human text
// e.g. "You'll receive ৳500" vs "You owe ৳500" — avoids repeating this interpretation in every view
protected function balanceLabel(): Attribute {
    return Attribute::make(get: fn () => $this->balance > 0
        ? "Receivable ৳" . number_format($this->balance)
        : ($this->balance < 0 ? "Payable ৳" . number_format(abs($this->balance)) : "Settled"));
}

// SaleItem — warranty_status (Phase 21): 'active' / 'expired'
protected function warrantyStatus(): Attribute {
    return Attribute::make(get: fn () => $this->warranty_expires_at?->isFuture() ? 'active' : 'expired');
}

// SaleItemServicePeriod — is_current (Phase 25): reuses the same "current active period" logic
// in both the UI display and the free-quota-check controller — defined once here
protected function isCurrent(): Attribute {
    return Attribute::make(get: fn () => now()->between($this->period_start_date, $this->period_end_date));
}

// EmiInstallment — is_overdue (Phase 26): same logic reused by both the UI and
// the daily overdue-check scheduled job (Phase 16 #1) — defined once, avoids duplication
protected function isOverdue(): Attribute {
    return Attribute::make(get: fn () => $this->status === 'pending' && $this->due_date->isPast());
}

// CompanyLoan — is_fully_paid
protected function isFullyPaid(): Attribute {
    return Attribute::make(get: fn () => $this->outstanding_balance <= 0);
}
```

### Model Mutators — normalize data on write ✅
Mutators transform a value *before* it's saved, as opposed to accessors which transform on read.

```php
// Contact — phone normalization, critical for the SMS/WhatsApp notification feature (Phase 16)
// to work reliably (API calls need a consistent format like +8801XXXXXXXXX)
protected function phone(): Attribute {
    return Attribute::make(set: fn ($value) => preg_replace('/[^0-9+]/', '', $value));
}

// Contact — email normalization
protected function email(): Attribute {
    return Attribute::make(set: fn ($value) => $value ? strtolower(trim($value)) : null);
}

// Product — SKU normalization, since Import Sales (Phase 22) matches products by SKU;
// inconsistent casing/whitespace would cause false match failures
protected function sku(): Attribute {
    return Attribute::make(set: fn ($value) => strtoupper(trim($value)));
}

// Name fields (Product/Contact) — trim whitespace to avoid near-duplicate entries
protected function name(): Attribute {
    return Attribute::make(set: fn ($value) => trim($value));
}

// Money fields (e.g. avg_cost) — round to 2 decimals to avoid floating-point drift
// accumulating through the Weighted Average Cost calculation (Phase 3)
protected function avgCost(): Attribute {
    return Attribute::make(set: fn ($value) => round($value, 2));
}
```

### Query Scopes — reusable query filters ✅
Scopes filter *across many rows* (used in list pages, reports, scheduled jobs) — distinct from accessors, which describe a single already-loaded record.

```php
// Contact — customer/supplier filtering, used directly by ContactController's type query param
public function scopeCustomers($query) { return $query->whereIn('type', ['customer', 'both']); }
public function scopeSuppliers($query) { return $query->whereIn('type', ['supplier', 'both']); }

// Product — low stock, reused across the Dashboard widget, the Notification scheduled job
// (Phase 16), and the Stock Report (Phase 14) — one definition, three consumers
public function scopeLowStock($query) {
    return $query->whereColumn('current_stock', '<=', 'minimum_stock_level');
}

// EmiInstallment — overdue, used by the daily scheduled job to fetch ALL overdue rows at once.
// Complements (doesn't replace) the isOverdue accessor above, which describes one loaded record;
// this scope is for querying many.
public function scopeOverdue($query) {
    return $query->where('status', 'pending')->where('due_date', '<', now());
}

// Sale/Purchase — status and payment filters
public function scopeDue($query) { return $query->where('payment_status', '!=', 'paid'); }
public function scopeConfirmed($query) { return $query->where('status', 'confirmed'); }

// Staff — active only, e.g. for a technician-assignment dropdown
public function scopeActive($query) { return $query->where('status', 'active'); }
```

### Global Scopes — used sparingly, only for cross-cutting concerns ✅
Unlike local scopes (opt-in per query), a global scope applies **automatically to every query** for a model unless explicitly bypassed — this hides query behavior, so it's used only where that's genuinely desirable, not for business-critical filtering.

**Good fit — Active/Inactive filtering** (ties directly to Phase 15's "mark inactive instead of delete" bulk-delete guard, which needed an `is_active` field now added to `contacts` and `products`):
```php
class ActiveScope implements Scope {
    public function apply(Builder $builder, Model $model) {
        $builder->where('is_active', true);
    }
}
// In the Product/Contact model:
protected static function booted() {
    static::addGlobalScope(new ActiveScope);
}

Product::all();                                   // automatically excludes inactive products
Product::withoutGlobalScope(ActiveScope::class)->get();  // explicit bypass for admin views
```

**Deliberately NOT used for excluding cancelled Sales/Purchases from reports** — even though it's tempting (e.g. to keep `cancelled` sales out of Profit/Loss automatically), a global scope here would hide filtering behavior in a financial system built entirely around explicit, auditable logic (immutable movements/ledgers throughout). If someone genuinely needs to see cancelled sales (e.g. reviewing why a sale was cancelled), a silent global scope could hide them without an obvious reason. The already-defined `scopeConfirmed()` **local scope** is the correct tool here — every report query explicitly opts in (`Sale::confirmed()->...`), keeping the filtering visible and intentional in the code.

**Multi-tenancy scoping — not applicable**: some SaaS ERPs use a global scope to filter by current tenant, but this system is single-tenant per install (Phase 23) — one shop's data per install, so no tenant-filtering scope is needed.

### Seeders vs Factories — separate purposes ✅
Kept distinct with different roles, not conflated.

**Seeders** — essential baseline data, runs every time via `php artisan migrate:fresh --seed`, kept lightweight so a fresh install is immediately usable (can log in, Settings/Roles/Units already exist):
```
database/seeders/
  DatabaseSeeder.php          -- calls the below
  RolePermissionSeeder.php    -- default roles (Admin, Manager, Cashier, Staff) + permissions (Phase 12)
  SettingsSeeder.php          -- the single settings row with sensible defaults (Phase 19)
  UnitSeeder.php               -- common units (pcs, kg, box, litre)
  AdminUserSeeder.php          -- one default Admin user
```

**Factories** — used rarely, exist mainly to generate large volumes for **stress-testing** whether the app holds up at scale (e.g. does pagination/index performance stay acceptable at 1,000,000 rows), not for regular seeding:
```
database/factories/
  ProductFactory.php, ContactFactory.php
  SaleFactory.php / SaleItemFactory.php
  StockMovementFactory.php, ContactLedgerFactory.php, AccountTransactionFactory.php
```

**Critical nuance**: since `current_stock`/`balance`/etc. are cached values kept in sync by real business logic (Action classes), naively bulk-creating via Eloquent factories would leave those cached fields out of sync — and running Eloquent `create()` per row for a million records would also be far too slow. So stress-testing uses a **separate, dedicated Artisan command** (not part of `DatabaseSeeder`), doing raw bulk `DB::table()->insert()` in chunks for speed, followed by a single batch `UPDATE` pass to correctly recompute the cached columns from the inserted history — prioritizing realistic volume/distribution for performance testing over per-record business-logic accuracy:
```php
// php artisan app:stress-test --products=10000 --contacts=5000 --sales=1000000
class StressTestCommand extends Command {
    public function handle() {
        if (app()->environment('production')) {
            $this->error('Stress test command is disabled in production.');
            return 1;
        }
        Product::factory(10000)->create();
        Contact::factory(5000)->create();
        collect(range(1, 1000000))->chunk(5000)->each(function ($chunk) {
            DB::table('stock_movements')->insert(/* bulk array */);
        });
        DB::statement('UPDATE products p SET current_stock = (
            SELECT COALESCE(SUM(CASE WHEN type IN (...) THEN quantity ELSE -quantity END), 0)
            FROM stock_movements WHERE product_id = p.id
        )');
    }
}
```
Guarded against running in production to prevent accidental execution.

### StockService — centralized stock-mutation helper ✅ (new — engineering pattern from reviewing a comparable production system)
Every module that touches stock (Purchase, Sale, Returns, Adjustment) was writing its own `StockMovement::create()` + `increment`/`decrement` pair. Centralizing this into one service removes duplication and the risk of one call being made without the other:
```php
class StockService {
    public function increase(Product $product, float $qty, string $type, ?string $referenceType = null, ?int $referenceId = null, ?string $note = null): void {
        DB::transaction(function () use ($product, $qty, $type, $referenceType, $referenceId, $note) {
            StockMovement::create(['product_id'=>$product->id, 'type'=>$type, 'quantity'=>$qty, 'reference_type'=>$referenceType, 'reference_id'=>$referenceId, 'note'=>$note]);
            $product->increment('current_stock', $qty);
        });
    }

    public function decrease(Product $product, float $qty, string $type, ?string $referenceType = null, ?int $referenceId = null, ?string $note = null): void {
        DB::transaction(function () use ($product, $qty, $type, $referenceType, $referenceId, $note) {
            StockMovement::create(['product_id'=>$product->id, 'type'=>$type, 'quantity'=>$qty, 'reference_type'=>$referenceType, 'reference_id'=>$referenceId, 'note'=>$note]);
            $product->decrement('current_stock', $qty);
        });
    }
}
```
Every Action class (ConfirmPurchaseAction, ConfirmSaleAction, CreateSaleReturnAction, CreatePurchaseReturnAction, StockAdjustmentAction) calls `StockService::increase()`/`decrease()` instead of duplicating the movement+quantity logic inline. Weighted Average Cost recalculation (Phase 3, purchase-only) stays in the Purchase-specific action, since it's not a generic stock-quantity concern.

### Custom Validation Rules ✅

**Reusable across many modules — "opening entry only once"**: since Product (opening stock), Contact/Account/Asset/Company Loan/Investor/Other Liability (opening balance/value) all share the exact same rule — no opening entry once any movement exists — one generic parameterized rule covers all of them:
```php
class NoExistingMovementsRule implements ValidationRule {
    public function __construct(private string $modelClass, private string $foreignKey, private int $id) {}
    public function validate($attribute, $value, $fail) {
        if ($this->modelClass::where($this->foreignKey, $this->id)->exists()) {
            $fail('This item already has transactions — an opening entry is no longer allowed.');
        }
    }
}
// usage: new NoExistingMovementsRule(StockMovement::class, 'product_id', $product->id)
//        new NoExistingMovementsRule(ContactLedger::class, 'contact_id', $contact->id)
```

**Return quantity within what was sold** (Phase 5):
```php
class ReturnQuantityWithinSoldRule implements ValidationRule {
    public function __construct(private int $saleItemId) {}
    public function validate($attribute, $value, $fail) {
        $sold = SaleItem::find($this->saleItemId)->quantity;
        $alreadyReturned = SaleReturnItem::where('sale_item_id', $this->saleItemId)->sum('quantity');
        if ($value > ($sold - $alreadyReturned)) {
            $fail("Cannot return more than " . ($sold - $alreadyReturned) . " remaining.");
        }
    }
}
```

**Sufficient stock on sale**:
```php
class SufficientStockRule implements ValidationRule {
    public function __construct(private int $productId) {}
    public function validate($attribute, $value, $fail) {
        $stock = Product::find($this->productId)->current_stock;
        if ($value > $stock) { $fail("Only {$stock} in stock."); }
    }
}
```

**Contact type restriction** (Sale needs a customer, Purchase needs a supplier):
```php
class ContactMustBeTypeRule implements ValidationRule {
    public function __construct(private string $requiredType) {}
    public function validate($attribute, $value, $fail) {
        $contact = Contact::find($value);
        if (!$contact || !in_array($contact->type, [$this->requiredType, 'both'])) {
            $fail("This contact isn't a {$this->requiredType}.");
        }
    }
}
```

**Multi-account split payment sum check** (Phase 6):
```php
class SplitPaymentSumRule implements ValidationRule {
    public function __construct(private float $expectedTotal) {}
    public function validate($attribute, $value, $fail) {
        if (array_sum(array_column($value, 'amount')) != $this->expectedTotal) {
            $fail('Split payment amounts must sum to the total.');
        }
    }
}
```

**Sale/Purchase must be confirmed before a Return can reference it** — same pattern as above, checking `status === 'confirmed'` before allowing a return.

### `prepareForValidation()` — normalize input before validation runs ✅
Distinct from (and complementary to) model **Mutators**: mutators run at save time and catch data from *any* path (import, seeder, tinker), while `prepareForValidation()` runs at the request layer, before validation, so validation itself sees already-normalized data.

```php
class StoreSaleRequest extends FormRequest {
    protected function prepareForValidation() {
        // Recompute totals server-side from submitted line items — never trust a
        // client-supplied total (prevents tampering with the browser dev tools)
        $items = $this->input('items', []);
        $subtotal = collect($items)->sum(fn ($item) => $item['quantity'] * $item['unit_price']);
        $this->merge([
            'subtotal' => $subtotal,
            'phone' => preg_replace('/[^0-9+]/', '', $this->input('phone', '')),
        ]);
    }
}
```

### `messages()` — plain-language error text for non-technical users ✅
```php
public function messages(): array {
    return [
        'quantity.required' => 'Please enter a quantity',
        'customer_id.required' => 'Please select a customer',
        'customer_id.exists' => 'Customer not found',
        'unit_price.min' => 'Price must be 0 or more',
    ];
}
```

### `authorize()` — ties FormRequest directly to Role & Permission (Phase 12) ✅
```php
public function authorize(): bool {
    return $this->user()->can('sale.create');
}
```
Keeps controllers thinner — no separate `can()` check needed inside the controller body.

### Orphan File Cleanup ✅
Three distinct sources of orphan files in this system, each cleaned up differently:

**1. Product images (abandoned form uploads)** — an image uploaded but the product form never submitted. Uses `spatie/laravel-medialibrary`'s **built-in `media-library:clean`** Artisan command (no custom code needed) — removes media rows/files with no valid model association or orphaned conversion files:
```php
$schedule->command('media-library:clean')->weekly();
```

**2. Generated Ledger/Invoice PDFs (Phase 16 #6)** — once a "Send Document" PDF is emailed/WhatsApp'd, the file itself has no lasting value (the send is logged in `message_logs`; a future re-send just regenerates fresh from current data rather than needing the old file preserved). Cleaned up by a scheduled job deleting anything older than 2 days:
```php
class CleanupGeneratedPdfsCommand extends Command {
    public function handle() {
        collect(Storage::files('ledger-pdfs'))->merge(Storage::files('invoice-pdfs'))
            ->filter(fn ($file) => Storage::lastModified($file) < now()->subDays(2)->timestamp)
            ->each(fn ($file) => Storage::delete($file));
    }
}
// scheduled daily
```

**3. Import files (Product/Contact/Sales CSV/Excel, Phase 15/22)** — deterministic cleanup, not scheduled: the uploaded file is deleted immediately once the import job finishes, success or failure:
```php
class ImportProductsJob {
    public function handle() {
        try {
            // ... processing ...
        } finally {
            Storage::delete($this->uploadedFilePath);
        }
    }
}
```

---

## Phase 29: Data Encryption & Sensitive Data Handling

### Encryption vs Hashing — distinct concepts ✅
- **Hashing** (passwords) — one-way, never reversed, only compared. Laravel's default `hashed` cast already covers this.
- **Encryption** (data that must be read back later, e.g. account numbers) — two-way, decryptable via `APP_KEY`, but never stored as plain text in the database.

### Gap found and fixed — Account Number field ✅
`accounts` previously only had `name`/`type`/`balance` — no field for the actual bank account number a shop owner would want on file for reconciliation. Added, encrypted via Laravel's built-in cast (no extra package needed):
```
accounts
- ...
- account_number    (nullable, encrypted)
```
```php
class Account extends Model {
    protected $casts = ['account_number' => 'encrypted'];
}
```
Same treatment applies if a staff member's own bank account number is ever added (for salary transfer reference) — `staff.bank_account_number`, encrypted the same way.

### What to encrypt vs not ✅
| Field | Encrypt? | Reasoning |
|---|---|---|
| `accounts.account_number` | ✅ Yes | Direct financial identifier |
| Staff's own bank account (if added) | ✅ Yes | Same reasoning |
| SMS/WhatsApp/Email gateway API keys | ✅ Yes — but store in `.env`, not the database | API credentials never belong in DB tables as plain values; environment variables are the standard place |
| `contacts.phone` / `contacts.email` | ❌ No | Explained below |

### Why contact phone/email are NOT encrypted — a deliberate trade-off ✅
Phone/email are PII, but encrypting them breaks core functionality: Global Search (Phase 20), phone-based customer matching during Import Sales (Phase 22), and direct use when sending SMS/WhatsApp (Phase 16). Encrypted columns can't be searched with `WHERE phone LIKE '%...%'` in SQL (ciphertext differs per encryption call), so search would require decrypting every row in PHP — infeasible at scale for a frequently-searched table. General security posture (HTTPS, permission-gated access, single-tenant self-hosting per Phase 23) covers this instead of field-level encryption.

### Never store, under any circumstances ✅
Card numbers, CVV, mobile banking (bKash/Nagad) PINs, OTPs — none of these should ever be persisted anywhere in the system, encrypted or not. Any payment gateway integration should rely on the gateway's own tokenization, keeping this application entirely out of that data's custody.

---

# Part VII — বাস্তব-জগৎ পরিমার্জন ও ব্যবসায়িক কৌশল

## Phase 30: Refinements from Real-World Reference System

Based on reviewing screenshots of a comparable existing ERP (AgainPOS/Green Air), several design choices were validated (contact `both` type, multi-account split payment, purchase-status vs payment-status separation, `is_active`/deactivate, ledger item-discount notes, staff bank details) and several genuine gaps surfaced and are addressed below.

### User-Staff Link + Sales Commission ✅
```
staff
- ...
- user_id    (nullable, FK to users — not every staff member needs a login, e.g. a technician)

users
- ...
- sales_commission_percentage    (nullable decimal)
- max_sales_discount_percent      (nullable decimal — caps the discount this user can apply at point of sale)
```
Feeds the previously-deferred Sales Representative Report (Phase 23): when a sale is confirmed, if the `created_by` user has a commission percentage set, `commission_amount = sale.total_amount × (percentage / 100)` becomes available for that report.

### Row-level Permission Scoping — "own" vs "all" ✅
Refines the Phase 12 permission naming convention with a scope suffix, primarily for Sale/Purchase/Draft/Quotation:
```php
if (auth()->user()->can('sale.view_all')) {
    $sales = Sale::query();
} elseif (auth()->user()->can('sale.view_own')) {
    $sales = Sale::where('created_by', auth()->id());
} else {
    abort(403);
}
```

### Documents & Note — generic attachment ✅
Extends `spatie/laravel-medialibrary` (already chosen for Product images, Phase 1) to Contact and User models for file attachments:
```php
class Contact extends Model implements HasMedia { use InteractsWithMedia; }
// $contact->addMedia($file)->toMediaCollection('documents');
```
Plus a polymorphic table for free-text notes, usable across Contact, User, and future models:
```
notes
- id
- notable_type, notable_id
- note
- created_by
```

### Business/Individual Contact + Shipping Address ✅
```
contacts
- ...
- entity_type       enum('individual', 'business')   -- a different dimension from `type` (customer/supplier/both)
- business_name      (nullable, used when entity_type = business)
- shipping_address    (nullable — separate from the existing `address`, which becomes the billing/primary address)
```

### Fiscal Year Reporting ✅
```
settings
- ...
- fiscal_year_start_month    (integer 1-12, default: 7 — Bangladesh convention, fiscal year starts July)
```
Reports (Phase 14) gain a "Financial Year" filter option computing date ranges from this setting (e.g. FY starting July 2026 → 01-07-2026 to 30-06-2027).

---

## Phase 31: Software Licensing / Piracy Protection

### Honest starting premise ✅
100% piracy prevention isn't achievable for a self-hosted PHP application (unlike SaaS, the vendor doesn't control the runtime server after sale). The realistic goal is making casual copying meaningfully harder, not airtight DRM.

### Architecture — a separate License Server (vendor-controlled, outside the ERP codebase) ✅
```
licenses    -- lives on the vendor's own server, e.g. license.yourcompany.com
- id
- license_key         (unique, generated string)
- customer_name
- domain               (locked at activation)
- server_fingerprint    (nullable — set on first activation)
- status               enum('pending', 'active', 'suspended', 'expired')
- issued_at
- expires_at
- last_checked_at
```

On each customer's ERP install (Settings, Phase 19):
```
settings
- ...
- license_key            (encrypted)
- license_status          (cached: active/expired/invalid/suspended)
- license_last_verified_at
```

### Activation Flow ✅
1. Customer purchases → receives a `license_key` via email
2. First install → enters the key on an Activation page
3. App calls the License Server to activate the key against the current domain
4. Server validates (not already activated elsewhere) and stores `domain` + `server_fingerprint`, sets `status = active`

### Periodic Re-verification (daily scheduled job) ✅
```php
class CheckLicenseJob {
    public function handle() {
        $response = Http::post('https://license.yourcompany.com/api/verify', [
            'license_key' => Settings::first()->license_key,
            'domain' => request()->getHost(),
        ]);
        Settings::first()->update([
            'license_status' => $response->json('status'),
            'license_last_verified_at' => now(),
        ]);
    }
}
```

### Grace Period — don't punish connectivity issues ✅
If the License Server hasn't been reachable for more than 7 days, the app does NOT treat this as expired/invalid — it's a connectivity problem, not a licensing one.

### Enforcement — final, chosen for the annual subscription/update-fee model ✅
Severity differs by status, since "expired" (a real paying customer late on renewal) and "invalid/suspended" (likely unauthorized use) call for very different treatment:
```php
class CheckLicenseMiddleware {
    public function handle($request, $next) {
        $license = Settings::first();
        match ($license->license_status) {
            'active' => null,                                    // normal operation
            'expired' => session()->flash('license_warning',
                'Your subscription has expired — please renew'),  // persistent banner, core features still work
            'invalid', 'suspended' => abort(403, 'License invalid — contact support'), // hard lockout
            default => null,
        };
        return $next($request);
    }
}
```
Rationale: locking out a legitimate customer over a late renewal would damage the business relationship and hold their own Sale/Customer data hostage; a persistent warning is enough pressure while an invalid/suspended license (wrong domain, unrecognized key) reasonably indicates unauthorized use and warrants a hard block.

### Renewal Reminders — vendor-side, not the ERP's own notification system ✅
The License Server (not the ERP's Phase 16 customer-notification system, which is for the shop owner's own customers) sends renewal reminders to the ERP customer via email/SMS 7/30 days before `expires_at` — a separate notification flow entirely, owned by the vendor.

---

## Phase 32: Scale Audit — Performance & UX Improvements

### 10-Year Data Volume Projection ✅
Assuming a moderate shop (~30 sales/day, ~10 purchases/day, 350 days/year):
| Table | Rows after 10 years |
|---|---|
| stock_movements | ~404,000 |
| contact_ledger | ~238,000 |
| sale_items | ~210,000 |
| account_transactions | ~157,000 |
| **activity_logs** | **~1,365,000** ← largest by far |
| **Total** | **~2.7 million** |

**Verdict**: MySQL handles this scale comfortably — no crash risk, and 500,000 rows is well within normal operating range. Two fixes below keep it fast long-term.

### Fix 1 — Composite indexes for Profit/Loss reporting ✅
`sale_items` has no date column (dates live on `sales`), so every P&L run JOINs ~210k item rows against ~105k sale rows before date-filtering. Composite indexes make this stay fast:
```sql
-- sales
INDEX(sale_date, status)        -- date range + confirmed filter together
-- sale_items
INDEX(sale_id, product_id)       -- JOIN + grouping together
-- purchases (same reasoning)
INDEX(purchase_date, status)
```

### Fix 2 — Activity Log retention, configurable ✅
`activity_logs` grows fastest and carries heavy JSON (`old_values`/`new_values`), yet logs older than a year or two are rarely consulted. Unlike financial records (which are never deleted), audit logs get a retention window — **configurable by the shop owner**, not hardcoded:
```
settings
- ...
- activity_log_retention_months    integer, default 18
```
UI-তে এটা **dropdown** (free-text নয়, ভুল মান এড়াতে): `3 months` · `6 months` · `12 months` · `18 months` (default)
```php
// monthly scheduled job
$months = Settings::first()->activity_log_retention_months;
ActivityLog::where('created_at', '<', now()->subMonths($months))->delete();
```
Keeps the table bounded (~200k rows at the default window) instead of growing without limit. Financial data (sales, ledgers, stock movements) is never subject to this — only the audit trail of who-edited-what.

### Fix 3 — Dashboard aggregation caching (deferred, but flagged) 🟡
Dashboard summary figures (today's sales, total receivable/payable) re-aggregate on every page load. Fine now; at roughly 2–3 years of data this warrants the `daily_summaries` cache table already noted as deferred optimization in Phase 14. No action needed yet — just don't forget it exists as a known future need.

### UX Improvements — identified in audit ✅

**1. Show customer's outstanding due at sale time** — when a customer is selected in the Add Sale form, prominently display their current `contacts.balance` ("Previous due: ৳12,000"). This is the single most decision-relevant fact for a shopkeeper at that moment, and it's currently not surfaced anywhere in the sale flow.

**2. Recent purchase history on customer select** — show that customer's last 3–5 purchases inline, with a one-click "add same items again" action. Common real-world request ("give me the same as last month") currently requires navigating away to a separate page.

**3. Keyboard shortcuts for POS speed** — counter work is slow with a mouse. F2 = product search, F4 = payment, Enter = confirm, Esc = cancel. Not currently in the design.

**4. Undo window after sale confirm** — the immutability rule (no editing confirmed sales) is correct for data integrity, but issuing a manual correction entry is hard for a non-technical owner who spots a mistake seconds later. A 30-second "Undo" toast after confirming a sale, which auto-generates the proper reversal entries, preserves the immutable audit trail while making the common case (immediate mistake) a single click.

**5. Empty-state guidance** — on a fresh install, list pages show "No data". Replace with actionable guidance ("Add your first product") plus the relevant button.

### Deduplication review — no changes needed ✅
Fields that look redundant are deliberate and must NOT be normalized away:
- `sale_items.cost_at_sale` — snapshot of `avg_cost`, so historical profit stays correct when avg_cost later changes
- `products.current_stock` / `contacts.balance` / etc. — cached values derivable from their ledgers, kept for read performance (the core hybrid pattern)
- `sale_item_service_periods` — copied from `service_plan_templates` at sale time, so template edits don't retroactively change sold units' terms

---

## Phase 33: Historical Records, Invoice Templates, AI Assistant & Multi-language

### 1. Manual "Historical Record" entry ✅ (extends Phase 22's `sales.source`)
`sales.source` (manual/imported) already exists for bulk Excel import, where imported rows deliberately create no stock/ledger/account effects — since Opening Stock is a snapshot of *today's* reality (already net of all past sales), replaying old sales would double-count.

That same need applies to **manually** entering a handful of old sales for record-keeping/proof, without a spreadsheet. So the Add Sale form gets a checkbox:

> ☐ **Historical record** (won't affect stock or balances)

When checked, the sale saves with `source = 'imported'` and skips stock movements, contact ledger, and account transactions entirely — same code path as bulk import, just triggered manually. The sale still appears in sales history and customer purchase history, which is the whole point.

UI note: this checkbox should be visually distinct (e.g. in a collapsed "Advanced" section) so it's never ticked by accident during normal daily selling.

### 2. Invoice Templates — multiple designs + dynamic fields ✅
Currently only two hardcoded layouts exist (A4 and Thermal). This adds selectable, customizable templates.

```
invoice_templates
- id
- name                   ("Classic", "Modern", "Minimal")
- type                    enum('a4', 'thermal')
- is_default              boolean
- show_logo               boolean
- show_signature_line      boolean
- show_terms               boolean
- show_qr_code              boolean
- header_note               (nullable text)
- footer_note                (nullable text)
- terms_text                  (nullable text)
- accent_color                 (hex)
- created_by
```

**Deliberately toggle-and-text based, not a free-form HTML editor**: 2–3 pre-built designs the owner picks from, then customizes via checkboxes and text fields. A raw HTML/template editor would be far more flexible but is genuinely risky for a non-technical shop owner — one bad edit breaks every invoice they print, with no obvious way back. If advanced templating is ever needed, it can be added later as a separate power-user feature without disturbing this.

Frontend: **Settings → Invoice Templates** (Page, with live preview panel); template selection and field toggles apply immediately to Invoice/Challan/Quotation printing.

### 3. AI Query Assistant ✅ (formally added — was previously only discussed)
Natural-language querying of the shop's own data via the Claude API's tool-use (function calling) capability. The owner types "নুর নবীর কাছে কত পাওনা?" and gets a direct answer, instead of navigating to a report.

**How it works**: Claude is given a set of tool definitions (not raw database access). It decides which tool to call and with what arguments; the Laravel app executes the actual query and returns the result; Claude phrases the answer.

```php
$tools = [
    ['name' => 'get_contact_balance', 'description' => "A contact's current receivable/payable balance",
     'input_schema' => ['properties' => ['contact_name' => ['type' => 'string']], 'required' => ['contact_name']]],
    ['name' => 'get_account_balance',  'description' => 'Current balance of one or all payment accounts', ...],
    ['name' => 'get_low_stock_products', ...],
    ['name' => 'get_sales_summary', 'description' => 'Sales totals for a date range', ...],
];
```

**Conversation-based (chat), not one-shot**: the Claude API is stateless, so full history is re-sent each turn — enabling follow-ups like "ওর গত মাসের বিক্রি কত ছিল?" resolving "ওর" from prior context.
```
ai_conversations  — id, user_id, title (auto-generated from first question), created_at
ai_messages       — id, ai_conversation_id, role enum('user','assistant'), content, tool_calls (JSON, for audit), created_at
```

**Three non-negotiable constraints:**
1. **Permissions are enforced inside the tool execution**, not by Claude — a Cashier asking about supplier dues gets the same `auth()->user()->can(...)` check as if they'd opened the report manually. The AI never becomes a permission bypass.
2. **Fuzzy name matching** — `LIKE '%নুর%'`; on multiple matches, Claude asks which one rather than guessing.
3. **Optional and off by default** — it incurs per-query API cost (roughly ৳0.50/question on Haiku), so:
```
settings
- ...
- ai_assistant_enabled    boolean, default false
```

Frontend: floating chat bubble (bottom-right), opens a chat panel; supports starting a new conversation or continuing a previous one. Hidden entirely when `ai_assistant_enabled = false`.

### 4. Multi-language (Bengali/English) ✅
Many shop staff aren't comfortable in English, while owners often prefer English labels for accounting terms — so language is a **per-user** setting, not a global one.

```
users
- ...
- locale    enum('en', 'bn'), default 'bn'
```

Implementation: Laravel's built-in localization (`lang/en/*.php`, `lang/bn/*.php`) for server-side strings, with translations passed to the frontend via Inertia shared props so React components read from the same source. A middleware sets `App::setLocale()` from the authenticated user's `locale`.

Scope note: this covers UI labels, buttons, validation messages, and menu items — **not** user-entered data (product names, customer names stay exactly as typed). Numerals stay Western by default; Bengali numeral formatting remains a separate candidate item (Phase 27) since it affects reports and printing differently than UI labels do.

---

## Phase 33: Historical Records, Invoice Templates, AI Assistant & Multi-language

### 1. Manual Historical Record Entry ✅ (extends Phase 22's `sales.source`)
Phase 22 already defined `sales.source enum('manual','imported')`, where `imported` rows are record-only (no stock/ledger/account effects) to avoid double-counting against Opening Stock. That was scoped to bulk Excel import — this extends the same mechanism to **manual entry** for the common case of entering a handful of old sales by hand as proof-of-record.

**Add Sale form gets a checkbox**: "Historical record (won't affect stock or balances)". When checked, `source` is set to `imported` and the confirm action skips all side effects:
```php
if ($sale->source === 'imported') {
    // create sales + sale_items only — no StockService, no LedgerService, no AccountService calls
} else {
    // full normal flow
}
```
Applies equally to Purchase (`purchases.source` — same enum, added for symmetry). Historical records still appear in Sales/Purchase lists and customer purchase history, and are visually marked (badge: "Historical") so they're never confused with live transactions.

**Reports treatment**: historical rows are excluded from Profit/Loss and stock valuation by default (they'd distort figures whose baseline is Opening Stock), but included in customer purchase history and sales-trend reports where they add genuine context. A filter toggle lets the user include/exclude them explicitly.

### 2. Invoice Templates — multiple designs + dynamic fields ✅
Currently only two hardcoded layouts exist (A4, thermal). Replaced with selectable, customizable templates:
```
invoice_templates
- id
- name                 ("Classic", "Modern", "Minimal")
- type                  enum('a4', 'thermal')
- is_default
- show_logo, show_signature_area, show_terms, show_qr_code    (booleans)
- header_note, footer_note, terms_text                          (customizable text)
- accent_color
- created_by
```

**Deliberate scope decision**: customization is **toggle- and text-based, not a free-form HTML editor**. A non-technical shop owner can safely turn a logo on/off or edit terms text; handing them raw HTML/Blade risks them breaking their own invoices with no way to recover. Two or three well-made base designs plus these toggles covers realistic needs.

Same template system serves Invoice, Delivery Challan, and Quotation — the underlying data differs, the layout engine doesn't.

### 3. AI Query Assistant ✅ (formalized — previously only discussed)
Natural-language querying of the shop's own data via the Claude API's tool-use capability, delivered as a chat interface.

**How it works**: the app defines a set of tools (functions) Claude may call; Claude picks the right one from a plain-language question; the Laravel app executes the actual query and returns the result; Claude phrases the answer. The tools reuse existing report/scope logic (Phase 14/28) — no new query code.
```php
$tools = [
    ['name' => 'get_customer_due', 'description' => "A customer's outstanding balance",
     'input_schema' => ['properties' => ['customer_name' => ['type' => 'string']], 'required' => ['customer_name']]],
    ['name' => 'get_account_balance', ...],
    ['name' => 'get_low_stock_products', ...],
    ['name' => 'get_todays_sales', ...],
];
```

**Conversation-based (multi-turn)** — the Claude API is stateless, so full history is re-sent each turn, which requires storing it:
```
ai_conversations
- id, user_id, title (auto-generated from first question), created_at

ai_messages
- id, ai_conversation_id
- role        enum('user','assistant')
- content
- tool_calls   (nullable JSON — which tools ran, for debugging/audit)
- created_at
```

**Three critical constraints:**
1. **Permissions are enforced inside tool execution** — the same `auth()->user()->can(...)` checks that guard manual reports apply here; the assistant can never surface data a user couldn't otherwise view.
2. **Fuzzy name matching** — customers rarely type exact full names; tools use `LIKE '%...%'`, and on multiple matches Claude asks which one was meant rather than guessing.
3. **Optional, off by default** — this is the only feature with an ongoing per-use API cost, so it's gated: `settings.ai_assistant_enabled` (default false).

**UI**: floating chat bubble (bottom-right), opens a chat panel; users can start a new conversation or resume a previous one.

### 4. Multi-language — Bengali/English ✅
Many shop staff aren't comfortable in English, and this is a genuine gap versus local competitors.

- Laravel localization (`lang/en/*.php`, `lang/bn/*.php`) for backend strings; a shared JSON translation file consumed by the React frontend for UI strings.
- Per-user preference (`users.locale`, default `bn`) — so an owner comfortable in English and a cashier who prefers Bengali can each get their own.
- **Scope boundary**: UI labels/messages are translated; user-entered data (product names, customer names, notes) is stored and shown exactly as typed — never machine-translated.
- Bengali numeral display (৳১২,০০০ vs ৳12,000) as a separate settings toggle, since preferences differ even among Bengali speakers.

---

## Phase 34: True Double-Entry Bookkeeping (Chart of Accounts + Journal Entries)

### Why this changed ✅
The earlier Debit/Credit labels shown in Contact Ledger, Trial Balance, and Financial Position were **derived presentation only** — computed from a single signed `amount` column, not genuine double-entry accounting (no Chart of Accounts, no guarantee that total debits equal total credits system-wide). This is fine for a small proprietorship shop, but insufficient for customers who need bank loans, formal audits, or tax filings — a real requirement once the target market includes larger/audit-needing businesses. Since no code has been written yet, this is the correct and cheapest time to build it properly, before any migration exists.

### Core Approach — Subsidiary Ledgers + General Ledger (standard accounting pattern) ✅
**Nothing already designed is discarded.** `contact_ledger`, `account_transactions`, `stock_movements`, `staff_ledger`, `asset_transactions`, etc. remain exactly as designed — in accounting terms these are **subsidiary ledgers** (fast, per-entity operational detail). A new **General Ledger** layer sits above them: every business event that already writes to a subsidiary ledger *also* posts a balanced Journal Entry to a Chart of Accounts, in the same `DB::transaction()`. The General Ledger becomes authoritative for formal accounting reports (Trial Balance, Balance Sheet, Profit & Loss); the subsidiary ledgers remain authoritative for fast operational UI (customer statement, account statement, stock history).

### Chart of Accounts ✅
```
chart_of_accounts
- id, code, name
- type              enum('asset', 'liability', 'equity', 'income', 'expense')
- normal_balance     enum('debit', 'credit')
- parent_id          (nullable — sub-accounts, e.g. each `accounts` row gets one under "Bank Accounts")
- is_active
```
**Default seeded accounts:**
```
1010 Cash in Hand (asset/debit)          1020 Bank Accounts (asset/debit, parent for per-bank sub-accounts)
1100 Accounts Receivable (asset/debit — control account, rolls up contacts.balance for customers)
1200 Inventory (asset/debit — control account, rolls up stock value)
1300 Staff Advances (asset/debit)         1400 Fixed Assets (asset/debit)
2100 Accounts Payable (liability/credit — control account, rolls up contacts.balance for suppliers)
2200 Loans Payable (liability/credit)      2300 Other Liabilities (liability/credit)
3100 Owner's/Investor's Capital (equity/credit)    3200 Retained Earnings (equity/credit)
4100 Sales Revenue (income/credit)          4200 Service/Installation Income (income/credit)
5100 Cost of Goods Sold (expense/debit)      5200+ one per expense_category (expense/debit)
```

### Journal Entries ✅
```
journal_entries
- id, entry_date (= operation_date, the authoritative business date), description
- reference_type, reference_id       (links back to Sale, Purchase, Expense, etc.)
- created_by, created_at

journal_entry_lines
- id, journal_entry_id, chart_of_account_id
- debit, credit
- note
```
**Hard rule**: for any single `journal_entry`, `SUM(debit) = SUM(credit)` across its lines — enforced in code, never allowed to be violated.

```php
class JournalService {
    public function post(Carbon $date, string $description, array $lines, ?string $refType = null, ?int $refId = null): JournalEntry {
        $totalDebit = array_sum(array_column($lines, 'debit'));
        $totalCredit = array_sum(array_column($lines, 'credit'));
        if (abs($totalDebit - $totalCredit) > 0.01) {
            throw new UnbalancedJournalEntryException();
        }
        return DB::transaction(function () use ($date, $description, $lines, $refType, $refId) {
            $entry = JournalEntry::create(['entry_date'=>$date, 'description'=>$description, 'reference_type'=>$refType, 'reference_id'=>$refId]);
            foreach ($lines as $line) { $entry->lines()->create($line); }
            return $entry;
        });
    }
}
```

### Example Postings — every existing Action class gains a journal post, alongside its existing subsidiary-ledger writes ✅
```
Sale (on credit, total 1000, COGS 700):
  Dr Accounts Receivable  1000  |  Cr Sales Revenue     1000
  Dr Cost of Goods Sold    700  |  Cr Inventory           700

Payment received (500):
  Dr Cash/Bank             500  |  Cr Accounts Receivable 500

Purchase (on credit):
  Dr Inventory             600  |  Cr Accounts Payable    600

Expense paid immediately (rent, 1000):
  Dr Rent Expense         1000  |  Cr Cash/Bank          1000

Fund Transfer:
  Dr Bank A               5000  |  Cr Cash In Hand       5000

Investor Investment:
  Dr Cash/Bank          100000  |  Cr Owner's Capital  100000

Company Loan Received:
  Dr Cash/Bank          200000  |  Cr Loans Payable    200000
```
Each existing Action class (`ConfirmSaleAction`, `ConfirmPurchaseAction`, `RecordPaymentAction`, expense/asset/loan/investor actions, `FundTransferAction`) is extended to call `JournalService::post()` with the correct lines, inside the same transaction as its existing `StockService`/`LedgerService`/`AccountService` calls — nothing about those existing calls changes.

### Reports now sourced from the Journal ✅ (supersedes the earlier ad-hoc formulas in Phase 14)
```php
// Trial Balance — genuinely guaranteed balanced, not just presented that way
JournalEntryLine::selectRaw('chart_of_account_id, SUM(debit) as total_debit, SUM(credit) as total_credit')
    ->groupBy('chart_of_account_id')->get();

// Balance Sheet — aggregate Chart of Accounts balances by type (asset / liability / equity)
// Profit & Loss — Income-type minus Expense-type account balances for a date range
```

### Reconciliation Check — safety net against subsidiary/GL divergence ✅
Since subsidiary ledgers and the General Ledger are dual-written, a bug in one path could silently desync them. A daily scheduled check:
```php
$contactReceivableTotal = Contact::whereIn('type', ['customer','both'])->where('balance', '>', 0)->sum('balance');
$glReceivable = ChartOfAccount::where('code', '1100')->first()->balance;
if (abs($contactReceivableTotal - $glReceivable) > 0.01) {
    // alert — investigate immediately, do not let this go unnoticed
}
```
Same check pattern applies to Accounts Payable (2100) vs supplier dues, and Inventory (1200) vs stock valuation.

### Build Order impact ✅
Chart of Accounts + Journal Entry + `JournalService` must be built **immediately after Accounts**, before any transaction module (Purchase, Sale, Expense...), since every one of those modules now posts journal entries as part of its core confirm logic.

---

## Phase 35: Architecture Hardening (V2) — External Review Fixes

Following an external architectural review (after Phase 34's double-entry addition), a set of gaps were identified and evaluated. This phase locks in the fixes — timed intentionally before Phase 2.5 (Chart of Accounts) implementation begins, so most land cleanly with no retrofit. Two items (Serial Number Lifecycle, Backup) require retrofitting already-built modules since those were completed before this review.

### 1. Explicit Source of Truth Rule ✅
Stated plainly, not just implied: **`journal_entries`/`journal_entry_lines` is the only source for financial statements** (Trial Balance, P&L, Balance Sheet, General Ledger). `contact_ledger`, `account_transactions`, `stock_movements`, `staff_ledger`, `asset_transactions`, etc. remain **operational subsidiary ledgers only** — fast UI, customer/account/stock detail — and must never be queried to produce a formal accounting report. `account_transactions` in particular must never become an alternate Balance Sheet source; if a future report needs "cash position," it queries the Cash/Bank Chart of Accounts balances, not `account_transactions` directly.

### 2. `accounts` ↔ `chart_of_accounts` mapping ✅
```
accounts
- ...
- chart_of_account_id    (FK, required — links this specific Cash/Bank/Mobile Banking account to its COA node)
```
Auto-created, not manually picked: when a new `accounts` row is created, a matching child `chart_of_accounts` entry is created under the right parent (Cash-type → child of 1010, Bank/Mobile Banking/Cheque-type → child of 1020) in the same transaction:
```php
class CreateAccountAction {
    public function execute(array $data): Account {
        return DB::transaction(function () use ($data) {
            $parentCode = $data['account_type'] === 'cash' ? '1010' : '1020';
            $coa = ChartOfAccount::create([
                'code' => $this->nextSubCode($parentCode), 'name' => $data['name'],
                'type' => 'asset', 'normal_balance' => 'debit',
                'parent_id' => ChartOfAccount::where('code', $parentCode)->first()->id,
            ]);
            return Account::create([...$data, 'chart_of_account_id' => $coa->id]);
        });
    }
}
```
`account_types` (Cash/Bank/Mobile Banking/Cheque) and `chart_of_accounts.type` (asset/liability/equity/income/expense) are explicitly two different classification axes — the former is payment-medium, the latter is accounting classification — never conflate them.

### 3. Opening Balance posts a Journal Entry too ✅
Previously, opening balances (Account, Contact, Asset, Loan, Investor, Other Liability) only wrote to their subsidiary ledger. Now each also posts a balanced journal entry against a new equity account:
```
New COA: 3300 Opening Balance Equity (equity/credit)

Asset-side opening (Cash, Inventory, Fixed Asset, Customer Due, Staff Advance):
  Dr {Asset COA}                  X   |  Cr Opening Balance Equity      X

Liability-side opening (Supplier Due, Loan, Other Liability):
  Dr Opening Balance Equity       X   |  Cr {Liability COA}             X
```
`accounts.opening_balance` remains as a historical/display field, but is no longer the accounting source of truth — the journal entry is.

### 4. Journal Entry status + reversal (never edit, only reverse) ✅
Consistent with the system's own immutability principle — extended properly to the General Ledger:
```
journal_entries
- ...
- status              enum('posted', 'reversed'), default 'posted'
- reversed_at, reversed_by     (nullable)
- reversal_of_id                (nullable, self-referencing FK)
```
```php
class JournalService {
    public function reverse(JournalEntry $original, string $reason, int $userId): JournalEntry {
        $mirrored = $original->lines->map(fn($l) => ['chart_of_account_id'=>$l->chart_of_account_id, 'debit'=>$l->credit, 'credit'=>$l->debit])->toArray();
        $reversal = $this->post(now(), "Reversal: {$reason}", $mirrored, 'journal_reversal', $original->id);
        $original->update(['status'=>'reversed', 'reversed_at'=>now(), 'reversed_by'=>$userId]);
        $reversal->update(['reversal_of_id'=>$original->id]);
        return $reversal;
    }
}
```

### 5. Accounting Period Lock ✅
```
accounting_periods
- id, start_date, end_date
- status         enum('open', 'closed')
- closed_at, closed_by
```
`JournalService::post()` checks the entry's date falls in an **open** period before writing; closed-period entries are rejected outright (`ClosedPeriodException`). Periods are seeded (monthly, aligned to `fiscal_year_start_month`) as `open` by default; closing one is an explicit Admin-only action. This prevents a July sale edit from silently changing an already-reported June P&L.

### 6. Idempotency for money-moving Actions ✅
Every Action that posts stock/ledger/journal entries (`ConfirmSaleAction`, `ConfirmPurchaseAction`, `RecordPaymentAction`, `CreateSaleReturnAction`, `CreatePurchaseReturnAction`, `FundTransferAction`, `EmiInstallmentPaymentAction`) gets a state-check guard as its first line — reprocessing an already-confirmed record is a safe no-op, not a duplicate:
```php
class ConfirmSaleAction {
    public function execute(Sale $sale, array $payments): Sale {
        if ($sale->status === 'confirmed') {
            return $sale; // already processed — idempotent no-op, not an error
        }
        return DB::transaction(function () use ($sale, $payments) { /* ... */ });
    }
}
```
For brand-new-record double-submission (e.g. double-clicking "Save Purchase" creating two separate rows), the frontend disables the submit button after first click, and the backend additionally rejects a repeat submission carrying the same short-lived request token within a small time window.

### 7. Stock Concurrency — pessimistic locking ✅
```php
class StockService {
    public function decrease(Product $product, float $qty, string $type, ...): void {
        DB::transaction(function () use ($product, $qty, $type, ...) {
            $locked = Product::lockForUpdate()->find($product->id);
            if ($locked->manage_stock && $locked->current_stock < $qty) {
                throw new InsufficientStockException();
            }
            StockMovement::create([...]);
            $locked->decrement('current_stock', $qty);
        });
    }
}
```
Prevents two simultaneous sales of the last unit from both succeeding.

### 8. Stock Movement — cost fields for valuation traceability ✅
```
stock_movements
- ...
- unit_cost      (nullable — cost per unit at the time of this specific movement)
- total_cost      (nullable — quantity × unit_cost)
```
`purchase` movements get the purchase's `unit_price`; `sale`/`sale_return` movements get the sale item's `cost_at_sale`; `adjustment` movements get the product's `avg_cost` at that moment. This makes `stock_movements` self-sufficient for inventory valuation reports without re-joining to `sale_items`/`purchase_items` every time.

### 9. Money fields — DECIMAL, never float ✅
**Global rule, applies retroactively to every already-defined column**: every monetary/quantity-adjacent column (`amount`, `price`, `balance`, `total`, `subtotal`, `debit`, `credit`, `cost`, etc., across all ~56 tables) uses `decimal('column', 19, 4)` in migrations — never `float`/`double`. This must be corrected in Phase 2/5/6's already-built migrations before Phase 2.5 continues, since it gets progressively more disruptive to fix later.

### 10. Return accounting mapping ✅
```
New COA: 4150 Sales Returns & Allowances (contra-income — nets against 4100 in reporting)

Sales Return:
  Dr Sales Returns & Allowances     X   |  Cr Accounts Receivable/Cash    X
  Dr Inventory                       Y (at cost_at_sale)  |  Cr Cost of Goods Sold   Y

Purchase Return:
  Dr Accounts Payable/Cash          X   |  Cr Inventory (at original purchase unit_cost)   X
```

### 11. Investor & Loan accounting mapping — explicit ✅
```
New COA: 5900 Interest Expense (expense/debit)

Investment:       Dr Cash/Bank              X  |  Cr Owner's/Investor's Capital   X
Profit Share:      Dr Retained Earnings       X  |  Cr Cash/Bank                    X
Withdrawal:         Dr Investor's Capital      X  |  Cr Cash/Bank                    X

Loan Disbursement: Dr Cash/Bank              X  |  Cr Loans Payable                X
Loan Repayment:      Dr Loans Payable          X  |  Cr Cash/Bank                    X
Interest Charge:      Dr Interest Expense        X  |  Cr Loans Payable                X
```

### 12. Serial Number Lifecycle — full retrofit, supersedes the earlier `sale_item_serials` ✅ (decided: do now)
The earlier lightweight `sale_item_serials` (Phase 26 — optional, sale-only, unconnected to purchase) is **replaced entirely** by a proper lifecycle table, since the target market (home appliances) genuinely benefits from tracking a specific unit from purchase through warranty:
```
serial_numbers
- id
- product_id
- serial_number         (unique per product)
- status                 enum('in_stock', 'sold', 'returned', 'under_warranty_service', 'disposed')
- purchase_item_id         (nullable, FK — which purchase brought this unit in)
- sale_item_id               (nullable, FK — set once sold)
- created_at
```
**Lifecycle**: Purchase confirm (if `product.track_serial_number`) creates one `serial_numbers` row per unit at `status: in_stock`. Sale confirm requires picking specific in-stock serial(s) for that product, setting `status: sold` + `sale_item_id`. Sale Return sets the matched serial to `status: returned` (requires manual move back to `in_stock` after inspection — a returned appliance may need a service check first, not an automatic re-stock). This gives the full chain: **Serial → Sale Item → Customer → Warranty → Service History**, queryable directly.
**Retrofit note**: since `sale_item_serials` was already built as part of Phase 6, this needs a migration replacing it with `serial_numbers`, plus updating `ConfirmSaleAction` to require serial selection (not free-text entry) when `track_serial_number` is on, and `ConfirmPurchaseAction` to generate `in_stock` rows.

### 13. Backup — Scheduled + Retention + Restore, reinstated ✅ (decided: revert the earlier simplification)
Phase 16 was deliberately simplified earlier to manual-only, no restore — reasonable for a small-shop-only target. Now that larger, audit-needing clients are in scope, that trade-off no longer holds; reinstating the fuller design:
- **Scheduled automatic backup** (daily, via `spatie/laravel-backup`'s `backup:run` on the schedule) + **retention** (`backup:clean`) + **health monitoring** (`backup:monitor`, alerting if a backup is missing or stale).
- **Restore — self-service, heavily guarded** (this exact design was worked out earlier in the project and is being reinstated as-is): `backup.manage` permission gate (Admin/Owner only) → typed confirmation ("type RESTORE to confirm, this is irreversible") → automatic safety-snapshot of current state immediately before restoring → queued `RestoreDatabaseJob` that extracts the backup's SQL dump and applies it. Download Backup and Upload-and-Restore (for migrating to new hosting) both included.

### 14. Cash Book → displayed as "Petty Cash" (no DB rename) ✅
The `cash_book`/`cash_book_entries` tables (already built, Phase 2.6) keep their internal names — renaming an already-migrated table has real cost for zero functional benefit. Only the **user-facing label** changes, everywhere in the UI (sidebar, page titles): "Cash Book" → **"Petty Cash"**, to avoid confusion with the formal accounting Cash account now that Chart of Accounts exists.

### 15. `sales.payment_type` renamed to `financing_type` — retrofit ✅
`enum('cash', 'emi')` was confusingly named (it's about financing mode, not payment method — payment method is already handled via account selection/split payment). Renamed:
```
sales.financing_type    enum('one_time', 'emi')   -- was payment_type enum('cash','emi')
```
Retrofit: rename the column, update the enum values, and update the one place (`ConfirmSaleAction`) that reads it.

### 16. Delete policy — tightened, stated explicitly ✅
Sale, Purchase, Payment (`account_transactions`), Journal Entry, Stock Movement, and every ledger table (`contact_ledger`, `staff_ledger`, `asset_transactions`, etc.) are **never hard-deleted, by anyone, including Admin** — the application layer exposes no delete action for these at all. Corrections always happen via Return, Adjustment, Void/Cancel, or Journal Reversal — never a DELETE statement against financial history.

### 17. Deferred, explicitly (per this review, given lower priority now) ⏳
- **Payment Allocation** (one payment split across multiple invoices via `payments`/`payment_allocations`) — decided to keep simple for now: one payment record ties to one Sale/Purchase reference, as already designed. Revisit if a real customer need for split-invoice payments surfaces.
- **Approval Workflow** (discount >20%, large stock adjustment, etc. requiring sign-off) — architecture leaves room for it (nullable `approved_by`/`approved_at` could be added later to sensitive tables) but not built now.
- **Tax/VAT** — schema stays naturally extensible (adding nullable `tax_rate`/`tax_amount` to `sale_items`/`purchase_items` later is non-disruptive); no action needed today.
- **Polymorphic `reference_type`/`reference_id` FK integrity** — an accepted trade-off of Laravel's polymorphic pattern; mitigated at the application layer (Actions only ever write valid references) rather than restructured into per-type FK columns, which would add far more complexity than the risk warrants at this scale.

---

## Not Yet Decided
- Supplier/Customer "contract" fields — deferred, not needed now. If revisited: `credit_limit`, `payment_due_days` (for due_date/overdue tracking), `discount_rate` (default per-contact discount) were discussed as candidate nullable columns on `contacts` — easy to add later without restructuring.

## Finalized — Product Scope
- **No product variants** (size/color) for now — Product table stays simple, no variant table needed.

---

*This document is updated as decisions are finalized during design discussions.*
