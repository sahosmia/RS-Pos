# Sahos POS — প্রোমোশনাল ওয়েবসাইট ব্রিফ

> **কার জন্য:** আপনি (যিনি Next.js দিয়ে সাইটটা বানাবেন)। সাইটের কপি/লেখা নিজে লক্ষ্য করছে বাংলাদেশের দোকান-মালিকদের।
> **তৈরির তারিখ:** ২০২৬-১০-০৩। ফিচার-তালিকা অ্যাপের মেনু, রুট, পেজ ও কোড দেখে বানানো। যেগুলো আমি কোডে যাচাই করতে পারিনি, সেগুলো আলাদা করে **§১২**-তে আছে — ওগুলো সাইটে লেখার আগে নিজে একবার দেখে নিন।

---

## ১. সাইটের উদ্দেশ্য ও শর্ত

| বিষয় | সিদ্ধান্ত |
|---|---|
| কাজ | **শুধু প্রচার।** দর্শক সিস্টেমটা বুঝবে, বিশ্বাস করবে, তারপর আপনাকে যোগাযোগ করবে (ডেমো/কোটেশন) |
| নাম | **Sahos POS** |
| টেকনোলজি | Next.js (App Router) + TypeScript + Tailwind |
| হোস্টিং | Vercel |
| ডাটাবেস | **নেই।** সব লেখা একটা ফাইলে (`content/site.ts`, §৫) |
| ভাষা | বাংলা (ডিফল্ট) + ইংরেজি। `/bn/...` ও `/en/...` |
| যোগাযোগ-ফর্ম | ডাটাবেস ছাড়া — **WhatsApp ক্লিক-টু-চ্যাট**, `tel:`, `mailto:` (বিস্তারিত §৮) |
| রেন্ডার | পুরো সাইট স্ট্যাটিক (SSG)। কোনো API রুট দরকার নেই |

**মূল কথা:** এটা বিক্রির ভিড়ে আলাদা করে দেখানোর সাইট, তাই প্রতিটা পেজের একটাই লক্ষ্য — দর্শককে **"ডেমো চাই"** বাটনে আনা।

---

## ২. প্রোডাক্ট পরিচিতি (সাইটের ভিত্তি)

**Sahos POS** একটি ব্যবসা-ব্যবস্থাপনা (POS + হিসাব) সফটওয়্যার, যেটা তৈরি হয়েছে বাংলাদেশের **হোম অ্যাপ্লায়েন্স দোকান** (ফ্রিজ, এসি, টিভি) মাথায় রেখে, পরে স্যানিটারি/হার্ডওয়্যার ব্যবসাতেও চলবে।

**যা একে আলাদা করে** (প্রতিযোগীর সাথে পার্থক্য — হেডলাইনে ব্যবহার করুন):

1. **কিস্তি (EMI) ও বাকির পূর্ণ হিসাব** — কিস্তির সময়সূচি, ওভারডিউ নিজে থেকে চিহ্নিত।
2. **ওয়ারেন্টি, সার্ভিস ও ইনস্টলেশন** — বিক্রির সাথেই সার্ভিস-প্ল্যান, ওয়ারেন্টি ক্লেইম, সিরিয়াল নম্বর।
3. **আসল হিসাবরক্ষণ (ডাবল-এন্ট্রি)** — প্রতিটা লেনদেন নিজে থেকে জার্নাল হয়ে যায়; ব্যালেন্স শিট, ট্রায়াল ব্যালেন্স, ক্যাশ ফ্লো বের হয়।
4. **কিছু মোছা যায় না, ভুল ঠিক হয় "রিভার্স" করে** — ব্যাংকের মতো; হিসাবের ইতিহাস অটুট।
5. **কে কী করেছে সব লেখা থাকে** — প্রতিটা বিক্রি/কেনা/খরচে কর্মীর নাম + Activity Log।
6. **বাংলা ও ইংরেজি দুই ভাষায়**, মোবাইলেও চলে, ডার্ক মোড আছে।
7. **প্রতিটা ক্রেতার জন্য আলাদা ইনস্টল (single-tenant)** — আপনার ডাটা অন্য কারো সাথে মেশে না।

> ⚠️ সাইটে শুধু ওপরের ও §৪-এর যাচাইকৃত ফিচার নিয়ে বলুন। **§১২-এর "দাবি করবেন না" তালিকা** মানুন।

---

## ৩. টার্গেট দর্শক (Persona)

| Persona | কী চায় | সাইটে কোন বার্তা |
|---|---|---|
| **দোকান-মালিক** (মূল) | হিসাব মিলুক, বাকি/কিস্তি উঠুক, কর্মী চুরি/ভুল না করুক | "বাকি ও কিস্তির হিসাব এক জায়গায়", "কে কী করেছে সব দেখুন" |
| **ম্যানেজার/হিসাবরক্ষক** | রিপোর্ট, ব্যালেন্স শিট, নির্ভুল ক্যাশ ফ্লো | "ডাবল-এন্ট্রি, ১-ক্লিক রিপোর্ট" |
| **ক্যাশিয়ার/সেলসম্যান** | দ্রুত বিক্রি, সহজ স্ক্রিন | "কীবোর্ড শর্টকাটে ১ মিনিটে বিক্রি", "Ctrl+Space কুইক অ্যাকশন" |
| **আইটি/পরিবারের শিক্ষিত সদস্য** | নিরাপত্তা, ব্যাকআপ | "অটো ব্যাকআপ, রোল-ভিত্তিক অনুমতি" |

---

## ৪. ফিচার তালিকা (কোডে যাচাই করা)

প্রতিটার বামে মেনুর আসল নাম, ডানে সাইটে লেখার মতো এক লাইন। এই তালিকাই `features` সেকশনের উৎস।

### ৪.১ বিক্রি (Sales)
- **দ্রুত বিক্রি স্ক্রিন:** পণ্য সার্চ, লাইন-বাই-লাইন দাম/ডিসকাউন্ট, `F2` সার্চ, `F4` পেমেন্ট, `Enter` কনফার্ম, `Esc` বাতিল।
- **ড্রাফট ও কোটেশন:** আগে সেভ করে রাখুন, পরে কনফার্ম। কোটেশনের মেয়াদ দেওয়া যায়।
- **একাধিক পেমেন্ট একসাথে:** একটা বিক্রিতে ক্যাশ + বিকাশ + ব্যাংক ভাগ করে নেওয়া।
- **ক্রেতার আগের বাকি/অগ্রিম** বিক্রির সময়েই দেখা যায়; **আগে যা কিনেছে** এক ক্লিকে আবার যোগ।
- **ইনভয়েস PDF** (সাধারণ + থার্মাল প্রিন্টার লেআউট), কাস্টমাইজযোগ্য ইনভয়েস।
- **WhatsApp-এ ইনভয়েস পাঠান:** "Save & WhatsApp" বাটনে বিক্রি সেভ হয়ে ক্রেতার জন্য প্রস্তুত মেসেজ (মোট, বাকি, আগের বাকি) খোলে।
- **সেলস অর্ডার (অগ্রিম বুকিং):** নির্দিষ্ট দিনে ডেলিভারির জন্য, অগ্রিম নিয়ে।
- **সেল রিটার্ন:** ফেরত নিলে স্টক ও হিসাব নিজে ঠিক হয়।
- **ঐতিহাসিক রেকর্ড (Historical):** পুরনো বিক্রি স্টক/ব্যালেন্সে হাত না দিয়ে তোলা যায়।
- **কে বিক্রি করল** — প্রতিটা বিক্রিতে কর্মীর নাম।

### ৪.২ কিস্তি (EMI) — *মডিউল চালু করলে*
- বিক্রির সময়েই EMI বেছে কিস্তি-সংখ্যা ঠিক করা।
- **কিস্তির তালিকা:** কোন ক্রেতার কোন কিস্তি বাকি, কতটা পরিশোধ।
- **ওভারডিউ নিজে থেকে চিহ্নিত** (প্রতিদিন রাতে)।
- কিস্তির টাকা নেওয়া ও কোন অ্যাকাউন্টে গেল তা লেখা।

