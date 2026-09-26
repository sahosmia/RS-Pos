- [x] **1**  Dashboard-e Sales Last 30 Days chart dekao, abar Sales Current Financial Year ata monthly hobe. 
- [x] **2** customer ba supplier details page e upore akta ddropdown thakbe jekane all contract gulo show korbe mane amar searchable input ta akan add hobe, je ta select korbo or data gulo tokon details page e dekabe
- [x] **3** ami initial obosthai jokon login korci dekci amar sales menu ta open thakche sidebar e, ata to open thakar kota na
- [x] **4** user management e user create edit delete thakbe, akane jodi kono user er under e kono transition thake tahole delete hobe na, status add korbe, 
- [x] **5** system joto ta user friendly kora jai, jemon kono jaigai kono contact (customer ba supplier) er nam thakle seta tar details pager stahe link kora thakbe jate click korle oi page e cole jai, 
- [x] **6**Add a "Financial Position" report (as-of-date balance sheet) built on a
balance+ledger-per-module pattern — NOT a formal double-entry chart of
accounts. Each subsidiary module already has its own transaction/ledger
table with a signed effect (debit/credit or +/- amount); this report simply
sums each one as of a chosen end_date and nets them into Assets vs
Liabilities, with Profit as the balancing figure.

## Core mechanism — "as of end_date" ledger sum
For every module that contributes a balance (staff advances, company assets,
other liabilities, investor capital, company loans, contact dues), query its
ledger table with:
  WHERE {module}_id = X
    AND effective_date <= :end_date
  GROUP BY module row
  SUM(debit-effect rows) - SUM(credit-effect rows) = balance

"effective_date" must NOT simply be the ledger row's created_at — if a ledger
row is linked to an underlying dated transaction (e.g. an account
transaction with its own operation_date), prefer that transaction's date and
fall back to created_at only when there's no linked transaction. This keeps
the report accurate when data entry happens later than the real transaction
date. Example SQL fragment:
```sql
DATE(COALESCE(
  (SELECT t.operation_date FROM {linked_transactions} t
   WHERE t.id = {ledger_alias}.linked_transaction_id AND t.deleted_at IS NULL),
  {ledger_alias}.created_at
))
Contacts (customer/supplier/both) — ONE unified balance per contact
Do not compute a separate "sell due" and "purchase due" and show both sides.
Instead, for every contact:


sell_due     = invoices - amount_received - returns + return_paid - discounts
             + (any other sell-side transaction types, e.g. bookings/subs)
purchase_due = purchases - amount_paid - returns + return_paid - discounts
opening_due  = opening_balance - opening_balance_paid
balance      = sell_due - purchase_due + opening_due
A 'both'-type contact nets purchase_due against sell_due automatically via
this one formula — never split the same contact across both Debtors and
Creditors. Then:

balance > 0 → Debtors / Sundry Debtors (asset side, they owe us)
balance < 0 → Creditors / Sundry Creditors (liability side, we owe them), shown as a positive "due to pay" amount (negate the balance)
Cutoff rule: payments must also be filtered paid_on <= end_date, not just
the transactions/invoices. Otherwise a payment made after the report date
still gets netted off, making a past-dated report change retroactively as
new payments come in, and can flip a contact to the wrong side.

Also account for unlinked/advance payments (payments recorded against the
contact directly, not tied to any specific transaction) — split by their own
credit/debit earmark, filtered by the same paid_on cutoff, or they'll be
invisible to the per-transaction joins and silently under/over-count.

Report sections

ASSETS
  Closing Stock          — existing stock-valuation-as-of-date utility
  Sundry Debtors         — contacts with balance > 0 (breakdown per contact)
  Company/Staff Advances — per-staff ledger balance, debit-effect rows minus
                            credit-effect rows, as of end_date
  Cash at Bank            — sum of payment-account balances (NOT filtered by
                            location — accounts are business-level, a
                            location filter must not silently drop
                            unmapped/shared accounts)
  Other/Company Assets    — per-asset ledger balance as of end_date

LIABILITIES
  Investor Capital        — per-investor: invest − withdraw, as of end_date
  Company Loans           — per-loan: (loan + accrued interest) − repay, as
                            of end_date (interest folds into the same side
                            as principal, not shown separately)
  Sundry Creditors        — contacts with balance < 0 (breakdown per contact)
  Other Liabilities       — per-liability ledger balance as of end_date
  Gross/Net Profit        — BALANCING FIGURE, computed as:
                            Total Assets − (Capital + Loans + Creditors + Other Liabilities)
                            i.e. never stored/tracked separately — it's
                            whatever makes Total Liabilities == Total Assets
Every section returns BOTH an aggregate total AND a per-entity breakdown
array (name + amount), so the frontend can show an expandable list under
each heading, not just a single number.

Filters
end_date (defaults to today) — every sub-query above must respect it
location_id (optional) — applied to transaction-based sums (stock, contact dues) but explicitly NOT applied to business-level data like cash accounts
Implementation notes
Gate the whole report behind a dedicated permission (e.g. financial_position.view), separate from any simpler/older balance-sheet permission that may already exist.
Wrap the whole computation in try/catch on the AJAX endpoint; log the error server-side and return a JSON error payload instead of a raw 500, so the frontend can show a friendly failure state.
Keep every returned key both under its new descriptive name AND (if replacing an older report) under any legacy key names other views/exports might already reference, to avoid breaking existing consumers during the transition.
- [x] **7** sales, purchess list e kono search nai akane cusotmer ba suplier nam diye, invoice diye search kora way thakte hobe to

- [x] **8** Petty Cash er date formate thik nai
- [x] **9** app\Http\Controllers\Staff\StaffController.php:73
Attempt to read property "value" on null

- [x] **10** user create and edit e role lagbe to,  abar username lagbe, karon username diyeo login kora jabe

- [x] **11** sob input filed gulo te custom forminput component use koro, ata full system e
----------------------------
- [ ] **12** asset and Liabilities alada menu hobe ar tab system hobe, alada separet menu hobe
- [ ] **13** Roles & Permissions menu ta user managment hisebe thakbe akane users, roles alada submenu hobe, sidebar tai serial ta thik koro buisness setting theke
- [ ] **14** header e quick create er button ta only + thakle hobe ato boro text lagbe na, ar bg tao normal thakbe
- [ ] **15** Added by option thakte hobe kono
- [ ] **16** Dashboard er je sales 30 days , sales year ai gulo full width hobe, 
- [ ] **17** aktu details e bolo dashboard er kon card er ki kaj
- [ ] **16**
- [ ] **16**






