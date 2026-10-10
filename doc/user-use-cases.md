# RS-POS — ব্যবহারকারী Use Case ও Manual Test গাইড

এই ডকুমেন্ট ধাপে ধাপে পুরো সিস্টেম পরীক্ষা করার জন্য। প্রতিটা Use Case-এ আছে: **কী পরীক্ষা হবে**, **কোন ইনপুট দিতে হবে**, **কী ঘটার কথা**, আর **ভুল ইনপুটে কী হওয়া উচিত**।
শেষে একটা পুরো দোকানের ধারাবাহিক গল্প (অধ্যায় ২০) আছে, যেখানে সংখ্যাসহ চূড়ান্ত হিসাব মেলানো যায়।

> **কীভাবে ব্যবহার করবেন:** অধ্যায়গুলো ক্রমানুসারে করুন। পরের অধ্যায় আগের অধ্যায়ের ডাটার ওপর দাঁড়িয়ে আছে (যেমন বিক্রির আগে product আর stock লাগবে)। প্রতিটা Test Case-এর পাশে `[ ]` আছে, পাশ হলে `[x]` করুন, ফেল হলে নিচে নোট লিখুন।

---

## ০. পরীক্ষার আগে প্রস্তুতি

| বিষয় | মান |
|---|---|
| নতুন ডাটাবেস | `php artisan migrate:fresh --seed` (পুরনো ডাটা মুছে যায়, শুধু পরীক্ষার ডাটাবেসে চালান) |
| সার্ভার চালু | `composer run dev` (বা `php artisan serve` আর `npm run dev`) |
| ঠিকানা | `http://localhost:8000` |
| Admin লগইন | ইমেইল `demo@gmail.com`, পাসওয়ার্ড `12345678` |
| তারিখ | যেকোনো তারিখ চলে। এই গাইডে "আজ" মানে আজকের তারিখ |

**নিয়ম:** টাকার অঙ্ক সব ৳ (টাকা)। দশমিক ২ ঘর পর্যন্ত। যেখানে "প্রত্যাশিত" লেখা আছে, ঠিক সেই সংখ্যা না এলে ফেল ধরুন।

---

## ১. লগইন, লগআউট ও ব্যবহারকারী

### TC-1.1 সঠিক লগইন `[ ]`
- **ইনপুট:** ইমেইল `demo@gmail.com`, পাসওয়ার্ড `12345678`
- **প্রত্যাশিত:** Dashboard খোলে। বাম পাশে Sidebar (Sales, Purchases, Product, Contacts ...) দেখা যায়।

### TC-1.2 ভুল লগইন `[ ]`
| ইনপুট | প্রত্যাশিত |
|---|---|
| ভুল পাসওয়ার্ড | লগইন হয় না, ভুলের বার্তা আসে |
| ফাঁকা ইমেইল | "required" ধরনের বার্তা |
| ৫ বার ভুল চেষ্টার পর | কিছুক্ষণের জন্য আটকে যায় (rate limit), অপেক্ষার সময় দেখায় |

### TC-1.3 নতুন ব্যবহারকারী তৈরি `[ ]`
**পথ:** User Management → Users → নতুন
- **ইনপুট:** নাম `Salma Cashier`, ইমেইল `cashier@test.com`, username `cashier1`, পাসওয়ার্ড `Cash@12345`, Role `Cashier`
- **প্রত্যাশিত:** তালিকায় আসে। ঐ ইমেইলে লগইন করা যায়।
- **নেতিবাচক:** একই ইমেইল বা username আবার দিলে "already taken"। username-এ স্পেস/বিশেষ চিহ্ন (`a b!`) দিলে ফেল।

### TC-1.4 Role ভিত্তিক অ্যাক্সেস `[ ]`
`cashier1` দিয়ে লগইন করে দেখুন:
| কাজ | প্রত্যাশিত |
|---|---|
| Sales → Add Sale | খোলে |
| Product list | দেখা যায় (শুধু দেখা) |
| Purchases, Expenses, Reports, Settings | Sidebar-এ নেই, সরাসরি URL (`/purchases`) দিলে **403 / অনুমতি নেই** |
| অন্যের তৈরি বিক্রি (`sale.view_own`) | শুধু নিজের বিক্রি দেখায় |

### TC-1.5 Role তৈরি ও permission `[ ]`
**পথ:** User Management → Roles → নতুন Role `Store Keeper`, শুধু `product.*` টিক।
- **প্রত্যাশিত:** ঐ role-এর ব্যবহারকারী শুধু Product মেনু পায়।

### TC-1.6 লগআউট `[ ]`
- Sidebar-এর নিচের Logout → লগইন পেজে ফেরে। Back চাপলে আবার ভেতরে ঢোকা যায় না।

---

## ২. দোকানের সেটিংস

### TC-2.1 Business Settings `[ ]`
**পথ:** Business Settings
| ফিল্ড | ইনপুট |
|---|---|
| Shop Name | `Rahman Electronics` |
| Address | `12 Mirpur Road, Dhaka` |
| Phone | `01711000000` |
| Currency Symbol | `৳` |
- **প্রত্যাশিত:** Save করলে সফল বার্তা। Dashboard/invoice-এ নাম আসে।
- **নেতিবাচক:** Shop Name ফাঁকা → ফেল। Currency Symbol ফাঁকা → ফেল। Phone ২১+ অক্ষর → ফেল।

### TC-2.2 Module চালু/বন্ধ `[ ]`
- **EMI Module চালু** করুন → Sales মেনুর ভেতরে **EMI Installments** আসে, sale ফর্মে Financing সারি আসে।
- **EMI Module বন্ধ** করুন → ঐ মেনু ও সারি অদৃশ্য।
- **Serial Number Module চালু** করুন → sale ফর্মে serial ঘর আসে (serial-trackable product-এ)।
- (পরের অধ্যায়গুলোর জন্য দুটোই **চালু** রাখুন।)

### TC-2.3 Invoice Settings `[ ]`
**পথ:** Invoice Settings
- Logo আপলোড (PNG/JPG), Business নাম/ঠিকানা/ফোন দেখানোর টিক, Item-এ SKU দেখানো, Totals-এ Paid দেখানো বদলান।
- **প্রত্যাশিত:** ডানের লাইভ প্রিভিউ সাথে সাথে বদলায়। Save করে কোনো invoice খুললে একই চেহারা।

### TC-2.4 Branding ছবি `[ ]`
- Logo বড়/ছোট, Favicon আপলোড → Sidebar ও ব্রাউজার ট্যাবে বদলায়। ছবি নয় এমন ফাইল (`.pdf`) দিলে ফেল।

### TC-2.5 থিম রঙ `[ ]`
- থিম রঙ (Neutral/Green ইত্যাদি) বদলে Save → বাটন ও হাইলাইটের রঙ বদলায়। Dark mode সুইচ কাজ করে।