### ৪.৩ পণ্য ও স্টক (Products)
- পণ্য, ক্যাটাগরি, ব্র্যান্ড, ইউনিট; পণ্যের ছবি; SKU ও বারকোড ফিল্ড।
- **স্টক ট্র্যাকিং:** প্রতিটা বাড়া-কমার ইতিহাস; ওপেনিং স্টক আর ভুল-সংশোধন (Adjustment) আলাদা।
- **লো-স্টক ও স্টক-আউট:** মিনিমাম লেভেল ঠিক করলে ড্যাশবোর্ডে ও নোটিফিকেশনে সতর্কতা।
- **গড় ক্রয়মূল্য ও মুনাফার হার** (Profit Margin) প্রতিটা পণ্যে।
- **সিরিয়াল নম্বর ট্র্যাকিং** (ফ্রিজ/এসির মতো পণ্যে) — *মডিউল চালু করলে*।
- **নন-স্টক আইটেম:** ইনস্টলেশন চার্জের মতো সেবা বিক্রি।
- দাম **ঐচ্ছিক** — না দিলেও পণ্য তৈরি হয়; বিক্রির সময় বসানো যায়।
- ফর্মের ভেতর থেকেই নতুন ক্যাটাগরি/ব্র্যান্ড/ইউনিট বানালে নিজে সিলেক্ট হয়ে যায়।

### ৪.৪ ক্রয় (Purchases)
- সাপ্লায়ার থেকে কেনা, ড্রাফট/অর্ডার/রিসিভড অবস্থা, ডিসকাউন্ট।
- ক্রয় রিটার্ন; সাপ্লায়ারের কাছে কত দেনা তার হিসাব।

### ৪.৪ক কন্টাক্ট (ক্রেতা/সাপ্লায়ার)
- একই ব্যক্তি ক্রেতা, সাপ্লায়ার বা দুটোই হতে পারে; কাস্টমার গ্রুপ।
- **প্রতিটার নিজস্ব লেজার** (কে কার কাছে কত পায়/দেয়) — ব্যাংক স্টেটমেন্টের মতো, তারিখ ধরে দেখা যায়।
- **বিল গ্রহণ/পরিশোধ/ডিসকাউন্ট (মওকুফ)** আলাদা স্ক্রিনে।
- সিলেক্ট করা কন্টাক্টদের নোটিফিকেশন পাঠানোর ফর্ম।

### ৪.৫ টাকা ও অ্যাকাউন্ট
- **একাধিক পেমেন্ট অ্যাকাউন্ট:** ক্যাশ, ব্যাংক, মোবাইল ব্যাংকিং — প্রতিটার নিজস্ব ব্যালেন্স।
- **ফান্ড ট্রান্সফার** নিজের দুই অ্যাকাউন্টের মধ্যে।
- **খরচ (Expenses)** — ক্যাটাগরি অনুযায়ী, যে অ্যাকাউন্ট থেকে দেওয়া সেখান থেকে সরাসরি কমে।
- **অন্যান্য আয় (Other Income)** — কার্টন/স্ক্র্যাপ বিক্রি, সুদ, কমিশনের মতো ছোট আয়।
- **স্টাফ:** বেতন ও অগ্রিম, প্রতিজনের লেজার।

### ৪.৬ সম্পদ, দেনা ও মূলধন
- **অ্যাসেট** (ফার্নিচার, গাড়ি, ইকুইপমেন্ট) — পুরনো (ওপেনিং ভ্যালু) বা এখন কেনা (অ্যাকাউন্ট থেকে কাটা)।
- **অন্যান্য দেনা (Other Liabilities)।**
- **ইনভেস্টর** ও তাদের বিনিয়োগ; **কোম্পানি লোন** (আগের চলমান বা নতুন), পরিশোধের হিসাব।

### ৪.৭ হিসাবরক্ষণ (Accounting)
- **ডাবল-এন্ট্রি:** প্রতিটা লেনদেন নিজে থেকে ডেবিট = ক্রেডিট জার্নালে যায়।
- **চার্ট অব অ্যাকাউন্টস**, **জার্নাল এন্ট্রি** (দরকারে নিজে রিভার্স), **অ্যাকাউন্টিং পিরিয়ড** (মাস/বছর বন্ধ)।
- **জেনারেল লেজার**, তারিখ-সীমা ও পেজ করা — বছরের পর বছরের ডাটাতেও দ্রুত।
- **দৈনিক স্বয়ংক্রিয় মিলিয়ে দেখা (reconciliation check):** জার্নাল, স্টক, বাকি, অ্যাকাউন্ট ব্যালেন্স পরস্পর মিলছে কিনা রাতে নিজে যাচাই হয়।

### ৪.৮ রিপোর্ট
**লাভ-ক্ষতি (Profit & Loss)**, **ব্যালেন্স শিট**, **ক্যাশ ফ্লো**, **ট্রায়াল ব্যালেন্স**, **ফাইন্যান্সিয়াল পজিশন**, **স্টক রিপোর্ট**, **বাকি (Due) রিপোর্ট**, **ট্রেন্ডিং/বেস্ট-সেলার পণ্য**।
- প্রতিটা লিস্ট থেকে **CSV / Excel / PDF এক্সপোর্ট** — কলাম বেছে, সিলেক্ট করা সারি বা সব। (বড় ডাটায় CSV সীমাহীন, Excel/PDF-এ সীমা আছে — সাইটে "বড় ডাটাতেও নিরাপদ" বলা যাবে।)

### ৪.৯ ওয়ারেন্টি ও সার্ভিস
- **সার্ভিস রিকোয়েস্ট:** ইনস্টলেশন ও সার্ভিস, ফ্রি কোটা নাকি চার্জ।
- **ওয়ারেন্টি ক্লেইম:** বিক্রিত আইটেম খুঁজে ক্লেইম খোলা, অবস্থা (Pending → In progress → Resolved/Rejected), রেজোলিউশন নোট।
- পণ্যে **সার্ভিস-প্ল্যান** (কত মাসে কতবার ফ্রি সার্ভিস) ও ওয়ারেন্টি মাস।

### ৪.১০ ড্যাশবোর্ড ও দৈনন্দিন সুবিধা
- **ড্যাশবোর্ড:** আজ/গতকাল/মাস/বছর বা নিজের তারিখ-সীমায় বিক্রি, ক্রয়, খরচ, বাকি; লো-স্টক; সাম্প্রতিক লেনদেন; বেস্ট-সেলার; ৩০ দিন ও অর্থবছরের চার্ট; রাজস্ব বনাম খরচ।
- **কুইক অ্যাকশন (`Ctrl + Space`):** যেকোনো পেজ থেকে নতুন বিক্রি/ক্রয়/কন্টাক্ট ইত্যাদি খোলা; কোনগুলো থাকবে ও ক্রম অ্যাডমিন ঠিক করে।
- **গ্লোবাল সার্চ (`Ctrl + K`)।**
- **নোটিফিকেশন:** লো-স্টক, বাকি পরিশোধ, লোন পরিশোধের সময়।
- **বাংলা/ইংরেজি, ডার্ক মোড, থিম রঙ** (শপের ডিফল্ট রঙ + ব্যক্তিগত পছন্দ)।
- **নিজের ব্র্যান্ডিং:** শপের লোগো (বড়/ছোট) ও ফেভিকন, সাইডবারের মেনু-ক্রম নিজের মতো সাজানো।
- টেবিল **টেবিল/গ্রিড** দুই ভিউ, কলাম দেখানো/লুকানো — মোবাইলে গ্রিড।

### ৪.১১ নিরাপত্তা ও নিয়ন্ত্রণ
- **ইউজার ও রোল:** Admin, Manager, Cashier, Staff — মডিউল ধরে অনুমতি (দেখা/তৈরি/এডিট/মোছা), নিজের বানানো রোলও।
- **Activity Log:** কে, কখন, কোন রেকর্ড তৈরি/বদল/মুছেছে, **পুরনো মান → নতুন মান** সহ; ব্যবহারকারী/ধরন/তারিখ দিয়ে ফিল্টার; সংরক্ষণের মেয়াদ ৩ থেকে ২৪ মাস ঠিক করা যায়।
- **প্রতিটা লেনদেনে "কে করেছে"** (বিক্রি, ক্রয়, খরচ, ট্রান্সফার…)।
- **অটো ব্যাকআপ** প্রতিদিন, পুরনোগুলো নিয়ম মেনে পরিষ্কার; অ্যাপের ভেতর থেকে ব্যাকআপ দেখা/নেওয়া।
- **ইমপোর্ট টুল:** আগের ডাটা (পণ্য, কন্টাক্ট ইত্যাদি) ফাইল থেকে তোলা।
- আনসেভড পরিবর্তন নিয়ে সতর্কতা (ফর্ম না সেভ করে ছাড়তে গেলে)।

### ৪.১২ সবকিছুর পেছনের ভিত্তি (বিশ্বাস গড়তে)
- ডেটা-ইন্টিগ্রিটি নীতি: স্টক ও ব্যালেন্স সবসময় ইতিহাস থেকে মেলানো যায়; ভুল ঠিক হয় নতুন এন্ট্রি দিয়ে — **কখনো মুছে নয়।**
- আধুনিক টেক: Laravel 12, React 19, TypeScript, Tailwind — দ্রুত ও নিরাপদ বেস।

