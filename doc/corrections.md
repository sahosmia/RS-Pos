## Correction & Improvement Checklist

### 1. Password Input — Show/Hide Password ✅ সম্পূর্ণ

* [x] **All password input fields-এ Show/Hide functionality যোগ করতে হবে।** — নতুন reusable `resources/js/components/ui/password-input.tsx` (`PasswordInput`) বানানো হয়েছে, existing `Input` component-কে wrap করে — ডান পাশে Eye/EyeOff icon button (`tabIndex={-1}`, তাই existing form-এর tab-order নষ্ট হয় না), click করলে local state দিয়ে `type="password"` ↔ `type="text"` টগল হয়। App-এর সবগুলো password field (Login, Register, Confirm Password, Reset Password, Settings → Change Password-এর ৩টা field, Delete Account modal — মোট ৯টা input, ৬টা ফাইলে) এই component ব্যবহার করে। Existing styling/validation/error-state/ref-based focus management (settings/password.tsx, delete-user.tsx) সব অপরিবর্তিত। Verification: `tsc` (নতুন কোনো error নেই, শুধু pre-existing baseline), `eslint` clean, ২৫টা auth/password/profile-সংক্রান্ত test pass।
* Password field-এর ডান পাশে **Eye / Eye-Off icon** থাকবে।
* Icon click করলে password show/hide হবে।
* একই functionality প্রতিটি form-এ আলাদাভাবে implement করা যাবে না।
* একটি reusable **`PasswordInput` component** তৈরি করতে হবে এবং system-এর সব password field-এ ব্যবহার করতে হবে।
* Existing styling, validation, error state এবং form behavior unchanged রাখতে হবে।
* Component-টি Login, Register, Change Password, Reset Password ইত্যাদি সব জায়গায় reusable হতে হবে।

**Expected Result:**
একটি centralized reusable `PasswordInput` component থাকবে এবং সকল password field consistent Show/Hide behavior ব্যবহার করবে।

---

### 2. Global Date Formatting ✅ সম্পূর্ণ

* [x] **System-এর সকল displayed date-এর জন্য centralized date formatting utility/helper তৈরি করতে হবে।** — Audit করে দেখা গেছে centralized `formatDate` util ইতিমধ্যে `resources/js/lib/format-date.ts`-এ আছে (output: `"27 Aug, 2026"`, bare `YYYY-MM-DD` আর full timestamp দুটোই handle করে, timezone off-by-one avoid করে) এবং প্রতিটি display site (sales list/columns, contacts show, ledger table, warranty-claims, service-requests) আগে থেকেই এটা ব্যবহার করছিল — কোনো manual `.toLocaleDateString()`/hand-rolled formatting বাকি ছিল না। একটাই bug পাওয়া গেছে: `resources/js/pages/sales/index.tsx`-এ shared `formatDate` import করার পরেও একই নামে একটা local helper (query-param-এর জন্য `YYYY-MM-DD` বানানো) declare করা ছিল, যেটা পুরো module-এ import-টাকে shadow করে ফেলছিল — ফলে sale date display (line 121) ভুলভাবে `YYYY-MM-DD` format দেখানোর ঝুঁকিতে ছিল। Local helper-টাকে `toQueryDate`-এ rename করে fix করা হয়েছে যাতে দুটো আলাদা purpose (display vs query param) আলাদা নামে স্পষ্ট থাকে। Verification: `tsc --noEmit` (নতুন কোনো error নেই, শুধু pre-existing baseline product-form/auth/sales-orders/welcome errors), `eslint` clean on the edited file।
* বর্তমানে যেসব জায়গায় date manually format করা হচ্ছে সেগুলো identify করে নতুন formatter ব্যবহার করতে হবে।
* Default display format হবে:

```text
27 Aug, 2026
```

* Day → `27`
* Month → `Aug`
* Year → `2026`
* একই formatting logic পুরো application-এ consistently ব্যবহার করতে হবে।
* প্রতিটি component/page-এ আলাদাভাবে date formatting logic লেখা যাবে না।
* Existing date value, timezone handling এবং backend data structure অপ্রয়োজনে পরিবর্তন করা যাবে না।

**Expected Result:**
Application-এর সকল date একই consistent format-এ display হবে।

---

### 3. Sidebar — Modern & Smooth Transition ✅ সম্পূর্ণ

