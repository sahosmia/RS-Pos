/**
 * বাংলা সংস্করণ — `system-guide.ts`-এর সাথে একই ক্রমে (topic key, section ও point-এর index মিলিয়ে)।
 * ইংরেজি ফাইলে কিছু বদলালে এখানেও একই জায়গায় বদলাতে হবে; না মিললে পেজ ইংরেজিতে fallback করে।
 */
export interface TopicBn {
    label: string;
    summary: string;
    sections: { title: string; points: string[] }[];
}

export const GROUPS_BN: Record<string, string> = {
    Basics: 'মূল ধারণা',
    Selling: 'বিক্রয়',
    'Buying & stock': 'ক্রয় ও স্টক',
    'People & money': 'মানুষ ও টাকা',
    'Data & admin': 'ডেটা ও অ্যাডমিন',
};

export const UI_BN = {
    title: 'সিস্টেম গাইড',
    description:
        'প্রতিটা module কীভাবে কাজ করে, কোন action কী বদলায়, আর কিছু ঠিক না লাগলে কোথায় দেখবেন। কোনো শব্দ, error message বা পেজের নাম লিখে খুঁজুন।',
    searchPlaceholder: 'গাইডে খুঁজুন — যেমন serial, EMI, import, cancel, warranty…',
    quickHelp: 'দ্রুত সাহায্য',
    stuck: 'কোথাও আটকে গেলে',
    impact: 'একটা action কী কী বদলায়',
    changes: 'পরিবর্তনের তালিকা',
    stuckIntro: 'Message বা সমস্যাটা খুঁজে নিন, কেন হয় দেখুন, আর সরাসরি সংশ্লিষ্ট পেজে বা logic-এ যান।',
    why: 'কেন: ',
    fix: 'কী করবেন: ',
    readLogic: 'Logic পড়ুন',
    nothing: 'আপনার সার্চের সাথে কিছু মেলেনি।',
    related: 'এ নিয়ে সাধারণ সমস্যা',
    impactIntro: 'একটা action হলে এই জায়গাগুলো একসাথে, একটাই all-or-nothing ধাপে বদলায় — তাই কোনো সংখ্যা নড়লে এখানে action-টা খুঁজুন।',
    changesIntro: 'পরিবর্তন সম্পূর্ণ confirmed হওয়ার পরই এখানে যোগ হয়।',
};