---

## ৫. কনটেন্ট ফাইল (`content/site.ts`) — সাইটের সব লেখা এখান থেকে

নিয়ম: **কম্পোনেন্টে কোনো লেখা হার্ডকোড নয়।** পেজ শুধু এই ফাইল পড়ে সাজায়। বাংলা/ইংরেজি দুটোই `L` টাইপে।

```ts
// content/site.ts
export type L = { bn: string; en: string };

export const site = {
  // ───────── ব্র্যান্ড ─────────
  brand: {
    name: 'Sahos POS',
    tagline: {
      bn: 'আপনার দোকানের পুরো হিসাব, এক জায়গায়',
      en: 'Your whole shop, accounted for — in one place',
    } satisfies L,
    description: {
      bn: 'বিক্রি, স্টক, বাকি, কিস্তি, ওয়ারেন্টি ও হিসাবরক্ষণ — বাংলায়, আপনার নিজস্ব সিস্টেমে।',
      en: 'Sales, stock, dues, EMI, warranty and full accounting — in Bangla, on your own system.',
    } satisfies L,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sahospos.vercel.app', // ডোমেইন পেলে বদলান
  },

  // ───────── যোগাযোগ (এখানেই বসান, সাইট আপনাআপনি সব জায়গায় নেবে) ─────────
  contact: {
    phone: '{{PHONE}}',            // যেমন +8801XXXXXXXXX
    whatsapp: '{{WHATSAPP}}',      // কান্ট্রি-কোডসহ, + ছাড়া: 8801XXXXXXXXX
    email: '{{EMAIL}}',
    address: { bn: '{{ঠিকানা}}', en: '{{Address}}' } satisfies L,
    hours: { bn: 'শনি–বৃহস্পতি, সকাল ১০টা – সন্ধ্যা ৭টা', en: 'Sat–Thu, 10am – 7pm' } satisfies L, // নিজের মতো বদলান
    social: { facebook: '{{URL}}', youtube: '{{URL}}' },
    whatsappPrefill: {
      bn: 'আসসালামু আলাইকুম, Sahos POS-এর একটা ডেমো দেখতে চাই।',
      en: 'Hello, I would like a demo of Sahos POS.',
    } satisfies L,
  },

  // ───────── নেভিগেশন ─────────
  nav: [
    { href: '/', label: { bn: 'হোম', en: 'Home' } },
    { href: '/features', label: { bn: 'ফিচার', en: 'Features' } },
    { href: '/modules', label: { bn: 'মডিউল', en: 'Modules' } },
    { href: '/faq', label: { bn: 'প্রশ্নোত্তর', en: 'FAQ' } },
    { href: '/contact', label: { bn: 'যোগাযোগ', en: 'Contact' } },
  ],
  cta: { label: { bn: 'ফ্রি ডেমো দেখুন', en: 'Get a free demo' } satisfies L },

  // ───────── হোম ─────────
  home: {
    hero: {
      eyebrow: { bn: 'দোকান-মালিকদের জন্য', en: 'Built for shop owners' },
      title: {
        bn: 'বাকি, কিস্তি আর হিসাবের ঝামেলা শেষ',
        en: 'Done with dues, instalments and messy books',
      },
      subtitle: {
        bn: 'ফ্রিজ, এসি, ইলেকট্রনিক্স ও হার্ডওয়্যার দোকানের জন্য বানানো — বিক্রি থেকে ব্যালেন্স শিট পর্যন্ত সব এক সিস্টেমে।',
        en: 'Made for appliance, electronics and hardware shops — from the sale to the balance sheet, in one system.',
      },
      primaryCta: { bn: 'ফ্রি ডেমো দেখুন', en: 'Get a free demo' },
      secondaryCta: { bn: 'সব ফিচার দেখুন', en: 'See all features' },
      // স্ক্রিনশট: /public/shots/dashboard.png (§৯ দেখুন)
      image: '/shots/dashboard.png',
    },
    // সংখ্যা বানিয়ে লিখবেন না — যা সত্যি, শুধু তাই
    highlights: [
      { value: '৮+', label: { bn: 'রিপোর্ট', en: 'reports' } },
      { value: '২', label: { bn: 'ভাষা: বাংলা ও ইংরেজি', en: 'languages: Bangla & English' } },
      { value: '১০০%', label: { bn: 'লেনদেনে "কে করেছে" লেখা', en: 'of transactions record who did it' } },
      { value: 'প্রতিদিন', label: { bn: 'অটো ব্যাকআপ', en: 'automatic backups, daily' } },
    ],
    problems: {
      title: { bn: 'চেনা সমস্যাগুলো?', en: 'Sound familiar?' },
      items: [
        { bn: 'কার কাছে কত বাকি, খাতা খুঁজে বের করতে হয়', en: 'Finding who owes what means digging through notebooks' },
        { bn: 'কিস্তির তারিখ ভুলে যাওয়া, টাকা আটকে থাকা', en: 'Missed instalment dates, money stuck outside' },
        { bn: 'স্টকে কত আছে আর খাতায় কত — মেলে না', en: 'Stock on the shelf never matches the register' },
        { bn: 'কর্মী কী বদলাল, কেউ জানে না', en: 'No idea what staff changed, or when' },
        { bn: 'মাস শেষে লাভ-ক্ষতি বের করতে সপ্তাহ লাগে', en: 'Month-end profit takes a week to work out' },
      ],
    },
    solutions: [
      {
        icon: 'receipt',
        title: { bn: 'দ্রুত বিক্রি', en: 'Fast selling' },
        body: { bn: 'কীবোর্ড শর্টকাটে মিনিটে ইনভয়েস, একাধিক পেমেন্ট, WhatsApp-এ ইনভয়েস।', en: 'Invoice in a minute with shortcuts, split payments, send it on WhatsApp.' },
      },
      {
        icon: 'calendar-clock',
        title: { bn: 'কিস্তি ও বাকি', en: 'Instalments & dues' },
        body: { bn: 'কিস্তির সময়সূচি, ওভারডিউ নিজে চিহ্নিত, ক্রেতার পুরো লেজার।', en: 'Instalment schedules, automatic overdue marking, a full ledger per customer.' },
      },
      {
        icon: 'shield-check',
        title: { bn: 'ওয়ারেন্টি ও সার্ভিস', en: 'Warranty & service' },
        body: { bn: 'সিরিয়াল নম্বর, সার্ভিস-প্ল্যান, ওয়ারেন্টি ক্লেইম — সব বিক্রির সাথে বাঁধা।', en: 'Serial numbers, service plans and warranty claims — all tied to the sale.' },
      },
      {
        icon: 'scale',
        title: { bn: 'আসল হিসাবরক্ষণ', en: 'Real accounting' },
        body: { bn: 'ডাবল-এন্ট্রি জার্নাল, ব্যালেন্স শিট, ট্রায়াল ব্যালেন্স, ক্যাশ ফ্লো।', en: 'Double-entry journals, balance sheet, trial balance and cash flow.' },
      },
      {
        icon: 'eye',
        title: { bn: 'পূর্ণ স্বচ্ছতা', en: 'Full transparency' },
        body: { bn: 'কে কখন কী বদলাল — পুরনো মান → নতুন মান সহ Activity Log।', en: 'Who changed what and when — with old → new values in the Activity Log.' },
      },
      {
        icon: 'database-backup',
        title: { bn: 'নিরাপদ ডাটা', en: 'Safe data' },
        body: { bn: 'প্রতিদিন অটো ব্যাকআপ, রোল-ভিত্তিক অনুমতি, কিছু মোছা যায় না — রিভার্স হয়।', en: 'Daily automatic backups, role-based permissions, nothing is deleted — it is reversed.' },
      },
    ],
    howItWorks: {
      title: { bn: 'শুরু করা কত সহজ', en: 'Getting started is simple' },
      steps: [
        { title: { bn: 'ডেমো দেখুন', en: 'See a demo' }, body: { bn: 'আমরা আপনার ব্যবসার ধরন বুঝে সিস্টেম দেখাই।', en: 'We walk you through the system for your kind of business.' } },
        { title: { bn: 'সেটআপ ও ডাটা তোলা', en: 'Setup & data import' }, body: { bn: 'পণ্য, কন্টাক্ট ও আগের হিসাব ফাইল থেকে তুলে দিই।', en: 'We bring in your products, contacts and opening balances from files.' } },
        { title: { bn: 'আপনার দল শুরু করে', en: 'Your team goes live' }, body: { bn: 'রোল ঠিক করে কর্মীদের দিয়ে চালু — আমরা পাশে থাকি।', en: 'Set roles, start with your staff — we stay alongside you.' } },
      ],
    },
    finalCta: {
      title: { bn: 'আপনার দোকানের জন্য কেমন হবে, নিজের চোখে দেখুন', en: 'See how it fits your shop' },
      body: { bn: 'ফ্রি ডেমোতে আপনার ব্যবসার ঘটনা দিয়েই সিস্টেম দেখাব।', en: 'In a free demo we use your own scenarios.' },
    },
  },

  // ───────── ফিচার পেজ ─────────
  // শ্রেণি অনুযায়ী; ডিটেইল §৪ থেকে। flag: 'optional' = মডিউল চালু করলে
  featureGroups: [
    {
      id: 'sales',
      title: { bn: 'বিক্রি', en: 'Sales' },
      lead: { bn: 'কাউন্টারে দ্রুত, হিসাবে নির্ভুল।', en: 'Quick at the counter, exact in the books.' },
      items: [
        { bn: 'কীবোর্ড-ফ্রেন্ডলি বিক্রি স্ক্রিন (F2 সার্চ, F4 পেমেন্ট, Enter কনফার্ম)', en: 'Keyboard-friendly sale screen (F2 search, F4 payment, Enter to confirm)' },
        { bn: 'ড্রাফট ও কোটেশন, পরে কনফার্ম', en: 'Drafts and quotations, confirm later' },
        { bn: 'একাধিক অ্যাকাউন্টে ভাগ করে পেমেন্ট', en: 'Split a payment across several accounts' },
        { bn: 'ক্রেতার আগের বাকি/অগ্রিম বিক্রির সময়েই দেখা', en: "See the customer's previous due/advance while selling" },
        { bn: 'আগে কেনা পণ্য এক ক্লিকে আবার যোগ', en: 'Re-add past purchases in one click' },
        { bn: 'ইনভয়েস PDF (সাধারণ ও থার্মাল) ও WhatsApp-এ পাঠানো', en: 'Invoice PDF (standard & thermal) and sharing on WhatsApp' },
        { bn: 'সেলস অর্ডার (অগ্রিম বুকিং) ও সেল রিটার্ন', en: 'Sales orders (advance booking) and sale returns' },
      ],
    },
    {
      id: 'emi',
      optional: true,
      title: { bn: 'কিস্তি (EMI)', en: 'EMI' },
      lead: { bn: 'কিস্তিতে বিক্রি আর আদায়, এক জায়গায়।', en: 'Sell on instalments and collect them from one place.' },
      items: [
        { bn: 'বিক্রির সময়েই কিস্তি-সংখ্যা ঠিক', en: 'Choose the number of instalments while selling' },
        { bn: 'কিস্তির সময়সূচি ও কত পরিশোধ হলো', en: 'Instalment schedule and how much is paid' },
        { bn: 'ওভারডিউ নিজে থেকে চিহ্নিত', en: 'Overdue instalments marked automatically' },
      ],
    },
    {
      id: 'stock',
      title: { bn: 'পণ্য ও স্টক', en: 'Products & stock' },
      lead: { bn: 'স্টকের প্রতিটা বাড়া-কমার ইতিহাস।', en: 'A history for every stock movement.' },
      items: [
        { bn: 'ক্যাটাগরি, ব্র্যান্ড, ইউনিট ও পণ্যের ছবি', en: 'Categories, brands, units and product photos' },
        { bn: 'লো-স্টক ও স্টক-আউট সতর্কতা', en: 'Low-stock and out-of-stock alerts' },
        { bn: 'গড় ক্রয়মূল্য ও মুনাফার হার', en: 'Average cost and profit margin' },
        { bn: 'সিরিয়াল নম্বর ট্র্যাকিং (চালু করলে)', en: 'Serial-number tracking (when enabled)' },
        { bn: 'ইনস্টলেশনের মতো নন-স্টক সেবা', en: 'Non-stock services such as installation' },
        { bn: 'ওপেনিং স্টক ও ভুল-সংশোধন আলাদা', en: 'Opening stock and corrections kept separate' },
      ],
    },
    {
      id: 'purchase-contacts',
      title: { bn: 'ক্রয় ও কন্টাক্ট', en: 'Purchasing & contacts' },
      lead: { bn: 'কে কার কাছে কত পায়, সবসময় পরিষ্কার।', en: 'Always clear who owes whom.' },
      items: [
        { bn: 'সাপ্লায়ার থেকে ক্রয় ও ক্রয় রিটার্ন', en: 'Purchases from suppliers and purchase returns' },
        { bn: 'ক্রেতা/সাপ্লায়ারের নিজস্ব লেজার, তারিখ ধরে দেখা', en: 'Per-contact ledger, viewable by date range' },
        { bn: 'কাস্টমার গ্রুপ', en: 'Customer groups' },
        { bn: 'বিল গ্রহণ, পরিশোধ ও ডিসকাউন্ট (মওকুফ)', en: 'Receive and pay bills, and waive dues' },
      ],
    },
    {
      id: 'money',
      title: { bn: 'টাকা, খরচ ও মূলধন', en: 'Money, expenses & capital' },
      lead: { bn: 'প্রতিটা টাকা কোন অ্যাকাউন্টে, জানা থাকে।', en: 'Always know which account holds every taka.' },
      items: [
        { bn: 'ক্যাশ, ব্যাংক, মোবাইল ব্যাংকিং — আলাদা ব্যালেন্স ও ফান্ড ট্রান্সফার', en: 'Cash, bank, mobile banking — separate balances and fund transfers' },
        { bn: 'খরচ ও অন্যান্য আয়', en: 'Expenses and other income' },
        { bn: 'স্টাফের বেতন ও অগ্রিম', en: 'Staff salary and advances' },
        { bn: 'অ্যাসেট, দেনা, ইনভেস্টর ও কোম্পানি লোন', en: 'Assets, liabilities, investors and company loans' },
      ],
    },
    {
      id: 'accounting',
      title: { bn: 'হিসাবরক্ষণ ও রিপোর্ট', en: 'Accounting & reports' },
      lead: { bn: 'হিসাবরক্ষকের মতো নির্ভুল, মালিকের মতো সহজ।', en: 'Accurate like an accountant, simple like an owner needs.' },
      items: [
        { bn: 'ডাবল-এন্ট্রি: প্রতিটা লেনদেন নিজে জার্নালে', en: 'Double-entry: every transaction posts a journal by itself' },
        { bn: 'চার্ট অব অ্যাকাউন্টস, জেনারেল লেজার, অ্যাকাউন্টিং পিরিয়ড', en: 'Chart of accounts, general ledger, accounting periods' },
        { bn: 'লাভ-ক্ষতি, ব্যালেন্স শিট, ক্যাশ ফ্লো, ট্রায়াল ব্যালেন্স', en: 'Profit & loss, balance sheet, cash flow, trial balance' },
        { bn: 'স্টক, বাকি ও বেস্ট-সেলার রিপোর্ট', en: 'Stock, dues and best-seller reports' },
        { bn: 'CSV / Excel / PDF এক্সপোর্ট', en: 'CSV / Excel / PDF export' },
        { bn: 'প্রতিদিন রাতে স্বয়ংক্রিয় হিসাব-মেলানো', en: 'A nightly automatic consistency check' },
      ],
    },
    {
      id: 'service',
      title: { bn: 'ওয়ারেন্টি ও সার্ভিস', en: 'Warranty & service' },
      lead: { bn: 'বিক্রির পরের দায়িত্বও সাজানো।', en: 'After-sale care, organised.' },
      items: [
        { bn: 'পণ্যে ওয়ারেন্টি মাস ও সার্ভিস-প্ল্যান', en: 'Warranty months and service plans per product' },
        { bn: 'ইনস্টলেশন ও সার্ভিস রিকোয়েস্ট (ফ্রি কোটা বা চার্জ)', en: 'Installation and service requests (free quota or charged)' },
        { bn: 'ওয়ারেন্টি ক্লেইম ও অবস্থা ট্র্যাকিং', en: 'Warranty claims with status tracking' },
      ],
    },
    {
      id: 'control',
      title: { bn: 'নিরাপত্তা ও নিয়ন্ত্রণ', en: 'Security & control' },
      lead: { bn: 'আপনার ডাটা, আপনার নিয়ন্ত্রণে।', en: 'Your data, under your control.' },
      items: [
        { bn: 'ইউজার ও রোল, মডিউল ধরে অনুমতি', en: 'Users and roles with per-module permissions' },
        { bn: 'Activity Log — পুরনো → নতুন মান সহ', en: 'Activity Log — with old → new values' },
        { bn: 'প্রতিটা লেনদেনে কর্মীর নাম', en: "The staff member's name on every transaction" },
        { bn: 'প্রতিদিন অটো ব্যাকআপ', en: 'Automatic daily backups' },
        { bn: 'আগের ডাটা ফাইল থেকে ইমপোর্ট', en: 'Import existing data from files' },
      ],
    },
    {
      id: 'comfort',
      title: { bn: 'প্রতিদিনের আরাম', en: 'Everyday comfort' },
      lead: { bn: 'যাতে কর্মীরা নিজে থেকেই শিখে নেয়।', en: 'So your staff pick it up on their own.' },
      items: [
        { bn: 'বাংলা ও ইংরেজি, ডার্ক মোড, থিম রঙ', en: 'Bangla & English, dark mode, theme colours' },
        { bn: 'Ctrl+Space কুইক অ্যাকশন, Ctrl+K গ্লোবাল সার্চ', en: 'Ctrl+Space quick actions, Ctrl+K global search' },
        { bn: 'আপনার লোগো ও ফেভিকন, নিজের মতো মেনু-ক্রম', en: 'Your logo and favicon, menu ordered your way' },
        { bn: 'মোবাইলে গ্রিড ভিউ, ডেস্কটপে টেবিল', en: 'Grid view on mobile, table on desktop' },
        { bn: 'ড্যাশবোর্ড: বিক্রি, বাকি, লো-স্টক ও চার্ট এক নজরে', en: 'Dashboard: sales, dues, low stock and charts at a glance' },
      ],
    },
  ],

  // ───────── মডিউল পেজ (সাইডবারের মতো সাজানো; ছোট কার্ড) ─────────
  modules: [
    { id: 'dashboard', name: { bn: 'ড্যাশবোর্ড', en: 'Dashboard' }, blurb: { bn: 'ব্যবসার আজকের অবস্থা এক পাতায়।', en: "Today's business on one page." } },
    { id: 'sales', name: { bn: 'বিক্রি', en: 'Sales' }, blurb: { bn: 'ইনভয়েস, ড্রাফট, কোটেশন, অর্ডার, রিটার্ন।', en: 'Invoices, drafts, quotations, orders, returns.' } },
    { id: 'products', name: { bn: 'পণ্য', en: 'Products' }, blurb: { bn: 'পণ্য, স্টক, ক্যাটাগরি, ব্র্যান্ড, ইউনিট।', en: 'Products, stock, categories, brands, units.' } },
    { id: 'contacts', name: { bn: 'কন্টাক্ট', en: 'Contacts' }, blurb: { bn: 'ক্রেতা, সাপ্লায়ার, গ্রুপ ও লেজার।', en: 'Customers, suppliers, groups and ledgers.' } },
    { id: 'purchases', name: { bn: 'ক্রয়', en: 'Purchases' }, blurb: { bn: 'সাপ্লায়ার থেকে কেনা ও রিটার্ন।', en: 'Buying from suppliers, and returns.' } },
    { id: 'bills', name: { bn: 'বিল', en: 'Bills' }, blurb: { bn: 'বাকি আদায়, পরিশোধ, ডিসকাউন্ট।', en: 'Collect dues, pay bills, waive.' } },
    { id: 'expenses', name: { bn: 'খরচ ও আয়', en: 'Expenses & income' }, blurb: { bn: 'দোকানের খরচ ও ছোট আয়।', en: 'Shop expenses and small income.' } },
    { id: 'accounts', name: { bn: 'পেমেন্ট অ্যাকাউন্ট', en: 'Payment accounts' }, blurb: { bn: 'ক্যাশ, ব্যাংক, মোবাইল ব্যাংকিং ও ট্রান্সফার।', en: 'Cash, bank, mobile banking and transfers.' } },
    { id: 'accounting', name: { bn: 'হিসাবরক্ষণ', en: 'Accounting' }, blurb: { bn: 'চার্ট অব অ্যাকাউন্টস, জার্নাল, পিরিয়ড।', en: 'Chart of accounts, journals, periods.' } },
    { id: 'assets', name: { bn: 'অ্যাসেট ও দেনা', en: 'Assets & liabilities' }, blurb: { bn: 'দোকানের সম্পদ ও অন্যান্য দেনা।', en: "The shop's assets and other liabilities." } },
    { id: 'investors', name: { bn: 'ইনভেস্টর ও লোন', en: 'Investors & loans' }, blurb: { bn: 'মূলধন ও কোম্পানি লোন।', en: 'Capital and company loans.' } },
    { id: 'staff', name: { bn: 'স্টাফ', en: 'Staff' }, blurb: { bn: 'বেতন ও অগ্রিম।', en: 'Salary and advances.' } },
    { id: 'service', name: { bn: 'ওয়ারেন্টি ও সার্ভিস', en: 'Warranty & service' }, blurb: { bn: 'সার্ভিস রিকোয়েস্ট ও ওয়ারেন্টি ক্লেইম।', en: 'Service requests and warranty claims.' } },
    { id: 'reports', name: { bn: 'রিপোর্ট', en: 'Reports' }, blurb: { bn: 'লাভ-ক্ষতি, ব্যালেন্স শিট, ক্যাশ ফ্লো ও আরও।', en: 'P&L, balance sheet, cash flow and more.' } },
    { id: 'admin', name: { bn: 'অ্যাডমিন', en: 'Admin' }, blurb: { bn: 'ইউজার, রোল, ব্যাকআপ, ইমপোর্ট, Activity Log, সেটিংস।', en: 'Users, roles, backups, import, Activity Log, settings.' } },
  ],

  // ───────── FAQ ─────────
  faq: [
    {
      q: { bn: 'Sahos POS কী ধরনের দোকানের জন্য?', en: 'What kind of shops is Sahos POS for?' },
      a: { bn: 'মূলত হোম অ্যাপ্লায়েন্স (ফ্রিজ, এসি, টিভি), ইলেকট্রনিক্স ও হার্ডওয়্যার/স্যানিটারি দোকানের জন্য — যেখানে কিস্তি, বাকি, ওয়ারেন্টি ও সিরিয়াল নম্বর গুরুত্বপূর্ণ। অন্য ধরনের খুচরা দোকানেও চলে।', en: 'Mainly home-appliance, electronics and hardware/sanitary shops where instalments, dues, warranty and serial numbers matter. It also works for other retail.' },
    },
    {
      q: { bn: 'কিস্তিতে বিক্রি কীভাবে চলে?', en: 'How do instalment sales work?' },
      a: { bn: 'EMI মডিউল চালু থাকলে বিক্রির সময়েই কিস্তি-সংখ্যা বেছে নিন। সিস্টেম কিস্তির সময়সূচি বানায়, ওভারডিউ নিজে চিহ্নিত করে, আর আপনি কিস্তির টাকা নিয়ে কোন অ্যাকাউন্টে গেল তা লেখেন।', en: 'With the EMI module on, choose the number of instalments while selling. The system builds the schedule, marks overdue ones automatically, and you record each payment against an account.' },
    },
    {
      q: { bn: 'ওয়ারেন্টি ও সার্ভিস কীভাবে সামলায়?', en: 'How does it handle warranty and service?' },
      a: { bn: 'পণ্যে ওয়ারেন্টি মাস ও সার্ভিস-প্ল্যান ঠিক করা যায়। বিক্রিত আইটেম খুঁজে ওয়ারেন্টি ক্লেইম খোলা যায় এবং ইনস্টলেশন/সার্ভিস রিকোয়েস্টে ফ্রি কোটা বা চার্জ রাখা যায়।', en: 'Set warranty months and a service plan per product. Open a claim by finding the sold item, and log installation/service requests as free-quota or charged.' },
    },
    {
      q: { bn: 'আমার ডাটা কি নিরাপদ? ব্যাকআপ হয়?', en: 'Is my data safe? Are there backups?' },
      a: { bn: 'প্রতিদিন স্বয়ংক্রিয় ব্যাকআপ হয় এবং পুরনোগুলো নিয়ম মেনে পরিষ্কার হয়। কে কী করতে পারবে তা রোল দিয়ে ঠিক করা যায়, আর Activity Log-এ প্রতিটা পরিবর্তন লেখা থাকে।', en: 'Automatic daily backups run and old ones are tidied by policy. Roles control who can do what, and the Activity Log records every change.' },
    },
    {
      q: { bn: 'কর্মী ভুল করলে বা কিছু বদলালে ধরব কীভাবে?', en: 'How do I catch a staff mistake or change?' },
      a: { bn: 'প্রতিটা বিক্রি, ক্রয়, খরচ ও ট্রান্সফারে কর্মীর নাম থাকে। Activity Log-এ কে, কখন, কোন রেকর্ড কী মানে থেকে কী মানে বদলাল তা দেখা যায়, ব্যবহারকারী/তারিখ দিয়ে ফিল্টার করেও।', en: 'Every sale, purchase, expense and transfer carries the staff name. The Activity Log shows who changed which record from what to what, filterable by user and date.' },
    },
    {
      q: { bn: 'ভুল এন্ট্রি হলে কী করব? মোছা যায়?', en: 'What if I make a wrong entry? Can I delete it?' },
      a: { bn: 'আর্থিক লেনদেন মোছা হয় না — ব্যাংকের মতো "রিভার্স" করা হয়, ফলে মূল রেকর্ড ও সংশোধন দুটোই ইতিহাসে থাকে। এতে হিসাব কখনো ভেঙে যায় না।', en: 'Financial transactions are not deleted — they are reversed, like a bank. Both the original and the correction stay in history, so your books never break.' },
    },
    {
      q: { bn: 'বাংলা ও ইংরেজি দুটোতেই চলে?', en: 'Does it work in both Bangla and English?' },
      a: { bn: 'হ্যাঁ। যেকোনো সময় ভাষা বদলানো যায়। ডার্ক মোড ও থিম রঙও আছে।', en: 'Yes. You can switch language any time. Dark mode and theme colours are included.' },
    },
    {
      q: { bn: 'মোবাইলে চলবে?', en: 'Does it work on mobile?' },
      a: { bn: 'হ্যাঁ, ব্রাউজারে মোবাইল, ট্যাব ও কম্পিউটারে চলে। মোবাইলে তালিকাগুলো কার্ড (গ্রিড) আকারে দেখা যায়।', en: 'Yes, in a browser on phone, tablet and computer. On mobile, lists appear as cards.' },
    },
    {
      q: { bn: 'ইনভয়েস প্রিন্ট ও থার্মাল প্রিন্টার?', en: 'Invoice printing and thermal printers?' },
      a: { bn: 'ইনভয়েস PDF হয় এবং থার্মাল প্রিন্টার লেআউট চালু করা যায়। কোন তথ্য ছাপা হবে (লোগো, ঠিকানা, শর্তাবলি, ফুটার ইত্যাদি) নিজে ঠিক করা যায়, সাথে লাইভ প্রিভিউ।', en: 'Invoices export as PDF and a thermal-printer layout can be enabled. Choose what prints (logo, address, terms, footer…) with a live preview.' },
    },
    {
      q: { bn: 'আমার আগের খাতার ডাটা তোলা যাবে?', en: 'Can I bring in my existing data?' },
      a: { bn: 'হ্যাঁ, ইমপোর্ট টুলে ফাইল থেকে ডাটা তোলা যায়। শুরুতে আমরা এ কাজে সাহায্য করি। আগের বাকি/ব্যালেন্স ওপেনিং ব্যালেন্স হিসেবে বসে।', en: 'Yes — the import tool brings data in from files, and we help with the first load. Past balances go in as opening balances.' },
    },
    {
      q: { bn: 'একাধিক কর্মী একসাথে কাজ করতে পারে? অনুমতি কীভাবে?', en: 'Can several staff work at once? How are permissions set?' },
      a: { bn: 'পারে। Admin, Manager, Cashier, Staff — এই ডিফল্ট রোল আছে, আর নিজের মতো রোল বানিয়ে মডিউল ধরে দেখা/তৈরি/এডিট/মোছার অনুমতি দেওয়া যায়।', en: 'Yes. Admin, Manager, Cashier and Staff roles come built-in, and you can create your own with per-module view/create/edit/delete permissions.' },
    },
    {
      q: { bn: 'কী কী রিপোর্ট পাব?', en: 'Which reports do I get?' },
      a: { bn: 'লাভ-ক্ষতি, ব্যালেন্স শিট, ক্যাশ ফ্লো, ট্রায়াল ব্যালেন্স, ফাইন্যান্সিয়াল পজিশন, স্টক, বাকি ও বেস্ট-সেলার পণ্য। প্রতিটা তালিকা CSV/Excel/PDF-এ নামানো যায়।', en: 'Profit & loss, balance sheet, cash flow, trial balance, financial position, stock, dues and best sellers. Lists export to CSV/Excel/PDF.' },
    },
    {
      q: { bn: 'ইন্টারনেট ছাড়া চলবে?', en: 'Does it work offline?' },
      a: { bn: '{{যাচাই করুন — নিচের নোট দেখুন}}', en: '{{Verify — see note below}}' },
      note: 'অ্যাপটা ওয়েব-ভিত্তিক; আপনি কোথায় হোস্ট করে দিচ্ছেন (দোকানের লোকাল সার্ভার নাকি ক্লাউড) তার ওপর নির্ভর করে। নিজে ঠিক করে উত্তর লিখুন — আন্দাজে "হ্যাঁ" লিখবেন না।',
    },
    {
      q: { bn: 'দাম কত? সাপোর্ট কেমন?', en: 'What does it cost? What about support?' },
      a: { bn: '{{আপনার প্যাকেজ/কোটেশন নীতি}} — ডেমোর পর আপনার দোকানের প্রয়োজন অনুযায়ী কোটেশন দিই।', en: '{{Your pricing/quote policy}} — after the demo we quote for your shop’s needs.' },
      note: 'দাম/সাপোর্ট আমি জানি না — আপনাকেই লিখতে হবে।',
    },
  ],

  // ───────── যোগাযোগ পেজ ─────────
  contactPage: {
    title: { bn: 'যোগাযোগ করুন', en: 'Get in touch' },
    lead: { bn: 'ডেমো, কোটেশন বা যেকোনো প্রশ্নে — আমরা দ্রুত উত্তর দিই।', en: 'For a demo, a quote or any question — we reply quickly.' },
    methods: ['whatsapp', 'phone', 'email'] as const, // ক্রম = বাটনের ক্রম
    // ফর্ম থাকলে (ঐচ্ছিক — §৮): কোন ফিল্ড
    form: {
      fields: [
        { name: 'name', label: { bn: 'আপনার নাম', en: 'Your name' }, required: true },
        { name: 'phone', label: { bn: 'ফোন নম্বর', en: 'Phone' }, required: true },
        { name: 'shop', label: { bn: 'দোকানের ধরন (যেমন: ফ্রিজ-এসি)', en: 'Type of shop' }, required: false },
        { name: 'message', label: { bn: 'কী জানতে চান', en: 'What would you like to know' }, required: false },
      ],
      submit: { bn: 'পাঠান', en: 'Send' },
      success: { bn: 'ধন্যবাদ! আমরা শিগগিরই যোগাযোগ করব।', en: 'Thank you! We will contact you soon.' },
    },
  },

  // ───────── SEO ─────────
  seo: {
    titleTemplate: '%s | Sahos POS',
    defaultTitle: { bn: 'Sahos POS — দোকানের POS ও হিসাব সফটওয়্যার', en: 'Sahos POS — POS & accounting software for shops' },
    keywords: {
      bn: ['পিওএস সফটওয়্যার', 'দোকানের হিসাব সফটওয়্যার', 'কিস্তি ব্যবস্থাপনা', 'ইনভেন্টরি সফটওয়্যার বাংলাদেশ', 'অ্যাপ্লায়েন্স দোকানের সফটওয়্যার'],
      en: ['POS software Bangladesh', 'shop accounting software', 'EMI management', 'inventory software', 'appliance shop software'],
    },
  },
} as const;
```