* [x] **Sidebar-এর open/close animation আরও smooth, modern এবং polished করতে হবে।** — Sidebar submenu-এর (`nav-main.tsx`-এর `CollapsibleContent`) open/close আগে instant show/hide ছিল (কোনো animation ছাড়া)। App-এ ইতিমধ্যে একটা reusable `collapsible-down`/`collapsible-up` `@keyframes` pair আছে (`resources/css/app.css`), যেটা data-table filters disclosure-এ (`data-table-toolbar.tsx`) height-based smooth animation-এর জন্য ব্যবহার হচ্ছিল — সেই একই established pattern সরাসরি sidebar submenu-তেও apply করা হয়েছে (`overflow-hidden data-[state=open]:animate-[collapsible-down_200ms_ease-out] data-[state=closed]:animate-[collapsible-up_200ms_ease-out]`)। ফলে submenu open হলে top→bottom grow করে (height 0 → auto) আর close হলে bottom→top shrink করে (height auto → 0), `overflow-hidden` sudden jump/flicker আটকায়, ২০০ms duration app-এর existing convention-এর সাথে consistent (না slow, না fast)। নতুন কোনো animation library লাগেনি, existing Tailwind arbitrary-value animation + existing keyframes reuse করা হয়েছে। Existing navigation/active-state/collapsed-icon-mode/mobile Sheet drawer behavior অপরিবর্তিত (শুধু `className` addition, কোনো logic change নেই) — desktop icon-collapse এবং mobile drawer আগে থেকেই `SidebarMenuSub`-এর `group-data-[collapsible=icon]:hidden` দিয়ে handled, তাতে হাত দেওয়া হয়নি। Verification: `eslint` clean on the edited file।
* Sidebar open হলে animation হবে **Top → Bottom** direction-এ।
* Sidebar close হলে animation হবে **Bottom → Top** direction-এ।
* Smooth easing এবং natural animation ব্যবহার করতে হবে।
* কোনো sudden jump বা visual flickering থাকা যাবে না।
* Animation অতিরিক্ত slow বা অতিরিক্ত fast হওয়া যাবে না।
* Existing navigation, active state এবং responsive/mobile behavior নষ্ট করা যাবে না।
* সম্ভব হলে existing Tailwind/CSS transition ব্যবহার করতে হবে; unnecessary animation library যোগ করা যাবে না।
* Desktop এবং mobile উভয় viewport-এ verify করতে হবে।

**Expected Result:**
Sidebar open/close একটি modern, smooth এবং professional dashboard-এর মতো অনুভূত হবে।

---

### 4. Sidebar — Product, Sales & Purchase Submenus ✅ সম্পূর্ণ

* [x] Sidebar-এর নিচের main menus-এ appropriate submenu যোগ করতে হবে: — Product/Purchase/Sales submenu আগে থেকেই existed (permission-gated parent + expandable/collapsible), শুধু "Add X" quick-create link বাকি ছিল। `app-sidebar.tsx`-এ প্রতিটি submenu-তে resource-এর existing `create` route (`/products/create`, `/purchases/create`, `/sales/create` — সবই standard Laravel `Route::resource` থেকে already আসে, নতুন route লাগেনি) দিয়ে "Add Product"/"Add Purchase"/"Add Sale" item যোগ করা হয়েছে, বাকি existing items (Low Stock, Category, Unit, Brand, Sale/Purchase Returns, Sales Order, EMI) অপরিবর্তিত রাখা হয়েছে। `nav` translation dictionary-তে (en.ts + bn.ts, দুটো জায়গাতেই — interface + values) নতুন `add_product`/`add_purchase`/`add_sale` key যোগ করা হয়েছে existing i18n pattern অনুসরণ করে। এই সংযোজনের ফলে একই parent-এর অধীনে দুটো url prefix-overlap করা sibling তৈরি হয় (যেমন `/products` আর `/products/create`) — সেটার জন্য `nav-main.tsx`-এ `findActiveSubItem` helper যোগ করা হয়েছে যেটা most-specific (longest URL) matching sub-item বেছে নেয়, ফলে `/products/create`-এ থাকলে শুধু "Add Product" highlight হয়, "Products" না (আগে এই edge case regression হতো)। Existing permission system অপরিবর্তিত — sub-item-level permission field আগেও কোথাও ব্যবহার হতো না (শুধু parent-level gate), তাই সেই convention-ই বজায় রাখা হয়েছে। Verification: `eslint` + `tsc --noEmit` (নতুন কোনো error নেই, শুধু pre-existing baseline)।