export const TOPICS_BN: Record<string, TopicBn> = {
    'how-it-works': {
        label: 'সিস্টেম কীভাবে ভাবে',
        summary: 'পাঁচটা নিয়ম, যা দিয়ে প্রায় সব আচরণ বোঝা যায়। আগে এটা পড়ুন।',
        sections: [
            {
                title: 'Draft বনাম Confirmed',
                points: [
                    'Draft/Quotation sale, Draft/Ordered purchase আর Sales Order শুধু নোট: এখনো stock, ledger, account বা journal কিছুই বদলায় না।',
                    'Confirm (sale) বা Receive (purchase) করার মুহূর্তে সবকিছু একটাই all-or-nothing ধাপে নড়ে। কোনো অংশ ব্যর্থ হলে (যেমন ভুল serial) কিছুই সেভ হয় না।',
                    'শুধু Draft/Quotation sale edit বা delete করা যায়। Confirmed record কখনো edit হয় না।',
                ],
            },
            {
                title: 'ভুল সংশোধন হয় যোগ করে, edit করে নয়',
                points: [
                    'Stock movement, contact-ledger, account transaction আর journal entry কখনো edit বা delete হয় না। সংশোধন মানে নতুন উল্টো entry: Return, Cancel (Undo), Stock Adjustment বা Reversing journal।',
                    'এ কারণে history সবসময় মেলে, আর Activity Log দেখায় কে কী করেছে।',
                ],
            },
            {
                title: 'আপনার সংখ্যা চার জায়গায় থাকে',
                points: [
                    'Product stock (current_stock) — কত unit আছে।',
                    'Contact ledger — প্রতিটা customer/supplier কত পাবে বা দেবে, running balance সহ।',
                    'Payment account — cash/bank/wallet-এর balance।',
                    'Journal (Chart of Accounts) — হিসাবের খাতা। Profit & Loss, Balance Sheet, Trial Balance, Cash Flow শুধু এখান থেকেই পড়ে।',
                    'প্রতিটা confirm প্রাসঙ্গিক সবগুলোতে একসাথে লেখে, তাই এরা মেলে। রাত ৩:০০-এ একটা check এদের তুলনা করে, গরমিল হলে warning log করে; Dashboard-এ books-check banner দেখায়।',
                ],
            },
            {
                title: 'টাকা জড়িত record কখনো hard-delete হয় না',
                points: [
                    'যে product-এ stock movement, sale, purchase বা serial আছে তা delete করা যায় না — Inactive করুন।',
                    'যে contact-এর ledger, sale, purchase বা order আছে তা delete করা যায় না — Inactive করুন।',
                    'Closed accounting period-এ নতুন journal post হয় না।',
                ],
            },
            {
                title: 'Menu নির্ভর করে permission-এর ওপর',
                points: [
                    'আপনার role যা ব্যবহার করতে পারে না তা sidebar, Quick Create আর Quick Actions থেকে লুকানো থাকে। কোনো menu না থাকলে সেটা permission, bug নয় — "Users, roles & permissions" দেখুন।',
                ],
            },
        ],
    },
    dashboard: {
        label: 'Dashboard',
        summary: 'Landing পেজ: নির্বাচিত তারিখ-সীমার confirmed record থেকে তৈরি live চিত্র।',
        sections: [
            {
                title: 'কী কী আছে',
                points: [
                    'উপরে date range preset (আজ, এই মাস, custom…) যা metric ও chart চালায়।',
                    'Metric card আর account balance।',
                    'Sales chart আর মাসভিত্তিক Revenue-vs-Expense chart।',
                    'Low-stock widget (minimum stock level বা তার নিচের product)।',
                    'Best sellers / purchases widget।',
                    'Follow-ups widget: বকেয়া/আসন্ন due, সাথে Remind-on-WhatsApp বাটন (WhatsApp খোলে, Send আপনি চাপেন)।',
                    'নতুন install-এর জন্য Setup checklist; সম্পন্ন ধাপে দাগ কাটা থাকে।',
                    'Books-check banner: রাতের reconciliation stock/ledger/journal-এ গরমিল পেলে দেখায়।',
                ],
            },
            {
                title: 'জেনে রাখুন',
                points: ['Draft ও quotation গোনা হয় না।', 'Card ও list-এর row সংশ্লিষ্ট পেজে নিয়ে যায়।'],
            },
        ],
    },
    header: {
        label: 'Header ও shortcut',
        summary: 'উপরের bar আর সব keyboard shortcut।',
        sections: [
            {
                title: 'Header',
                points: [
                    'বাঁ দিকে sidebar toggle আর breadcrumb।',
                    '"+" Quick Create: New Customer/Supplier, Sale, Purchase, Sales Order, Sale Return, Purchase Return, Service, Product, Expense, Asset।',
                    'Search বাটন: product, contact, sale, purchase, expense জুড়ে global search।',
                    'Fullscreen toggle আর account menu (profile, appearance, logout)।',
                ],
            },
            {
                title: 'Keyboard shortcut',
                points: [
                    'Ctrl/⌘ + K — global search। ↑ ↓ সরান, Enter খোলে, Esc বন্ধ করে।',
                    'Ctrl/⌘ + B — sidebar ছোট/বড় করে।',
                    'Ctrl + Space — Quick Actions। Ctrl চেপে ধরে Space আবার চাপলে পরেরটায় যায় (Shift+Space পেছনে), Ctrl ছাড়লে নির্বাচিতটা খোলে, Esc বাতিল করে।',
                    'কোন Quick Action দেখাবে ও কোন ক্রমে, তা Business Settings → Quick Actions-এ ঠিক হয়। Add Service, Add Sale Return, Add Purchase Return আছে, কিন্তু শুরুতে বন্ধ।',
                    '? — shortcut তালিকা (কোনো field-এ না লিখলে)।',
                    'Add/Edit Sale: F2 product search, F4 Payment-এ যাওয়া, Enter confirm ও save (field-এ না লিখলে), Esc বাতিল।',
                    'List পেজ: search box-এ Enter দিলে সাথে সাথে search।',
                ],
            },
        ],
    },
    roles: {
        label: 'User, role ও permission',
        summary: 'কে কী দেখতে ও করতে পারবে।',
        sections: [
            {
                title: 'কীভাবে কাজ করে',
                points: [
                    'প্রতিটা permission "module.action", যেমন product.view, sale.create, contact.payment, account.transfer।',
                    'Module: product, contact, sale, purchase, expense, account, accounting, asset, finance (investor ও loan), staff, service, report, financial_position, import, backup, activity_log, settings, role।',
                    'Sale ও purchase-এ view_own (শুধু নিজের তৈরি) আর view_all (সবার) আছে।',
                    'ডিফল্ট role: Admin (সব), Manager, Cashier (sale.create, sale.view_own, product.view) আর একটা সীমিত staff role। User Management → Roles-এ edit বা নতুন role করুন।',
                    'Sidebar শুধু menu লুকায়; server সরাসরি URL-এও permission ছাড়া module দিলে 403 দেয়।',
                ],
            },
            {
                title: 'সাধারণ ক্ষেত্র',
                points: [
                    'Return-এ sale.create / purchase.create লাগে। Service-এ service.*। Bills (receive/pay/discount)-এ contact.payment।',
                    'Business ও Invoice Settings-এ settings.manage; Backups-এ backup.manage; Import-এ import.view।',
                ],
            },
        ],
    },
    sales: {
        label: 'Sales (বিক্রয়)',
        summary: 'Draft → Confirmed sale, payment, cancel/undo, আর প্রতিটা status-এর মানে।',
        sections: [
            {
                title: 'Status',
                points: [
                    'Draft / Quotation — edit ও delete করা যায়; stock, ledger, account-এ প্রভাব নেই। Quotation-এ "valid until" তারিখ দেওয়া যায়।',
                    'Confirmed — sale বাস্তব। ভুল হলে Edit দিয়ে ঠিক করুন (নিচে দেখুন); খাতার পেছনে কিছু বদলানো হয় না।',
                    'Cancelled — যে confirmed sale undo করা হয়েছে।',
                    'Payment status আলাদা: Due → Partial → Paid, পাওয়া টাকা থেকে হিসাব হয়।',
                    'Source: Manual (স্বাভাবিকভাবে দেওয়া) বা Imported (পুরনো record — Import দেখুন)।',
                ],
            },
            {
                title: 'Confirm কী করে (ক্রমে, all-or-nothing)',
                points: [
                    'প্রতিটা product row lock করে stock কমায়; তখনকার cost প্রতিটা line-এ রেখে দেয় (পরে cost বদলালেও profit ঠিক থাকে)।',
                    'Serial-tracked product: আপনার লেখা serial গুলো ঠিক করে Sold করে (Serial numbers দেখুন)।',
                    'Warranty: প্রতিটা line-এর warranty শেষ তারিখ = sale তারিখ + warranty মাস (line-এর নিজের মান, না থাকলে product-এর)।',
                    'Free-service plan: product-এর service period গুলো আসল তারিখসহ sold line-এ কপি হয় (Warranty ও service দেখুন)।',
                    'Installation: "installation required" line হলে স্বয়ংক্রিয় Installation service request তৈরি হয়।',
                    'ফর্মে দেওয়া payment নির্বাচিত account-এ যায় (একাধিক account-এ ভাগ করা যায়)।',
                    'যা পরিশোধ হয়নি তা customer-এর due হয়ে contact ledger-এ যায়।',
                    'Journal entry post হয়: cash/bank ও receivable-এর বিপরীতে revenue, আর cost of goods sold-এর বিপরীতে inventory।',
                    'EMI sale হলে installment schedule তৈরি হয় (EMI দেখুন)।',
                ],
            },
            {
                title: 'পরে আরও টাকা নেওয়া',
                points: [
                    'Due আছে এমন confirmed sale-এ "Add Payment": account ও amount দিন। Account, customer ledger ও journal আপডেট হয়, sale Paid-এর দিকে এগোয়।',
                    '"View Payments" sale-এর সব payment দেখায়।',
                    'অনেক unpaid invoice থাকা customer-এর জন্য বরং Bills → Bill Receive ব্যবহার করুন।',
                ],
            },
            {
                title: 'Confirmed sale edit ও cancel',
                points: [
                    'Edit (sale edit permission লাগে): ফর্ম sale, তার payment ও serial সহ খোলে। কারণ লিখে সেভ করুন। সিস্টেম পুরনো sale উল্টে দেয় — stock, serial, customer due, payment ও journal নতুন উল্টো entry দিয়ে — আর একই invoice নম্বরে সংশোধিতটা এক ধাপে লেখে। শেষ করা না গেলে (stock কম, serial In stock নয়, closed period) কিছুই বদলায় না।',
                    'যে sale-এ Sale Return, পরিশোধ হওয়া EMI কিস্তি, warranty claim, service visit, মাফ করা discount আছে, বা যেটা imported পুরনো record, তার Edit বন্ধ।',
                    'Cancel Sale (confirmation সহ): একইভাবে sale উল্টে Cancelled হিসেবে রেখে দেয়। ভুল ঠিক করতে Cancel নয়, Edit ব্যবহার করুন। Return আছে এমন sale পুরোটা cancel করা যায় না।',
                    'Imported historical sale উল্টানোর কিছু নেই (সেগুলো কখনো stock বা টাকা নাড়েনি)।',
                ],
            },
            {
                title: 'Sale পেজের অন্য জিনিস',
                points: [
                    'Print Invoice (A4, বা Business Settings-এ চালু থাকলে thermal), Send WhatsApp (message লেখা অবস্থায় WhatsApp খোলে — Messaging দেখুন), Sale Return, আর draft-এর Edit/Delete।',
                    'Invoice নম্বর আসে Business Settings-এর prefix ও next-number থেকে।',
                ],
            },
        ],
    },
    'sales-orders': {
        label: 'Sales order',
        summary: 'Advance সহ অর্ডার বুক করুন; পরে ডেলিভারি দিন।',
        sections: [
            {
                title: 'Logic',
                points: [
                    'Order তৈরিতে stock নড়ে না। Advance নিলে সেই টাকা নির্বাচিত account, customer ledger ও journal-এ liability (Customer Advances) হিসেবে যায় — আপনি মাল বা ফেরতের ঋণী।',
                    'Status: Pending → Partial → Completed, অথবা Cancelled।',
                    'আলাদা order ফর্ম নেই। স্বাভাবিক Add Sale ফর্ম (discount, installation, warranty ও service plan, serial, EMI) পূরণ করে Confirm-এর বদলে "Sales Order" বাটন চাপুন। মাল এখনো হাতে না থাকলে এটা ব্যবহার করুন: stock কমে না, serial stock-এর সাথে মেলানো হয় না, আর পেমেন্ট ঘরে টাকা দিলে সেটা অগ্রিম হয়ে থাকে।',
                    'Sales Orders তালিকায় শুধু অপেক্ষমাণ order দেখায়; প্রতিটার পাশে "Confirm Sale"। চাপলে order পূর্ণ sale-ফর্মে খোলে — যা খুশি বদলান (পণ্য, দাম, serial, EMI, পেমেন্ট) তারপর Confirm Sale। Serial এখনই stock-এর সাথে মেলানো হয়। তারপর order তালিকা থেকে সরে যায় (পুরনোগুলো দেখতে status বা All বেছে নিন)।',
                    'কোনো order খোলা থাকলে Dashboard-এ "Sales orders waiting" card দেখায় (Confirm লিঙ্কসহ); একটাও না থাকলে card দেখায় না।',
                    'Sale-এ convert করলে স্বাভাবিক Confirm flow দিয়ে আসল sale তৈরি ও confirm হয়, তখনই stock/ledger/journal নড়ে। Advance নিজে থেকেই ধরা হয়, দুইবার লেখা হয় না; ডেলিভারির সময় বাড়তি টাকা নিলে শুধু সেটা নতুন payment।',
                ],
            },
        ],
    },
    'sale-returns': {
        label: 'Sale return',
        summary: 'Customer মাল ফেরত আনলে।',
        sections: [
            {
                title: 'Logic',
                points: [
                    'Confirmed sale থেকে শুরু করুন; line ও quantity বেছে নিন। সেই line-এ যা এখনো ফেরত হয়নি তার বেশি দেওয়া যায় না।',
                    'Return মূল্য = quantity × আসলে ধার্য দাম, বিয়োগ invoice discount-এর ওই line-এর অংশ, যোগ installation-এর ফেরতযোগ্য অংশ।',
                    'Stock আসল cost-এ ফিরে আসে; customer-এর due কমে (বা credit হয়); journal revenue ও cost of goods উল্টায়।',
                    'Serial product: পেজ কোন serial জিজ্ঞেস করে না — ওই line-এর সবচেয়ে পুরনো Sold serial গুলো Returned হয়।',
                    'Returned serial নিজে থেকে In stock হয় না, আর sale শুধু In-stock serial নেয়। মাল সত্যিই তাকে ফিরে এলে sale-এর পেজ খুলে ওই serial-এর পাশে Restock চাপুন।',
                    'পরে নগদ ফেরত দিতে return-এর Refund বাটন ব্যবহার করুন (account বেছে)।',
                ],
            },
        ],
    },
    emi: {
        label: 'EMI / কিস্তি',
        summary: 'ঐচ্ছিক সুদসহ কিস্তিতে বিক্রি। EMI module চালু থাকা লাগে।',
        sections: [
            {
                title: 'Setup',
                points: [
                    'Business Settings → Modules → "EMI Module"। ডিফল্টে বন্ধ; বন্ধ থাকলে EMI menu ও option লুকানো থাকে।',
                    'Product-এ "EMI available" টিক দিন। Sale-এ payment type EMI বেছে interest method, বার্ষিক হার, frequency, tenure দিন।',
                ],
            },
            {
                title: 'কী financed হয়',
                points: [
                    'শুধু EMI-র জন্য চিহ্নিত product financed হয়। অন্য line (তার, bracket…) আর installation charge একই invoice-এ বিল হয় কিন্তু কিস্তির অংশ নয় ও সুদ নেই।',
                    'Confirm-এর সময় দেওয়া টাকা আগে non-EMI item ঢাকে, তারপর "আগেই নেওয়া" বেছে থাকলে installation; বাকিটা EMI item-এর down payment।',
                    'Financed amount = EMI item − down payment। সুদ শুধু এর ওপর।',
                ],
            },
            {
                title: 'সুদের পদ্ধতি',
                points: [
                    'None — financed amount সমান ভাগ।',
                    'Flat — পুরো tenure-এর জন্য মূল financed amount-এর ওপর সরল সুদ, সমান ভাগ।',
                    'Reducing — ব্যাংকের মতো সমান কিস্তি, বাকি থাকা balance-এর ওপর সুদ।',
                    'Frequency: weekly, monthly বা quarterly। Tenure দিন/সপ্তাহ/মাস/বছরে; কিস্তির সংখ্যা ওপরে round হয়। Due তারিখ প্রথম due তারিখ থেকে গোনা হয় (৩১ তারিখ স্থায়ীভাবে ২৮-এ নামে না)।',
                    'সব হিসাব পূর্ণ পয়সায় হয়, তাই কিস্তি ঠিক মেলে; ১ পয়সার তফাত কিস্তিগুলোতে ভাগ হয়।',
                ],
            },
            {
                title: 'আদায় ও status',
                points: [
                    'EMI Installments পেজে সব কিস্তি দেখা যায়। একটা পরিশোধ করুন: account ও amount দিন (ওই কিস্তির বাকির বেশি নয়)। টাকা account, customer ledger ও journal-এ (receivable-এর বিপরীতে) যায়, sale-এর paid/due আপডেট হয়।',
                    'Status: Pending → Paid, অথবা Overdue, অথবা Cancelled।',
                    'রোজ রাত ১২:৩০-এ একটা job মেয়াদোত্তীর্ণ Pending কিস্তিকে Overdue করে ও in-app due-payment notification বানায়। (Server-এর scheduler চালু থাকতে হবে।)',
                    'Sale cancel করলে অপরিশোধিত কিস্তি বাতিল হয়; পরিশোধিতগুলো history হিসেবে থাকে।',
                    'কিস্তিগুলো পেজ থেকে Excel-এ export করা যায়।',
                ],
            },
        ],
    },
    serial: {
        label: 'Serial number',
        summary: 'প্রতিটা বাস্তব unit ট্র্যাক করা: কখন দিতে হয়, কী যাচাই হয়, ভুল দিলে কী হয়।',
        sections: [
            {
                title: 'চালু করুন',
                points: [
                    'Business Settings → Modules → "Serial Number Tracking" (পুরো দোকান), আর প্রতিটা product-এ "Track serial number" টিক (Product form → Service & Warranty)।',
                    'দোকানের switch বন্ধ থাকলে sale form-এ serial box দেখায় না — আর tracked product তখন confirm করা যায় না (নিচের count check ব্যর্থ হয়)। কোনো tracked product থাকলে এটা চালু রাখুন।',
                ],
            },
            {
                title: 'কখন দেবেন — মাল তোলার সময় (Purchase)',
                points: [
                    'Purchase-এ Confirm/Receive চাপুন। প্রতিটা tracked item-এর প্রতিটা unit-এর জন্য একটা box আসে (quantity 5 = 5টা serial box)।',
                    'প্রতি unit-এ ঠিক একটা আলাদা serial দিতে হবে। ওই product-এ আগে থেকে থাকা serial প্রত্যাখ্যাত হয়। সব ঠিক না হলে কিছুই receive হয় না।',
                    'প্রতিটা serial In stock status-এ সেভ হয়।',
                    'Opening stock (product form বা import) serial চায় না; tracked product-এর জন্য Purchase দিয়ে stock তুলুন যাতে প্রতিটা unit serial পায়।',
                ],
            },
            {
                title: 'কখন দেবেন — বিক্রির সময় (Sale)',
                points: [
                    'Add Sale form-এ tracked product line-এর নিচে serial গুলো comma দিয়ে লিখুন (যেমন A1001, A1002)। সংখ্যা quantity-র সমান ও সবগুলো আলাদা হতে হবে।',
                    'Confirm-এ প্রতিটা serial ওই product-এর জন্য থাকতে এবং In stock হতে হবে। তারপর সেটা Sold হয়ে ওই sale line-এর (তাই customer, warranty ও service history-র) সাথে যুক্ত হয়।',
                    'কোনো serial ব্যর্থ হলে পুরো sale confirm হয় না, কিছুই নড়ে না, আর message ওই line-এর নিচে দেখায়।',
                ],
            },
            {
                title: 'Status',
                points: [
                    'In stock — তাকে আছে, বিক্রি করা যায়।',
                    'Sold — কোনো sale line-এ যুক্ত।',
                    'Returned — customer ফেরত দিয়েছে (sale return)।',
                    'Under warranty service — service-এ থাকা unit-এর জন্য সংরক্ষিত।',
                    'Disposed — supplier-কে ফেরত (purchase return)।',
                ],
            },
            {
                title: 'Sale-এ ভুল serial দিলে',
                points: [
                    'Typo / যে serial নেই বা In stock নয়: sale error দিয়ে প্রত্যাখ্যাত হয়। লেখা ঠিক করে আবার confirm করুন — কিছুই বদলায়নি।',
                    'ভুল কিন্তু বৈধ serial (একই product-এর অন্য In-stock unit): sale confirm হয়ে যায়। কোন বাক্স আপনি আসলে দিয়েছেন সিস্টেম জানে না, তাই invoice, warranty ও service history ভুল unit-এর দিকে যায়।',
                    'Sale পেজে serial-এর পাশের পেন্সিল চাপুন, যে unit সত্যিই দিয়েছেন তার serial লিখে নিশ্চিত করুন। ভুল unit আবার In stock-এ ফেরে, আসল unit ওই line-এ Sold হয়, আর invoice, warranty ও service history তার সাথে যায়। টাকা বা stock-এর পরিমাণ বদলায় না। Sale edit permission লাগে।',
                    'শুধু confirmed sale-এর Sold unit বদলানো যায়, আর নতুন serial একই product-এর In-stock হতে হবে। ফেরত আসা unit-এর জন্য Restock (নিচে)। পুরো sale-ই ভুল হলে confirm-এর পর ~৩০ সেকেন্ডের Undo আগের মতো আছে।',
                    'Return আছে এমন sale কখনো cancel করবেন না — সিস্টেম আটকে দেয়।',
                    'তাই Confirm চাপার আগে বাক্সের সাথে serial মিলিয়ে নিন।',
                ],
            },
            {
                title: 'অন্যান্য নিয়ম',
                points: [
                    'Tracked unit receive করা purchase cancel করা যায় না যদি তার কোনো serial বিক্রি/সরানো হয়ে থাকে; নইলে serial গুলো মুছে যায়।',
                    'Sale cancel করলে তার serial গুলো In stock-এ ফেরে।',
                    'Purchase return ওই line-এর সবচেয়ে পুরনো In-stock serial গুলোকে Disposed করে।',
                    'যে product-এর কোনো serial আছে তা কখনো delete হয় না — শুধু Inactive।',
                    'Serial → sale line → customer → warranty → service history এই শিকলে warranty claim একটা unit-এ পৌঁছায়।',
                ],
            },
        ],
    },
    'warranty-service': {
        label: 'Warranty, service ও installation',
        summary: 'Warranty তারিখ, free service, paid service ও installation কীভাবে চলে।',
        sections: [
            {
                title: 'Product-এ সেট করুন',
                points: [
                    'Product form → Service & Warranty: warranty মাস, "has installation service", "track serial number", "EMI available", আর free-service plan।',
                    'Free-service plan = ক্রমানুসারে period, প্রতিটায় মাস ও free visit সংখ্যা। যেমন AC — period 1: ১২ মাস, ২টা free; period 2: ১২ মাস, ০ free (paid)।',
                    'পরে plan বদলালে আগে বিক্রি হওয়া unit বদলায় না: confirm-এর সময় plan sold line-এ কপি হয়ে যায়।',
                ],
            },
            {
                title: 'বিক্রির সময়',
                points: [
                    'প্রতিটা line নিজস্ব warranty মাস (যেমন পুরনো invoice) ও service plan অন্তর্ভুক্ত কিনা ঠিক করতে পারে; নইলে product-এর মান খাটে।',
                    'Warranty শেষ = sale তারিখ + মাস, sold line-এ সেভ হয়।',
                    'Service period গুলো sale তারিখ থেকে একটার পর একটা আসল শুরু/শেষ তারিখ পায়।',
                    '"Installation required" line স্বয়ংক্রিয়ভাবে Installation request বানায়; তার charge ইতিমধ্যে invoice-এর অংশ।',
                ],
            },
            {
                title: 'Service request',
                points: [
                    'Add Service: invoice নম্বর, customer নাম বা ফোন দিয়ে invoice খুঁজুন, sold item ও type (Service বা Installation), তারিখ, technician (Staff, শুধু active) বাছুন।',
                    'Sold unit যদি চলমান service period-এ থাকে আর free visit বাকি থাকে তবে Service FREE; নইলে paid। এটা server ঠিক করে — ফর্ম দিয়ে free করা যায় না।',
                    'Installation কখনো free নয়; তার charge (থাকলে) ওই request-এ বিল হয়।',
                    'Account বেছে paid request করলে charge তৈরির সময়ই post হয়: account-এ টাকা, journal-এ Service/Installation Income।',
                    'Status: Pending → Scheduled → Completed, অথবা Cancelled। Completed ও Cancelled চূড়ান্ত — নতুন request বানান।',
                ],
            },
            {
                title: 'Warranty claim',
                points: [
                    'Warranty Claims পেজ: invoice বা customer খুঁজুন, sold item বাছুন, সমস্যা লিখুন।',
                    'Status: Pending → In progress → Resolved বা Rejected, সাথে resolution note।',
                    'Claim শুধু record: stock বা টাকা নাড়ে না। মেরামতে charge থাকলে Service request করুন।',
                    'Item-এর warranty শেষ তারিখ list-এ দেখায়, তাই এক নজরে বোঝা যায় warranty-তে আছে কিনা।',
                ],
            },
        ],
    },
    purchases: {
        label: 'Purchases (ক্রয়)',
        summary: 'Supplier থেকে মাল তোলা আর তাদের কত দেনা তা ট্র্যাক করা।',
        sections: [
            {
                title: 'Status',
                points: [
                    'Draft → Ordered → Received (confirmed) → অথবা Cancelled। Draft/Ordered নির্দ্বিধায় edit করা যায়; Received purchase Edit দিয়ে বদলানো হয় (receipt তুলে আবার receive — Cancel দেখুন)।',
                ],
            },
            {
                title: 'Receive কী করে',
                points: [
                    'পুরনো stock ও নতুন batch থেকে প্রতিটা product-এর Weighted Average Cost নতুন করে হিসাব করে, তারপর stock বাড়ায়।',
                    'Tracked product: প্রতি unit-এর একটা serial চায় (Serial numbers দেখুন)।',
                    'Receive-এর সময়ের payment নির্বাচিত account থেকে বের হয়; থাকা supplier credit-ও প্রয়োগ করা যায়।',
                    'অপরিশোধিত অংশ contact ledger-এ supplier payable হয়।',
                    'Journal: payables-এর বিপরীতে inventory, আর পরিশোধিত অংশের জন্য cash/bank-এর বিপরীতে payables।',
                ],
            },
            {
                title: 'Cancel',
                points: [
                    'Received purchase নতুন উল্টো entry দিয়ে উল্টায় (stock বের, payable ও payment উল্টানো, journal উল্টানো)।',
                    'Purchase return থাকলে, বা তার কোনো serial বিক্রি হয়ে গেলে আটকে যায়।',
                    'পরে payment: purchase-এর "Add payment" বা Bills → Bill Pay।',
                    'Received purchase Edit (purchase edit permission লাগে): কারণ লিখে সেভ করুন। receipt তোলা হয় (stock, serial, গড় cost ফেরত, supplier payable, payment, journal — উল্টো entry দিয়ে) আর সংশোধিতটা একই invoice-এ এক ধাপে receive হয়। যা আগেই বিক্রি হয়েছে তার নিচে পরিমাণ নামানো যায় না, বিক্রি হওয়া serial বদলানো যায় না, আর Return / supplier discount / প্রয়োগ করা supplier credit থাকলে Edit বন্ধ। কোথাও আটকালে purchase ঠিক আগের মতোই থাকে।',
                    'Correct Price (purchase edit permission): শুধু দাম ভুল হলে, মালের কিছু অংশ বিক্রি হয়ে গেলেও, purchase-এ "Correct Price" ব্যবহার করুন। পরিমাণ, stock ও serial ছোঁয়া হয় না; supplier-এর দেনা পার্থক্য অনুযায়ী বদলায়, তাকে থাকা unit-এর অংশ Inventory মূল্য ও গড় cost বদলায়, আর বিক্রি হয়ে যাওয়া unit-এর অংশ cost variance হয় (আজকের তারিখে একটাই adjustment entry)। আগের বিক্রি যে cost-এ হয়েছিল সেটাই থাকে। যা আগেই শোধ হয়েছে তার নিচে মোট নামানো যায় না, আর Return থাকলে বন্ধ।',
                ],
            },
        ],
    },
    'purchase-returns': {
        label: 'Purchase return',
        summary: 'Supplier-কে মাল ফেরত পাঠানো।',
        sections: [
            {
                title: 'Logic',
                points: [
                    'Received purchase থেকে line ও quantity বাছুন (ফেরতযোগ্যের বেশি নয়)।',
                    'Stock বের হয়; supplier payable কমে (বা ফেরত পাওনা হয়); journal inventory/payable উল্টায়।',
                    'Serial product: ওই line-এর সবচেয়ে পুরনো In-stock serial গুলো Disposed হয়।',
                    'Supplier-এর নগদ ফেরত Refund বাটনে লিখুন (যে account টাকা পাচ্ছে সেটা বেছে)।',
                ],
            },
        ],
    },
    'products-stock': {
        label: 'Product ও stock',
        summary: 'Catalogue, stock-এর নিয়ম, opening stock, adjustment ও stock report।',
        sections: [
            {
                title: 'Product-এর মূল কথা',
                points: [
                    'নাম, SKU, barcode, category, brand, unit, বিক্রয় মূল্য, minimum stock level (low-stock alert চালায়), manage-stock, for-sale ও active flag।',
                    'Category, Brand, Unit নিজেদের পেজ থেকে বা import-এর সময় বানানো যায়।',
                    'Low / out of stock Products list-এর filter (stock status), Dashboard থেকেও লিঙ্ক আছে।',
                ],
            },
            {
                title: 'Stock কীভাবে বদলায়',
                points: [
                    'শুধু: Purchase receive (+), Sale confirm (−), Sale return (+), Purchase return (−), cancel/undo (উল্টো), Opening stock আর Stock adjustment দিয়ে।',
                    'প্রতিটা বদল type, পরিমাণ, reference ও unit cost সহ একটা stock-movement row লেখে। Row কখনো edit হয় না।',
                    'Stock কমানোর সময় product row lock থাকে, তাই দুই cashier একই শেষ unit দুইবার বেচতে পারে না।',
                    'গড় cost Weighted Average, প্রতি purchase-এ নতুন করে হিসাব হয়।',
                ],
            },
            {
                title: 'Opening stock',
                points: [
                    'Product form বা Opening Stock import-এ দেওয়া হয়। শুধু product-এ প্রথম movement হওয়ার আগে অনুমোদিত; তারপর lock।',
                    'হিসাব মেলাতে opening-stock journal entry post করে।',
                ],
            },
            {
                title: 'Stock ঠিক করা',
                points: [
                    'Stock adjustment: গোনা পরিমাণ দিন; পার্থক্যটা একটা increase বা decrease movement হিসেবে লেখা হয়। Movement হয়ে গেলে stock ঠিক করার এটাই একমাত্র পথ।',
                    'Serial-tracked product-এ গোনা সংখ্যা লেখা যায় না, unit ধরে adjust হয়: in-stock serial থেকে যেগুলো নেই (হারিয়েছে, চুরি, নষ্ট) সেগুলো টিক দিন — ওগুলো "Written off" হবে ও stock সেই সংখ্যায় কমবে — আর/অথবা পাওয়া unit-এর serial লিখুন, ওগুলো In stock হয়ে ঢুকবে। তাই serial তালিকা ও stock সবসময় সমান থাকে। In-stock নয় এমন serial write-off করা যায় না, আর আগে থেকে থাকা serial আবার যোগ করা যায় না। প্রতিটা adjustment গড় cost-এ হিসাবে (Inventory ও "Stock Adjustment Loss/Gain") যায়।',
                ],
            },
            {
                title: 'Delete',
                points: [
                    'Product-এ কোনো movement, sale, purchase বা serial থাকলে আটকে যায় — বরং Inactive করুন (বিক্রি থেকে লুকানো, history-তে থাকে)।',
                ],
            },
        ],
    },
    contacts: {
        label: 'Contact ও ledger',
        summary: 'Customer, supplier, running balance, discount ও credit।',
        sections: [
            {
                title: 'Contact-এর ধরন',
                points: [
                    'Customer, Supplier বা Both। একই ফোন + একই type duplicate ধরা হয় (import-এ গুরুত্বপূর্ণ)।',
                    'Business contact-এ business name দেওয়া যায়। Opening balance তৈরির সময় একবার দেওয়া যায়।',
                ],
            },
            {
                title: 'Ledger',
                points: [
                    'প্রতিটা sale invoice, payment, return, discount, adjustment ও refund running balance সহ একটা row। Positive/negative contact type অনুযায়ী (customer আপনাকে দেবে বনাম আপনি supplier-কে দেবেন)।',
                    'Contact পেজে ledger filter ও export করা যায়।',
                    'Customer-এর negative balance মানে credit (আগাম বা বেশি দিয়েছে)।',
                ],
            },
            {
                title: 'বিশেষ action',
                points: [
                    'Waive due / customer discount: customer-এর কিছু due মাফ, সবচেয়ে পুরনো unpaid invoice থেকে কাটে। টাকা নড়ে না। "Sales Returns & Allowances" ও receivable-এ post হয়।',
                    'Supplier discount: উল্টোটা — supplier-কে আপনার দেনা কমায়, টাকা নড়ে না; payables ও Other Income-এ post হয়।',
                    'Refund credit: customer-এর credit account থেকে নগদে ফেরত দেওয়া।',
                    'একই discount পর্দা Bills → Add Discount থেকেও পাওয়া যায়।',
                ],
            },
            {
                title: 'Delete',
                points: [
                    'শুধু যে contact-এর ledger, sale, purchase বা order নেই তার জন্য সম্ভব। নইলে Inactive করুন। Bulk delete যেগুলো মোছা যায় না সেগুলো বাদ দেয় ও কতগুলো বাদ গেল জানায়।',
                ],
            },
        ],
    },
    bills: {
        label: 'Bills (receive / pay / discount)',
        summary: 'প্রতিটা invoice না খুলে contact থেকে টাকা নেওয়া বা তাকে দেওয়া।',
        sections: [
            {
                title: 'Logic',
                points: [
                    'Receive ("Pay Due Amount"): customer, account(s) ও amount বাছুন। টাকা তাদের সবচেয়ে পুরনো unpaid invoice-এ আগে লাগে, ledger ও account আপডেট হয়, journal post হয়।',
                    'Pay: supplier-এর purchase-এর জন্য একই।',
                    'Discount: ledger-স্তরের মাফ, টাকা নড়ে না (Contact ও ledger দেখুন)।',
                    'contact.payment permission লাগে।',
                ],
            },
        ],
    },
    messaging: {
        label: 'WhatsApp, SMS ও email',
        summary: 'আজ আসলে কী সংযুক্ত — customer-কে স্বয়ংক্রিয় message-এর প্রতিশ্রুতি দেওয়ার আগে এটা পড়ুন।',
        sections: [
            {
                title: 'Sale থেকে WhatsApp',
                points: [
                    'Sales → row action "Send WhatsApp Notification" (বা sale পেজ) customer-এর নম্বরে invoice-এর message লেখা অবস্থায় WhatsApp Web/App খোলে।',
                    '০ দিয়ে শুরু বাংলাদেশি নম্বর নিজে থেকে ৮৮০… হয়ে যায়।',
                    'এটা click-to-chat লিঙ্ক: Send আপনাকেই চাপতে হবে। কোনো WhatsApp Business API নেই, তাই কিছু স্বয়ংক্রিয় যায় না।',
                ],
            },
            {
                title: 'Contacts থেকে bulk "Send Notification"',
                points: [
                    'Contact বেছে → Send Notification → SMS, WhatsApp বা Email বেছে message লিখুন। Email নেই এমন contact-এর জন্য Email বন্ধ।',
                    'Business Settings → SMS-এ আপনার SMS কোম্পানি (gateway URL, API key, sender ID ও কোম্পানির parameter-নাম) একবার সেট করলে SMS সত্যিই যায়; "Send test" দিয়ে যাচাই করুন। প্রতিটি message Sent বা Failed লগ হয়, Failed হলে কারণ (ফোন নম্বর নেই, কোম্পানি ফিরিয়ে দিয়েছে...) থাকে।',
                    'WhatsApp ও Email আপাতত শুধু রেকর্ড হয় (Pending, কখনো Sent নয়) — এগুলোর gateway সংযুক্ত নেই।',
                    'SMS বন্ধ থাকলে বা gateway URL না থাকলে dialog-এ জানানো হয় এবং SMS পাঠানো যায় না।',
                ],
            },
            {
                title: 'In-app notification (এগুলো কাজ করে)',
                points: [
                    'রোজ একটা job (সকাল ৫:০০) low stock, due payment, loan repayment ও expense due-এর notification বানায়; overdue EMI কিস্তিও due-payment notice তোলে।',
                    'এগুলোর জন্য server scheduler দরকার (Scheduled jobs দেখুন)।',
                ],
            },
        ],
    },
    'expenses-income': {
        label: 'Expense ও other income',
        summary: 'চালানোর খরচে টাকা বের হওয়া, আর sale ছাড়া অন্য আয়ে টাকা ঢোকা।',
        sections: [
            {
                title: 'Logic',
                points: [
                    'Expense নির্বাচিত payment account কমায় এবং journal-এ expense account-এর বিপরীতে cash/bank post করে। Other income উল্টোটা।',
                    'প্রতিটার category আছে (নিজস্ব পেজে); প্রতিটা category একটা accounting account-এর সাথে যুক্ত।',
                    'দুই পেজেই Add modal আছে যা Quick Create / Quick Actions থেকেও খোলে, আর Excel export আছে।',
                    'Post হওয়া কিছু চুপচাপ মোছা হয় না: other-income মুছলে আগে তার account movement উল্টায় ও journal entry reverse হয়।',
                ],
            },
        ],
    },
    accounts: {
        label: 'Payment account ও transfer',
        summary: 'Cash, bank, wallet: balance, statement ও নিজেদের মধ্যে টাকা সরানো।',
        sections: [
            {
                title: 'Account',
                points: [
                    'Account type (cash, bank, mobile wallet…) account-types পেজে ঠিক হয়। Account নম্বর encrypted থাকে।',
                    'Account তৈরি করলে Chart of Accounts-এ তার sub-account নিজে থেকে তৈরি হয় — হাতে map করতে হয় না।',
                    'প্রতিটা টাকার ঘটনা (sale payment, purchase payment, expense, bill, EMI, service charge…) তারিখসহ একটা account transaction। প্রতিটা account-এর statement আছে।',
                    'Balance শুধু এই transaction দিয়ে বদলায়, সংখ্যা edit করে নয়।',
                ],
            },
            {
                title: 'Transfer',
                points: [
                    'নিজের দুই account-এর মধ্যে টাকা সরান (account.transfer লাগে)। একটা কমে, অন্যটা সমান বাড়ে, একটা সমতল journal entry post হয়। Net worth বদলায় না।',
                ],
            },
            {
                title: 'Financial position',
                points: ['Cash/bank balance, receivable, payable ও stock মূল্যের একটা একত্র দৃশ্য (financial_position.view লাগে)।'],
            },
        ],
    },
    accounting: {
        label: 'হিসাবের খাতা',
        summary: 'Chart of Accounts, journal entry ও period — financial report-এর সত্যের উৎস।',
        sections: [
            {
                title: 'নিয়ম',
                points: [
                    'প্রতিটা টাকার action operational বদলের একই ধাপে একটা সমতল journal entry post করে (মোট debit = মোট credit)।',
                    'Journal entry কখনো edit বা delete হয় না। ভুল ঠিক করতে reverse করুন (নতুন উল্টো entry)।',
                    'Closed accounting period তার ভেতরের তারিখে নতুন posting নেয় না। Close করা একমুখী কাজ; করার আগে নিশ্চিত হোন সব শেষ।',
                    'Chart of Accounts থেকে যেকোনো account-এর General Ledger খোলা যায়।',
                    'Journal entry Excel-এ export করা যায়।',
                ],
            },
            {
                title: 'সাধারণ posting',
                points: [
                    'Sale: Dr cash/bank + receivable, Cr sales revenue; Dr cost of goods sold, Cr inventory।',
                    'Purchase: Dr inventory, Cr payables; payment-এ Dr payables, Cr cash/bank।',
                    'Expense: Dr expense, Cr cash/bank। Service charge: Dr cash/bank, Cr service income।',
                    'Sales order advance: Dr cash/bank, Cr customer advances (liability)।',
                ],
            },
        ],
    },
    'finance-others': {
        label: 'Asset, liability, investor, loan, staff',
        summary: 'বাণিজ্যের বাইরের টাকার module।',
        sections: [
            {
                title: 'একই ধারণা',
                points: [
                    'Asset, Other Liability, Investor ও Company Loan প্রতিটার নিজস্ব balance ও transaction history ("ledger") আছে; প্রতিটা transaction একটা payment account নাড়ে ও journal entry post করে।',
                    'এরা sidebar-এর "Assets & Liabilities" menu-তে একসাথে (Investor ও Loan-এ finance.view; Asset ও Liability-তে asset.view)।',
                    'Loan-এর repayment reminder notification-এ আসে।',
                ],
            },
            {
                title: 'Staff',
                points: [
                    'Staff কর্মী/technician। প্রত্যেকের staff ledger আছে; transaction অ্যাডমিন-নির্ধারিত type-এর (বেতন, advance, bonus…), প্রতিটা type-এর একটা "nature" ঠিক করে journal কীভাবে post হবে।',
                    'Active staff service request-এর technician তালিকায় আসে।',
                ],
            },
        ],
    },
    import: {
        label: 'Import (Excel / CSV)',
        summary: 'Product, contact, opening stock ও পুরনো sale নিরাপদে আনা।',
        sections: [
            {
                title: 'ধাপ',
                points: [
                    'Import Tools → type বাছুন → template নামান (header row-ই সঠিক format) → ভরুন → upload (.xlsx, .xls, .csv; সর্বোচ্চ ১০ MB)।',
                    'Preview ধাপে কী তৈরি/বাদ হবে ও row-এর error দেখায়; Confirm না চাপা পর্যন্ত কিছু সেভ হয় না। Discard preview ফেলে দেয় (preview মেয়াদোত্তীর্ণও হয়)।',
                    'প্রয়োজনীয় column না থাকলে file column নামসহ প্রত্যাখ্যাত হয়। ফোন, SKU, barcode text হিসেবে পড়া হয় যাতে Excel নষ্ট না করে।',
                ],
            },
            {
                title: 'প্রস্তাবিত ক্রম',
                points: ['১) Contacts  ২) Products  ৩) Opening Stock  ৪) Historical Sales (ঐচ্ছিক)।'],
            },
            {
                title: 'Products',
                points: [
                    'আবশ্যক: name, sku, category, unit, selling_price। ঐচ্ছিক: brand, barcode, opening_stock, opening_stock_cost, minimum_stock_level, warranty_period_months।',
                    'Category, unit, brand না থাকলে তৈরি হয়। যে row-এর SKU আগে থেকে আছে তা বাদ যায়।',
                ],
            },
            {
                title: 'Contacts',
                points: [
                    'আবশ্যক: name, phone, type (customer / supplier / both)। ঐচ্ছিক: email, address, business_name, opening_balance। একই phone + type duplicate হিসেবে বাদ যায়।',
                ],
            },
            {
                title: 'Opening stock',
                points: [
                    'আবশ্যক: sku, quantity, unit_cost। Product থাকতে হবে ও এখনো stock movement থাকা চলবে না। Opening-stock journal post করে।',
                    'Serial number import করা যায় না — tracked product-এ Purchase দিয়ে তুলুন।',
                ],
            },
            {
                title: 'Historical sales',
                points: [
                    'একই invoice_no-র row গুলো একটা sale হয়। সবসময় source "Imported" (পুরনো record) হিসেবে সেভ: কোনো stock, ledger, account বা journal নাড়ে না — কারণ opening stock ইতিমধ্যে আজকের পরিমাণ ধরে আছে।',
                    'SKU/নামে না পাওয়া product কখনো নিজে থেকে তৈরি হয় না; ওই পুরো invoice বাদ যায়।',
                    'File-এর order total মিলিয়ে দেখা হয় কিন্তু import আটকায় না।',
                ],
            },
        ],
    },
    export: {
        label: 'Export (Excel)',
        summary: 'List-এর ডেটা Excel-এ নামানো।',
        sections: [
            {
                title: 'কোথায়',
                points: [
                    'Export বাটন আছে: Sales, Purchases, Sales Orders, Sale Returns, Purchase Returns, Products, Contacts, Contact ledger, Expenses, Other Income, Assets, Investors, Company Loans, Other Liabilities, EMI Installments, Service Requests, Warranty Claims ও Journal Entries-এ।',
                    'Export পেজে প্রয়োগ করা filter (তারিখ, status, search) মানে — আগে filter করুন, তারপর export।',
                    'Import template আলাদা, Import Tools পেজ থেকে নামে।',
                ],
            },
        ],
    },
    backups: {
        label: 'Backup',
        summary: 'ডেটা রক্ষা ও ফেরত আনা।',
        sections: [
            {
                title: 'Logic',
                points: [
                    'Backups পেজ (backup.manage লাগে): এখনই backup, download (zip-এ database ও আপলোড করা ছবি/ফাইল দুটোই থাকে), থাকা backup restore, delete। Backup file upload করা যায় না।',
                    'স্বয়ংক্রিয়: রোজ রাত ১:০০-এ backup, ১:৩০-এ পুরনো backup পরিষ্কার, ২:০০-এ monitor — শুধু server scheduler চললে।',
                    'Restore বর্তমান ডেটা backup-এর ডেটা দিয়ে বদলে দেয়। আগে নতুন backup নিন, আর কাজ চলার সময় সবাইকে থামতে বলুন।',
                ],
            },
        ],
    },
    'activity-log': {
        label: 'Activity log',
        summary: 'কে কখন কী বদলেছে।',
        sections: [
            {
                title: 'Logic',
                points: [
                    'Created / updated / deleted ঘটনা user, record ও আগে/পরের মানসহ রাখে, সাথে প্রতিটা login ও logout (কে, কখন, কোন address ও browser থেকে)। পেজ দ্রুত রাখতে শুরুতে শেষ ৭ দিন দেখায়; আরও পেছনে দেখতে From / To বদলান (তারিখ মুছে দিলে সব দেখায়)। user, record type ও action (Login / Logout সহ) দিয়ে filter করুন।',
                    'Business Settings-এর "Activity log retention (months)" অনুযায়ী পুরনো entry মাসিক ছাঁটা হয়।',
                ],
            },
        ],
    },
    settings: {
        label: 'Business ও invoice settings',
        summary: 'দোকানের তথ্য, নম্বরিং, module, চেহারা ও layout।',
        sections: [
            {
                title: 'Business Settings tab',
                points: [
                    'দোকানের তথ্য (নাম, logo, ঠিকানা, ফোন, মুদ্রার চিহ্ন) আর invoice/purchase/sales-order prefix ও next number।',
                    'Modules: thermal printer, EMI module, serial number tracking।',
                    'Fiscal year শুরুর মাস; pagination option; activity-log retention; theme রং।',
                    'Sidebar Menu Organizer: সবার জন্য menu/sub-menu সাজান। Quick Actions: Ctrl+Space action বাছুন ও সাজান।',
                    'License key ও status (key encrypted থাকে)।',
                ],
            },
            { title: 'Invoice Settings', points: ['ছাপা invoice-এ কী থাকবে ও তার layout নিয়ন্ত্রণ করে।'] },
        ],
    },
    reports: {
        label: 'Report',
        summary: 'কোন report কোথা থেকে পড়ে।',
        sections: [
            {
                title: 'দুই পরিবার',
                points: [
                    'Financial statement — Profit & Loss, Balance Sheet, Trial Balance, Cash Flow: শুধু journal পড়ে। কোনো sale/expense এখানে "নেই" মনে হলে তার journal entry ও accounting period দেখুন।',
                    'Operational report — Due, Trending products: ledger ও sale ডেটা সরাসরি পড়ে। Stock মূল্য, low/out-of-stock ও product-ভিত্তিক stock Products পেজেই আছে (আলাদা Stock Report নেই)।',
                    'দুটো না মিললে রাত ৩:০০-এর reconciliation তা log করে ও Dashboard-এ banner দেখায়।',
                ],
            },
        ],
    },
    scheduled: {
        label: 'Scheduled job',
        summary: 'নিজে নিজে যা হয় — আর তার একটাই দরকার।',
        sections: [
            {
                title: 'দৈনিক job',
                points: [
                    'রাত ১২:৩০ — overdue EMI কিস্তি চিহ্নিত (ও notify)।',
                    'রাত ১:০০ — backup। ১:৩০ — পুরনো backup পরিষ্কার। ২:০০ — backup monitor।',
                    'রাত ৩:০০ — reconciliation check (stock বনাম movement, ledger বনাম journal)।',
                    'সকাল ৫:০০ — notification তৈরি (low stock, due, loan, expense)।',
                    'মাসিক (১ তারিখ, ভোর ৪:০০) — পুরনো activity-log ছাঁটা।',
                ],
            },
            {
                title: 'শর্ত',
                points: [
                    'Server প্রতি মিনিটে Laravel scheduler না চালালে এর কোনোটাই চলে না (cron `php artisan schedule:run`, বা `php artisan schedule:work`)। EMI কখনো Overdue না হলে বা notification না এলে প্রথমে এটা দেখুন।',
                ],
            },
        ],
    },
};