---

## ৬. সাইট ম্যাপ ও পেজ-ভিত্তিক স্পেক

| রুট | লক্ষ্য | সেকশন (ওপর থেকে নিচে) |
|---|---|---|
| `/` হোম | প্রথম ৫ সেকেন্ডে বোঝানো ও ডেমোতে আনা | Hero (হেডলাইন + দুই বাটন + ড্যাশবোর্ড স্ক্রিনশট) → হাইলাইট সংখ্যা → সমস্যা তালিকা → ৬টা সমাধান-কার্ড → "শুরু করা কত সহজ" (৩ ধাপ) → মডিউলের ছোট ঝলক → FAQ-এর ৩-৪টা → শেষ CTA |
| `/features` | বিস্তারিত ফিচার | `featureGroups` গ্রুপ অনুযায়ী; প্রতি গ্রুপে শিরোনাম + `lead` + বুলেট; পাশে ২-১টা স্ক্রিনশট; `optional` গ্রুপে "মডিউল চালু করলে" ব্যাজ |
| `/modules` | অ্যাপের পরিসর বোঝানো | `modules`-এর কার্ড-গ্রিড (আইকনসহ), ক্লিক করলে `/features#<id>` |
| `/faq` | আপত্তি দূর করা | অ্যাকর্ডিয়ন; নিচে "উত্তর পাননি?" → যোগাযোগ; **FAQPage JSON-LD** (SEO) |
| `/contact` | লিড ধরা | WhatsApp বড় বাটন (সবচেয়ে বেশি কাজের) → ফোন → ইমেইল → ঠিকানা/সময় → ঐচ্ছিক ফর্ম |
| `/privacy`, `/terms` | বিশ্বাস | ছোট স্ট্যাটিক টেক্সট (আপনি লিখবেন; টেমপ্লেট নিলেও চলবে) |
| `/404` | | বাংলা বার্তা + হোমে ফেরা |