---

## ৩. মাস্টার ডাটা: Unit, Category, Brand

### TC-3.1 Unit `[ ]`
**পথ:** Product → Unit
- **ইনপুট:** Name `Piece`, Short name `pcs`
- **প্রত্যাশিত:** তালিকায় আসে।
- **নেতিবাচক:** একই নাম আবার → ফেল (unique)। ফাঁকা নাম → ফেল।

### TC-3.2 Category `[ ]`
- `Air Conditioner`, `Accessories` দুটো তৈরি। আবার একই নাম দিলে ফেল।
- **মুছে ফেলা:** যে category-তে product আছে সেটা মুছতে গেলে বাধা আসে। খালি category মোছা যায়।

### TC-3.3 Brand `[ ]`
- `Gree`, `Walton` তৈরি। সম্পাদনা (নাম বদল) কাজ করে।

---

## ৪. Product

### TC-4.1 সাধারণ product (serial ছাড়া) `[ ]`
**পথ:** Product → Add Product
| ফিল্ড | ইনপুট |
|---|---|
| Name | `Copper Pipe 15ft` |
| SKU | `PIPE-15` |
| Category / Unit | Accessories / Piece |
| Selling Price | `3000` |
| Minimum Stock Level | `5` |
| Manage Stock | হ্যাঁ |
| Opening Stock / Cost | `0` |
- **প্রত্যাশিত:** তালিকায় আসে, stock `0`।

### TC-4.2 দ্বিতীয় product `[ ]`
- `Wiring Kit`, SKU `WIRE-01`, Selling Price `5000`, Minimum `5`।

### TC-4.3 জটিল product (AC) `[ ]`
| ফিল্ড | ইনপুট |
|---|---|
| Name | `Split AC 1.5 Ton` |
| SKU | `AC-15` |
| Barcode | `8901234567890` |
| Category / Brand / Unit | Air Conditioner / Gree / Piece |
| Selling Price | `55000` |
| Warranty (months) | `12` |
| Installation Service | হ্যাঁ |
| EMI Available | হ্যাঁ |
| Track Serial Number | হ্যাঁ |
| Service Plan | লাইন ১: `6` মাস, ফ্রি `1`; লাইন ২: `12` মাস, ফ্রি `1` |
| Image | যেকোনো PNG/JPG (৪MB-এর কম) |
- **প্রত্যাশিত:** product তৈরি। তালিকায় ও বিস্তারিত পেজে ছবি দেখা যায়।

### TC-4.4 Opening stock সহ product `[ ]`
- নতুন product `Stabilizer`, SKU `STAB-1`, Opening Stock `10`, Opening Stock Cost `1500` → তৈরির পর stock `10`, avg cost `1500`।
- **নেতিবাচক:** Opening Stock `10` দিয়ে Cost ফাঁকা → ফেল ("cost required")।

### TC-4.5 নেতিবাচক যাচাই `[ ]`
| ইনপুট | প্রত্যাশিত |
|---|---|
| Name ফাঁকা | ফেল |
| Unit না বাছলে | ফেল |
| একই Name (`Wiring Kit`) আবার | ফেল (unique) |
| একই SKU বা Barcode আবার | ফেল |
| Selling Price `-5` | ফেল |
| ছবি ৫MB বা `.pdf` | ফেল |
| Service plan-এ মাস `0` | ফেল |

### TC-4.6 সম্পাদনা ও Stock Adjustment `[ ]`
- `Wiring Kit`-এর দাম `5000` → `5200` করে Save → বদলায়। **তারপর আবার `5000` করে Save করুন** (পরের অধ্যায়ের সংখ্যা `5000` ধরে হিসাব করা)।
- **Stock Adjustment:** `Stabilizer` → Counted Quantity `8`, Reason `Damaged 2 pcs` → stock `8` হয়। নতুন বেশি সংখ্যা (`12`) দিলে Unit Cost চায়।
- **নেতিবাচক:** Reason ফাঁকা → ফেল।

### TC-4.7 তালিকা, ফিল্টার, এক্সপোর্ট `[ ]`
- Search `AC` → AC আসে। `Low Stock` / `Out of Stock` মেনু সঠিক তালিকা দেখায়।
- Export (Excel/CSV/PDF) → ফাইলে নাম ও কলাম ঠিক। তালিকায় **Status কলাম ডিফল্টভাবে লুকানো**; View options থেকে দেখানো যায়।

---

## ৫. Contact (Customer / Supplier)

### TC-5.1 Supplier `[ ]`
**পথ:** Contacts → নতুন
| ফিল্ড | ইনপুট |
|---|---|
| First / Last name | `ABC` / `Electronics` |
| Type | Supplier |
| Entity type | Business, Business name `ABC Electronics Ltd` |
| Phone | `01711111111` |
| Opening Balance | `0` |

### TC-5.2 Customer `[ ]`
- First `Rahim`, Last `Uddin`, Type Customer, Phone `01722222222`, Address `Mirpur, Dhaka`।
- দ্বিতীয় customer: `Karim` `Hossain`, `01833333333`।

### TC-5.3 Opening Balance `[ ]`
- Customer `Salam Old Debt`, Opening Balance `5000` (সে আমাদের দেবে) → তালিকায় Receivable `5,000`।
- Supplier `Old Supplier`, Opening Balance `-8000` (আমরা তাকে দেব) → Payable `8,000`।
- **নিয়ম:** পরে লেনদেন হলে Opening Balance আর বদলানো যায় না।

### TC-5.4 নেতিবাচক `[ ]`
| ইনপুট | প্রত্যাশিত |
|---|---|
| Phone ফাঁকা | ফেল |
| First/Last name ফাঁকা | ফেল |
| একই Contact Code | ফেল |
| ভুল ইমেইল (`abc`) | ফেল |

### TC-5.5 Contact মোছা `[ ]`
- লেনদেন নেই এমন contact → মোছা যায়।
- যার বিক্রি/ledger আছে → মোছা যায় না, "Inactive করুন" বার্তা।

### TC-5.6 Customer Group `[ ]`
- Group `VIP` তৈরি, contact-এ বসানো, contact list ফিল্টার কাজ করে।

### TC-5.7 ledger ও Contact তালিকা `[ ]`
- Contact খুলে ledger দেখা, তারিখ ফিল্টার (From/To), প্রিন্ট। Balance কার্ডে "Receivable/Payable" লেখা সঠিক।

---

## ৬. Payment Account (নগদ/ব্যাংক)

### TC-6.1 Account তৈরি `[ ]`
**পথ:** Payment Accounts → নতুন
| নাম | Type | Opening Balance |
|---|---|---|
| `Cash in Hand` | Cash (ডিফল্ট টিক) | `500000` |
| `City Bank` | Bank, Account number `1234567890` | `200000` |
- **প্রত্যাশিত:** দুটো তালিকায়। Account number ঢাকা (encrypt) থাকে।
- **নেতিবাচক:** Opening Balance `-1` → ফেল। নাম ফাঁকা → ফেল।