export const TROUBLESHOOTING_BN: { problem: string; why: string; fix: string }[] = [
    {
        problem: 'Sale confirm হচ্ছে না: "expected N unique serial(s)"',
        why: 'Serial-tracked product-এ quantity-র প্রতি unit-এর জন্য ঠিক একটা আলাদা serial লাগে।',
        fix: 'Quantity যত, তত comma-দেওয়া serial লিখুন। Business Settings → Modules → Serial Number Tracking চালু আছে কিনা দেখুন, নইলে box লুকানো থাকে।',
    },
    {
        problem: 'Sale error: "Serial … is not an in-stock unit of …"',
        why: 'ওই serial এই product-এর জন্য নেই, আগেই Sold/Returned/Disposed, অথবা typo/space আছে।',
        fix: 'Serial বাক্স এবং যে purchase-এ receive হয়েছিল তার সাথে মিলিয়ে দেখুন (purchase receive করার সময় serial লেখা হয়)। আগে receive হতে হবে এবং আগে বিক্রি হওয়া চলবে না।',
    },
    {
        problem: 'ভুল serial দিয়ে sale confirm করে ফেলেছি',
        why: 'একই product-এর বৈধ in-stock serial গ্রহণ হয়; কোন বাক্স দিয়েছেন সিস্টেম বোঝে না।',
        fix: 'Sale খুলে serial-এর পাশের পেন্সিল চাপুন: আসল serial লিখে নিশ্চিত করুন। ভুল unit আবার In stock-এ ফেরে; invoice, warranty ও service আসল unit-কে অনুসরণ করে।',
    },
    {
        problem: 'Purchase receive হচ্ছে না: "Serial … already exists"',
        why: 'এই product-এর জন্য একই serial আগেই receive হয়েছে (বা দুইবার লেখা)।',
        fix: 'Duplicate ঠিক করুন। একটা product-এ একটা serial একবারই থাকতে পারে।',
    },
    {
        problem: 'Purchase cancel করা যাচ্ছে না: serial বিক্রি হয়ে গেছে',
        why: 'এই purchase-এর unit বিক্রি বা সরানো হয়েছে; cancel করলে যে stock নেই তা বাদ যাবে।',
        fix: 'বরং যে unit এখনো stock-এ আছে তার Purchase Return করুন।',
    },
    {
        problem: 'Sale cancel করা যাচ্ছে না: return আছে',
        why: 'Return ইতিমধ্যে ওই অংশ উল্টেছে; পুরো sale cancel করলে দুইবার উল্টে যাবে।',
        fix: 'বাকিটা আরেকটা return দিয়ে সামলান, বা admin-কে বলুন।',
    },
    {
        problem: 'Confirmed sale ঠিক বা cancel করব কীভাবে?',
        why: 'Confirmed sale জায়গায় বসে বদলানো হয় না; Edit সেটা উল্টে একই invoice-এ সংশোধিতটা লেখে।',
        fix: 'Sale খুলুন: ঠিক করতে Edit, না থাকার কথা হলে Cancel Sale। Return, পরিশোধিত কিস্তি, warranty claim বা service visit থাকলে দুটোই বন্ধ।',
    },
    {
        problem: 'Sale edit বা delete করা যাচ্ছে না',
        why: 'শুধু Draft/Quotation sale edit করা যায়। Confirmed record অপরিবর্তনীয়।',
        fix: 'Sale-এ Edit চাপুন (sale edit permission লাগে), বা Cancel Sale। Draft নির্দ্বিধায় edit ও delete করা যায়।',
    },
    {
        problem: 'Product stock ভুল',
        why: 'Stock শুধু confirmed document দিয়ে নড়ে; বাস্তব গণনার তফাতে adjustment লাগে।',
        fix: 'Product পেজ খুলুন: stock-movement history দেখাবে কী বদলেছে; তারপর গোনা পরিমাণ দিয়ে Stock Adjustment করুন।',
    },
    {
        problem: 'Opening stock lock / import বলছে product-এ movement আছে',
        why: 'Opening stock শুধু প্রথম movement-এর আগে চলে।',
        fix: 'Stock Adjustment ব্যবহার করুন।',
    },
    {
        problem: 'Product বা contact delete করা যাচ্ছে না',
        why: 'এতে history আছে (movement, sale, purchase, serial বা ledger)।',
        fix: 'Inactive করুন।',
    },
    {
        problem: 'Customer-এর due ভুল মনে হচ্ছে',
        why: 'Balance হলো ledger row-এর যোগফল: invoice, payment, return, discount, adjustment।',
        fix: 'Contact-এর ledger খুলে প্রতিটা row তার sale/payment-এ অনুসরণ করুন। Due report-এর সাথে মেলান।',
    },
    {
        problem: 'Due-এর বেশি দিয়েছি / customer-এর credit আছে',
        why: 'বেশি দেওয়া টাকা negative balance (আগাম credit) হয়।',
        fix: 'পরের invoice-এ কাটে, বা "Refund credit" দিয়ে ফেরত দিন।',
    },
    {
        problem: 'EMI menu বা option নেই',
        why: 'EMI module বন্ধ, অথবা product "EMI available" চিহ্নিত নয়।',
        fix: 'Business Settings → Modules → EMI Module; তারপর product form → EMI available।',
    },
    {
        problem: 'EMI কিস্তি কখনো Overdue দেখায় না',
        why: 'রোজকার overdue job-এর জন্য server scheduler লাগে।',
        fix: 'Server-এ `schedule:run` প্রতি মিনিটে চলছে কিনা নিশ্চিত করুন।',
    },
    {
        problem: 'EMI কিস্তি পরিশোধ করা যাচ্ছে না',
        why: 'ইতিমধ্যে পরিশোধিত, amount বাকির বেশি, বা তার sale cancelled।',
        fix: 'কিস্তির বাকি amount ও sale-এর status দেখুন।',
    },
    {
        problem: 'Service paid দেখাচ্ছে কিন্তু customer free আশা করছে',
        why: 'Free visit sold unit-এর service period থেকে আসে: period শেষ বা quota ফুরালে paid।',
        fix: 'Sale line-এর service period ও আগের service request দেখুন। Installation কখনো free নয়।',
    },
    {
        problem: 'Service request-এর status বদলানো যাচ্ছে না',
        why: 'Completed ও Cancelled চূড়ান্ত।',
        fix: 'নতুন service request বানান।',
    },
    {
        problem: 'পুরনো sale-এ warranty তারিখ নেই',
        why: 'তারিখ confirm-এর সময় line বা product-এর warranty মাস থেকে বসে; warranty মাস না থাকা product কিছু পায় না। Imported sale-এর live প্রভাব নেই।',
        fix: 'বিক্রির সময় line-এ warranty মাস দিন; পুরনোর জন্য warranty claim-এ note রাখুন।',
    },
    {
        problem: 'WhatsApp / SMS message customer-এর কাছে পৌঁছায়নি',
        why: 'Sale WhatsApp শুধু chat খোলে (Send আপনি চাপেন)। Bulk SMS-এর জন্য Business Settings → SMS সেট করা লাগে; bulk WhatsApp/email শুধু রেকর্ড হয়।',
        fix: 'WhatsApp-এ Send চাপুন। SMS-এর ক্ষেত্রে Business Settings → SMS দেখুন ও Send test দিন; Failed message log-এ কারণ দেখা যায়।',
    },
    {
        problem: 'Import বলছে "Missing required column"',
        why: 'Header row template থেকে আলাদা।',
        fix: 'Import Tools থেকে template নামিয়ে তার header-এর নিচে ডেটা বসান।',
    },
    {
        problem: 'Import-এ কিছু row বাদ গেছে',
        why: 'Duplicate SKU, duplicate phone+type, sale-এ অচেনা product, বা যে product-এ আগেই movement আছে (opening stock)।',
        fix: 'Preview/result তালিকায় প্রতিটা row-এর কারণ পড়ুন।',
    },
    {
        problem: 'Imported historical sale stock বা due বদলায়নি',
        why: 'ইচ্ছাকৃত: imported sale শুধু history।',
        fix: 'পরিমাণের জন্য Opening Stock, আর due-র জন্য contact opening balance ব্যবহার করুন।',
    },
    {
        problem: 'Entry post হচ্ছে না: accounting period closed',
        why: 'Closed period নতুন journal posting নেয় না।',
        fix: 'Transaction-টা open period-এর তারিখে দিন, বা period নিয়ে অনুমোদিত user-কে জিজ্ঞেস করুন।',
    },
    {
        problem: 'Report-এর যোগফল Due report-এর থেকে আলাদা',
        why: 'Financial statement journal entry পড়ে; operational report ledger/stock table পড়ে।',
        fix: 'Dashboard-এর books-check banner দেখুন; account-এর General Ledger খুলে মেলান।',
    },
    {
        problem: 'কোনো user-এর menu বা বাটন নেই',
        why: 'তার role-এ ওই permission নেই।',
        fix: 'User Management → Roles-এ module action টিক দিন (যেমন sale.create)।',
    },
    {
        problem: 'সরাসরি লিঙ্কে 403',
        why: 'User-এর permission না থাকা module server URL দিয়েও আটকায়।',
        fix: 'Permission দিন, বা যার আছে সেই account ব্যবহার করুন।',
    },
    {
        problem: 'Backup / notification স্বয়ংক্রিয়ভাবে হচ্ছে না',
        why: 'এগুলো scheduled job।',
        fix: 'Server-এ Laravel scheduler প্রতি মিনিটে চালান।',
    },
    {
        problem: 'এই record কে বদলেছে?',
        why: 'প্রতিটা create/update/delete log হয়।',
        fix: 'Activity Log-এ record type ও তারিখ দিয়ে filter করুন।',
    },
];

