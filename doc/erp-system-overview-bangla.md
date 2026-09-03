# ERP সিস্টেম — সম্পূর্ণ ওভারভিউ

**স্ট্যাক:** Laravel + Inertia.js + React + TypeScript
**টার্গেট মার্কেট:** হোম অ্যাপ্লায়েন্স (ফ্রিজ, এসি) ও পরবর্তীতে স্যানিটারি/হার্ডওয়্যার ব্যবসা
**বিক্রয় মডেল:** প্রতিটা কাস্টমারের জন্য আলাদা install (Single-tenant), নিজস্ব হোস্টিং

এই ডকুমেন্ট পুরো সিস্টেমে কী কী থাকছে তার এক নজরে সারসংক্ষেপ। বিস্তারিত schema/technical design আলাদা ডকুমেন্টে (erp-design-decisions.md) আছে।

---

## ১. মূল ধারণা — সিস্টেমটা কীভাবে কাজ করে

গোটা সিস্টেম একটা সহজ কিন্তু শক্তিশালী নীতির উপর দাঁড়িয়ে:

- **প্রতিটা module-এ দুই ধরনের data থাকে** — একটা "বর্তমান অবস্থা" (যেমন stock কত আছে, কার কাছে কত পাওনা) যেটা দ্রুত দেখানোর জন্য, আরেকটা "ইতিহাস" (movement/ledger) যেটা কখনো মুছে ফেলা হয় না, শুধু নতুন entry যোগ হয়
- এর ফলে যেকোনো সময় হিসেব ফিরে দেখা যায়, কোনো ভুল হলে সরাসরি এডিট না করে **correction entry** দিয়ে ঠিক করা হয় — ঠিক যেমন ব্যাংক statement-এ হয়
- এই একই pattern Product Stock, Customer/Supplier Due, Cash/Bank Account, Asset, Loan, Investor, Staff Salary — সব জায়গাতেই ব্যবহার হয়েছে, তাই পুরো সিস্টেম সামঞ্জস্যপূর্ণ ও predictable

---

## ২. মূল Module সমূহ

### ২.১ Inventory (পণ্য ব্যবস্থাপনা)
- Product, Category, Unit, Brand — সব দিয়ে পণ্য সাজানো
- প্রতিটা পণ্যের ছবি ও spec sheet/brochure রাখা যায়
- Opening Stock (প্রথমবার entry) ও Stock Adjustment (ভুল ঠিক করা) আলাদা flow
- Product variant (সাইজ/রঙ) নেই — simple রাখা হয়েছে
- **Non-stock item** সাপোর্ট — Installation Charge, Delivery Charge-এর মতো জিনিস বিক্রি করা যায় stock ছাড়াই
- Barcode generate ও label print করার সুবিধা
- Low Stock Alert-এর জন্য threshold সেট করা যায়

### ২.২ Contact (Customer/Supplier)
- একই ব্যক্তি Customer, Supplier, বা দুটোই হতে পারে
- Customer Group দিয়ে filter/segment করা যায়
- প্রতিটা Contact-এর নিজস্ব Ledger (কে কার কাছে কত পায়) — ব্যাংক statement-এর মতো
- Individual/Business ভেদে Business Name, আলাদা Shipping Address
- Contact-এ Document/Note সংযুক্ত করা যায় (NID কপি, চুক্তিপত্র ইত্যাদি)

### ২.৩ Purchase ও Sale
- Purchase — সাপ্লায়ারের কাছ থেকে মাল কেনা, একাধিক পণ্য একসাথে
- Sale — Draft (অসম্পূর্ণ), Quotation (দাম-প্রস্তাব), Confirmed — তিন ধাপ
- Sales Order — অগ্রিম বুকিং, advance payment নেওয়া যায়
- Sale/Purchase Return — ফেরত দেওয়া/নেওয়া, পুরনো record সম্পূর্ণভাবে নষ্ট না করে
- Discount তিন স্তরে — item-level, পুরো বিলের উপর, আর customer-এর বকেয়া মাফ (ledger-level)
- **EMI/কিস্তি বিক্রি** — চালু/বন্ধ করা যায় পুরো সিস্টেমে, আবার প্রতিটা পণ্যেও আলাদা করে
- Product Cost হিসেব হয় **Weighted Average** পদ্ধতিতে (accurate profit calculation-এর জন্য)