### TC-6.2 Fund Transfer `[ ]`
- From `City Bank` → To `Cash in Hand`, Amount `50000`, নোট `Cash needed`।
- **প্রত্যাশিত:** Bank `150,000`, Cash `550,000`।
- **নেতিবাচক:** একই account দুই দিকে → ফেল। Bank-এর balance-এর বেশি (`999999`) → "insufficient balance"।
- (পরীক্ষা শেষে উল্টো করে `Cash` → `Bank` `50000` ফেরত দিন, যাতে Cash `500,000` আর Bank `200,000` থাকে।)

### TC-6.3 Account Statement `[ ]`
- Account খুলে তারিখসহ statement: প্রতিটা লেনদেনের পর running balance ঠিক।

---

## ৭. ক্রয় (Purchase)

### TC-7.1 Draft ক্রয় `[ ]`
**পথ:** Purchases → Add Purchase
- Supplier `ABC Electronics`, Status `Draft`, লাইন: `Split AC 1.5 Ton` ×`5` @`40000`।
- **প্রত্যাশিত:** সংরক্ষিত, কিন্তু **stock আর supplier ledger বদলায় না**।

### TC-7.2 Received ক্রয় (মূল পরীক্ষা) `[ ]`
- Supplier `ABC Electronics`, Status **Received**, তারিখ আজ।
- লাইন:

| Product | Qty | Unit Cost |
|---|---|---|
| Split AC 1.5 Ton | 5 | 40,000 |
| Copper Pipe 15ft | 10 | 2,000 |
| Wiring Kit | 10 | 3,000 |

- Serial: AC-এর পাশে "Serials" বাটন → `AC-SN-001` থেকে `AC-SN-005` (প্রতি unit আলাদা)।
- Payment: Account `Cash in Hand`, Amount `100000`।
- **প্রত্যাশিত:**
  - Subtotal/Total = `250,000` (AC 200,000 + Pipe 20,000 + Wiring 30,000)
  - Stock: AC `5`, Pipe `10`, Wiring `10`
  - Supplier ledger: Payable `150,000` (দেওয়া বাকি)
  - Cash `400,000`
  - Payment status **Partial**, Due `150,000`

### TC-7.3 ছাড় (discount) সহ `[ ]`
- আরেকটা Draft: Pipe ×`10` @`2000`, লাইন-ছাড় `10%` → লাইনের নামের পাশের **পেন্সিল** চাপুন।
- **প্রত্যাশিত:** একটা **Discount কলাম** আসে (`10% off`, `Saves ৳2,000 · ৳1,800 each`)। কোনো লাইনে ছাড় না থাকলে কলামটা থাকে না। Total `18,000`।
- Invoice-স্তরের ছাড় (Subtotal-এর নিচে পেন্সিল): Flat `500` → Total `17,500`।

### TC-7.4 Serial গণনা `[ ]`
- Received করার সময় AC-র serial সংখ্যা quantity-র কম দিলে সতর্কতা ("N টা serial বাকি") আর save আটকে যায়।

### TC-7.5 Payment যোগ `[ ]`
- TC-7.2-এর ক্রয় খুলে Add Payment: `City Bank`, `50000` → Due `100,000`, Bank `150,000` (৫০,০০০ কমে)।
- **নেতিবাচক:** Due-র বেশি (`200000`) → ফেল। Account-এর balance-এর বেশি → ফেল।

### TC-7.6 Supplier Credit `[ ]`
- Supplier-এর ওপর আমাদের পাওনা (balance ধনাত্মক) থাকলে নতুন ক্রয়ে "Supplier credit" ঘর আসে। সেটা প্রয়োগ করলে cash না নড়ে due কমে।

### TC-7.7 ক্রয় বাতিল (Cancel) `[ ]`
- আলাদা একটা Received ক্রয় (Wiring ×`2` @`3000`) করে Cancel চাপুন।
- **প্রত্যাশিত:** stock ফিরে যায়, supplier ledger উল্টে যায়, দেওয়া payment ফেরত (account-এ), status **Cancelled**।
- **নেতিবাচক:** যে ক্রয়ের serial বিক্রি হয়ে গেছে বা return হয়েছে সেটা বাতিল হয় না।

### TC-7.8 Draft ক্রয় মোছা `[ ]`
- Draft (payment ছাড়া) → Delete কাজ করে। তালিকা থেকে লুকায় (ডাটাবেসে রেখে দেওয়া হয়, soft delete)।
- Received বা payment-সহ ক্রয় মোছা যায় না ("cancel করুন")।

### TC-7.9 ক্রয় Return `[ ]`
**পথ:** Purchase Returns → নতুন
- ক্রয় `TC-7.2`, Pipe ×`2` ফেরত, কারণ `Defective`।
- **প্রত্যাশিত:** Pipe stock `8`, supplier payable কমে, Return তৈরি। পরে Refund নিলে সেই account-এ টাকা আসে।
- **নেতিবাচক:** কেনা সংখ্যার বেশি (`11`) ফেরত → ফেল।

---

## ৮. নগদ বিক্রি (Sale)

### TC-8.1 সহজ নগদ বিক্রি `[ ]`
**পথ:** Sales → Add Sale
- Customer `Rahim Uddin`, লাইন: `Copper Pipe 15ft` ×`2` @`3000`, `Wiring Kit` ×`1` @`5000`।
- Invoice ছাড় Flat `1000`। Payment: `Cash in Hand`, পুরো টাকা (নিজে থেকে বসে যায়)।
- **প্রত্যাশিত:** Subtotal `11,000`, ছাড় `-1,000`, Total `10,000`। Confirm করলে status **Confirmed**, Payment **Paid**, Due `0`।
  Stock: Pipe `8`, Wiring `9`। Invoice পেজ খোলে (INV-xxxx)।

### TC-8.2 Quantity বদলালে payment মিলে যায় `[ ]`
- লাইনের Quantity বাড়ান/কমান। **প্রত্যাশিত:** Total আর Payment amount একসাথে বদলায় (এক ঝলকের জন্য "Add Account" বাটন ভেসে ওঠার কথা নয়)। নিজে Payment-এ অঙ্ক লিখলে সেটা আর নিজে বদলায় না।

### TC-8.3 আংশিক পরিশোধ ও বাকি `[ ]`
- Customer `Karim Hossain`, Wiring ×`2` @`5000` (মোট `10,000`), Payment `3000`।
- **প্রত্যাশিত:** Payment **Partial**, Due `7,000`, Karim-এর Receivable `7,000` বাড়ে।

