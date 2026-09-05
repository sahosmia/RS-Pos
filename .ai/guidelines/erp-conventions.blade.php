# CLAUDE.md — Project Standing Instructions

এই ফাইলটা প্রতিটা Claude Code session-এর শুরুতে automatically load হয়। এখানে যা লেখা থাকবে সেটা **বার বার বলার দরকার নেই** — Claude Code নিজেই মেনে চলবে।

## Project Context
- Laravel 12 (পরে 13-এ upgrade) + Inertia 2 + React 19 + TypeScript + MySQL + Tailwind 4 + shadcn/ui
- Single-shop, single-tenant ERP — প্রতিটা customer আলাদা install
- সম্পূর্ণ design reference: `docs/erp-master-reference.md` (logic+DB+frontend একসাথে), `docs/erp-database-schema.md` (শুধু schema), `docs/erp-design-decisions.md` (কারণ ও ইতিহাস)
- **যেকোনো module বানানোর আগে `docs/erp-master-reference.md`-এর সংশ্লিষ্ট পর্ব পড়ে নাও।**

## Architecture — সবসময় এই Pattern মেনে চলো

### Backend
- **Controller পাতলা থাকবে** — শুধু validate করবে ও Action/Service call করবে, business logic controller-এ লেখা যাবে না
- **Business logic → `app/Actions/{Module}/{Verb}Action.php`** — যেমন `ConfirmSaleAction`, `RecordPaymentAction`
- **Reusable cross-module logic → `app/Services/`** — `StockService`, `LedgerService`, `AccountService` (এগুলো ইতিমধ্যে design-এ সংজ্ঞায়িত, নতুন বানানোর আগে এগুলো ব্যবহার করো)
- **Multi-table পরিবর্তন সবসময় `DB::transaction()`-এর ভিতরে**
- **Validation ও Authorization → FormRequest** (`app/Http/Requests/`) — inline validation controller-এ লিখবে না। `authorize()` মেথডে permission check করবে
- **পুনরাবৃত্ত business rule → Custom Validation Rule** (`app/Rules/`) — যেমন "opening entry শুধু একবার", "return quantity বিক্রির বেশি না"
- **একই আচরণের একাধিক module → Trait** — যেমন `HasLedger` (Asset/Loan/Investor/OtherLiability সবাই share করে)
- **Stock পরিবর্তন সবসময় `StockService::increase()/decrease()` দিয়ে** — সরাসরি `increment()/decrement()` কল করবে না
- **Contact/Staff balance পরিবর্তন সবসময় `LedgerService` দিয়ে**
- **Account balance পরিবর্তন সবসময় `AccountService` দিয়ে**, আর `operation_date` set করতে ভুলবে না (শুধু `created_at` না)
- **⭐ প্রতিটা টাকা-সংক্রান্ত Action (Sale/Purchase/Payment/Expense/Transfer/Asset/Loan/Investor confirm) একই transaction-এর ভিতরে `JournalService::post()`-ও কল করবে** — Chart of Accounts-এ balanced Debit=Credit journal entry পোস্ট করার জন্য। কোনো money-movement Action journal posting ছাড়া "সম্পূর্ণ" ধরা হবে না। কোন account কোন lines পাবে সেটা `docs/erp-master-reference.md`-এর পর্ব ৬.৫-এ উদাহরণ আকারে আছে।

## Architecture V2 — গুরুত্বপূর্ণ Standing Rule (Phase 35)

- **Source of Truth:** Trial Balance/P&L/Balance Sheet **শুধু** `journal_entries`/`journal_entry_lines` থেকে আসবে। `contact_ledger`, `account_transactions`, `stock_movements` — এগুলো কখনো financial report-এর সরাসরি source হবে না, শুধু operational UI-এর জন্য
- **Money সবসময় `decimal(19,4)`** — কখনো `float`/`double` না, কোনো টেবিলে না
- **Journal Entry কখনো edit/delete হবে না** — ভুল হলে `JournalService::reverse()` দিয়ে reversing entry বানাতে হবে
- **Closed Accounting Period-এ কোনো নতুন journal post করা যাবে না** — `assertPeriodOpen()` check বাধ্যতামূলক প্রতিটা posting-এর আগে
- **Idempotency:** প্রতিটা confirm Action-এর প্রথম লাইনে state-check (`if ($model->status === 'confirmed') return $model;`) — reprocessing নিরাপদ no-op হবে, duplicate entry না
- **Stock decrement সবসময় `Product::lockForUpdate()` দিয়ে** — race condition এড়াতে
- **কোনো financial record (Sale, Purchase, account_transactions, journal_entries, stock_movements, যেকোনো ledger) কখনো hard-delete হবে না**, Admin দিয়েও না — Return/Adjustment/Void/Reversal দিয়ে সংশোধন হবে
- নতুন কোনো `accounts` row তৈরি হলে সাথে সাথে একটা `chart_of_accounts` sub-account **automatically** তৈরি হবে (manually পিক করতে হবে না)

### Immutability — এই নিয়ম কখনো ভাঙবে না
- Confirmed Sale/Purchase-এর data সরাসরি edit করা যাবে না — correction লাগলে নতুন adjustment/return entry
- Stock movement, ledger entry কখনো update বা delete হবে না, শুধু নতুন entry যোগ হয়

### Frontend
- **Reusable component `resources/js/components/shared/`-এ**, shadcn base `components/ui/`-এ — নতুন কিছু বানানোর আগে existing শেয়ার্ড component (`DataTable`, `ContactSelect`, `AccountPaymentRows`, `MoneyInput`, `StatusBadge`, `LedgerTable`, `FormModal`, `ConfirmDialog`, `EmptyState`) আছে কিনা দেখো
- **Custom hook `resources/js/hooks/`-এ** — `useDatatable`, `useConfirm`, `useMoneyFormat`
- TypeScript strict, কোনো `any` টাইপ ছাড়া চলা যাবে না জরুরি না হলে
- Backend enum-এর সাথে মিলিয়ে `resources/js/types/models.d.ts`-এ টাইপ রাখা
- Tailwind utility class + design token — inline style/hardcoded color না

## Code Style
- PHP: PSR-12, Laravel Pint দিয়ে format (`vendor/bin/pint`)
- Class name: PascalCase, method: camelCase, DB column: snake_case
- ছোট, single-responsibility method — একটা method একটাই কাজ করবে
- Magic number/string এড়িয়ে enum/const ব্যবহার করবে

## Testing
- প্রতিটা Action class-এর জন্য **অন্তত একটা Feature test** — বিশেষ করে multi-table transaction ঠিক আছে কিনা (stock+ledger+account একসাথে আপডেট হলো কিনা)
- `php artisan test` চালিয়ে confirm করেই কাজ "done" ধরা হবে

## যা কখনো করবে না
- Card number, CVV, PIN, OTP কোথাও store করবে না
- `accounts.account_number`, `settings.license_key` ছাড়া নতুন কোনো sensitive field encrypt করার দরকার নেই বলে ধরে নেবে না — জিজ্ঞেস করো
- Contact/Staff-এর `type`/`role`-এর মতো enum পরিবর্তন করার আগে `docs/erp-design-decisions.md`-এ Enum Reference (Phase 18) চেক করো, নতুন value ওখানেও যোগ করতে হবে

## একটা Task শেষ করার পর
- সংশ্লিষ্ট migration/model/action-এর জন্য feature test লেখা ও পাশ করানো
- `docs/`-এর কোনো enum/schema reference বদলালে সেটাও আপডেট করা (sync রাখা)
- ছোট, স্পষ্ট commit message দেওয়া