export const IMPACT_BN: { action: string; effects: { target: string; effect: string }[] }[] = [
    {
        action: 'Sale Confirm',
        effects: [
            { target: 'Product stock', effect: 'বিক্রিত পরিমাণ কমে; stock movement লেখা হয়; line-এ cost snapshot সেভ হয়।' },
            { target: 'Serial numbers', effect: 'লেখা serial In stock → Sold হয়ে line-এ যুক্ত হয়।' },
            {
                target: 'Warranty ও service',
                effect: 'Warranty শেষ তারিখ বসে; free-service period তারিখসহ কপি হয়; দরকার হলে Installation request তৈরি।',
            },
            { target: 'Contact ledger', effect: 'অপরিশোধিত অংশে customer due বাড়ে।' },
            { target: 'Payment account', effect: 'পাওয়া প্রতিটা অঙ্কে বাড়ে।' },
            { target: 'EMI', effect: 'কিস্তির schedule তৈরি (শুধু EMI sale)।' },
            { target: 'Journal / report', effect: 'Revenue, receivable, cash/bank, cost of goods sold ও inventory post হয়।' },
        ],
    },
    {
        action: 'Sale Cancel (Edit-এরও প্রথম অর্ধেক)',
        effects: [
            { target: 'Product stock', effect: 'পরিমাণ stock-এ ফেরে।' },
            { target: 'Serial numbers', effect: 'In stock-এ ফেরে, sale থেকে আলাদা হয়।' },
            { target: 'Contact ledger', effect: 'Due উল্টানো হয়।' },
            { target: 'Payment account', effect: 'পাওয়া টাকা উল্টে বের হয়।' },
            { target: 'EMI', effect: 'অপরিশোধিত কিস্তি বাতিল।' },
            { target: 'Journal / report', effect: 'মূল entry reverse হয়।' },
        ],
    },
    {
        action: 'Sale-এ payment / Bill Receive / EMI কিস্তি পরিশোধ',
        effects: [
            { target: 'Payment account', effect: 'বাড়ে।' },
            { target: 'Contact ledger', effect: 'Customer due কমে।' },
            { target: 'Sale', effect: 'Paid/due যোগফল ও payment status নতুন করে হিসাব।' },
            { target: 'Journal / report', effect: 'Receivable-এর বিপরীতে cash/bank।' },
        ],
    },
    {
        action: 'Sale Return',
        effects: [
            { target: 'Product stock', effect: 'ফেরত পরিমাণ আসল cost-এ ফিরে আসে।' },
            { target: 'Serial numbers', effect: 'Line-এর সবচেয়ে পুরনো Sold serial গুলো Returned হয়।' },
            { target: 'Contact ledger', effect: 'Due কমে (বা credit হয়)।' },
            { target: 'Payment account', effect: 'শুধু Refund চাপলে কমে।' },
            { target: 'Journal / report', effect: 'Revenue ও cost of goods উল্টায়।' },
        ],
    },
    {
        action: 'Purchase Receive',
        effects: [
            { target: 'Product stock ও cost', effect: 'Stock বাড়ে; Weighted Average Cost নতুন করে হয়।' },
            { target: 'Serial numbers', effect: 'প্রতি unit-এ একটা In-stock serial তৈরি (tracked product)।' },
            { target: 'Contact ledger', effect: 'অপরিশোধিত অংশে supplier payable বাড়ে।' },
            { target: 'Payment account', effect: 'দেওয়া প্রতিটা অঙ্কে কমে।' },
            { target: 'Journal / report', effect: 'Payables-এর বিপরীতে inventory; cash/bank-এর বিপরীতে payables।' },
        ],
    },
    {
        action: 'Purchase Cancel',
        effects: [
            { target: 'Product stock', effect: 'পরিমাণ বাদ যায়।' },
            { target: 'Serial numbers', effect: 'মুছে যায় (কোনোটা বিক্রি হলে আটকায়)।' },
            { target: 'Contact ledger / account / journal', effect: 'Payable, payment ও entry উল্টানো হয়।' },
        ],
    },
    {
        action: 'Purchase Return',
        effects: [
            { target: 'Product stock', effect: 'পরিমাণ stock থেকে বের হয়।' },
            { target: 'Serial numbers', effect: 'Line-এর সবচেয়ে পুরনো In-stock serial গুলো Disposed হয়।' },
            { target: 'Contact ledger', effect: 'Supplier payable কমে।' },
            { target: 'Payment account', effect: 'Supplier-এর ফেরত লিখলে তবেই বাড়ে।' },
            { target: 'Journal / report', effect: 'Inventory/payable উল্টায়।' },
        ],
    },
    {
        action: 'Advance সহ Sales Order',
        effects: [
            { target: 'Payment account', effect: 'Advance-এর অঙ্কে বাড়ে।' },
            { target: 'Contact ledger', effect: 'Customer credit/advance লেখা হয়।' },
            { target: 'Journal / report', effect: 'Customer Advances (liability)-এর বিপরীতে cash/bank।' },
            { target: 'Product stock', effect: 'Sale-এ convert না হওয়া পর্যন্ত অপরিবর্তিত।' },
        ],
    },
    {
        action: 'Paid Service / Installation request',
        effects: [
            { target: 'Payment account', effect: 'Charge-এর অঙ্কে বাড়ে (account বাছলে)।' },
            { target: 'Journal / report', effect: 'Service/Installation Income-এর বিপরীতে cash/bank।' },
            { target: 'Free service', effect: 'Free visit period-এর free-quota থেকে একটা খরচ করে; কিছু post হয় না।' },
        ],
    },
    {
        action: 'Expense / Other Income',
        effects: [
            { target: 'Payment account', effect: 'কমে (expense) বা বাড়ে (income)।' },
            { target: 'Journal / report', effect: 'Cash/bank-এর বিপরীতে expense বা income account।' },
        ],
    },
    {
        action: 'Customer waive / supplier discount',
        effects: [
            { target: 'Contact ledger', effect: 'Balance কমে; সবচেয়ে পুরনো unpaid document থেকে কাটে।' },
            { target: 'Payment account', effect: 'অপরিবর্তিত — টাকা নড়ে না।' },
            {
                target: 'Journal / report',
                effect: 'Waive: Sales Returns & Allowances বনাম receivable। Supplier discount: payables বনাম Other Income।',
            },
        ],
    },
    {
        action: 'Account transfer',
        effects: [
            { target: 'Payment account', effect: 'একটা কমে, অন্যটা সমান বাড়ে।' },
            { target: 'Journal / report', effect: 'দুটোর মধ্যে সমতল entry; net worth অপরিবর্তিত।' },
        ],
    },
    {
        action: 'Stock adjustment / Opening stock',
        effects: [
            { target: 'Product stock', effect: 'পার্থক্যের জন্য একটা increase/decrease movement (opening stock শুধু প্রথম movement-এর আগে)।' },
            { target: 'Journal / report', effect: 'Opening stock একটা opening-stock entry post করে।' },
        ],
    },
];