### TC-8.4 লাইন-ছাড় ও Discount কলাম `[ ]`
- লাইনের নামের পাশে পেন্সিল → `10%`। **প্রত্যাশিত:** Discount কলাম আসে। সব ছাড় সরালে কলাম চলে যায়।

### TC-8.5 AC বিক্রি: Installation, Serial, Warranty `[ ]`
- Customer `Rahim Uddin`, `Split AC 1.5 Ton` ×`1` @`55000`, লাইন-ছাড় `5%` → একক দাম `52,250`।
- Installation টিক, Charge `2000`।
- **Warranty ঘর:** ডিফল্ট `12` মাস দেখায় (product থেকে)। বদলে `18` করুন।
- Service plan টিক (ডিফল্ট চালু)।
- Serial: `AC-SN-001`।
- Payment `20000`।
- **প্রত্যাশিত:**
  - Total = 52,250 + 2,000 = `54,250` (installation-এ ছাড় লাগে না)
  - Due = `34,250`
  - Invoice-এ "Warranty 18 months, until <আজ+১৮ মাস>"
  - Serial `AC-SN-001` → Sold
  - Service period ২টা তৈরি (৬ মাস, ১২ মাস)
  - Installation request তৈরি (Service Requests-এ)

### TC-8.6 Warranty বদলালেও পুরনো বিক্রি অপরিবর্তিত `[ ]`
- `Split AC 1.5 Ton` product-এ Warranty `12` → `24` বা ফাঁকা করুন।
- **প্রত্যাশিত:** TC-8.5-এর invoice-এ আগের `18` মাস ও মেয়াদ **একই** থাকে। নতুন বিক্রিতে ডিফল্ট দেখায় নতুন মান।
- একই ভাবে Service plan মুছলে পুরনো বিক্রির service period থাকে।

### TC-8.7 Warranty/Service ছাড়া বিক্রি `[ ]`
- নতুন বিক্রিতে AC-র Warranty ঘর **ফাঁকা (None)** করুন এবং Service plan-এর টিক তুলে দিন → Confirm।
- **প্রত্যাশিত:** invoice-এ warranty লাইন নেই, কোনো service period নেই।

### TC-8.8 নেতিবাচক `[ ]`
| ইনপুট | প্রত্যাশিত |
|---|---|
| Customer না বেছে Confirm | ফেল |
| কোনো product না দিয়ে | বাটন কাজ করে না |
| Stock-এর বেশি Quantity (`AC ×99`) | ফেল, বিক্রি তৈরি হয় না |
| Serial যেটা stock-এ নেই (`SN-FAKE`) | ফেল, **কোনো আধা-তৈরি Draft থাকে না**, stock অপরিবর্তিত |
| Payment-এ ঋণাত্মক/শূন্য | ফেল |
| Warranty `-1` | ফেল |

### TC-8.9 Draft, Quotation `[ ]`
- Status Draft হিসেবে সংরক্ষণ → stock/ledger নড়ে না; পরে Edit করে Confirm করা যায়।
- Quotation: "Valid until" আবশ্যক; বিক্রির তারিখের আগের তারিখ দিলে ফেল।

### TC-8.10 Confirmed বিক্রি সম্পাদনা নয় `[ ]`
- Confirmed invoice-এ Edit বাটন নেই। ভুল হলে Cancel বা Return।

### TC-8.11 বিক্রি Cancel `[ ]`
- TC-8.1-এর বিক্রি Cancel → stock ফেরে, ledger/টাকা উল্টে যায়, status Cancelled।

### TC-8.12 Payment যোগ ও ইতিহাস `[ ]`
- TC-8.3-এর Karim-এর বিক্রিতে Add Payment `City Bank` `2000` → Due কমে। Payment history-তে সারি দেখায়।
- Due-র বেশি টাকা → ফেল।

### TC-8.13 Sales list: Search ও ফিল্টার `[ ]`
- Search: Invoice নম্বর, নাম, **ফোন নম্বর (আংশিকও: `01722`)** — প্রতিটা দিয়ে সঠিক বিক্রি আসে।
- Customer নামের নিচে ফোন নম্বর দেখা যায়।
- ফিল্টার: তারিখ, Customer, Status, Payment status।
- Export: Excel/CSV/PDF।

### TC-8.14 Draft হারিয়ে গেলে ফেরত `[ ]`
- নতুন sale ফর্মে Customer ও দু'একটা লাইন দিয়ে ট্যাব বন্ধ করুন বা রিলোড দিন।
- আবার Add Sale → ওপরে "You have an unsaved sale from <তারিখ-সময়>" ব্যানার, **Restore** চাপলে সব ফিরে আসে, **Discard** চাপলে মুছে যায়। সংরক্ষণ করলে খসড়া চলে যায়।

### TC-8.15 পাতা ছেড়ে যাওয়ার সতর্কতা `[ ]`
- ফর্মে কিছু লিখে Sidebar-এর লিংকে চাপুন → "Unsaved changes" dialog।
- **ব্রাউজারের Back বাটন** চাপুন → একই dialog। **Stay** চাপলে ফর্ম ঠিক যেমন ছিল তেমন থাকে; **Discard & Leave** চাপলে আগের পেজে যায়।

---

## ৯. EMI (কিস্তিতে বিক্রি)

> আগে নিশ্চিত করুন EMI Module চালু (TC-2.2) এবং AC product-এ "EMI Available" টিক।

### TC-9.1 পুরো invoice কিস্তিতে `[ ]`
- Customer `Karim Hossain`, `Split AC 1.5 Ton` ×`1` @`55000`, Installation নেই।
- Financing সারির পেন্সিল → **Payment plan** মডাল:

| ফিল্ড | ইনপুট |
|---|---|
| How will the customer pay | EMI |
| Interest type | Flat rate |
| Interest rate | `12` |
| Duration / type | `12` / Months |
| Pay | Every month |
| Down payment | `15000` |

- **প্রত্যাশিত (মডালে লাইভ হিসাব):** Financed `40,000`, Interest `4,800`, কিস্তি `12 × 3,733.33` (শেষটা কয়েক পয়সা সমন্বয় হতে পারে), পরের due তারিখ ১ মাস পরে।
- Apply → Payment amount বসে `15,000`। Confirm → invoice-এ **Installment plan** কার্ড, "0 of 12 paid", Total `59,800`, Due `44,800`।