### ২.৪ Accounts (Cash/Bank/Cheque)
- একাধিক account (Cash, বিভিন্ন Bank, Cheque) রাখা যায়, প্রতিটার নিজস্ব ব্যালেন্স
- একটা বিক্রি একাধিক account দিয়ে ভাগ করে payment নেওয়া যায় (যেমন কিছু Cash, কিছু Bank Transfer)
- প্রতিটা টাকার লেনদেনের সম্পূর্ণ ইতিহাস (Account Statement)

### ২.৫ Expense (খরচ)
- Category অনুযায়ী খরচ ট্র্যাক (ভাড়া, বিদ্যুৎ, বেতন...)
- Due/Partial/Paid — খরচ এখনো শোধ করা না হলেও record রাখা যায়
- মাসিক ভাড়ার মতো recurring খরচ প্রতি মাসে আলাদা entry হিসেবে থাকে (transparency বজায় রাখতে)

### ২.৬ Assets, Company Loan, Other Liability, Investor
- **Assets** — দোকানের নিজস্ব সম্পদ (ফ্রিজ, গাড়ি, ফার্নিচার) — কেনা, upgrade, বিক্রি সব ট্র্যাক হয়
- **Company Loan** — ব্যাংক/ব্যক্তি থেকে নেওয়া ঋণ, কিস্তি শোধ
- **Other Liability** — উপরের কোনোটার সাথে না মেলা অন্য কোনো দেনা
- **Investor** — বিনিয়োগকারীর মূলধন, লাভের ভাগ, withdrawal — মূলধন থেকে আলাদা

### ২.৭ Staff (কর্মচারী)
- বেতন, অগ্রিম, ঋণ — সব একই pattern-এ ট্র্যাক
- Staff একইসাথে Investor-ও হতে পারে (লিঙ্ক করা)
- Staff System-এ login করতেও পারে, নাও পারে (Technician-এর হয়তো লাগবে না)
- Sales Commission % ও সর্বোচ্চ Discount % প্রতিটা staff-এর জন্য আলাদা সেট করা যায়

### ২.৮ Warranty ও Service (হোম অ্যাপ্লায়েন্স-বিশেষ ফিচার)
- Product-এ Warranty period সেট করা যায়, বিক্রির সময় snapshot হয়ে যায়
- **Installation Charge** — বিক্রির সময় নেওয়া হয়
- **Free Service Plan** — flexible, যেমন "১ম বছর ২টা ফ্রি সার্ভিস, ২য় বছর ০টা" — প্রতিটা পণ্যের নিজস্ব schedule
- Free quota শেষ হলে পরবর্তী সার্ভিস charge করা হয়
- Warranty Claim ট্র্যাক করার আলাদা ব্যবস্থা

### ২.৯ Import/Export ও Bulk Actions
- Product, Contact, Opening Stock, পুরনো Sale — সব Excel/CSV থেকে import করা যায়
- পুরনো Sale import করলে stock/account-এ প্রভাব পড়ে না (শুধু history হিসেবে থাকে)
- List page-এ একাধিক item select করে — Export, Notification পাঠানো, Group-এ যোগ করা যায়

### ২.১০ Marketing ও Notification
- Contact list থেকে checkbox দিয়ে customer বেছে SMS/WhatsApp/Email পাঠানো যায়
- একই customer-কে দুইবার একই মেসেজ যাওয়া আটকানো হয়
- Ledger PDF এক ক্লিকে WhatsApp/Email-এ পাঠানো যায়
- Low Stock, Due Payment, EMI Overdue-তে automatic notification

