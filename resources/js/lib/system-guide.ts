/**
 * Content of System Tools → System Guide. Hand-maintained against the real code: when a module's behaviour
 * changes, edit the entry here and add a CHANGE_LOG line — but only once the change is fully confirmed/shipped,
 * not while it is in progress.
 */
export interface GuideLink {
    label: string;
    href: string;
}

export interface GuideSection {
    title: string;
    points: string[];
}

export interface GuideTopic {
    key: string;
    group: string;
    label: string;
    summary: string;
    /** Pages this topic is about — the "go there" shortcuts. */
    links?: GuideLink[];
    sections: GuideSection[];
}

export interface TroubleshootingEntry {
    problem: string;
    why: string;
    fix: string;
    /** The topic that explains the underlying logic. */
    topic: string;
    where: GuideLink[];
}

export interface ImpactRow {
    action: string;
    effects: { target: string; effect: string }[];
}

export interface ChangeLogEntry {
    date: string;
    module: string;
    note: string;
}

export const GUIDE_TOPICS: GuideTopic[] = [
    // ───────────────────────────── Basics ─────────────────────────────
    {
        key: 'how-it-works',
        group: 'Basics',
        label: 'How the system thinks',
        summary: 'Five rules that explain almost every behaviour you will see. Read this first.',
        sections: [
            {
                title: 'Draft vs Confirmed',
                points: [
                    'A Draft/Quotation sale, a Draft/Ordered purchase and a Sales Order are only notes: no stock, ledger, account or journal changes yet.',
                    'Confirming (sale) or Receiving (purchase) is the moment everything moves — in one all-or-nothing step. If any part fails (for example a bad serial number), nothing at all is saved.',
                    'Only Draft/Quotation sales can be edited or deleted. A confirmed record is never edited.',
                ],
            },
            {
                title: 'Mistakes are corrected by adding, not editing',
                points: [
                    'Stock movements, contact-ledger rows, account transactions and journal entries are never edited or deleted. A correction is a new opposite entry: Return, Cancel (Undo), Stock Adjustment, or a Reversing journal entry.',
                    'Because of this, history always adds up and the Activity Log can show who did what.',
                ],
            },
            {
                title: 'Four places hold your numbers',
                points: [
                    'Product stock (current_stock) — how many units you hold.',
                    'Contact ledger — what each customer/supplier owes or is owed, with running balance.',
                    'Payment accounts — cash/bank/wallet balances.',
                    'Journal (Chart of Accounts) — the accounting books. Profit & Loss, Balance Sheet, Trial Balance and Cash Flow read ONLY from here.',
                    'Every confirm writes all the relevant ones together, so they agree. A nightly check (3:00 AM) compares them and logs a warning if they ever drift; the Dashboard shows a books-check banner.',
                ],
            },
            {
                title: 'Records are never hard-deleted once they carry money',
                points: [
                    'A product with any stock movement, sale, purchase or serial cannot be deleted — set it Inactive.',
                    'A contact with ledger history, sales, purchases or sales orders cannot be deleted — set it Inactive.',
                    'Closed accounting periods refuse new journal postings.',
                ],
            },
            {
                title: 'Menus follow permission',
                points: [
                    'Anything your role cannot use is hidden from the sidebar, Quick Create and Quick Actions. If a menu is missing, it is a permission, not a bug — see "Users, roles & permissions".',
                ],
            },
        ],
    },
    {
        key: 'dashboard',
        group: 'Basics',
        label: 'Dashboard',
        summary: 'Landing page: a live snapshot built from confirmed records for the chosen date range.',
        links: [{ label: 'Open Dashboard', href: '/dashboard' }],
        sections: [
            {
                title: 'What is on it',
                points: [
                    'Date range presets at the top (today, this month, custom…) drive the metrics and charts.',
                    'Metric cards and account balances.',
                    'Sales chart and Revenue-vs-Expense chart by month.',
                    'Low-stock widget (products at or below their minimum stock level).',
                    'Best sellers / purchases widget.',
                    'Follow-ups widget: overdue/upcoming dues to chase, with a Remind-on-WhatsApp button (opens WhatsApp, you press Send).',
                    'Setup checklist for a new install; ticked steps are struck through.',
                    'Books-check banner: appears if the nightly reconciliation found stock/ledger/journal disagreement.',
                ],
            },
            {
                title: 'Good to know',
                points: ['Drafts and quotations are not counted.', 'Cards and list rows link into the matching page.'],
            },
        ],
    },
    {
        key: 'header',
        group: 'Basics',
        label: 'Header & shortcuts',
        summary: 'The top bar and every keyboard shortcut.',
        links: [{ label: 'Quick Actions settings', href: '/business-settings' }],
        sections: [
            {
                title: 'Header',
                points: [
                    'Sidebar toggle and breadcrumbs (left).',
                    '"+" Quick Create: New Customer/Supplier, Sale, Purchase, Sales Order, Sale Return, Purchase Return, Service, Product, Expense, Asset.',
                    'Search button: global search over products, contacts, sales, purchases and expenses.',
                    'Fullscreen toggle and the account menu (profile, appearance, logout).',
                ],
            },
            {
                title: 'Keyboard shortcuts',
                points: [
                    'Ctrl/⌘ + K — global search. ↑ ↓ move, Enter opens, Esc closes.',
                    'Ctrl/⌘ + B — collapse/expand the sidebar.',
                    'Ctrl + Space — Quick Actions. Keep Ctrl held and press Space again to step to the next action (Shift+Space steps back), release Ctrl to open the highlighted one, Esc cancels.',
                    'Which Quick Actions show, and their order, is set in Business Settings → Quick Actions. Add Service, Add Sale Return and Add Purchase Return exist but start switched off.',
                    '? — shortcut reference (when not typing in a field).',
                    'Add/Edit Sale: F2 product search, F4 jump to Payment, Enter confirm & save (when not typing in a field), Esc cancel.',
                    'List pages: Enter in the search box searches immediately.',
                ],
            },
        ],
    },
    {
        key: 'roles',
        group: 'Basics',
        label: 'Users, roles & permissions',
        summary: 'Who can see and do what.',
        links: [
            { label: 'Users', href: '/roles?tab=users' },
            { label: 'Roles', href: '/roles?tab=roles' },
        ],
        sections: [
            {
                title: 'How it works',
                points: [
                    'Every permission is "module.action", e.g. product.view, sale.create, contact.payment, account.transfer.',
                    'Modules: product, contact, sale, purchase, expense, account, accounting, asset, finance (investors & loans), staff, service, report, financial_position, import, backup, activity_log, settings, role.',
                    "Sale and purchase use view_own (only records the user created) and view_all (everyone's).",
                    'Default roles: Admin (everything), Manager, Cashier (sale.create, sale.view_own, product.view) and a limited staff role. Edit or add roles in User Management → Roles.',
                    'The sidebar only hides menus; the server also refuses direct URL access (HTTP 403) to a module the user lacks.',
                ],
            },
            {
                title: 'Common cases',
                points: [
                    'Returns use sale.create / purchase.create. Service uses service.*. Bills (receive/pay/discount) use contact.payment.',
                    'Business Settings and Invoice Settings need settings.manage; Backups need backup.manage; Import needs import.view.',
                ],
            },
        ],
    },

    // ───────────────────────────── Selling ─────────────────────────────
    {
        key: 'sales',
        group: 'Selling',
        label: 'Sales',
        summary: 'Draft → Confirmed sale, payments, cancel/undo, and what each status means.',
        links: [
            { label: 'Sales', href: '/sales' },
            { label: 'Add Sale', href: '/sales/create' },
            { label: 'Drafts', href: '/sales?status=draft' },
        ],
        sections: [
            {
                title: 'Statuses',
                points: [
                    'Draft / Quotation — editable and deletable; no effect on stock, ledger or accounts. A quotation can carry a "valid until" date.',
                    'Confirmed — the sale is real. Fix it with Edit (see below); it is never changed behind the books.',
                    'Cancelled — a confirmed sale that was undone (see below).',
                    'Payment status is separate: Due → Partial → Paid, worked out from the amounts received.',
                    'Source: Manual (entered normally) or Imported (historical record — see Import).',
                ],
            },
            {
                title: 'What Confirm does (in order, all-or-nothing)',
                points: [
                    "Locks each product row and reduces stock; records each line's cost at that moment (so profit stays right even if cost changes later).",
                    'Serial-tracked products: assigns the exact serial numbers you typed and marks them Sold (see Serial numbers).',
                    "Warranty: each line gets a warranty-expiry date = sale date + warranty months (the line's own value, else the product's).",
                    "Free-service plan: the product's service periods are copied onto the sold line with real dates (see Warranty & service).",
                    'Installation: a line marked "installation required" automatically creates an Installation service request.',
                    'Payments entered on the form go to the chosen accounts (split across several accounts is allowed).',
                    "Whatever is not paid becomes the customer's due in the contact ledger.",
                    'A journal entry is posted: cash/bank and receivable against revenue, plus cost of goods sold against inventory.',
                    'EMI sale: the installment schedule is created (see EMI).',
                ],
            },
            {
                title: 'Taking more money later',
                points: [
                    '"Add Payment" on a confirmed sale with a due amount: choose account(s) and amount. Updates the account, the customer ledger and the journal, and moves the sale toward Paid.',
                    '"View Payments" lists every payment on the sale.',
                    'For a customer with many unpaid invoices use Bills → Bill Receive instead.',
                ],
            },
            {
                title: 'Edit and cancel a confirmed sale',
                points: [
                    'Edit (needs the sale edit permission): the form opens with the sale, its payments and its serials. Give a reason and save. The system reverses the old sale — stock, serials, the customer due, the payments and the journal, with new opposite entries — and records the corrected one on the same invoice number, all in one step. If it cannot be completed (not enough stock, a serial not in stock, a closed period) nothing changes at all.',
                    'Edit is closed for a sale that has a Sale Return, a paid EMI installment, a warranty claim, a service visit, a waived discount, or that is a historical (imported) record.',
                    'Cancel Sale (with a confirmation): reverses the sale the same way and keeps it on file as Cancelled. To correct a mistake use Edit, not Cancel. A sale that already has a return cannot be cancelled as a whole.',
                    'Imported historical sales reverse nothing (they never moved stock or money).',
                ],
            },
            {
                title: 'Other things on the sale page',
                points: [
                    'Print Invoice (A4 or thermal if enabled in Business Settings), Send WhatsApp (opens WhatsApp with the message prefilled — see Messaging), Sale Return, and the Delete/Edit actions for drafts.',
                    'Invoice numbers come from the prefix and next-number in Business Settings.',
                ],
            },
        ],
    },
    {
        key: 'sales-orders',
        group: 'Selling',
        label: 'Sales orders',
        summary: 'Book an order with an optional advance; deliver later.',
        links: [
            { label: 'Sales Orders', href: '/sales-orders' },
            { label: 'New Sales Order', href: '/sales-orders/create' },
        ],
        sections: [
            {
                title: 'Logic',
                points: [
                    'Creating an order moves NO stock. If you take an advance, that cash moves into the chosen account, the customer ledger and the journal as a liability (Customer Advances) — you owe goods or a refund.',
                    'Statuses: Pending → Partial → Completed, or Cancelled.',
                    'There is no separate order form. Fill the normal Add Sale form (discounts, installation, warranty and service plan, serial numbers, EMI) and press the "Sales Order" button instead of Confirm. Use it when the goods are not in hand yet: stock is not reduced, serial numbers are NOT checked, and any payment rows are kept as an advance.',
                    'The Sales Orders list shows only orders still waiting; each row has "Confirm Sale". It opens the order in the full sale form — change anything (items, prices, serials, EMI, payment) and press Confirm Sale. Serial numbers are checked against stock only now. The order then leaves the list (pick a status or All to see old ones).',
                    'The Dashboard shows a "Sales orders waiting" card with a Confirm link while any order is open; with none, the card is not shown.',
                    'Converting to a sale creates and confirms a real sale through the normal Confirm flow, so stock/ledger/journal move then. The advance is folded in automatically and not recorded twice; only extra money collected at delivery is a new payment.',
                ],
            },
        ],
    },
    {
        key: 'sale-returns',
        group: 'Selling',
        label: 'Sale returns',
        summary: 'Customer brings goods back.',
        links: [
            { label: 'Sale Returns', href: '/sale-returns' },
            { label: 'New Sale Return', href: '/sale-returns/create' },
        ],
        sections: [
            {
                title: 'Logic',
                points: [
                    'Start from a confirmed sale; choose lines and quantities. The quantity cannot exceed what is still unreturned on that line.',
                    "Return value = quantity × the price actually charged, minus the line's share of any invoice discount, plus a refundable share of installation.",
                    "Stock goes back in at the original cost; the customer's due is reduced (or credit created); the journal reverses revenue and cost of goods.",
                    'Serial products: the page does not ask which serial — the oldest still-Sold serials on that line are marked Returned.',
                    'A Returned serial is not back In stock by itself, and a sale only accepts In-stock serials. Once the unit is physically back on the shelf, open the sale and press Restock next to that serial.',
                    'Refund cash later with the Refund button on the return (choose the account).',
                ],
            },
        ],
    },
    {
        key: 'emi',
        group: 'Selling',
        label: 'EMI / installments',
        summary: 'Sell on installments with optional interest. Needs the EMI module switched on.',
        links: [
            { label: 'EMI Installments', href: '/emi-installments' },
            { label: 'Modules switch', href: '/business-settings' },
        ],
        sections: [
            {
                title: 'Setup',
                points: [
                    'Business Settings → Modules → "EMI Module". Off by default; when off, EMI menus and options are hidden.',
                    'On the product, tick "EMI available". On the sale choose payment type EMI and set: interest method, annual rate, frequency, tenure.',
                ],
            },
            {
                title: 'What is financed',
                points: [
                    'Only products marked for EMI are financed. Other lines (wiring, brackets…) and the installation charge are billed on the same invoice but are never part of the installments and earn no interest.',
                    'Money paid at confirm covers the non-EMI items first, then installation if "collected up front" is chosen; whatever is left over counts as down payment on the EMI items.',
                    'Financed amount = EMI items − down payment. Interest applies to this only.',
                ],
            },
            {
                title: 'Interest methods',
                points: [
                    'None — financed amount split evenly.',
                    'Flat — simple interest on the full financed amount for the whole tenure, split evenly.',
                    'Reducing — bank-style equal installments, interest on the balance still owed.',
                    'Frequency: weekly, monthly or quarterly. Tenure in days/weeks/months/years; number of installments is rounded up. Due dates are counted from the first due date (a 31st does not slide to the 28th permanently).',
                    'All maths is done in whole paisa so installments add up exactly; any 1-paisa difference is spread across installments.',
                ],
            },
            {
                title: 'Collecting & status',
                points: [
                    "EMI Installments page lists every installment. Pay one: choose account and amount (cannot exceed what is left of that installment). Money goes to the account, the customer ledger and the journal against receivable, and the sale's paid/due totals update.",
                    'Statuses: Pending → Paid, or Overdue, or Cancelled.',
                    "A scheduled job runs daily at 12:30 AM and marks past-due Pending installments Overdue and creates an in-app due-payment notification. (The server's scheduler must be running.)",
                    'Cancelling the sale voids installments not yet paid; paid ones stay as history.',
                    'Installments can be exported to Excel from the page.',
                ],
            },
        ],
    },
    {
        key: 'serial',
        group: 'Selling',
        label: 'Serial numbers',
        summary: 'Tracking each physical unit: when to enter, what is checked, and what a wrong entry does.',
        links: [
            { label: 'Modules switch', href: '/business-settings' },
            { label: 'Products', href: '/products' },
        ],
        sections: [
            {
                title: 'Turn it on',
                points: [
                    'Business Settings → Modules → "Serial Number Tracking" (shop-wide), AND on each product tick "Track serial number" (Product form → Service & Warranty).',
                    'If the shop switch is off the sale form shows no serial box — and a tracked product then cannot be confirmed (the count check below fails). Keep it on if you use any tracked product.',
                ],
            },
            {
                title: 'When to enter — receiving stock (Purchase)',
                points: [
                    'In the Purchase, click Confirm/Receive. A box appears for EVERY unit of every tracked item (quantity 5 = 5 serial boxes).',
                    'You must give exactly one unique serial per unit. A serial that already exists for that product is refused. Nothing is received until all are valid.',
                    'Each serial is stored with status In stock.',
                    'Opening stock (product form or import) does not ask for serials; for tracked products receive stock through a Purchase so each unit gets a serial.',
                ],
            },
            {
                title: 'When to enter — selling (Sale)',
                points: [
                    'In the Add Sale form, under a tracked product line, type the serials comma-separated (e.g. A1001, A1002). The count must equal the quantity and all must be different.',
                    'On Confirm each serial must exist for that product AND be In stock. Then it becomes Sold and is attached to that sale line (and so to the customer, the warranty and the service history).',
                    'If any serial fails, the whole sale is not confirmed, nothing moves, and the message appears under that line.',
                ],
            },
            {
                title: 'Statuses',
                points: [
                    'In stock — on your shelf, can be sold.',
                    'Sold — attached to a sale line.',
                    'Returned — customer returned it (sale return).',
                    'Under warranty service — reserved for a unit being serviced.',
                    'Disposed — returned to the supplier (purchase return).',
                ],
            },
            {
                title: 'If you entered the WRONG serial on a sale',
                points: [
                    'Typo / serial that does not exist or is not In stock: the sale is refused with an error. Fix the text and confirm again — nothing was changed.',
                    'Wrong but valid serial (a different In-stock unit of the same product): the sale confirms. The system cannot know which box you physically handed over, so the invoice, warranty and service history now point to the wrong unit.',
                    'On the sale page, press the pencil next to the serial, enter the serial of the unit that was really handed over and confirm. The wrong unit goes back In stock, the real one becomes Sold on that line, and the invoice, warranty and service history follow it. No money or stock quantity changes. Needs the sale edit permission.',
                    'The change is allowed only for a Sold unit of a Confirmed sale, and only to an In-stock serial of the same product. A returned unit is restocked instead (see below). Undo (about 30 seconds after confirming) still reverses the whole sale if the sale itself was wrong.',
                    'Never cancel a sale that already has a return — the system blocks it.',
                    'So: scan/verify the serial against the box before pressing Confirm.',
                ],
            },
            {
                title: 'Other rules',
                points: [
                    'Cancelling a purchase that received tracked units is blocked if any of those serials were already sold or moved; otherwise its serials are removed.',
                    'Cancelling a sale puts its serials back In stock.',
                    'A purchase return marks the oldest In-stock serials of that line Disposed.',
                    'A product with any serial can never be deleted — only made Inactive.',
                    'The serial → sale line → customer → warranty → service history chain is how a warranty claim is traced to a unit.',
                ],
            },
        ],
    },
    {
        key: 'warranty-service',
        group: 'Selling',
        label: 'Warranty, service & installation',
        summary: 'How warranty dates, free service visits, paid service and installation work.',
        links: [
            { label: 'Service Requests', href: '/service-requests' },
            { label: 'Add Service', href: '/service-requests/create' },
            { label: 'Warranty Claims', href: '/warranty-claims' },
        ],
        sections: [
            {
                title: 'Set it up on the product',
                points: [
                    'Product form → Service & Warranty: warranty period in months, "has installation service", "track serial number", "EMI available", and the free-service plan.',
                    'Free-service plan = ordered periods, each with months and a free-visit quota. Example: AC — period 1: 12 months, 2 free visits; period 2: 12 months, 0 free (paid).',
                    'Editing a plan later never changes units already sold: the plan is copied onto the sold line at confirm time.',
                ],
            },
            {
                title: 'At sale time',
                points: [
                    "Each line can set its own warranty months (e.g. an old invoice) and whether the service plan is included; otherwise the product's values apply.",
                    'Warranty expiry = sale date + months, saved on the sold line.',
                    'Service periods get real start/end dates, one after another from the sale date.',
                    'A line with "installation required" automatically creates an Installation request; its charge is already part of the invoice.',
                ],
            },
            {
                title: 'Service requests',
                points: [
                    'Add Service: find the invoice by number, customer name or phone, pick the sold item and type (Service or Installation), date, technician (Staff, active only).',
                    'Service is FREE if the sold unit is inside a current service period that still has free visits left; otherwise it is paid. The server decides this — the form cannot force it free.',
                    'Installation is never free; its charge (if any) is billed on that request.',
                    'A paid request with an account selected posts the charge at creation: money into the account and Service/Installation Income in the journal.',
                    'Status flow: Pending → Scheduled → Completed, or Cancelled. Completed and Cancelled are final — make a new request instead.',
                ],
            },
            {
                title: 'Warranty claims',
                points: [
                    'Warranty Claims page: search an invoice or customer, pick the sold item, describe the issue.',
                    'Statuses: Pending → In progress → Resolved or Rejected, with a resolution note.',
                    'A claim is a record only: it moves no stock and no money. If a repair is charged, record a Service request.',
                    "The list shows the item's warranty expiry so you can see at a glance if it is in or out of warranty.",
                ],
            },
        ],
    },

    // ───────────────────────────── Buying & stock ─────────────────────────────
    {
        key: 'purchases',
        group: 'Buying & stock',
        label: 'Purchases',
        summary: 'Receive stock from suppliers and track what you owe them.',
        links: [
            { label: 'Purchases', href: '/purchases' },
            { label: 'Add Purchase', href: '/purchases/create' },
        ],
        sections: [
            {
                title: 'Statuses',
                points: [
                    'Draft → Ordered → Received (confirmed) → or Cancelled. Draft/Ordered are edited freely; a Received purchase is edited with Edit (the receipt is taken out and received again — see Cancel).',
                ],
            },
            {
                title: 'What Receive does',
                points: [
                    "Recalculates each product's Weighted Average Cost from the old stock and the new batch, then increases stock.",
                    'Tracked products: asks for one serial per unit (see Serial numbers).',
                    'Payments at receipt go out of the chosen account(s); you can also apply existing supplier credit.',
                    'The unpaid rest becomes the supplier payable in the contact ledger.',
                    'Journal: inventory against payables, and payables against cash/bank for what was paid.',
                ],
            },
            {
                title: 'Cancel',
                points: [
                    'Reverses a received purchase with new opposite entries (stock out, payable and payments reversed, journal reversed).',
                    'Blocked if a purchase return exists, or if any serial from it was already sold.',
                    'Later payments: use "Add payment" on the purchase, or Bills → Bill Pay.',
                    'Edit a received purchase (needs the purchase edit permission): give a reason and save. The receipt is taken out (stock, serials, the average cost given back, supplier payable, payments, journal — with opposite entries) and the corrected one is received on the same invoice, in one step. The quantity cannot go below what was already sold from it, sold serials cannot be changed, and it is closed once a return, a supplier discount or applied supplier credit exists. Any failure leaves the purchase exactly as it was.',
                    'Correct Price (purchase edit permission): when only the PRICE was wrong, even if part of the goods is already sold, use "Correct Price" on the purchase. Quantity, stock and serial numbers are not touched; the supplier payable moves by the difference, the part that belongs to units still on the shelf changes the Inventory value and the average cost, and the part for units already sold is a cost variance (one adjustment entry dated today). Earlier sales keep the cost they were sold at. It cannot take the total below what is already paid, and it is closed once a return exists.',
                ],
            },
        ],
    },
    {
        key: 'purchase-returns',
        group: 'Buying & stock',
        label: 'Purchase returns',
        summary: 'Send goods back to a supplier.',
        links: [
            { label: 'Purchase Returns', href: '/purchase-returns' },
            { label: 'New Purchase Return', href: '/purchase-returns/create' },
        ],
        sections: [
            {
                title: 'Logic',
                points: [
                    'From a received purchase choose lines and quantities (not above what is left to return).',
                    'Stock goes out; the supplier payable falls (or a refund is owed); the journal reverses inventory/payable.',
                    'Serial products: the oldest In-stock serials of that line are marked Disposed.',
                    "Record the supplier's cash refund with the Refund button (choose the account that receives it).",
                ],
            },
        ],
    },
    {
        key: 'products-stock',
        group: 'Buying & stock',
        label: 'Products & stock',
        summary: 'Catalogue, stock rules, opening stock, adjustments and stock reports.',
        links: [
            { label: 'Products', href: '/products' },
            { label: 'Low stock', href: '/products?stock_status=low_stock' },
            { label: 'Out of stock', href: '/products?stock_status=out_of_stock' },
            { label: 'Categories', href: '/categories' },
            { label: 'Units', href: '/units' },
            { label: 'Brands', href: '/brands' },
        ],
        sections: [
            {
                title: 'Product basics',
                points: [
                    'Name, SKU, barcode, category, brand, unit, selling price, minimum stock level (drives the low-stock alert), manage-stock, for-sale and active flags.',
                    'Category, Brand and Unit can be created from their own pages or while importing.',
                    'Low / out of stock are filters on the Products list (stock status), also linked from the Dashboard.',
                ],
            },
            {
                title: 'How stock changes',
                points: [
                    'Only through: Purchase receive (+), Sale confirm (−), Sale return (+), Purchase return (−), cancel/undo (reverse), Opening stock, and Stock adjustment.',
                    'Each change writes a stock-movement row with type, quantity, reference and unit cost. Rows are never edited.',
                    'Stock is decreased while the product row is locked, so two cashiers cannot oversell the same last unit.',
                    'Average cost is a Weighted Average, recalculated on each purchase.',
                ],
            },
            {
                title: 'Opening stock',
                points: [
                    'Entered on the product form or through the Opening Stock import. Allowed only while the product has no movements yet; afterwards it is locked.',
                    'Posts an opening-stock journal entry so the books match.',
                ],
            },
            {
                title: 'Correcting stock',
                points: [
                    'Stock adjustment: enter the counted quantity; the system records the difference as one increase or decrease movement. This is the only way to fix stock once movements exist. The difference is valued at the average cost and posted to the books (Inventory against "Stock Adjustment Loss/Gain"), so the Inventory account keeps matching the stock.',
                    'Serial-tracked products are adjusted unit by unit, with no typed count: tick the in-stock serials that are gone (lost, stolen, damaged) — they become "Written off" and stock drops by that many — and/or type the serials of units that were found, which enter stock as In stock. The serial list and the stock therefore always stay equal. A serial that is not in stock cannot be written off, and a serial that already exists cannot be added.',
                ],
            },
            {
                title: 'Deleting',
                points: [
                    'Blocked if the product has any movement, sale, purchase or serial — mark it Inactive instead (hidden from selling, kept in history).',
                ],
            },
        ],
    },

    // ───────────────────────────── People & money ─────────────────────────────
    {
        key: 'contacts',
        group: 'People & money',
        label: 'Contacts & ledger',
        summary: 'Customers, suppliers, running balance, discounts and credit.',
        links: [
            { label: 'Customers', href: '/contacts?type=customer' },
            { label: 'Suppliers', href: '/contacts?type=supplier' },
            { label: 'Customer groups', href: '/customer-groups' },
            { label: 'Due report', href: '/reports/due' },
        ],
        sections: [
            {
                title: 'Contact types',
                points: [
                    'Customer, Supplier or Both. Same phone + same type is treated as a duplicate (important for import).',
                    'Business contacts can have a business name. Opening balance can be entered once at creation.',
                ],
            },
            {
                title: 'The ledger',
                points: [
                    'Every sale invoice, payment, return, discount, adjustment and refund is a row with a running balance. Positive/negative follows the contact type (customer owes you vs. you owe supplier).',
                    'The contact page shows the ledger, filterable and exportable.',
                    'A negative customer balance is credit (they paid in advance or overpaid).',
                ],
            },
            {
                title: 'Special actions',
                points: [
                    'Waive due / customer discount: forgives part of what a customer owes, taken off the oldest unpaid invoices first. No cash moves. Posts against "Sales Returns & Allowances" and receivable.',
                    'Supplier discount: the mirror — reduces what you owe a supplier, no cash moves; posts against payables and Other Income.',
                    "Refund credit: hand a customer's credit back as cash from an account.",
                    'The same discount screens are reachable from Bills → Add Discount.',
                ],
            },
            {
                title: 'Deleting',
                points: [
                    'Only possible for a contact with no ledger, sales, purchases or orders. Otherwise set Inactive. Bulk delete skips the ones that cannot be deleted and tells you how many.',
                ],
            },
        ],
    },
    {
        key: 'bills',
        group: 'People & money',
        label: 'Bills (receive / pay / discount)',
        summary: 'Collect from or pay a contact without opening each invoice.',
        links: [
            { label: 'Bill Receive', href: '/bills/receive' },
            { label: 'Bill Pay', href: '/bills/pay' },
            { label: 'Add Discount', href: '/bills/discount' },
        ],
        sections: [
            {
                title: 'Logic',
                points: [
                    'Receive ("Pay Due Amount"): choose a customer, the account(s) and amount. The money is applied to their oldest unpaid invoices first, the ledger and the account are updated and a journal entry is posted.',
                    "Pay: same for a supplier's purchases.",
                    'Discount: ledger-level forgiveness, no money moves (see Contacts & ledger).',
                    'Needs the contact.payment permission.',
                ],
            },
        ],
    },
    {
        key: 'messaging',
        group: 'People & money',
        label: 'WhatsApp, SMS & email',
        summary: 'What is really connected today — read this before promising customers automatic messages.',
        links: [
            { label: 'Contacts', href: '/contacts' },
            { label: 'Sales', href: '/sales' },
        ],
        sections: [
            {
                title: 'WhatsApp from a sale',
                points: [
                    'Sales → row action "Send WhatsApp Notification" (or the sale page) opens WhatsApp Web/App with the invoice message already typed for the customer\'s number.',
                    'Bangladeshi numbers beginning with 0 are converted to 880… automatically.',
                    'It is a click-to-chat link: YOU must press Send. No WhatsApp Business API is configured, so nothing is sent automatically.',
                ],
            },
            {
                title: 'Bulk "Send Notification" from Contacts',
                points: [
                    'Select contacts → Send Notification → choose SMS, WhatsApp or Email and write the message. Email is disabled for contacts without an email.',
                    'SMS is really sent through your SMS company once you set it up in Business Settings → SMS (gateway URL, API key, sender ID and the parameter names your company uses; use "Send test" to check). Each message is logged Sent or Failed, and a failure keeps its reason (no phone number, company refused it, ...).',
                    'WhatsApp and Email are only recorded for now (marked Pending, never Sent) — no gateway is connected for them.',
                    'If SMS is switched off or has no gateway URL, the dialog says so and SMS cannot be sent.',
                ],
            },
            {
                title: 'In-app notifications (these do work)',
                points: [
                    'A daily job (5:00 AM) generates notifications for low stock, due payments, loan repayments and expense dues; overdue EMI installments also raise a due-payment notice.',
                    'They need the server scheduler (see Scheduled jobs).',
                ],
            },
        ],
    },
    {
        key: 'expenses-income',
        group: 'People & money',
        label: 'Expenses & other income',
        summary: 'Money going out for running costs and money coming in that is not a sale.',
        links: [
            { label: 'Expenses', href: '/expenses' },
            { label: 'Expense categories', href: '/expense-categories' },
            { label: 'Other income', href: '/other-income' },
        ],
        sections: [
            {
                title: 'Logic',
                points: [
                    'An expense reduces the chosen payment account and posts expense account against cash/bank in the journal. Other income does the reverse.',
                    'Each has categories (managed on their own pages); each category maps to an accounting account.',
                    'Both pages have an Add modal that also opens from Quick Create / Quick Actions, and an Excel export.',
                    'Nothing posted is silently erased: removing an other-income record first undoes its account movement and reverses its journal entry.',
                ],
            },
        ],
    },
    {
        key: 'accounts',
        group: 'People & money',
        label: 'Payment accounts & transfers',
        summary: 'Cash, bank and wallet accounts: balances, statements and moving money between them.',
        links: [
            { label: 'Accounts', href: '/accounts' },
            { label: 'Financial position', href: '/reports/financial-position' },
        ],
        sections: [
            {
                title: 'Accounts',
                points: [
                    'Account types (cash, bank, mobile wallet…) are managed on the account-types page. Account numbers are stored encrypted.',
                    'Creating an account automatically creates its matching sub-account in the Chart of Accounts — you never map it by hand.',
                    'Every money event (sale payment, purchase payment, expense, bill, EMI, service charge…) is an account transaction with a date. Each account has a statement.',
                    'Balance only changes through these transactions, never by editing the number.',
                ],
            },
            {
                title: 'Transfers',
                points: [
                    'Move money between two of your own accounts (needs account.transfer). One account is reduced, the other increased by the same amount, and one balanced journal entry is posted. Net worth does not change.',
                ],
            },
            {
                title: 'Financial position',
                points: ['A single view of cash/bank balances, receivable, payable and stock value (needs financial_position.view).'],
            },
        ],
    },
    {
        key: 'accounting',
        group: 'People & money',
        label: 'Accounting books',
        summary: 'Chart of Accounts, journal entries and periods — the source of truth for financial reports.',
        links: [
            { label: 'Chart of Accounts', href: '/chart-of-accounts' },
            { label: 'Journal Entries', href: '/journal-entries' },
            { label: 'Accounting Periods', href: '/accounting-periods' },
            { label: 'Trial Balance', href: '/reports/trial-balance' },
        ],
        sections: [
            {
                title: 'Rules',
                points: [
                    'Every money action posts a balanced journal entry (total debit = total credit) in the same step as the operational change.',
                    'A journal entry is never edited or deleted. Fix a mistake by reversing it (a new opposite entry).',
                    'A closed accounting period refuses any new posting dated inside it. Closing is a one-way action by an authorised user; check you are done before closing.',
                    'The General Ledger of any account can be opened from the Chart of Accounts.',
                    'Journal entries can be exported to Excel.',
                ],
            },
            {
                title: 'Typical postings',
                points: [
                    'Sale: Dr cash/bank + receivable, Cr sales revenue; Dr cost of goods sold, Cr inventory.',
                    'Purchase: Dr inventory, Cr payables; payment Dr payables, Cr cash/bank.',
                    'Expense: Dr expense, Cr cash/bank. Service charge: Dr cash/bank, Cr service income.',
                    'Sales order advance: Dr cash/bank, Cr customer advances (liability).',
                ],
            },
        ],
    },
    {
        key: 'finance-others',
        group: 'People & money',
        label: 'Assets, liabilities, investors, loans, staff',
        summary: 'The non-trading money modules.',
        links: [
            { label: 'Assets', href: '/assets' },
            { label: 'Other liabilities', href: '/other-liabilities' },
            { label: 'Investors', href: '/investors' },
            { label: 'Company loans', href: '/company-loans' },
            { label: 'Staff', href: '/staff' },
        ],
        sections: [
            {
                title: 'Shared idea',
                points: [
                    'Assets, Other Liabilities, Investors and Company Loans each have their own balance with a transaction history ("ledger"); every transaction also moves a payment account and posts a journal entry.',
                    'They sit together under the sidebar menu "Assets & Liabilities" (Investors and Loans need finance.view; Assets and Liabilities need asset.view).',
                    'Loans raise repayment reminders in notifications.',
                ],
            },
            {
                title: 'Staff',
                points: [
                    'Staff are employees/technicians. Each has a staff ledger; transactions are of admin-defined types (salary, advance, bonus…), each type has a "nature" that decides how the journal is posted.',
                    'Active staff appear in the technician picker on service requests.',
                ],
            },
        ],
    },

    // ───────────────────────────── Data & admin ─────────────────────────────
    {
        key: 'import',
        group: 'Data & admin',
        label: 'Import (Excel / CSV)',
        summary: 'Bring in products, contacts, opening stock and old sales safely.',
        links: [{ label: 'Import Tools', href: '/imports' }],
        sections: [
            {
                title: 'Flow',
                points: [
                    'Import Tools → pick a type → download the template (the header row is the exact format) → fill it → upload (.xlsx, .xls, .csv; max 10 MB).',
                    'A preview step shows what will be created or skipped and the row errors; nothing is saved until you press Confirm. Discard throws the preview away (previews also expire).',
                    'A file missing a required column is rejected with the column names. Phones, SKUs and barcodes are read as text so Excel does not mangle them.',
                ],
            },
            {
                title: 'Recommended order',
                points: ['1) Contacts  2) Products  3) Opening Stock  4) Historical Sales (optional).'],
            },
            {
                title: 'Products',
                points: [
                    'Required: name, sku, category, unit, selling_price. Optional: brand, barcode, opening_stock, opening_stock_cost, minimum_stock_level, warranty_period_months.',
                    'Category, unit and brand are created if missing. A row whose SKU already exists is skipped.',
                ],
            },
            {
                title: 'Contacts',
                points: [
                    'Required: name, phone, type (customer / supplier / both). Optional: email, address, business_name, opening_balance. Same phone + type is skipped as duplicate.',
                ],
            },
            {
                title: 'Opening stock',
                points: [
                    'Required: sku, quantity, unit_cost. The product must exist and have no stock movement yet. Posts the opening-stock journal.',
                    'Serial numbers cannot be imported — for tracked products receive through a Purchase.',
                ],
            },
            {
                title: 'Historical sales',
                points: [
                    'Rows with the same invoice_no become one sale. Always saved as source "Imported" (historical record): it moves NO stock, ledger, account or journal — because opening stock already reflects today\'s quantity.',
                    'A product not found by SKU/name is never auto-created; that whole invoice is skipped.',
                    'The order total in the file is cross-checked but never blocks the import.',
                ],
            },
        ],
    },
    {
        key: 'export',
        group: 'Data & admin',
        label: 'Export (Excel)',
        summary: 'Download list data as Excel.',
        sections: [
            {
                title: 'Where',
                points: [
                    'An Export button on: Sales, Purchases, Sales Orders, Sale Returns, Purchase Returns, Products, Contacts, Contact ledger, Expenses, Other Income, Assets, Investors, Company Loans, Other Liabilities, EMI Installments, Service Requests, Warranty Claims and Journal Entries.',
                    'The export follows the filters currently applied on the page (date range, status, search) — filter first, then export.',
                    'Import templates are separate downloads on the Import Tools page.',
                ],
            },
        ],
    },
    {
        key: 'backups',
        group: 'Data & admin',
        label: 'Backups',
        summary: 'Protect and restore your data.',
        links: [{ label: 'Backups', href: '/backups' }],
        sections: [
            {
                title: 'Logic',
                points: [
                    'Backups page (needs backup.manage): create a backup now, download (the zip holds the database and the uploaded images/files), restore an existing one, delete. Uploading a backup file is not possible.',
                    'Automatic: backup runs daily at 1:00 AM, old backups are cleaned at 1:30 AM and monitored at 2:00 AM — only if the server scheduler is running.',
                    "Restore replaces current data with the backup's. Take a fresh backup first, and tell everyone to stop working while it runs.",
                ],
            },
        ],
    },
    {
        key: 'activity-log',
        group: 'Data & admin',
        label: 'Activity log',
        summary: 'Who changed what, when.',
        links: [{ label: 'Activity Log', href: '/activity-log' }],
        sections: [
            {
                title: 'Logic',
                points: [
                    'Records created / updated / deleted events with the user, the record and the before/after values, and every login and logout (who, when, from which address and browser). It opens on the last 7 days so the page stays quick; change From / To to look further back (clear a date to see everything). Filter by user, record type and action (including Login / Logout).',
                    'Old entries are pruned monthly according to "Activity log retention (months)" in Business Settings.',
                ],
            },
        ],
    },
    {
        key: 'settings',
        group: 'Data & admin',
        label: 'Business & invoice settings',
        summary: 'Shop details, numbering, modules, look and layout.',
        links: [
            { label: 'Business Settings', href: '/business-settings' },
            { label: 'Invoice Settings', href: '/invoice-settings' },
        ],
        sections: [
            {
                title: 'Business Settings tabs',
                points: [
                    'Shop info (name, logo, address, phone, currency symbol) and invoice/purchase/sales-order prefixes with next numbers.',
                    'Modules: thermal printer, EMI module, serial number tracking.',
                    'Fiscal year start month; pagination options; activity-log retention; theme colour.',
                    'Sidebar Menu Organizer: reorder menus/sub-menus for everyone. Quick Actions: choose and order Ctrl+Space actions.',
                    'License key and status (the key is stored encrypted).',
                ],
            },
            {
                title: 'Invoice Settings',
                points: ['Controls what appears on the printed invoice and its layout.'],
            },
        ],
    },
    {
        key: 'reports',
        group: 'Data & admin',
        label: 'Reports',
        summary: 'Which report reads from where.',
        links: [
            { label: 'Profit & Loss', href: '/reports/profit-loss' },
            { label: 'Balance Sheet', href: '/reports/balance-sheet' },
            { label: 'Trial Balance', href: '/reports/trial-balance' },
            { label: 'Cash Flow', href: '/reports/cash-flow' },
            { label: 'Due report', href: '/reports/due' },
            { label: 'Trending products', href: '/reports/trending-products' },
        ],
        sections: [
            {
                title: 'Two families',
                points: [
                    'Financial statements — Profit & Loss, Balance Sheet, Trial Balance, Cash Flow: read ONLY the journal. If a sale/expense is "missing" here, check its journal entry and its accounting period.',
                    'Operational reports — Due, Trending products: read ledger and sales data directly. Stock value, low/out-of-stock and per-product stock live on the Products page (there is no separate Stock Report).',
                    'If the two ever disagree, the nightly reconciliation (3:00 AM) logs it and the Dashboard shows a banner.',
                ],
            },
        ],
    },
    {
        key: 'scheduled',
        group: 'Data & admin',
        label: 'Scheduled jobs',
        summary: 'Things that happen by themselves — and the one thing they need.',
        sections: [
            {
                title: 'Daily jobs',
                points: [
                    '12:30 AM — mark overdue EMI installments (and notify).',
                    '1:00 AM — backup. 1:30 AM — clean old backups. 2:00 AM — monitor backups.',
                    '3:00 AM — reconciliation check (stock vs movements, ledgers vs journal).',
                    '5:00 AM — generate notifications (low stock, dues, loans, expenses).',
                    'Monthly (1st, 4:00 AM) — prune old activity-log entries.',
                ],
            },
            {
                title: 'Requirement',
                points: [
                    'None of these run unless the server runs the Laravel scheduler every minute (cron `php artisan schedule:run`, or `php artisan schedule:work`). If EMI never turns Overdue or notifications never appear, this is the first thing to check.',
                ],
            },
        ],
    },
];