**প্রতিটা পেজের নিচে একই CTA ব্যান্ড** ("ফ্রি ডেমো দেখুন" + WhatsApp)। হেডারে CTA বাটন স্টিকি।

**ঐচ্ছিক পরে:** `/pricing` ("প্যাকেজ" না থাকলে "কোটেশন নিন" একটা পেজ), `/blog` (SEO-র জন্য: "কিস্তি ব্যবস্থাপনার ৫ ভুল" ধরনের লেখা — আলাদা `content/posts/*.mdx`, এখনো ডাটাবেস লাগবে না)।

---

## ৭. Next.js কাঠামো (প্রস্তাবিত)

```
sahos-pos-site/
├─ app/
│  ├─ [lang]/                  # 'bn' | 'en'
│  │  ├─ layout.tsx            # <html lang>, হেডার/ফুটার, ফন্ট
│  │  ├─ page.tsx              # হোম
│  │  ├─ features/page.tsx
│  │  ├─ modules/page.tsx
│  │  ├─ faq/page.tsx
│  │  ├─ contact/page.tsx
│  │  ├─ privacy/page.tsx
│  │  └─ terms/page.tsx
│  ├─ sitemap.ts               # দুই ভাষার সব রুট
│  ├─ robots.ts
│  └─ opengraph-image.tsx      # ব্র্যান্ড OG ইমেজ
├─ components/                 # Hero, FeatureGroup, ModuleCard, Faq, ContactActions, CtaBand…
├─ content/site.ts             # §৫ — সব লেখা
├─ lib/i18n.ts                 # pick(L, lang), হ্যাশ ডিফল্ট ভাষা 'bn'
├─ public/shots/               # স্ক্রিনশট (§৯)
└─ middleware.ts               # `/` → `/bn` (ঐচ্ছিক: ব্রাউজার ভাষা দেখে)
```