**Product**

* Products
* Add Product

**Purchase**

* Purchases
* Add Purchase

**Sales**

* Sales

* Add Sale

* Parent menu expandable/collapsible হবে।

* Current route অনুযায়ী appropriate parent menu automatically active/open থাকবে।

* Submenu item-এর active state clearly visible হতে হবে।

* Existing permission system অনুযায়ী user যে menu/action-এর permission রাখে না, সেটি দেখানো যাবে না।

**Expected Result:**
Product, Purchase এবং Sales-এর frequently used actions sidebar থেকেই দ্রুত access করা যাবে।

---

### 5. Sidebar — Active Parent Menu Highlight ✅ সম্পূর্ণ

* [x] কোনো submenu/page active থাকলে তার **parent menu-তেও active background/highlight** দেখাতে হবে। — আগে parent menu button (`CollapsibleTrigger`-এর ভিতরের `SidebarMenuButton`)-এ `isActive` prop-ই pass করা হতো না, ফলে child page active থাকলেও parent শুধু expand (open) হতো, background highlight পেত না। এখন item #4-এ যোগ করা `activeSubItem` (already-computed most-specific matching sub-item) parent button-এ `isActive={!!activeSubItem}` হিসেবে pass করা হয়েছে — existing `sidebarMenuButtonVariants`-এর already-defined `data-[active=true]:bg-sidebar-accent` styling reuse করে (নতুন color/class লাগেনি), তাই parent + child active state visually consistent। Nested route (e.g. `/products/5/edit`)-এও `isItemActive`-এর existing prefix-match logic অনুযায়ী parent ঠিকই active থাকে। Verification: `eslint` + `tsc --noEmit` clean (baseline অপরিবর্তিত)।
* Example:

```text
Sales                    ← Active background
   ├── Sales
   └── Add Sale           ← Current page
```

* Parent এবং child active state visually consistent হতে হবে।
* Nested route থাকলেও parent menu active থাকতে হবে।
* Active state-এর জন্য existing theme/color system ব্যবহার করতে হবে।

**Expected Result:**
User বর্তমানে কোন module/section-এর মধ্যে আছে তা sidebar দেখেই সহজে বুঝতে পারবে।

---

### 6. Centralized Color / Theme Customization ✅ সম্পূর্ণ