/** Symptom-first help: "I am stuck here → why it happens → where to look". */
export const TROUBLESHOOTING: TroubleshootingEntry[] = [
    {
        problem: 'Sale will not confirm: "expected N unique serial(s)"',
        why: 'A serial-tracked product needs exactly one different serial per unit of quantity.',
        fix: 'Type as many comma-separated serials as the quantity. Check Business Settings → Modules → Serial Number Tracking is on, otherwise the box is hidden.',
        topic: 'serial',
        where: [
            { label: 'Add Sale', href: '/sales/create' },
            { label: 'Modules switch', href: '/business-settings' },
        ],
    },
    {
        problem: 'Sale error: "Serial … is not an in-stock unit of …"',
        why: 'That serial does not exist for this product, is already Sold/Returned/Disposed, or was typed with a typo/space.',
        fix: 'Check the serial against the box and the purchase it was received on (serials are typed when a purchase is received). It must have been received first and not sold already.',
        topic: 'serial',
        where: [
            { label: 'Purchases', href: '/purchases' },
            { label: 'Products', href: '/products' },
        ],
    },
    {
        problem: 'I confirmed a sale with the wrong serial',
        why: 'A valid in-stock serial of the same product is accepted; the system cannot tell which box you handed over.',
        fix: 'Open the sale and press the pencil next to the serial: enter the real serial and confirm. The wrong unit goes back In stock; invoice, warranty and service follow the real one.',
        topic: 'serial',
        where: [
            { label: 'Sales', href: '/sales' },
            { label: 'Sale Returns', href: '/sale-returns' },
        ],
    },
    {
        problem: 'Purchase will not receive: "Serial … already exists"',
        why: 'The same serial was already received for this product (or typed twice).',
        fix: 'Correct the duplicate. A serial can only exist once per product.',
        topic: 'serial',
        where: [{ label: 'Purchases', href: '/purchases' }],
    },
    {
        problem: 'Cannot cancel a purchase: serials already sold',
        why: 'Units from this purchase have been sold or moved; cancelling would remove stock you no longer have.',
        fix: 'Use a Purchase Return for the units still in stock instead.',
        topic: 'purchases',
        where: [{ label: 'Purchase Returns', href: '/purchase-returns' }],
    },
    {
        problem: 'Cannot cancel a sale: it has a return',
        why: 'The return already reversed that part; cancelling the whole sale would reverse it twice.',
        fix: 'Handle the rest with another return, or ask an admin.',
        topic: 'sales',
        where: [{ label: 'Sale Returns', href: '/sale-returns' }],
    },
    {
        problem: 'How do I correct or cancel a confirmed sale?',
        why: 'A confirmed sale is never changed in place; Edit reverses it and records the corrected one on the same invoice.',
        fix: 'Open the sale: Edit to correct it, Cancel Sale if it should not exist. Both are closed once a return, a paid installment, a warranty claim or a service visit exists.',
        topic: 'sales',
        where: [{ label: 'Sale Returns', href: '/sale-returns/create' }],
    },
    {
        problem: 'Cannot edit or delete a sale',
        why: 'Only Draft/Quotation sales are editable. Confirmed records are immutable.',
        fix: 'Press Edit on the sale (needs the sale edit permission), or Cancel Sale. Drafts are edited and deleted freely.',
        topic: 'how-it-works',
        where: [{ label: 'Sales', href: '/sales' }],
    },
    {
        problem: 'Product stock is wrong',
        why: 'Stock only moves through confirmed documents; a physical count difference needs an adjustment.',
        fix: 'Open the product page: its stock-movement history shows what changed it; then use Stock Adjustment with the counted quantity.',
        topic: 'products-stock',
        where: [{ label: 'Products', href: '/products' }],
    },
    {
        problem: 'Opening stock is locked / import says product has movements',
        why: 'Opening stock is only allowed before the first movement.',
        fix: 'Use Stock Adjustment.',
        topic: 'products-stock',
        where: [{ label: 'Products', href: '/products' }],
    },
    {
        problem: 'Cannot delete a product or contact',
        why: 'It has history (movements, sales, purchases, serials, or ledger).',
        fix: 'Set it Inactive.',
        topic: 'how-it-works',
        where: [
            { label: 'Products', href: '/products' },
            { label: 'Contacts', href: '/contacts' },
        ],
    },
    {
        problem: 'Customer due looks wrong',
        why: 'The balance is the sum of ledger rows: invoices, payments, returns, discounts, adjustments.',
        fix: "Open the contact's ledger and follow each row to its sale/payment. Compare with the Due report.",
        topic: 'contacts',
        where: [
            { label: 'Customers', href: '/contacts?type=customer' },
            { label: 'Due report', href: '/reports/due' },
        ],
    },
    {
        problem: 'Paid more than the due / customer has credit',
        why: 'Overpayment becomes a negative balance (advance credit).',
        fix: 'It is used on the next invoice, or give it back with "Refund credit".',
        topic: 'contacts',
        where: [{ label: 'Customers', href: '/contacts?type=customer' }],
    },
    {
        problem: 'EMI menu or options are missing',
        why: 'The EMI module is switched off, or the product is not marked "EMI available".',
        fix: 'Business Settings → Modules → EMI Module; then product form → EMI available.',
        topic: 'emi',
        where: [
            { label: 'Modules switch', href: '/business-settings' },
            { label: 'Products', href: '/products' },
        ],
    },
    {
        problem: 'EMI installments never show Overdue',
        why: 'The daily overdue job needs the server scheduler.',
        fix: 'Make sure `schedule:run` runs every minute on the server.',
        topic: 'scheduled',
        where: [{ label: 'EMI Installments', href: '/emi-installments' }],
    },
    {
        problem: 'Cannot pay an EMI installment',
        why: 'It is already paid, the amount exceeds what is left, or its sale is cancelled.',
        fix: "Check the installment's remaining amount and the sale status.",
        topic: 'emi',
        where: [{ label: 'EMI Installments', href: '/emi-installments' }],
    },
    {
        problem: 'Service shows as paid but customer expects free',
        why: "Free visits come from the sold unit's service periods: expired period or quota used up means paid.",
        fix: "Check the sale line's service periods and previous service requests. Installation is never free.",
        topic: 'warranty-service',
        where: [
            { label: 'Service Requests', href: '/service-requests' },
            { label: 'Sales', href: '/sales' },
        ],
    },
    {
        problem: 'Cannot change a service request status',
        why: 'Completed and Cancelled are final.',
        fix: 'Create a new service request.',
        topic: 'warranty-service',
        where: [{ label: 'Add Service', href: '/service-requests/create' }],
    },
    {
        problem: 'No warranty date on an old sale',
        why: "The date is set at confirm from the line's or product's warranty months; products without warranty months get none. Imported sales carry no live effects.",
        fix: 'Set warranty months on the line when selling; for history, record a warranty claim note.',
        topic: 'warranty-service',
        where: [{ label: 'Warranty Claims', href: '/warranty-claims' }],
    },
    {
        problem: 'WhatsApp / SMS message did not reach the customer',
        why: 'Sale WhatsApp only opens a chat (you press Send). Bulk SMS needs Business Settings → SMS to be set up; bulk WhatsApp/email are only recorded.',
        fix: 'Press Send in WhatsApp. For SMS, check Business Settings → SMS and use Send test; a Failed message log shows the reason.',
        topic: 'messaging',
        where: [{ label: 'Contacts', href: '/contacts' }],
    },
    {
        problem: 'Import says "Missing required column"',
        why: 'The header row differs from the template.',
        fix: 'Download the template from Import Tools and paste your data under its headers.',
        topic: 'import',
        where: [{ label: 'Import Tools', href: '/imports' }],
    },
    {
        problem: 'Imported rows were skipped',
        why: 'Duplicate SKU, duplicate phone+type, unknown product in sales, or a product that already has movements (opening stock).',
        fix: 'Read the preview/result list for the reason on each row.',
        topic: 'import',
        where: [{ label: 'Import Tools', href: '/imports' }],
    },
    {
        problem: 'Imported historical sale did not change stock or due',
        why: 'By design: imported sales are history only.',
        fix: 'Use Opening Stock for quantities and contact opening balance for dues.',
        topic: 'import',
        where: [{ label: 'Import Tools', href: '/imports' }],
    },
    {
        problem: 'Cannot post an entry: accounting period is closed',
        why: 'Closed periods accept no new journal postings.',
        fix: 'Date the transaction in an open period, or ask an authorised user about the period.',
        topic: 'accounting',
        where: [{ label: 'Accounting Periods', href: '/accounting-periods' }],
    },
    {
        problem: 'Report total differs from the Due report',
        why: 'Financial statements read journal entries; operational reports read ledger/stock tables.',
        fix: 'Check the Dashboard books-check banner; open the General Ledger of the account and compare.',
        topic: 'reports',
        where: [
            { label: 'Trial Balance', href: '/reports/trial-balance' },
            { label: 'Chart of Accounts', href: '/chart-of-accounts' },
        ],
    },
    {
        problem: 'A menu or button is missing for a user',
        why: 'The role lacks that permission.',
        fix: 'User Management → Roles: tick the module action (e.g. sale.create).',
        topic: 'roles',
        where: [{ label: 'Roles', href: '/roles?tab=roles' }],
    },
    {
        problem: 'Direct link gives 403',
        why: 'The server blocks modules the user has no permission for, even by URL.',
        fix: 'Grant the permission, or use an account that has it.',
        topic: 'roles',
        where: [{ label: 'Roles', href: '/roles?tab=roles' }],
    },
    {
        problem: 'Backups / notifications are not happening automatically',
        why: 'They are scheduled jobs.',
        fix: 'Run the Laravel scheduler on the server every minute.',
        topic: 'scheduled',
        where: [{ label: 'Backups', href: '/backups' }],
    },
    {
        problem: 'Who changed this record?',
        why: 'Every create/update/delete is logged.',
        fix: 'Filter the Activity Log by record type and date.',
        topic: 'activity-log',
        where: [{ label: 'Activity Log', href: '/activity-log' }],
    },
];