- `generateStaticParams()` দিয়ে `bn`/`en` দুটোই বিল্ডে তৈরি → পুরো সাইট স্ট্যাটিক, Vercel-এ ফ্রি প্ল্যানেও দ্রুত।
- ভাষা-পিকার: ছোট `L → string` হেল্পার (`pick(obj, lang)`); কোনো i18n লাইব্রেরি লাগে না, কনটেন্ট ফাইলেই আছে।
- `<link rel="alternate" hreflang>` দুই ভাষার জন্য।
- UI কনস্ট্যান্ট (বাটন লেখা ইত্যাদি) ও `content/site.ts`-এই রাখুন।

**ডিপ্লয়:** GitHub-এ পুশ → Vercel-এ "Import Project" → ফ্রেমওয়ার্ক অটো-ডিটেক্ট → Environment Variable: `NEXT_PUBLIC_SITE_URL`। কাস্টম ডোমেইন Vercel Settings → Domains থেকে।

---

## ৮. যোগাযোগ কীভাবে চলবে (ডাটাবেস ছাড়া)

অগ্রাধিকার ক্রমে:

1. **WhatsApp ক্লিক-টু-চ্যাট** (সবচেয়ে কার্যকর — বাংলাদেশের দোকান-মালিকরা এটাই ব্যবহার করেন):
   `https://wa.me/<contact.whatsapp>?text=<encodeURIComponent(whatsappPrefill[lang])>`