### TC-9.2 শুধু AC কিস্তিতে, বাকি নগদে (পণ্য-ভিত্তিক EMI) `[ ]`
- Customer `Rahim Uddin`, লাইন: AC ×`1` @`55000`, `Wiring Kit` ×`1` @`5000`, `Copper Pipe 15ft` ×`1` @`3000`, AC-তে Installation `2000`।
- Payment plan মডালে **"Which products go on EMI?"** তালিকায় শুধু AC টিক রাখুন (Wiring, Pipe টিক তুলুন)।
- Interest Flat `12%`, `12` Months, Monthly। Down payment `7000`।
- **প্রত্যাশিত:**
  - মডাল দেখায়: On EMI `55,000`, Paid now `8,000`, Financed `48,000`, Interest `5,760`, কিস্তি `12 × 4,480`
  - Apply করলে Payment amount = `7,000 + 8,000 = 15,000`
  - Confirm করলে Total `70,760` (63,000 পণ্য + 2,000 installation + 5,760 সুদ), Paid `15,000`, Due `55,760` (53,760 কিস্তি + 2,000 installation)
  - Invoice-এ লাইনের নিচে "On EMI" (AC) ও "Paid now" (বাকিরা)। Installation আলাদা বকেয়া, সুদ লাগে না।
- **Installation আগেই নিতে চাইলে:** "Collect the installation charge now" টগল চালু → Payment amount `17,000` হয়, due `53,760`।

### TC-9.3 নেতিবাচক `[ ]`
| ইনপুট | প্রত্যাশিত |
|---|---|
| সব পণ্যের টিক তুলে Apply | ফেল: "কমপক্ষে একটা পণ্য EMI-তে রাখুন" |
| Down payment ≥ EMI পণ্যের দাম | ফেল |
| Flat rate কিন্তু Rate `0` বা ফাঁকা | ফেল ("0-র বেশি দিন বা No interest বাছুন") |
| Duration ফাঁকা | ফেল |
| বিক্রির তারিখ | ঠিকই কাজ করে |
| "No interest" বেছে | সুদ `0`, কিস্তি সমান ভাগ |
| Reducing balance | সুদ flat-এর চেয়ে কম |

### TC-9.4 কিস্তি আদায় `[ ]`
- Invoice-এর Installment plan কার্ডে Next installment-এর পাশে **Pay** বাটন → Account `Cash in Hand`, Amount ডিফল্ট বাকি → Record Payment।
- **প্রত্যাশিত:** "1 of 12 paid", Next পরের কিস্তিতে যায়, ঐ পেজেই থাকে।
- **আংশিক:** কিস্তির অর্ধেক দিলে স্ট্যাটাস **Partial**, বাকি দেখায়।
- **নেতিবাচক:** বাকির বেশি → ফেল।

### TC-9.5 EMI Installments তালিকা `[ ]`
**পথ:** Sales → EMI Installments
- ফিল্টার/Search (Invoice, নাম, **ফোন**)। সারিতে নামের নিচে ফোন।
- সারি থেকে Pay। সংক্ষিপ্ত হিসাব (সপ্তাহ/মাস/বছর অনুযায়ী আদায়)।

### TC-9.6 Overdue `[ ]`
- (তারিখ পেরোলে) রাত ০:৩০-এ স্বয়ংক্রিয় চলে: পার হওয়া কিস্তি **Overdue** চিহ্ন পায়। হাতে চালাতে: `php artisan emi:mark-overdue`।

### TC-9.7 WhatsApp তাগাদা `[ ]`
- Invoice-এর Installment plan-এ **Remind** বা Dashboard-এর "Installments to collect"-এর WhatsApp আইকন → WhatsApp খোলে, বার্তা আগে থেকে লেখা। মেয়াদ পার হলে বার্তার শব্দ আলাদা।

---

## ১০. Sales Order (অগ্রিম অর্ডার)

### TC-10.1 অর্ডার তৈরি `[ ]`
**পথ:** Sales → Sales Order
- Customer `Karim Hossain`, Expected delivery আজ+৭ দিন, লাইন AC ×`1` @`55000`, Advance Payment `Cash in Hand` `10000`।
- **প্রত্যাশিত:** অর্ডার **Pending/Partial**, Karim-এর "Customer Advance" `10,000`, stock নড়ে না।
- **নেতিবাচক:** Expected delivery < Order date → ফেল।

### TC-10.2 অর্ডার থেকে Sale `[ ]`
- অর্ডারে Convert → নতুন sale তৈরি, অগ্রিম আপনা-আপনি প্রয়োগ হয় (Paid ≥ `10,000`)।
- **প্রত্যাশিত:** অর্ডার **Completed**।

---

## ১১. বিক্রি Return ও Refund

### TC-11.1 আংশিক Return `[ ]`
**পথ:** Sale Returns → নতুন
- Invoice (TC-8.1), Pipe ×`1` ফেরত, কারণ `Customer changed mind`।
- **প্রত্যাশিত:** Pipe stock `+1`, Return তৈরি, Refund প্রাপ্য টাকা দেখায়।

### TC-11.2 Refund `[ ]`
- Return খুলে Refund → Account `Cash in Hand`, প্রাপ্য টাকা।
- **প্রত্যাশিত:** Cash কমে, return-এর refunded amount বাড়ে। প্রাপ্যের বেশি → ফেল।

### TC-11.3 নেতিবাচক `[ ]`
| ইনপুট | প্রত্যাশিত |
|---|---|
| বিক্রির সংখ্যার বেশি ফেরত | ফেল |
| Draft/Cancelled বিক্রির Return | ফেল (শুধু Confirmed) |
| Quantity `0` | ফেল |

---

## ১২. বকেয়া আদায়/পরিশোধ ও ছাড় (Bills ও Contact ledger)

> **নিয়ম:** Receivable = সে আমাদের দেবে। Payable = আমরা তাকে দেব।

### TC-12.1 Customer-এর বকেয়া আদায় (+ছাড়) `[ ]`
**পথ:** Contact (Rahim) → **Pay Due Amount** (বা Bills → Bill Receive)
- Rahim-এর বকেয়া `34,250` (TC-8.5)।
- ইনপুট: Direction "Receive from", Account `Cash in Hand`, Amount `10000`, **Discount `5000`**।
- **প্রত্যাশিত:** বকেয়া `19,250`। Cash `+10,000` (ছাড়ে cash নড়ে না)। পুরনো invoice থেকে আগে কাটে। Journal সমতুল্য (Debit = Credit)।
- **নেতিবাচক:** Discount বকেয়ার বেশি (`99999`) → ফেল।

### TC-12.2 Supplier-কে পরিশোধ (+ছাড়) `[ ]`
- Supplier `ABC Electronics`-এর Payable ধরুন `100,000` (TC-7.5-এর পর)।
- Pay Due: Direction "Pay to", Account `Cash in Hand`, Amount `90000`, **Discount `10000`** (সরবরাহকারী ছাড় দিল)।
- **প্রত্যাশিত:** Payable `0`। Cash `-90,000`। ক্রয়ের status **Paid**।

### TC-12.3 শুধু ছাড় (Payment ছাড়া) `[ ]`
- Supplier-এর ওপর Payable থাকলে Amount ফাঁকা রেখে Discount `5000` → Payable `5,000` কমে, cash নড়ে না।
- Customer-এর ক্ষেত্রে: **Add Discount** বাটন (শুধু যার কাছে আমরা পাই, তাকে ছাড়)।