/** One action → everything it touches. Use this when a number "moved" and you need to know why. */
export const IMPACT_MAP: ImpactRow[] = [
    {
        action: 'Confirm a Sale',
        effects: [
            { target: 'Product stock', effect: 'Reduced by the sold quantity; stock movement recorded; cost snapshot saved on the line.' },
            { target: 'Serial numbers', effect: 'Typed serials change In stock → Sold and attach to the line.' },
            {
                target: 'Warranty & service',
                effect: 'Warranty expiry set; free-service periods copied with dates; Installation request created if required.',
            },
            { target: 'Contact ledger', effect: 'Customer due increases by the unpaid amount.' },
            { target: 'Payment account', effect: 'Increased by each amount received.' },
            { target: 'EMI', effect: 'Installment schedule created (EMI sales only).' },
            { target: 'Journal / reports', effect: 'Revenue, receivable, cash/bank, cost of goods sold and inventory posted.' },
        ],
    },
    {
        action: 'Cancel a Sale (also the first half of Edit)',
        effects: [
            { target: 'Product stock', effect: 'Quantity returns to stock.' },
            { target: 'Serial numbers', effect: 'Back to In stock, detached from the sale.' },
            { target: 'Contact ledger', effect: 'Due reversed.' },
            { target: 'Payment account', effect: 'Received money reversed out.' },
            { target: 'EMI', effect: 'Unpaid installments voided.' },
            { target: 'Journal / reports', effect: 'Original entry reversed.' },
        ],
    },
    {
        action: 'Add payment to a Sale / Bill Receive / Pay EMI installment',
        effects: [
            { target: 'Payment account', effect: 'Increased.' },
            { target: 'Contact ledger', effect: 'Customer due reduced.' },
            { target: 'Sale', effect: 'Paid/due totals and payment status recalculated.' },
            { target: 'Journal / reports', effect: 'Cash/bank against receivable.' },
        ],
    },
    {
        action: 'Sale Return',
        effects: [
            { target: 'Product stock', effect: 'Returned quantity goes back in at original cost.' },
            { target: 'Serial numbers', effect: 'Oldest Sold serials of the line become Returned.' },
            { target: 'Contact ledger', effect: 'Due reduced (or credit created).' },
            { target: 'Payment account', effect: 'Reduced only when you press Refund.' },
            { target: 'Journal / reports', effect: 'Revenue and cost of goods reversed.' },
        ],
    },
    {
        action: 'Receive a Purchase',
        effects: [
            { target: 'Product stock & cost', effect: 'Stock increased; Weighted Average Cost recalculated.' },
            { target: 'Serial numbers', effect: 'One In-stock serial created per unit (tracked products).' },
            { target: 'Contact ledger', effect: 'Supplier payable increases by the unpaid amount.' },
            { target: 'Payment account', effect: 'Reduced by each amount paid.' },
            { target: 'Journal / reports', effect: 'Inventory against payables; payables against cash/bank.' },
        ],
    },
    {
        action: 'Cancel a Purchase',
        effects: [
            { target: 'Product stock', effect: 'Quantity removed.' },
            { target: 'Serial numbers', effect: 'Removed (blocked if any were sold).' },
            { target: 'Contact ledger / account / journal', effect: 'Payable, payments and entry reversed.' },
        ],
    },
    {
        action: 'Purchase Return',
        effects: [
            { target: 'Product stock', effect: 'Quantity leaves stock.' },
            { target: 'Serial numbers', effect: 'Oldest In-stock serials of the line become Disposed.' },
            { target: 'Contact ledger', effect: 'Supplier payable reduced.' },
            { target: 'Payment account', effect: 'Increased only when you record the supplier refund.' },
            { target: 'Journal / reports', effect: 'Inventory/payable reversed.' },
        ],
    },
    {
        action: 'Sales Order with advance',
        effects: [
            { target: 'Payment account', effect: 'Increased by the advance.' },
            { target: 'Contact ledger', effect: 'Customer credit/advance recorded.' },
            { target: 'Journal / reports', effect: 'Cash/bank against Customer Advances (liability).' },
            { target: 'Product stock', effect: 'Unchanged until converted to a sale.' },
        ],
    },
    {
        action: 'Paid Service / Installation request',
        effects: [
            { target: 'Payment account', effect: 'Increased by the charge (when an account is chosen).' },
            { target: 'Journal / reports', effect: 'Cash/bank against Service/Installation Income.' },
            { target: 'Free service', effect: "A free visit uses one of the period's free-quota; nothing is posted." },
        ],
    },
    {
        action: 'Expense / Other Income',
        effects: [
            { target: 'Payment account', effect: 'Reduced (expense) or increased (income).' },
            { target: 'Journal / reports', effect: 'Expense or income account against cash/bank.' },
        ],
    },
    {
        action: 'Customer waive / supplier discount',
        effects: [
            { target: 'Contact ledger', effect: 'Balance reduced; taken from the oldest unpaid documents first.' },
            { target: 'Payment account', effect: 'Unchanged — no money moves.' },
            { target: 'Journal / reports', effect: 'Waive: Sales Returns & Allowances vs receivable. Supplier discount: payables vs Other Income.' },
        ],
    },
    {
        action: 'Account transfer',
        effects: [
            { target: 'Payment account', effect: 'One reduced, the other increased by the same amount.' },
            { target: 'Journal / reports', effect: 'Balanced entry between the two; net worth unchanged.' },
        ],
    },
    {
        action: 'Stock adjustment / Opening stock',
        effects: [
            { target: 'Product stock', effect: 'One increase/decrease movement for the difference (opening stock only before first movement).' },
            { target: 'Journal / reports', effect: 'Opening stock posts an opening-stock entry.' },
        ],
    },
];