2. **`tel:`** লিংক (মোবাইলে সরাসরি কল), **`mailto:`** লিংক।
3. **ঐচ্ছিক ফর্ম** (সার্ভার/DB না বানিয়ে): Web3Forms / Formspree / Getform-এর মতো সেবা — ফর্ম তাদের URL-এ POST করে, তারা আপনার ইমেইলে পাঠায়। `fetch` ক্লায়েন্ট-সাইডে; কোনো API রুট লাগে না। স্প্যাম ঠেকাতে সেবাটির honeypot/reCAPTCHA চালু রাখুন।

কোনো ফর্মের ডাটা নিজে সংরক্ষণ করবেন না → প্রাইভেসি পেজে লিখুন "আমরা ফর্মের তথ্য শুধু আপনার সাথে যোগাযোগের জন্য ব্যবহার করি"।

---

## ৯. স্ক্রিনশট পরিকল্পনা (সাইটের সবচেয়ে বড় বিক্রয়-হাতিয়ার)

প্রজেক্টে ডেমো ডাটা বানানোর সিডার আছে: `php artisan db:seed --class=DummyDataSeeder` (এবং `HomeApplianceProductSeeder` — ফ্রিজ/এসির মতো পণ্য)। **আলাদা একটা ডেমো ডাটাবেসে চালিয়ে** স্ক্রিনশট নিন (আসল দোকানের ডাটা নয়)।

| ফাইলের নাম | কোন পেজ | কোথায় ব্যবহার |
|---|---|---|
| `dashboard.png` | `/dashboard` (মাসের রেঞ্জ) | হোম Hero |
| `sale-form.png` | `/sales/create` (৩-৪টা আইটেম, পেমেন্ট ভাগ করা) | দ্রুত বিক্রি |
| `invoice-pdf.png` | বিক্রির ইনভয়েস PDF | বিক্রি, প্রিন্ট |
| `emi.png` | `/emi-installments` | কিস্তি |
| `product-list.png` | `/products` (লো-স্টক ব্যাজসহ) | পণ্য ও স্টক |
| `contact-ledger.png` | কোনো ক্রেতার ledger ট্যাব | বাকি/লেজার |
| `balance-sheet.png` | `/reports/balance-sheet` | হিসাবরক্ষণ |
| `profit-loss.png` | `/reports/profit-loss` | রিপোর্ট |
| `warranty.png` | `/warranty-claims` | ওয়ারেন্টি |
| `activity-log.png` | `/activity-log` (আপডেট এন্ট্রিসহ) | নিয়ন্ত্রণ |
| `quick-actions.png` | `Ctrl+Space` খোলা অবস্থায় | প্রতিদিনের আরাম |
| `mobile-grid.png` | মোবাইল প্রস্থে পণ্যের গ্রিড | মোবাইল |
| `dark.png` | ডার্ক মোডে ড্যাশবোর্ড | থিম |

নির্দেশ: ১৪৪০px প্রস্থে নিন, `next/image`-এ `width/height` ও `alt` (বাংলা) দিন; WebP-তে কনভার্ট; ফোনের মতো ফ্রেমে বসানোর দরকার নেই — ব্রাউজার-ফ্রেম মোকআপ যথেষ্ট। ব্যক্তিগত তথ্য (আসল নাম/ফোন) ডেমো ডাটায় রাখবেন না।

---

## ১০. ডিজাইন নির্দেশনা

- **ফন্ট:** বাংলার জন্য `Hind Siliguri` বা `Noto Sans Bengali` (Google Fonts, `next/font`); ইংরেজির জন্য `Inter`। দুটো একসাথে লোড করে `lang` ধরে বদলান।
- **রং:** অ্যাপের সাথে মিল রাখতে নিউট্রাল (সাদা/কালো/ধূসর) বেসের ওপর **একটা অ্যাকসেন্ট** (অ্যাপের ডিফল্ট থিম-রং ধরে নিতে পারেন, বা ব্র্যান্ডের নিজের)। ডার্ক মোড সাপোর্ট (অ্যাপেও আছে, দেখাতে ভালো)।
- **সংখ্যা ও তারিখ:** বাংলা সংস্করণে সংখ্যা বাংলা অঙ্কে (`Intl.NumberFormat('bn-BD')`)।
- **বাংলা টাইপোগ্রাফি:** লাইন-হাইট বেশি (১.৭+), হেডলাইনে খুব ছোট ফন্ট নয়।
- **CTA:** প্রতি স্ক্রিনে একটাই প্রধান বাটন। রঙ একই, লেখা একই ("ফ্রি ডেমো দেখুন")।
- **মোবাইল-ফার্স্ট:** ট্রাফিকের বেশিরভাগ মোবাইল থেকে আসবে। হেডারে হ্যামবার্গার, নিচে স্টিকি "WhatsApp" বাটন।
- **অ্যাক্সেসিবিলিটি:** `alt`, ফোকাস রিং, কন্ট্রাস্ট ≥ 4.5:1, কীবোর্ডে অ্যাকর্ডিয়ন চলে।
- **পারফরম্যান্স লক্ষ্য:** Lighthouse ৯০+; ছবি `next/image` + `priority` শুধু Hero-তে; কোনো ভারি অ্যানিমেশন লাইব্রেরি নয়।

