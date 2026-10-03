# Data integrity — which record wins

Money and stock are each written in more than one place. That is deliberate (a fast cached
balance for locking and screens, a log for history), but it only stays safe if everyone agrees
**which one is the truth** and the others are checked against it.

## Source of truth

| What | Source of truth | Operational register | Cached / derived (never trusted over its source) |
|---|---|---|---|
| Money | `journal_entries` + `journal_entry_lines` (General Ledger) | `account_transactions` (cash/bank register) | `chart_of_accounts.balance`, `accounts.current_balance`, `accounts.opening_balance` |
| Customer / supplier dues | General Ledger (1100 / 2100) | `contact_ledger` | `contacts.balance` |
| Stock | `stock_movements` (append-only log) | — | `products.current_stock` |
| Loans, assets, investors, other liabilities | their `*_transactions` log + General Ledger | `*_transactions` | `outstanding_balance`, `current_value`, `total_invested`, `current_balance` |

Rules that follow from this:

- **History is append-only.** A mistake is corrected with a reversing entry / opposite movement,
  never by editing or deleting the row. (The one deliberate exception: an account's opening
  transaction while the account has no other activity.)
- **One write path.** Cached balances move only through the services (`AccountService`,
  `JournalService`, `StockService`, `LedgerService`, the `HasLedger` trait), in the same database
  transaction as the row they summarise.
- **A cache is never "corrected" by hand.** If a check below disagrees, find out *why* first:
  the log may be the thing that is wrong, and `--fix` would then make the wrong number permanent.

## The nightly check

`php artisan reconciliation:check` (scheduled daily at 03:00, see `routes/console.php`) sets the
copies side by side and logs a warning for every mismatch. It never changes data on its own.

1. Receivable / Payable / Inventory — subsidiary ledgers against their General Ledger accounts
2. Every journal entry's debits equal its credits
3. Every chart-of-accounts balance equals its journal lines
4. Every payment account's balance equals its own transactions
5. Loan / asset / investor / liability balances equal their transaction logs
6. Every product's stock equals its stock movements (per product, so two opposite errors cannot cancel out)
7. Each cash/bank account's register equals the journal lines on the ledger account it posts to
8. `accounts.opening_balance` equals the account's opening transaction

`reconciliation:check --fix` rebuilds contact balances, product stock and the loan / asset /
investor / liability balances from their logs before checking. Run it by hand, after looking at
the warnings — not on a schedule.

## When you add something new

- A new cached column? Say here what it caches, and add its check to `CheckReconciliation`.
- A new module that moves money? It must write the register row **and** the journal entry in one
  transaction; check 7 will flag it if it forgets one.