### TC-12.4 কোন বাটন কখন দেখায় `[ ]`
| অবস্থা | Pay Due | Add Discount |
|---|---|---|
| Customer, বকেয়া আছে (আমরা পাব) | দেখায় | দেখায় |
| Supplier, আমরা দেব | দেখায় | নেই (Pay Due-র ভেতরের Discount ঘর ব্যবহার) |
| Pure customer, ঋণাত্মক (তার জমা টাকা) | নেই, **Refund** আছে | নেই |
| Pure supplier, সে আমাদের দেবে | নেই | দেখায় |
| Balance শূন্য | দেখায় | নেই |

### TC-12.5 Invoice নির্দিষ্ট করে `[ ]`
- Pay Due-এ "Settle Invoice" থেকে একটা invoice বেছে Amount + Discount দিন → শুধু ঐ invoice কমে। Amount + Discount > ঐ invoice-এর due হলে ফেল।

### TC-12.6 Customer-এর জমা টাকা ফেরত (Refund) `[ ]`
- Customer অতিরিক্ত দিয়েছে (ঋণাত্মক balance) → Refund বাটন → Account থেকে টাকা বেরোয়, balance `0`। জমার বেশি → ফেল।

---

## ১৩. খরচ ও অন্যান্য আয়

### TC-13.1 Expense Category `[ ]`
- `Shop Rent`, `Electricity` তৈরি। Chart of Accounts-এ 5200-এর নিচে নিজে থেকে sub-account আসে।

### TC-13.2 Expense `[ ]`
- Category `Shop Rent`, Account `Cash in Hand`, Amount `15000`, তারিখ আজ, নোট `October rent`, রসিদ (PDF/JPG) সংযুক্ত।
- **প্রত্যাশিত:** Cash `-15,000`, তালিকায় আসে, Journal সমতুল্য।
- **নেতিবাচক:** Account-এ যথেষ্ট টাকা নেই → ফেল। Amount `0` → ফেল। ১০MB-এর বেশি ফাইল → ফেল।

### TC-13.3 Expense সম্পাদনা ও মোছা `[ ]`
- Account `Cash` → `Bank`, Amount `12000` করুন → পুরনো টাকা Cash-এ ফেরে, Bank থেকে কাটে।
- Delete → টাকা account-এ ফেরে। তালিকা থেকে লুকায়, কিন্তু রেকর্ড ডাটাবেসে থাকে।
- ঐ Category আর মোছা যায় না (ইতিহাস আছে)।

### TC-13.4 Other Income `[ ]`
- Category `Scrap Sale`, Account `Cash in Hand`, Amount `2000` → Cash `+2,000`।
- **নেতিবাচক:** Amount `0` → ফেল। একই Category নাম আবার → ফেল।

---

## ১৪. সম্পদ, দায়, বিনিয়োগকারী, ঋণ

### TC-14.1 Asset `[ ]`
- **Existing:** Type Existing, Name `Delivery Van`, Opening value `300000` → asset তৈরি, নগদ নড়ে না।
- **New purchase:** Type New, Name `Computer`, Purchase amount `60000`, Account `City Bank` → Bank `-60,000`।
- **লেনদেন:** Computer-এ `sold`, Sale price `40000`, Account `Cash` → Cash `+40,000`, লাভ/লোকসান Journal-এ। `disposal` (Account লাগে না)।
- **নেতিবাচক:** Purchase amount `0` → ফেল।

### TC-14.2 Other Liability `[ ]`
- নাম `Supplier Advance Held`, Opening `10000`। Transaction: `increase` `5000` (Account বাছতে হবে) → balance `15,000`; `payment` `4000` → `11,000`।

### TC-14.3 Investor `[ ]`
- নাম `Mr. Alam`, Opening `100000`। Transaction: `investment` `50000` (Cash-এ) → Cash `+50,000`; `withdrawal` `20000` → Cash `-20,000`; `profit_share`।
- **নেতিবাচক:** Cash-এ থাকা টাকার বেশি withdrawal → ফেল।

### TC-14.4 Company Loan `[ ]`
- **New:** Lender `XYZ Bank`, Loan amount `200000`, Account `City Bank`, Rate `10`, Start আজ → Bank `+200,000`, Loan outstanding `200,000`।
- `repayment` `20000` (Bank থেকে) → `180,000`। `interest_charge` `1500` → বাড়ে।
- **Existing:** Loan `100000`, Current balance `60000` → balance `60,000`।
- **নেতিবাচক:** Existing-এ Current balance > Loan amount → ফেল। Rate `150` → ফেল।

### TC-14.5 Staff `[ ]`
- নাম `Jamal`, Designation `Technician`, Joining আজ, Salary `20000`, Status Active।
- Transaction type মাত্র তিনটা: **Salary**, **Advance**, **Advance Return**।
- Salary `20000` (Account `Cash`) → Cash `-20,000`, খরচ হিসেবে ওঠে, staff balance বদলায় না।
- Advance `3000` → staff-এর কাছে আমাদের পাওনা `3,000`। Advance Return `3000` → `0`।
- **নেতিবাচক:** Amount `0` → ফেল। Account না দিলে (যেখানে টাকা নড়ে) → ফেল।

---

## ১৫. সার্ভিস ও Warranty

### TC-15.1 Installation Request `[ ]`
- TC-8.5-এর AC বিক্রিতে নিজে থেকে একটা Installation request (**Service Requests** তালিকায়) তৈরি আছে।
- সম্পাদনা: Staff `Jamal`, Service date আজ+২, Status `Scheduled` → `Completed`।

### TC-15.2 Paid Service `[ ]`
- নতুন Service Request: Sale item `AC (INV...)`, Request date আজ।
- সিস্টেম নিজেই ঠিক করে সেবাটা **ফ্রি** না **পেইড**। ফ্রি হলে Charge/Account লাগে না, `is_free` হয়।
- ফ্রি কোটা শেষ হলে (বা service period-এর বাইরে) **পেইড**: Charge `1500` ও Account `Cash in Hand` দিতে হয় → Cash `+1,500`।
- **নেতিবাচক:** পেইড অবস্থায় Charge ফাঁকা বা `0` → ফেল।

### TC-15.3 Free service quota `[ ]`
- AC-র service plan (৬ মাস: ফ্রি `1`, ১২ মাস: ফ্রি `1`): প্রথম Service Request ফ্রি, একই period-এ দ্বিতীয়টা পেইড (চার্জ আবশ্যক)। পরের period শুরু হলে আবার একটা ফ্রি।

### TC-15.4 Warranty Claim `[ ]`
- Sale item `AC (INV...)`, Claim date আজ, Issue `Not cooling` → তৈরি, status Pending।
- **জানা ঘাটতি:** Warranty-র মেয়াদ পেরোনো item-এ claim করলেও সিস্টেম এখন বাধা দেয় না বা সতর্ক করে না। চেষ্টা করে ফলাফল লিখে রাখুন; এখানে সতর্কবার্তা থাকা উচিত।
- Export কাজ করে।