/** Newest first. Add a line only after the change is fully confirmed and shipped. */
export const CHANGE_LOG: ChangeLogEntry[] = [
    {
        date: '2026-10-09',
        module: 'Products & Sales',
        note: 'Stock adjustment for serial products now works unit by unit (tick lost units, enter found serials) and every stock adjustment posts to the books. A new Sale, Sales Order or Purchase returns to its list page instead of the details page. Run php artisan migrate.',
    },
    {
        date: '2026-10-09',
        module: 'Sales Orders',
        note: 'Sales Orders are booked from the Add Sale form with the new "Sales Order" button (no stock or serial check). The Sales Orders list shows only waiting orders; "Confirm Sale" opens one in the full sale form to change anything and confirm, and the order then leaves the list. The Dashboard shows a card while orders are waiting. Run php artisan migrate.',
    },
    {
        date: '2026-10-09',
        module: 'Settings & Contacts',
        note: 'Bulk SMS is now set up from Business Settings → SMS (no code change needed when the SMS company changes), with a Send test button; Contacts → Send Notification really sends SMS and logs Sent/Failed with the reason. Forgot-password is hidden on the login page. Stat and list cards share one look.',
    },
    {
        date: '2026-10-09',
        module: 'Activity Log',
        note: 'Logins and logouts are now recorded. The log opens on the last 7 days (change From / To to look further back). Footer now links to sahospos.com.',
    },
    {
        date: '2026-10-08',
        module: 'Purchases',
        note: 'Correct Price: fix only the price of a received purchase without touching units, stock or serials (works even when goods are sold). An edited sale keeps the original cost on the units it sells again, so its profit does not move with the average cost.',
    },
    {
        date: '2026-10-08',
        module: 'Sales & Purchases',
        note: 'A confirmed sale or purchase can now be edited (anything on it): the old one is reversed with opposite entries and the corrected one is recorded on the same invoice, in one step. The 30-second Undo toast is gone; use Edit, or Cancel Sale. Cancelling or amending a purchase now gives its price back out of the product average cost.',
    },
    {
        date: '2026-10-08',
        module: 'Security & Serials',
        note: 'Own-records-only users can no longer open or change other users sales and purchases by address; the Dashboard hides the shop money figures from people without report access; a wrong serial can be changed and a returned unit restocked from the sale page; confirm / cancel / payment are safe against double clicks.',
    },
    {
        date: '2026-10-08',
        module: 'Navigation',
        note: 'Add Sale, Draft Sales, Add Purchase and Add Product are back in the sidebar (they are used all day). Low/Out of Stock stay as Products filters.',
    },
    {
        date: '2026-10-08',
        module: 'Reports',
        note: 'Stock Report removed: the Products page already shows stock value, low/out-of-stock filters and export. The old address redirects to Products.',
    },
    {
        date: '2026-10-08',
        module: 'Navigation',
        note: 'Balance Sheet, Cash Flow and Trial Balance moved from Payment Accounts into Reports, so every report is in one menu.',
    },
    {
        date: '2026-10-08',
        module: 'System Guide',
        note: 'Expanded: module-by-module logic, serial/warranty/EMI/import/messaging details, troubleshooting with deep links, impact map.',
    },
    {
        date: '2026-10-08',
        module: 'Navigation',
        note: 'Sidebar shortened: "Add …", Draft Sales, Low/Out of Stock and Investors menus folded into Quick Create, list filters and Assets & Liabilities.',
    },
    { date: '2026-10-08', module: 'Quick Actions', note: 'Added Add Service, Add Sale Return and Add Purchase Return.' },
    { date: '2026-10-08', module: 'System Tools', note: 'System Guide added.' },
];