---

## ১১. SEO ও অ্যানালিটিক্স

- প্রতি পেজে `generateMetadata` — `title` (`seo.titleTemplate`), `description`, `alternates.languages`, `openGraph`, `twitter`।
- **JSON-LD:** `SoftwareApplication` (হোমে), `FAQPage` (`/faq`-এ), `Organization`।
- `sitemap.ts` ও `robots.ts` (দুই ভাষার সব URL)।
- **অ্যানালিটিক্স:** Vercel Analytics (এক লাইন) বা Plausible; কুকি-ব্যানার না লাগে এমন টুল বেছে নিন। মাপার মূল ঘটনা: "WhatsApp ক্লিক", "ফোন ক্লিক", "ফর্ম সাবমিট"।
- বাংলা কীওয়ার্ড কনটেন্টে স্বাভাবিকভাবে ব্যবহার করুন (`seo.keywords`); কিস্তি/বাকি/ওয়ারেন্টি নিয়ে ব্লগ দীর্ঘমেয়াদে সবচেয়ে বেশি লিড আনে।

---

## ১২. ⚠️ যা আপনাকে নিজে দিতে/ঠিক করতে হবে, আর যা দাবি করবেন না

### ক) যেগুলো আমি জানি না — আপনাকে দিতে হবে (কনটেন্ট ফাইলে `{{…}}` চিহ্নিত)
- ফোন/WhatsApp/ইমেইল/ঠিকানা/অফিস সময়, সামাজিক লিংক
- **দাম বা প্যাকেজ নীতি** (সাইটে আপাতত "কোটেশন নিন" রাখা নিরাপদ)
- সাপোর্ট কীভাবে (WhatsApp/ফোন/রিমোট), ট্রেনিং ও ডেটা-তোলায় কতটা সাহায্য
- **হোস্টিং মডেল:** ক্রেতার নিজস্ব সার্ভার, নাকি আপনি ক্লাউডে হোস্ট করে দেন? (ইন্টারনেট-ছাড়া চলার প্রশ্নের উত্তর এর ওপর নির্ভর করে)
- ডোমেইন নাম, লোগো (অ্যাপের ব্র্যান্ডিং থেকে নিতে পারেন), ব্র্যান্ড-রং
- গ্রাহক-প্রশংসা/কেস-স্টাডি — **থাকলে** সত্যিগুলো দিন; না থাকলে সেকশনটাই বাদ। বানিয়ে লিখবেন না।

### খ) যেগুলো আমি কোডে নিশ্চিত হইনি — সাইটে লেখার আগে অ্যাপে একবার দেখে নিন
- **বারকোড:** পণ্যে বারকোড *ফিল্ড* আছে; লেবেল প্রিন্ট/জেনারেটর আছে কিনা নিশ্চিত নই।
- পণ্যের স্পেক-শিট/ব্রোশিওর আপলোড (পুরনো ডিজাইন-ডকে ছিল; বর্তমান UI-তে পাইনি)।
- **কন্টাক্টদের নোটিফিকেশন পাঠানো** (SMS/WhatsApp/Email চ্যানেলের বাছাই ফর্মে আছে) — আসলে কীভাবে পাঠায় (সরাসরি SMS গেটওয়ে, নাকি শুধু WhatsApp লিংক) যাচাই করুন, তারপর "অটো SMS" টাইপ দাবি করুন।
- EMI ও সিরিয়াল-নম্বর **ঐচ্ছিক মডিউল** — সাইটে "চালু করলে" বলা আছে; ডিফল্টে বন্ধ ধরে নিন।

### গ) **দাবি করবেন না**
- অনলাইন পেমেন্ট গেটওয়ে/বিকাশ API সংযোগ (নেই — মোবাইল ব্যাংকিং শুধু একটা *অ্যাকাউন্ট* হিসেবে হিসাব রাখে)
- মাল্টি-ব্রাঞ্চ বা ক্লাউড-সিঙ্ক (এখন single-tenant, একটা দোকানের জন্য একটা ইনস্টল)
- অফলাইন মোড, মোবাইল অ্যাপ (Play Store/App Store) — এখন ওয়েব-ভিত্তিক
- ভ্যাট/NBR ইন্টিগ্রেশন, ই-কমার্স স্টোর
- বানানো সংখ্যা: "১০০০+ গ্রাহক", "৯৯.৯% আপটাইম" — প্রমাণ ছাড়া নয়
- "AI" শব্দ — অ্যাপে কোনো AI ফিচার নেই

---

## ১৩. কাজের ক্রম (পরামর্শ)

1. `content/site.ts` বসান ও `{{…}}` পূরণ করুন (§১২ক)
2. ডেমো ডাটায় স্ক্রিনশট নিন (§৯)
3. Next.js প্রজেক্ট: `npx create-next-app@latest` (TypeScript, Tailwind, App Router, ESLint)
4. লেআউট + `[lang]` রাউটিং + `pick()` হেল্পার
5. হোম → ফিচার → মডিউল → FAQ → যোগাযোগ
6. SEO মেটাডেটা, sitemap, JSON-LD, OG ইমেজ
7. মোবাইলে ও ডার্ক মোডে ঘুরে দেখুন; Lighthouse চালান
8. Vercel-এ ডিপ্লয় → ডোমেইন → Analytics
9. বাস্তব ক্লায়েন্টকে দেখিয়ে বাংলা কপি আরেকবার ঝালাই করুন (আমার লেখা বাংলা প্রথম খসড়া — আপনার ব্যবসার সুরে বদলে নেবেন)

---

## ১৪. পরিশিষ্ট — অ্যাপের মেনু ও তার ফিচারের মানচিত্র (রেফারেন্স)

| অ্যাপ-মেনু | মূল পেজ | সাইটের কোন মডিউল/গ্রুপ |
|---|---|---|
| Dashboard | `/dashboard` | ড্যাশবোর্ড (§৪.১০) |
| Sales: Sales / Draft / Add / Returns / Sales Order / EMI | `/sales…` | বিক্রি, EMI |
| Product: Products / Add / Low stock / Out of stock / Category / Unit / Brand | `/products…` | পণ্য ও স্টক |
| Contact: Supplier / Customer / Customer group | `/contacts…` | ক্রয় ও কন্টাক্ট |
| Bills: Receive / Pay / Discount | `/bills/…` | ক্রয় ও কন্টাক্ট |
| Purchases: Purchases / Add / Returns | `/purchases…` | ক্রয় ও কন্টাক্ট |
| Expenses: Expenses / Categories / Other income | `/expenses…` | টাকা, খরচ ও মূলধন |
| Payment accounts: Accounts / Financial position / Balance sheet / Cash flow / Trial balance | `/accounts…`, `/reports/…` | টাকা + রিপোর্ট |
| Accounting: Chart / Journal / Periods | `/chart-of-accounts…` | হিসাবরক্ষণ |
| Assets & liabilities: Assets / Other liabilities | `/assets…` | টাকা, খরচ ও মূলধন |
| Investors: Investors / Company loans | `/investors…` | টাকা, খরচ ও মূলধন |
| Staff | `/staff` | টাকা, খরচ ও মূলধন |
| Service & warranty: Requests / Claims | `/service-requests…` | ওয়ারেন্টি ও সার্ভিস |
| Reports: P&L / Stock / Due / Trending | `/reports/…` | হিসাবরক্ষণ ও রিপোর্ট |
| Import tools | `/imports` | নিরাপত্তা ও নিয়ন্ত্রণ |
| Backups | `/backups` | নিরাপত্তা ও নিয়ন্ত্রণ |
| Activity log | `/activity-log` | নিরাপত্তা ও নিয়ন্ত্রণ |
| User management: Users / Roles | `/roles` | নিরাপত্তা ও নিয়ন্ত্রণ |
| Business settings | `/business-settings` | প্রতিদিনের আরাম (ব্র্যান্ডিং, মেনু-ক্রম, কুইক অ্যাকশন) |
| Invoice settings | `/invoice-settings` | বিক্রি (ইনভয়েস কাস্টমাইজ) |

**টেক স্ট্যাক (অ্যাপের):** Laravel 12 · Inertia 2 · React 19 · TypeScript · Tailwind 4 · MySQL। সাইটে "আধুনিক ও নিরাপদ বেস" বলার জন্য যথেষ্ট; ক্রেতাদের জন্য টেক-নাম নিয়ে বেশি লেখার দরকার নেই।