---

## ১৬. Hisab ও Reports

### TC-16.1 Chart of Accounts `[ ]`
- তালিকায় 1010 Cash, 1020 Bank, 1100 Receivable, 1200 Inventory, 2100 Payable, 4100 Sales Revenue ইত্যাদি। নতুন Payment Account তৈরি করলে নিজে থেকে sub-account আসে।

### TC-16.2 Journal Entries `[ ]`
- যেকোনো বিক্রি/ক্রয়/খরচ-এর Journal খুলুন: **Total Debit = Total Credit**।
- Journal Entry সম্পাদনা/মোছা যায় না। শুধু **Reverse** করা যায় → উল্টো এন্ট্রি তৈরি, আসলটা "Reversed"।

### TC-16.3 Accounting Period বন্ধ করা `[ ]`
- Accounting Periods → গত মাসের period → Close।
- **প্রত্যাশিত:** ঐ তারিখে নতুন কোনো বিক্রি/খরচ/ক্রয় (তারিখ ঐ period-এর ভেতরে) save হয় না, ত্রুটি আসে। আবার Close চাপলে কিছু হয় না (নিরাপদ)।

### TC-16.4 Trial Balance `[ ]`
- **প্রত্যাশিত:** Debit মোট = Credit মোট।

### TC-16.5 Profit & Loss `[ ]`
- সময়কাল বেছে: আয় (Sales − Returns + Other Income), COGS, খরচ, নিট লাভ। TC-8.1-এর মতো ছোট কেস দিয়ে হাতে হিসাব মিলিয়ে দেখুন।

### TC-16.6 Balance Sheet ও Financial Position `[ ]`
- Assets = Liabilities + Equity। Financial Position পেজে নগদ, receivable, payable, stock মূল্য।

### TC-16.7 Cash Flow `[ ]`
- নির্দিষ্ট তারিখে নগদ প্রবাহ account-এর statement-এর সাথে মেলে।

### TC-16.8 Stock Report `[ ]`
- প্রতিটা product-এর stock ও মূল্য; Dashboard-এর Closing Stock Value-র সাথে মেলে।

### TC-16.9 Due Report `[ ]`
- Customer/Supplier-ভিত্তিক বকেয়া; ধরুন Rahim `19,250`, Supplier `0`। তালিকার যোগফল Dashboard-এর Receivable/Payable-র সমান।

### TC-16.10 Trending Products `[ ]`
- বেশি বিক্রিত product উপরে।

---

## ১৭. Import, Backup, Activity Log

### TC-17.1 Import `[ ]`
**পথ:** System Tools → Import
- Template ডাউনলোড (Products/Contacts/Opening stock/Sales)। প্রতিটার জন্য আবশ্যক ও ঐচ্ছিক কলাম টেবিলে দেখায়।
- Products: ২টা সারি (`Name`, `SKU`, `Unit`...) দিয়ে আপলোড → সফল সংখ্যা দেখায়।
- **নেতিবাচক:** একটা সারিতে Name ফাঁকা বা ডুপ্লিকেট SKU → ঐ সারি ত্রুটি সহ বাদ, বাকিগুলো যায়; ত্রুটি কোন সারিতে তা পরিষ্কার লেখা।
- ভুল ফরম্যাটের ফাইল (`.pdf`) → ফেল।
- **Check file ধাপ:** ফাইল বেছে "Check file" চাপলে সারি ধরে দেখায় কোন ঘরে কোন মান যাচ্ছে ও কোন সারি কেন Skipped। "Import" চাপার আগে কিছুই সংরক্ষিত হয় না; "Cancel" দিলে ফাইল মুছে যায়।
- **Sales import:** কলামে আছে historical (yes = শুধু record, **stock বা ব্যালেন্স নড়ে না**; no = live sale), line ও invoice discount, installation_charge, warranty_months, paid_amount ও payment_account। নেতিবাচক: discount_type = half → ওই invoice Skipped; live sale-এ paid_amount দিয়ে ভুল payment_account → Skipped।
- **Template:** .xlsx ডাউনলোড হয়, phone/SKU/barcode ঘর Text। ফাইলে 8.80181E+12 ধরনের নষ্ট phone দিলে সেই সারি Skipped হয় ও কারণ লেখা থাকে।

### TC-17.2 Backup `[ ]`
- System Tools → Backups → Create → ফাইল তালিকায় আসে (ডাউনলোড/মোছা সম্ভব)।
- (রাত ১টায় নিজে থেকে চলে।) **Restore পরীক্ষা:** ডাউনলোড করা ব্যাকআপ আলাদা পরিষ্কার পরিবেশে ফিরিয়ে দেখুন ডাটা আছে।

### TC-17.3 Activity Log `[ ]`
- কোনো product/contact বদলান। Activity Log-এ দেখা যায়: কে, কী, কখন, আগে/পরে মান।
- ফিল্টার (ব্যবহারকারী/মডিউল/তারিখ)।

---

## ১৮. Dashboard ও সাধারণ সুবিধা

### TC-18.1 Dashboard কার্ড `[ ]`
- আজ/গতকাল/৭ দিন/মাস/Custom ফিল্টার। Total Sales, Net Sales, Due, Purchase, Expense কার্ডের সংখ্যা Reports-এর সাথে মেলে।
- চার্ট: ৩০ দিনের বিক্রি, অর্থবছরের বিক্রি, আয়-ব্যয়।

### TC-18.2 আজকের কাজ (Follow-ups) `[ ]`
- **Installments to collect:** ৭ দিনের মধ্যে ও Overdue কিস্তি, মোট সংখ্যা ও টাকা সহ; সারিতে ক্লিক করলে ঐ invoice।
- **Warranties ending soon:** ৩০ দিনের মধ্যে শেষ হবে এমন।
- কিছু না থাকলে "Nothing to chase right now"।

### TC-18.3 Books Check `[ ]`
- `php artisan reconciliation:check` চালান। Report-দেখার অনুমতিওয়ালা ব্যবহারকারীর Dashboard-এ সবুজ লাইন "Books check: everything adds up"।
- (অভিজ্ঞদের জন্য) ইচ্ছাকৃত গরমিল তৈরি করে (যেমন সরাসরি DB-তে contact balance বদলে) আবার চালালে **লাল** লাইন, কোন check ফেল তা লেখা থাকে।

### TC-18.4 নতুন দোকানের চেকলিস্ট `[ ]`
- একদম নতুন DB-তে Dashboard-এ "Get your shop ready": Shop → Product → Supplier → Purchase → Customer → Sale। প্রথম বিক্রির পর নিজে থেকে চলে যায়।