### ২.১১ Dashboard ও Reports
- Dashboard-এর উপরে Quick Action বাটন (নতুন বিক্রি, নতুন ক্রয়, টাকা জমা...) — role অনুযায়ী দেখাবে
- Profit/Loss, Balance Sheet (দুই ধরনের — সহজ ও পূর্ণাঙ্গ), Cash Flow
- Stock Report, Due Report, Sales/Purchase Report, Trending Products
- Fiscal Year (July-June) ভিত্তিক রিপোর্টও দেখা যায়

### ২.১২ Role ও Permission
- Admin, Manager, Cashier, Staff — আলাদা আলাদা role, প্রতিটার নিজস্ব permission
- একজন user একাধিক role পেতে পারে
- "নিজের করা কাজ" vs "সবার কাজ" — আলাদাভাবে permission দেওয়া যায় (যেমন Sales staff শুধু নিজের বিক্রি দেখবে)

### ২.১৩ Settings — Business Type অনুযায়ী Customize
- EMI, Serial Number Tracking — পুরো সিস্টেমে চালু/বন্ধ করা যায় Settings থেকে (Furniture shop-এ EMI দরকার নাই এমন হলে পুরোপুরি লুকানো থাকবে)
- Thermal Printer সাপোর্ট — চালু/বন্ধ করা যায়
- Invoice Numbering, Currency Symbol, Shop Info

### ২.১৪ Design ও Mobile
- Light/Dark Mode — দুটোতেই সামঞ্জস্যপূর্ণ ডিজাইন
- Global Search (Cmd+K) — সব module একসাথে খোঁজা
- মোবাইলে Table এর বদলে Card view, আর বিক্রির ফর্ম হবে cart-এর মতো (product যোগ করা → confirm)

---

## ৩. Sidebar Menu (সংক্ষেপে)

```
Dashboard
Inventory (Products, Categories, Units, Brands, Stock Adjustment...)
Contacts (Customer, Supplier, Group)
Purchase (List, Add, Return)
Sales (List, Add, Draft, Quotation, Return, Sales Order, EMI)
Payment Accounts (Cash/Bank, Balance Sheet, Cash Flow)
Expenses
Asset & Liabilities (Asset, Loan, Other Liability)
Investor
Staff
Service & Warranty
Marketing (Campaign History)
Reports (Profit/Loss, Stock, Due, Sales/Purchase...)
Database Backup
Settings (Business Info, Invoice, Users, Roles)
```

---

## ৪. বিশেষ কয়েকটা শক্তিশালী দিক

1. **Immutable History** — কোনো ভুল হলে সরাসরি এডিট না করে নতুন correction entry যোগ হয়, তাই হিসেবের ইতিহাস কখনো নষ্ট হয় না
2. **Business-Type Aware** — Furniture shop, Home Appliance shop — একই সিস্টেম, কিন্তু Settings দিয়ে relevant feature-ই দেখাবে, অপ্রয়োজনীয় জিনিস দেখাবে না
3. **নিরাপত্তা** — Account Number-এর মতো sensitive data encrypted, কার্ড/পিন কখনো store হয় না
4. **Real-world validated** — ডিজাইন করার সময় একটা established ERP (AgainPOS)-এর সাথে মিলিয়ে দেখা হয়েছে, তাই বাস্তবসম্মত

---

## ৫. Development Order (সংক্ষেপে)

```
১. Basic Auth ও Settings
২. Accounts (Cash/Bank)
৩. Inventory, Contact
৪. Purchase, Sale, Return
৫. Sales Order, EMI
৬. Expense, Asset, Loan, Investor, Other Liability
৭. Staff, Warranty & Service
৮. Import Tools
৯. Dashboard/Reports
১০. UI Polish, Notification
১১. সবশেষে — Role/Permission (granular)
```

---

*এই ডকুমেন্টটা সম্পূর্ণ সিস্টেমের overview মাত্র। প্রতিটা module-এর schema, business logic, ও কোড-লেভেল বিস্তারিত জানতে "erp-design-decisions.md" দেখুন।*
