

<laravel-boost-guidelines>
=== .ai/erp-conventions rules ===

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

=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application running on PHP 8.2. You are an expert with the Laravel ecosystem. Always use the APIs that match the installed major version of each package — do not assume a version.

Before relying on a package's API, confirm its installed version:
- PHP packages: run `composer show --direct` to list direct dependencies with versions, or `composer show <vendor/package>` for a single package.
- JS packages: check `package.json` for the installed versions.

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Use `search-docs` before changes that depend on Laravel ecosystem APIs, behavior, configuration, or version-specific syntax. Skip it for copy-only edits and other changes where package documentation is irrelevant. Reuse sufficient results already in context instead of searching again.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Project Rules

- This project contains committed, area-grouped rules in `.ai/rules` when that directory exists (settled decisions, non-obvious traps, standing constraints). Framework and package guidelines that only apply to specific paths (testing, frontend, components) also live there, under `.ai/rules/boost` — this is not just recorded decisions, it is load-bearing guidance you have not seen inline. Before you enter plan mode or create/edit any file, you MUST first: open @.ai/rules/index.md (it maps file globs to rule files), read every rule file whose globs cover the path(s) in scope, and run `grep -rin 'keyword' .ai/rules` to catch what a path match alone misses. Do not write code until you have read and are following every matching rule. If `.ai/rules` does not exist, continue without it.
- Record durable rules with `record-rule` so the next agent or teammate inherits them instead of working them out again. Pass a `glob` (e.g. `app/Http/Controllers/**`), a short `title`, and a few-line `note`. Always use `record-rule`, never your native memory or notes tool — native memory is personal and session-scoped; only `.ai/rules` is shared with the team and persists in the repo.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.

=== tests rules ===

# Test Enforcement

- Test every code change by adding or updating a test.
- Run the affected tests and ensure they pass.
- Test the changed behavior and its important failure modes, but do not add tests beyond them.
- Read the `testing-best-practices` skill before writing tests.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

# Inertia v2

- Use all Inertia features from v1 and v2. Check the documentation before making changes to ensure the correct approach.
- New features: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

=== laravel/v12 rules ===

# Laravel 12

- CRITICAL: ALWAYS use `search-docs` tool for version-specific Laravel documentation and updated code examples.
- Since Laravel 11, Laravel has a new streamlined file structure which this project uses.

## Laravel 12 Structure

- In Laravel 12, middleware are no longer registered in `app/Http/Kernel.php`.
- Middleware are configured declaratively in `bootstrap/app.php` using `Application::configure()->withMiddleware()`.
- `bootstrap/app.php` is the file to register middleware, exceptions, and routing files.
- `bootstrap/providers.php` contains application specific service providers.
- The `app/Console/Kernel.php` file no longer exists; use `bootstrap/app.php` or `routes/console.php` for console configuration.
- Console commands in `app/Console/Commands/` are automatically available and do not require manual registration.

## Database

- When modifying a column, the migration must include all of the attributes that were previously defined on the column. Otherwise, they will be dropped and lost.

- Laravel 12 allows limiting eagerly loaded records natively, without external packages: `$query->latest()->limit(10);`.

### Models

- Casts can and likely should be set in a `casts()` method on a model rather than the `$casts` property. Follow existing conventions from other models.

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== pest/core rules ===

# Pest

- This project uses Pest. Create tests with `php artisan make:test --pest {name}`.
- Do not include the test suite directory in `{name}`. Use `SomeFeatureTest`, not `Feature/SomeFeatureTest`.
- Read the `testing-best-practices` skill for guidance on coverage, naming, structure, dependency isolation, and review.
- Do not delete tests or test files without approval. They are part of the application.

## Running Tests

- Run the narrowest set of tests that covers the change. Pass a file path or `--filter=testName` to `php artisan test --compact`.
- Rerun a test after each change to it.
- Run `vendor/bin/pest` to call the test runner directly. It accepts the same file path and `--filter=testName` arguments.
- After the feature tests pass, ask the user to run the complete suite with `php artisan test --compact`.

=== inertia-react/core rules ===

# Inertia + React

- IMPORTANT: Activate `inertia-react-development` when working with Inertia React client-side patterns.

</laravel-boost-guidelines>