### TC-18.5 Global Search ও Shortcut `[ ]`
- `Ctrl+K` (Mac-এ `⌘K`): নাম লিখে Product/Contact/Sale/Purchase/Expense খুঁজে পাওয়া। `Ctrl+B`: Sidebar ভাঁজ/খোলা। `Ctrl+Space`: Quick actions।
- Sale পেজে `F2` → Product search-এ ফোকাস, `F4` → Payment অংশে লাফ, `Enter` (ফিল্ডে না লিখলে) → Confirm ও সেভ, `Esc` → বাতিল করে তালিকায়।
- Shortcuts বাটন থেকে পুরো তালিকা দেখা যায়।

### TC-18.6 Responsive ও Dark mode `[ ]`
- ব্রাউজার ছোট করে (মোবাইল প্রস্থ) Sale ফর্ম: লাইন তালিকা কার্ড আকারে, নিচে মোট বার। আড়াআড়ি স্ক্রল থাকবে না।
- Dark mode-এ সব পেজ পড়া যায়।

---

## ১৯. নিরাপত্তা ও ডাটা অখণ্ডতা (অবশ্যই দেখুন)

### TC-19.1 টাকার ডাটা কখনো সরাসরি মোছা নয় `[ ]`
- Confirmed Sale/Purchase-এর Delete বাটন নেই। Journal Entry মোছা যায় না। Stock movement মোছা যায় না।

### TC-19.2 একই কাজ দুবার চাপলে `[ ]`
- "Confirm" দ্রুত দুবার চাপুন (বা Back করে আবার Confirm) → **দুটো invoice বা দ্বিগুণ stock কাটা হয় না।**

### TC-19.3 দশমিক ও রাউন্ডিং `[ ]`
- দাম `333.33` × `3` → মোট `999.99`। EMI কিস্তি যোগফল ঠিক মোট payable-এর সমান (পয়সার ফারাক শেষ কিস্তিতে মেটে)।

### TC-19.4 একই সময়ে দুই জন `[ ]`
- দুই ব্রাউজারে শেষ ১টা AC একসাথে বিক্রির চেষ্টা → একটা সফল, অন্যটা "stock নেই" ত্রুটি। Stock ঋণাত্মক হয় না।

### TC-19.5 অনুমতি `[ ]`
- Cashier দিয়ে URL সরাসরি লিখে (`/expenses`, `/business-settings`, `/roles`, `/chart-of-accounts`) অন্য মডিউল খোলার চেষ্টা → ৪০৩।

---

## ২০. ধারাবাহিক পুরো দোকানের গল্প (শেষে হিসাব মেলান)

> একদম নতুন DB (`migrate:fresh --seed`) থেকে শুরু করুন। নিচের ক্রমে করুন; ধাপ-শেষে Cash ও Bank-এর **প্রত্যাশিত** balance মিলিয়ে নিন।

**প্রাথমিক:** Cash `500,000`, Bank `200,000` (TC-6.1)। Product (TC-4): AC `55,000`, Pipe `3,000`, Wiring `5,000`।

| # | কাজ | Cash | Bank | অন্যান্য প্রত্যাশিত |
|---|---|---:|---:|---|
| 1 | শুরু | 500,000 | 200,000 | |
| 2 | ক্রয় (TC-7.2): AC×5@40,000 + Pipe×10@2,000 + Wiring×10@3,000 = 250,000; Cash-এ 100,000 | 400,000 | 200,000 | Supplier Payable 150,000; Stock: AC5 Pipe10 Wiring10 |
| 3 | নগদ বিক্রি (Rahim, TC-8.1): Pipe×2 + Wiring×1 @5,000 = 11,000, ছাড় 1,000 = 10,000, পুরো Cash | 410,000 | 200,000 | Stock: Pipe8 Wiring9; Rahim বকেয়া 0 |
| 4 | AC বিক্রি (Rahim): 52,250 + installation 2,000 = 54,250; Cash 20,000 | 430,000 | 200,000 | Rahim বকেয়া 34,250; AC stock 4 |
| 5 | EMI বিক্রি (Karim, TC-9.2 এর মতো): AC + Wiring + Pipe + installation, Cash 15,000 | 445,000 | 200,000 | Total 70,760; Karim বকেয়া 55,760; ১২টা কিস্তি 4,480; Stock: AC3 Wiring8 Pipe7 |
| 6 | Karim-এর প্রথম কিস্তি 4,480 (Cash) | 449,480 | 200,000 | "1 of 12 paid" |
| 7 | Rahim-কে বকেয়া আদায় 10,000 + ছাড় 5,000 | 459,480 | 200,000 | Rahim বকেয়া 19,250 |
| 8 | Supplier-কে পরিশোধ 100,000 (Bank থেকে) + ছাড় 10,000 | 459,480 | 100,000 | Supplier Payable 40,000 |
| 9 | খরচ: Shop Rent 15,000 (Cash) | 444,480 | 100,000 | |
| 10 | অন্যান্য আয়: Scrap 2,000 (Cash) | 446,480 | 100,000 | |

**শেষে যাচাই:**
- [ ] Trial Balance: Debit = Credit
- [ ] Balance Sheet: Assets = Liabilities + Equity
- [ ] Dashboard: Receivable = Rahim 19,250 + Karim (55,760 − 4,480 = 51,280) = **70,530**; Payable = **40,000**
- [ ] Stock Report: AC 3, Pipe 7, Wiring 8; সবগুলোর Qty × avg cost যোগ = Dashboard-এর Closing Stock Value
- [ ] `php artisan reconciliation:check` → সব OK
- [ ] Journal Entry তালিকার প্রতিটা এন্ট্রি Debit = Credit
- [ ] কোনো Account-এর balance ঋণাত্মক নয়

> **নোট:** ধাপ ৫-এর EMI-তে Karim-এর বিক্রির জন্য AC-র লাইনে ছাড় বা সুদ-হার ভিন্ন দিলে অঙ্ক বদলাবে; তখন মডালে দেখানো Financed/Interest/কিস্তি অনুযায়ী নিজে হিসাব করে নিন (সূত্র: Flat সুদ = Financed × বার্ষিক হার × বছর; কিস্তি = (Financed + সুদ) ÷ কিস্তির সংখ্যা)।

---

## পরিশিষ্ট: ত্রুটি পেলে কী জানাবেন

প্রতিটা ফেল হওয়া Test Case-এর জন্য লিখুন:
1. Test Case নম্বর (যেমন TC-9.2)
2. আপনি কোন ইনপুট দিয়েছিলেন
3. কী হওয়ার কথা ছিল, আসলে কী হয়েছে (সম্ভব হলে স্ক্রিনশট)
4. কোন ব্রাউজার/ডিভাইস
5. `storage/logs/laravel.log`-এর শেষ ত্রুটি (ডেভেলপারের জন্য)