/** English `CHANGE_LOG` index-এর সাথে মিলিয়ে `note`। */
export const CHANGE_LOG_BN: string[] = [
    'Products ও Sales: Serial product-এর stock adjustment এখন unit ধরে হয় (হারানো unit টিক, পাওয়া serial লেখা) আর প্রতিটা stock adjustment হিসাবে যায়। নতুন Sale, Sales Order বা Purchase করার পর তালিকা পেজে ফেরে, details পেজে নয়। php artisan migrate চালান।',
    'Sales Orders: Add Sale ফর্মের নতুন "Sales Order" বাটন দিয়ে order রাখা যায় (stock বা serial যাচাই নেই)। তালিকায় শুধু অপেক্ষমাণ order দেখায়; "Confirm Sale" চাপলে পূর্ণ sale-ফর্মে খোলে, যা খুশি বদলে confirm করা যায়, তারপর order তালিকা থেকে সরে যায়। অপেক্ষমাণ থাকলে Dashboard-এ card দেখায়। php artisan migrate চালান।',
    'Settings ও Contacts: Bulk SMS এখন Business Settings → SMS থেকে সেট হয় (কোম্পানি বদলালে code বদলাতে হয় না), Send test বাটনসহ; Contacts → Send Notification এখন সত্যিই SMS পাঠায় এবং কারণসহ Sent/Failed লগ করে। Login পেজে Forgot-password লুকানো। Stat ও list card এখন একই ধাঁচের।',
    'Activity Log: login ও logout এখন রেকর্ড হয়। শুরুতে শেষ ৭ দিন দেখায় (আগের দিন দেখতে From / To বদলান)। Footer-এ এখন sahospos.com-এর লিঙ্ক।',
    'Purchases: Correct Price — মাল বিক্রি হয়ে গেলেও, unit/stock/serial না ছুঁয়ে শুধু Received purchase-এর দাম ঠিক করা যায়। Edit করা sale যে unit আবার বিক্রি করে সেগুলো আগের cost-ই ধরে রাখে, তাই গড় cost বদলালেও ওই sale-এর লাভ নড়ে না।',
    'Confirmed sale বা purchase এখন edit করা যায় (সবকিছু): পুরনোটা উল্টো entry দিয়ে উল্টে যায় আর সংশোধিতটা একই invoice-এ এক ধাপে লেখা হয়। ৩০ সেকেন্ডের Undo toast আর নেই; Edit বা Cancel Sale ব্যবহার করুন। Purchase cancel বা edit করলে তার দাম পণ্যের গড় cost থেকে বেরিয়ে যায়।',
    'নিরাপত্তা ও Serial: শুধু-নিজের-record user এখন ঠিকানা দিয়ে অন্যের sale/purchase খুলতে বা বদলাতে পারে না; report-অধিকার ছাড়া user Dashboard-এ দোকানের টাকার হিসাব দেখে না; Sale পেজ থেকে ভুল serial বদলানো ও ফেরত unit Restock করা যায়; confirm / cancel / payment এখন double-click-এ নিরাপদ।',
    'Add Sale, Draft Sales, Add Purchase ও Add Product আবার sidebar-এ ফিরেছে (এগুলো সারাদিন লাগে)। Low/Out of Stock Products-এর filter হিসেবেই থাকছে।',
    'Stock Report সরানো হয়েছে: Products পেজেই stock মূল্য, low/out-of-stock filter ও export আছে। পুরনো ঠিকানা Products-এ redirect করে।',
    'Balance Sheet, Cash Flow ও Trial Balance Payment Accounts থেকে Reports menu-তে গেছে, যাতে সব report এক জায়গায় থাকে।',
    'বিস্তৃত করা হয়েছে: module ধরে logic, serial/warranty/EMI/import/messaging-এর খুঁটিনাটি, লিঙ্কসহ troubleshooting, impact map।',
    'Sidebar ছোট করা হয়েছে: "Add …", Draft Sales, Low/Out of Stock ও Investors menu যথাক্রমে Quick Create, list filter ও Assets & Liabilities-এ গেছে।',
    'Add Service, Add Sale Return ও Add Purchase Return যোগ হয়েছে।',
    'System Guide যোগ হয়েছে।',
];