* [x] System-এ **centralized color/theme selection system** তৈরি করতে হবে। — Full-stack implement করা হয়েছে, existing `Locale`/`LocaleController` (per-user language preference) pattern-টা exactly mirror করে যাতে architecture consistent থাকে:
  - `App\Enums\ThemeColor` — backed enum (`neutral`, `blue`, `green`, `violet`, `rose`, `orange`); নতুন palette যোগ করতে শুধু একটা নতুন `case` + `resources/css/app.css`-এ একটা matching `[data-theme-color="..."]` CSS block লাগবে।
  - `settings.theme_color` (default `neutral`, global) আর `users.theme_color` (nullable, personal override) — দুটো নতুন incremental migration দিয়ে (RS-Pos-এর existing convention অনুযায়ী, পুরনো migration edit না করে)।
  - `[data-theme-color]` attribute-scoped CSS blocks app.css-এ — শুধু brand-accent variable গুলো override করে (`--primary`, `--ring`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-ring`), বাকি সব color (background/card/border/muted...) light + dark দুটোতেই অপরিবর্তিত থাকে — তাই hardcoded color না, existing CSS variable/Tailwind theme mechanism-এর মধ্যেই পুরোপুরি integrate করা।
  - **Priority resolution** (User → Global → System default) blade-এর root `app` view-তে `ThemeColorComposer`-এ resolve হয় এবং `<html data-theme-color="...">`-এ server-side render হয় (dark-mode-এর inline no-flash script যেমন করে, ঠিক সেভাবে — কিন্তু এটা DB-backed বলে JS-এর দরকার নেই, Blade-তেই resolve করা যায়)। এই কাজটা করার সময় একটা real bug ধরা পড়ে ও ফিক্স হয়: Eloquent `Builder::value()` আসলে `first()`-এর মধ্য দিয়ে model hydrate করে, তাই model-এর enum cast apply হয়ে যায় — ফলে `Settings::query()->value('theme_color')` raw string না দিয়ে `ThemeColor` enum object ফেরত দিচ্ছিল, আর `$themeColor !== 'neutral'` (object vs string) সবসময় true হয়ে যাচ্ছিল, ফলে "neutral"-এও attribute render হয়ে যেত। `?->value` দিয়ে unwrap করে ফিক্স করা হয়েছে — নতুন test (`neutral renders with no data-theme-color attribute at all`) এই regression future-এ ধরবে।
  - Global picker: Business Settings-এ নতুন **Branding** tab (`resources/js/pages/business-settings/index.tsx`), existing form pattern অনুসরণ করে। Save-এর পর current user-এর personal override না থাকলে client-side-ও তৎক্ষণাৎ apply হয় (full reload ছাড়াই)।
  - Personal picker: Settings → Appearance page-এ (`resources/js/pages/settings/appearance.tsx`) — dark mode tabs-এর ঠিক নিচে, একই page-এ, সাথে "Use shop default" button override clear করার জন্য।
  - Backend persistence: `PATCH /theme-color` (`ThemeColorController`, `locale` route-এর ঠিক পাশে, একই `auth` middleware group, কোনো extra permission লাগে না — personal preference) — `router.patch` দিয়ে ফ্রন্টএন্ড থেকে সাথে সাথে persist হয়, `document.documentElement` attribute সাথে সাথেই optimistically update হয়।
  - Reusable `ThemeColorPicker` component (`resources/js/components/theme-color-picker.tsx`) দুই জায়গাতেই (global + personal) ব্যবহার হয়েছে — duplicate picker UI লেখা হয়নি।
  - Verification: নতুন `tests/Feature/ThemeColorTest.php` (৮টা test — override set/clear, invalid value reject, shared props, no-flash blade render, neutral case) + existing `BusinessSettingsTest`-এ `theme_color` payload/assertion যোগ, পুরো `Locale|Appearance|Settings|BusinessSettings|ThemeColor` filter pass করে, `pint --test` clean, `eslint`/`tsc --noEmit` clean (নতুন কোনো error নেই)।
* একটি default/global color palette থাকবে।
* Global color পরিবর্তন করলে application-এর relevant UI elements সেই color palette অনুযায়ী update হবে।
* Theme শুধু hardcoded color দিয়ে implement করা যাবে না; existing design system / CSS variables / Tailwind theme mechanism-এর সাথে integrate করতে হবে।
* Future-এ নতুন color palette যোগ করা সহজ হতে হবে।

#### User/Panel Specific Color

* কোনো user চাইলে তার নিজের panel-এর জন্য **আলাদা color preference** select করতে পারবে।
* User-specific color preference থাকলে সেটি global default-এর উপর priority পাবে।
* User-specific preference না থাকলে global/default theme ব্যবহার হবে।

**Priority:**

```text
User/Panel Theme
      ↓
Global Theme
      ↓
System Default
```

* Theme preference database-এ persist করতে হবে যাতে logout/login করার পরেও preference থাকে।
* Theme change করার পর পুরো application-এর relevant component consistent থাকতে হবে।

**Expected Result:**
একটি centralized theme system থাকবে যেখানে system-wide default color এবং user-specific panel color—দুই ধরনের customization support করবে।

---

### 7. User Preferences — Dark Mode & Language ✅ সম্পূর্ণ

* [x] **Dark Mode এবং Language selection-কে header-এর permanent controls হিসেবে না রেখে User Settings/Preferences-এর মধ্যে রাখা উচিত।** ✅ সম্পূর্ণ — `app-sidebar-header.tsx` থেকে `AppearanceToggleDropdown` আর `LanguageDropdown` দুটোই সরানো হয়েছে (এখন header-এ শুধু sidebar trigger, breadcrumbs, আর global search — dead হয়ে যাওয়া দুটো dropdown component file delete করা হয়েছে)। Settings → Appearance page-এ (`resources/js/pages/settings/appearance.tsx`) checklist-এর exact structure অনুযায়ী তিনটা section একসাথে: existing **Appearance** tabs (Light/Dark/System, item #6-এ যোগ করা **Panel color** picker-এর ঠিক উপরে), আর নতুন **Language** tabs (English/বাংলা — নতুন `LanguageTabs` component, existing `AppearanceTabs`-এর সাথে visually consistent, একই `locale.update` endpoint ব্যবহার করে)।
  - **Persistence gap fix:** Dark mode আগে শুধু `localStorage`-এ থাকতো (server-এ কিছুই persist হতো না) — তাই "login করার পরে preference automatically apply হবে" ঠিকভাবে সত্যি ছিল না (অন্য device/browser-এ preference হারিয়ে যেত)। এখন `locale`/`theme_color`-এর মতোই DB-persisted: নতুন `users.appearance` column (migration + `App\Enums\Appearance` enum + `AppearanceController`, route `PATCH /appearance`), `useAppearance()` hook এখন `localStorage`-এর বদলে Inertia shared prop (`auth.user.appearance`) থেকে read করে, `router.patch` দিয়ে persist করে।
  - No-flash: `dark`/`light` এখন server-side-ই resolve হয় (`AppearanceComposer`, item #6-এর `ThemeColorComposer`-এর ঠিক পাশে, একই pattern) — `app.blade.php`-তে `@class(['dark' => $appearance === 'dark'])` দিয়ে সরাসরি render হয়, `system`-এর জন্যই শুধু client-side `prefers-color-scheme` script এখনো লাগে (আগে সবসময় client script চলতো, এখন conditional)। `app.tsx`-এর আলাদা `initializeTheme()` boot call আর দরকার নেই, সরিয়ে ফেলা হয়েছে — globally-mounted `<Toaster>`-ই এখন `useAppearance()`-এর via live system-preference listener বহন করে।
  - Header থেকে সরানোর ফলে mobile/responsive-এ header আরও কম crowded — নতুন কোনো layout regression হয়নি (শুধু দুটো icon button কমেছে)।
  - Verification: নতুন `tests/Feature/AppearanceTest.php` (৬টা test — switch, invalid value reject, dark/light/system-এর no-flash blade render behavior) pass করে, `Appearance|Locale|ThemeColor|Settings|BusinessSettings|Dashboard` filter সহ পুরো relevant suite pass করে, `pint --test` clean, `eslint`/`tsc --noEmit` clean (নতুন কোনো error নেই)।
* Header-এ unnecessary controls কমিয়ে clean এবং minimal রাখা হবে।
* User Settings-এর মধ্যে রাখা যেতে পারে:

```text
Appearance
├── Light
├── Dark
└── System

Language
├── English
└── বাংলা
```

* User-এর preference persist করতে হবে।
* Login করার পর selected preference automatically apply হবে।
* Responsive/mobile layout-এ header unnecessarily crowded হওয়া যাবে না।
* Future-এ অন্যান্য personal preferences যোগ করার জন্য structure extensible রাখতে হবে।

**Expected Result:**
Header clean থাকবে এবং user-specific configuration একটি centralized Settings/Preferences section থেকে manage করা যাবে।

---

### 8. Sidebar Menu Ordering / Management ✅ সম্পূর্ণ

* [x] Sidebar menu-এর **display order dynamically manage করার ব্যবস্থা** করতে হবে।
  - **বাস্তবায়ন:** `settings.menu_order` (JSON, migration + model cast), `lib/nav-items.ts` (menu tree-র single source, প্রতিটা item-এ stable `key`), `lib/menu-order.ts` (`applyMenuOrder` — parent আর প্রতিটা parent-এর submenu আলাদাভাবে sort; unknown/hidden key শেষে যায়), Business Settings → "Menu Order" tab (`MenuOrderEditor`, Up/Down — drag-drop library ছাড়া)। **Backend validation যোগ হয়েছে** (`UpdateBusinessSettingsRequest`: `menu_order.top.*`/`sub.*.*` string+distinct) — আগে না থাকায় save হতো না। `MenuOrder` `interface` থেকে `type` করা হয়েছে যাতে Inertia `useForm`-এর typing না ভাঙে। Test: `BusinessSettingsTest`-এ save + shared prop, malformed reject।
* Admin প্রয়োজন অনুযায়ী menu/module-এর order পরিবর্তন করতে পারবে।
* Example:

```text
Dashboard
Sales
Purchases
Products
Customers
Reports
Settings
```

অথবা:

```text
Dashboard
Products
Sales
Customers
Purchases
Reports
Settings
```

* Menu order hardcoded রাখার পরিবর্তে centralized configuration/database-based approach ব্যবহার করা যেতে পারে—যেটি existing architecture-এর সাথে সবচেয়ে clean হয়।
* Parent menu এবং submenu-এর order আলাদাভাবে manage করার capability রাখা উচিত।
* User permission অনুযায়ী hidden menu থাকলেও ordering system ভেঙে যাওয়া যাবে না।
* Drag & Drop ordering থাকলে ভালো UX হবে, তবে unnecessary complexity হলে simple ordering system যথেষ্ট।
* Ordering change করলে সকল relevant user/panel-এ correct order reflect করতে হবে।

**Expected Result:**
Admin কোনো code change ছাড়াই sidebar menu-এর order manage করতে পারবে।

---

### 9. Sidebar & Navigation — Permission-Aware UI ✅ সম্পূর্ণ

* [x] Sidebar-এর প্রতিটি menu এবং submenu **permission-aware** হতে হবে।
  - **বাস্তবায়ন:** *Frontend:* `filterNavByPermission` (`lib/nav-items.ts`) submenu-level `permission` মানে (Add Sale/Product/Purchase → `*.create`), সব child hidden হলে parent-ও hide। *Backend* (আগে শুধু `backups`/`roles`-এ `permission:` ছিল, বাকি ~২৫ route file শুধু `auth`): নতুন `EnsureModuleAccess` middleware (`module:sale` — HTTP method থেকে action: GET→view, POST→create, PUT/PATCH→edit, DELETE→delete; module-এ না থাকা action নিকটতম-এ fallback; sale/purchase-এ `view_own|view_all`) সব module route group-এ; one-off route-এ আলাদা permission (`contact.payment` — payments/due-waivers, `contact.delete` — bulk-delete, `account.transfer`, `accounting.edit` — journal reverse); business-settings → `settings.manage`। `RolePermissionSeeder::MODULE_ACTIONS` public (permission list-এর একটাই source)। `UserFactory` এখন default-এ সব permission দেয় (existing test না ভেঙে); সীমিত access-এর test-এ `userWithPermissions()` (এখন `syncPermissions`)। Test: নতুন `ModuleAccessTest` (১৫টা), `RoleTest`-এর ২টা adjust; পুরো suite ৩১০ pass। *Known:* অনুমতিহীন user অস্তিত্বহীন record-এর URL-এ 403-এর বদলে 404 পায় (route-model binding middleware-এর আগে চলে) — existing record-এ সঠিকভাবে 403।
* User-এর permission না থাকলে corresponding menu item দেখানো যাবে না।
* Parent menu-এর সব child hidden হলে parent menu-ও automatically hide হবে।
* Permission logic frontend-এ শুধু UI hiding-এর জন্য ব্যবহার হবে; **actual authorization অবশ্যই backend-এ enforce করতে হবে।**
* Direct URL access করেও unauthorized user যেন protected page/action access করতে না পারে।

**Expected Result:**
Sidebar user-এর actual capabilities অনুযায়ী dynamically তৈরি হবে এবং unauthorized navigation options দেখাবে না।

---

### 10. Sidebar State Persistence ✅ সম্পূর্ণ

* [x] Sidebar-এর user interaction state intelligently preserve করতে হবে।
  - **বাস্তবায়ন:** নতুন `hooks/use-sidebar-state.ts` — desktop open/collapsed আর expanded parent menu-র list `localStorage`-এ **user id দিয়ে key করা**; অন্য user-এর leftover entry পড়ার সময় মুছে যায় (user change-এ carry-over নেই)। `AppShell` (আগে user-ছাড়া `sidebar` key) আর `NavMain` (আগে প্রতি page-এ `defaultOpen` reset) দুটোই এটা ব্যবহার করে; নতুন menu-তে navigate করলে সেটা একবার auto-open হয়, তারপর হাতে collapse করা যায়। Mobile drawer ইচ্ছাকৃতভাবে persist হয় না (navigation-এ বন্ধ হওয়াই সঠিক)।
* Example:

  * কোন parent menu expanded
  * Sidebar collapsed/expanded
  * Mobile drawer open/closed
* Page navigation করলে unnecessaryভাবে sidebar state reset হওয়া উচিত নয়।
* তবে logout/login বা user change হলে inappropriate state carry-over করা যাবে না।
* Desktop এবং mobile behavior আলাদাভাবে handle করতে হবে যেখানে প্রয়োজন।

**Expected Result:**
Navigation করার সময় sidebar predictable এবং consistent behavior করবে।

---

### 11. Responsive Navigation Experience ✅ সম্পূর্ণ

* [x] Sidebar এবং header **desktop, tablet এবং mobile** viewport-এর জন্য properly optimize করতে হবে।
  - **বাস্তবায়ন:** Mobile-এ sidebar আগে থেকেই Sheet drawer (backdrop সহ)। নতুন: drawer open animation ৫০০ms→৩০০ms; mobile-এ menu/submenu button-এর touch target বাড়ানো (`max-md:h-11` / `max-md:h-10`, আগে ৩২/২৮px)। Header #7-এ আগেই minimal। **Browser-এ viewport দিয়ে যাচাই করা হয়নি** — শুধু code-level।
* Mobile-এ sidebar drawer হিসেবে কাজ করবে।
* Mobile sidebar open/close করার সময় smooth transition থাকবে।
* Sidebar open থাকলে প্রয়োজন অনুযায়ী backdrop ব্যবহার করা যেতে পারে।
* Navigation item-এর touch target যথেষ্ট usable হতে হবে।
* Header এবং sidebar একসাথে মিলিয়ে responsive layout clean রাখতে হবে।

**Expected Result:**
Desktop এবং mobile উভয় platform-এ navigation experience consistent এবং professional হবে।

---

### 12. Global UI Consistency Audit ✅ সম্পূর্ণ

* [x] উপরোক্ত changes implement করার সময় পুরো application-এর UI consistency একবার audit করতে হবে।
  - **বাস্তবায়ন (targeted audit):** (১) ১০ জায়গায় copy-paste `new Date().toISOString().slice(0,10)` (UTC — সকালে গতকালের তারিখ দেখাতে পারে) → `lib/format-date.ts`-এর `today()` (local timezone); (২) product/sale/contact table-এ status badge-এর একই emerald/amber/red/blue class string ৪ ফাইলে → `lib/status-tones.ts`; (৩) `NavItem.key` required হওয়ায় `app-header.tsx`/`settings/layout.tsx`-এ tsc error → key যোগ। Raw `<select>` নেই; hand-rolled spinner শুধু auth page আর data-table-toolbar-এ (রাখা হয়েছে)। বাকি hardcoded color ছোট/একক ব্যবহার, ছোঁয়া হয়নি। `tsc`/`eslint`-এ নতুন error নেই (শুধু pre-existing baseline)।
* বিশেষভাবে check করতে হবে:

  * Button styles
  * Input styles
  * Select/Combobox
  * Date display
  * Badge/status
  * Dropdown
  * Dialog/Modal
  * Table
  * Pagination
  * Empty state
  * Loading/Skeleton
  * Error state
  * Toast/notification
  * Dark mode
  * Theme colors
  * Sidebar/header
* একই ধরনের UI element-এর জন্য duplicate styling/logic থাকলে reusable component ব্যবহার করতে হবে।
* Existing design system-এর বাইরে নতুন arbitrary styling যোগ করা যাবে না, যদি reusable solution already থাকে।

**Expected Result:**
পুরো ERP-এর UI একটি single design system follow করবে এবং বিভিন্ন module-এ inconsistent look & behavior থাকবে না.

---

## Important Implementation Rules

* Existing architecture অপ্রয়োজনে redesign করা যাবে না।
* Reusable component যেখানে justified সেখানে তৈরি করতে হবে।
* Generic component-এর মধ্যে business-specific logic রাখা যাবে না।
* Existing permission/security rules bypass করা যাবে না।
* Backend authorization এবং validation অবশ্যই বজায় রাখতে হবে।
* Theme/color system centralized রাখতে হবে।
* একই functionality বিভিন্ন জায়গায় duplicate করা যাবে না।
* Unnecessary package/library যোগ করা যাবে না।
* Existing responsive behavior নষ্ট করা যাবে না।
* কোনো feature implement করার আগে existing codebase-এর একই ধরনের implementation আছে কিনা check করতে হবে।
* সব changes শেষে affected pages এবং reusable components-এর regression check করতে হবে।


