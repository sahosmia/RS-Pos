/**
 * English UI strings — sidebar navigation + Dashboard page, the flagship
 * pages migrated to the translation system first (see doc/TASKS.md's
 * বহুভাষা entry for the incremental rollout plan covering the rest of
 * the app's ~150 pages/components).
 */
export interface Dictionary {
    common: {
        add: string;
        view: string;
        edit: string;
        delete: string;
        save: string;
        saving: string;
        cancel: string;
        confirm: string;
        name: string;
        actions: string;
        search: string;
        export: string;
        print: string;
        clear_filters: string;
        no_results_title: string;
        no_results_description: string;
        of: string;
        active: string;
        inactive: string;
        activate: string;
        deactivate: string;
        date: string;
        status: string;
        total: string;
        due: string;
        invoice: string;
        account: string;
        select_account: string;
        note: string;
        amount: string;
        phone: string;
        email: string;
        address: string;
        upload: string;
        uploading: string;
        both: string;
    };
    nav: {
        dashboard: string;
        sales: string;
        sale_returns: string;
        sales_order: string;
        add_sale: string;
        emi_installments: string;
        product: string;
        products: string;
        add_product: string;
        low_stock: string;
        category: string;
        unit: string;
        brand: string;
        contact: string;
        supplier: string;
        customer: string;
        customer_group: string;
        bills: string;
        bill_receive: string;
        bill_pay: string;
        add_discount: string;
        purchases: string;
        add_purchase: string;
        purchase_returns: string;
        expenses: string;
        expense_categories: string;
        payment_accounts: string;
        accounts: string;
        petty_cash: string;
        accounting: string;
        chart_of_accounts: string;
        journal_entries: string;
        accounting_periods: string;
        finance: string;
        assets_liabilities: string;
        assets: string;
        other_liabilities: string;
        investors: string;
        company_loans: string;
        staff: string;
        service_warranty: string;
        service_requests: string;
        warranty_claims: string;
        reports: string;
        profit_loss: string;
        balance_sheet: string;
        financial_position: string;
        trial_balance: string;
        cash_flow: string;
        stock_report: string;
        due_report: string;
        trending_products: string;
        import_tools: string;
        backups: string;
        user_management: string;
        users: string;
        roles: string;
        roles_permissions: string;
        business_settings: string;
    };
    dashboard: {
        title: string;
        description: string;
        sales_section: string;
        purchases_expenses_section: string;
        current_position: string;
        total_sales: string;
        net_sales: string;
        invoice_due: string;
        total_sell_return: string;
        total_purchase: string;
        purchase_due: string;
        total_purchase_return: string;
        expense: string;
        total_receivable: string;
        total_payable: string;
        cash_and_bank: string;
        low_stock_products: string;
    };
    language: {
        label: string;
        english: string;
        bangla: string;
    };
    serviceRequests: {
        title: string;
        description: string;
        add_description: string;
        add: string;
        from: string;
        to: string;
        type: string;
        all_types: string;
        installation: string;
        service: string;
        status: string;
        all_statuses: string;
        pending: string;
        scheduled: string;
        completed: string;
        cancelled: string;
        empty_title: string;
        empty_description: string;
        date: string;
        invoice: string;
        customer: string;
        product: string;
        charge: string;
        free: string;
        paid: string;
        page: string;
        requests_count: string;
        previous: string;
        next: string;
        search: string;
        search_placeholder: string;
        no_results: string;
        start_searching: string;
        select: string;
        next_service: string;
        choose_different_item: string;
        request_date: string;
        service_date: string;
        technician: string;
        none: string;
        charge_amount: string;
        account: string;
        select_account: string;
        note: string;
        add_button: string;
    };
    warrantyClaims: {
        title: string;
        description: string;
        add: string;
        empty_title: string;
        empty_description: string;
        status: string;
        all_statuses: string;
        pending: string;
        in_progress: string;
        resolved: string;
        rejected: string;
        date: string;
        invoice: string;
        customer: string;
        product: string;
        issue: string;
        actions: string;
        update: string;
        warranty_till: string;
        claim_date: string;
        add_title: string;
        update_title: string;
        resolution_note: string;
    };
    productColumns: {
        product: string;
        category_brand: string;
        stock: string;
        price: string;
        margin: string;
        status: string;
        sku: string;
        barcode: string;
        margin_percent: string;
    };
    productsPage: {
        title: string;
        description: string;
        add_product: string;
        search_placeholder: string;
        empty_title: string;
        empty_description: string;
        deleted_toast: string;
        delete_error: string;
        delete_title: string;
        delete_description: string;
        item_label: string;
        total_products: string;
        total_stock: string;
        total_stock_value: string;
        low_stock_products: string;
    };
    stockAdjustment: {
        title: string;
        description: string;
        adjust: string;
        actual_quantity: string;
        current_stock: string;
        reason: string;
        reason_placeholder: string;
        toast: string;
    };
    lookupManager: {
        new_name_placeholder: string;
        parent_placeholder: string;
        no_parent: string;
        adding: string;
        add: string;
        empty: string;
        added_toast: string;
        deleted_toast: string;
        saved_toast: string;
        delete_error: string;
        delete_title: string;
        delete_description: string;
    };
    contactsPage: {
        title: string;
        title_customers: string;
        title_suppliers: string;
        description: string;
        add_contact: string;
        search_placeholder: string;
        type: string;
        all_types: string;
        all_groups: string;
        selected: string;
        send_notification: string;
        send: string;
        empty_title: string;
        empty_description: string;
        delete_title: string;
        delete_description: string;
        bulk_delete_title_prefix: string;
        bulk_delete_title_suffix: string;
        bulk_delete_description: string;
        item_label: string;
        stats_total: string;
        stats_active: string;
        stats_receivable: string;
        stats_payable: string;
    };
    contactColumns: {
        contact_id: string;
        contact_label: string;
        address: string;
        balance: string;
    };
    contactShow: {
        pay_due: string;
        add_discount: string;
        balance: string;
        ledger: string;
        purchases: string;
        sales: string;
        documents: string;
        payments: string;
        empty_ledger_title: string;
        empty_ledger_description: string;
        empty_purchases_title: string;
        empty_purchases_description: string;
        empty_sales_title: string;
        empty_sales_description: string;
        empty_documents_title: string;
        empty_documents_description: string;
        empty_payments_title: string;
        empty_payments_description: string;
    };
    contactForm: {
        edit_title: string;
        add_title: string;
        entity_type: string;
        individual: string;
        business: string;
        business_name: string;
        no_group: string;
        opening_balance: string;
        opening_balance_hint: string;
        opening_balance_locked: string;
        shipping_address: string;
        active_hint: string;
    };
    payDueModal: {
        title: string;
        current_status: string;
        submit: string;
        direction: string;
        receive_from: string;
        pay_to: string;
    };
    waiveDueModal: {
        title: string;
        current_status: string;
        no_cash_movement_hint: string;
        submit: string;
        reason: string;
        reason_placeholder: string;
    };
    customerGroups: {
        title: string;
        description: string;
        add: string;
        empty_title: string;
        empty_description: string;
        contacts_count: string;
        delete_title: string;
        delete_description: string;
    };
    contactNotification: {
        title: string;
        channel: string;
        sms: string;
        whatsapp: string;
        email_channel: string;
        subject: string;
        message: string;
        send: string;
        sending_to_prefix: string;
        sending_to_suffix: string;
        sent_toast_prefix: string;
        sent_toast_suffix: string;
        error_toast: string;
        email_unavailable_hint: string;
    };
    productList: {
        all_categories: string;
        all_brands: string;
        stock_status: string;
        all_stock_levels: string;
        in_stock: string;
        low_stock: string;
        out_of_stock: string;
        service_item: string;
        inactive: string;
        in_stock_suffix: string;
    };
    productForm: {
        basic_info: string;
        product_name: string;
        sku: string;
        sku_helper: string;
        barcode: string;
        category: string;
        select_category: string;
        brand: string;
        no_brand: string;
        unit: string;
        select_unit: string;
        pricing_stock: string;
        selling_price: string;
        minimum_stock_level: string;
        current_stock: string;
        current_stock_locked: string;
        manage_stock: string;
        manage_stock_description: string;
        opening_stock: string;
        opening_stock_cost: string;
        opening_stock_locked: string;
        warranty_months: string;
        installation_service: string;
        emi_available: string;
        track_serial_number: string;
        service_plan: string;
        service_plan_description: string;
        add_period: string;
        no_periods_yet: string;
        period_label: string;
        duration_months: string;
        free_quota: string;
        visibility_media: string;
        for_sale: string;
        for_sale_description: string;
        active: string;
        active_description: string;
        product_image: string;
        create_product: string;
        save_changes: string;
        created_toast: string;
        updated_toast: string;
        manage_categories: string;
        manage_brands: string;
        manage_units: string;
    };
    lookup: {
        brands_title: string;
        brands_description: string;
        brands_add: string;
        brands_empty_title: string;
        brands_empty_description: string;
        brands_delete_title: string;
        brands_delete_description: string;
        categories_title: string;
        categories_description: string;
        categories_add: string;
        categories_empty_title: string;
        categories_empty_description: string;
        categories_delete_title: string;
        categories_delete_description: string;
        categories_parent: string;
        categories_no_parent: string;
        units_title: string;
        units_description: string;
        units_add: string;
        units_empty_title: string;
        units_empty_description: string;
        units_delete_title: string;
        units_delete_description: string;
        products_count: string;
    };
}

const en: Dictionary = {
    common: {
        add: 'Add',
        view: 'View',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        saving: 'Saving...',
        cancel: 'Cancel',
        confirm: 'Confirm',
        name: 'Name',
        actions: 'Actions',
        search: 'Search',
        export: 'Export',
        print: 'Print',
        clear_filters: 'Clear filters',
        no_results_title: 'No results',
        no_results_description: 'Try a different search or filter',
        of: 'of',
        active: 'Active',
        inactive: 'Inactive',
        activate: 'Activate',
        deactivate: 'Deactivate',
        date: 'Date',
        status: 'Status',
        total: 'Total',
        due: 'Due',
        invoice: 'Invoice',
        account: 'Account',
        select_account: 'Select an account',
        note: 'Note',
        amount: 'Amount',
        phone: 'Phone',
        email: 'Email',
        address: 'Address',
        upload: 'Upload',
        uploading: 'Uploading...',
        both: 'Both',
    },
    nav: {
        dashboard: 'Dashboard',
        sales: 'Sales',
        sale_returns: 'Sale Returns',
        sales_order: 'Sales Order',
        add_sale: 'Add Sale',
        emi_installments: 'EMI Installments',
        product: 'Product',
        products: 'Products',
        add_product: 'Add Product',
        low_stock: 'Low Stock',
        category: 'Category',
        unit: 'Unit',
        brand: 'Brand',
        contact: 'Contact',
        supplier: 'Supplier',
        customer: 'Customer',
        customer_group: 'Customer Group',
        bills: 'Bills',
        bill_receive: 'Bill Receive',
        bill_pay: 'Bill Pay',
        add_discount: 'Add Discount',
        purchases: 'Purchases',
        add_purchase: 'Add Purchase',
        purchase_returns: 'Purchase Returns',
        expenses: 'Expenses',
        expense_categories: 'Categories',
        payment_accounts: 'Payment Accounts',
        accounts: 'Accounts',
        petty_cash: 'Petty Cash',
        accounting: 'Accounting',
        chart_of_accounts: 'Chart of Accounts',
        journal_entries: 'Journal Entries',
        accounting_periods: 'Accounting Periods',
        finance: 'Finance',
        assets_liabilities: 'Assets & Liabilities',
        assets: 'Assets',
        other_liabilities: 'Other Liabilities',
        investors: 'Investors',
        company_loans: 'Company Loans',
        staff: 'Staff',
        service_warranty: 'Service & Warranty',
        service_requests: 'Service Requests',
        warranty_claims: 'Warranty Claims',
        reports: 'Reports',
        profit_loss: 'Profit & Loss',
        balance_sheet: 'Balance Sheet',
        financial_position: 'Financial Position',
        trial_balance: 'Trial Balance',
        cash_flow: 'Cash Flow',
        stock_report: 'Stock Report',
        due_report: 'Due Report',
        trending_products: 'Trending Products',
        import_tools: 'Import Tools',
        backups: 'Backups',
        user_management: 'User Management',
        users: 'Users',
        roles: 'Roles',
        roles_permissions: 'Roles & Permissions',
        business_settings: 'Business Settings',
    },
    dashboard: {
        title: 'Dashboard',
        description: 'Overview & analytics',
        sales_section: 'Sales',
        purchases_expenses_section: 'Purchases & Expenses',
        current_position: 'Current Position',
        total_sales: 'Total Sales',
        net_sales: 'Net Sales',
        invoice_due: 'Invoice Due',
        total_sell_return: 'Total Sell Return',
        total_purchase: 'Total Purchase',
        purchase_due: 'Purchase Due',
        total_purchase_return: 'Total Purchase Return',
        expense: 'Expense',
        total_receivable: 'Total Receivable',
        total_payable: 'Total Payable',
        cash_and_bank: 'Cash + Bank',
        low_stock_products: 'Low Stock Products',
    },
    language: {
        label: 'Language',
        english: 'English',
        bangla: 'বাংলা',
    },
    serviceRequests: {
        title: 'Service Requests',
        description: 'Installation and follow-up servicing — free/paid auto-detected',
        add_description: 'Search by invoice number or customer name',
        add: 'Add Service Request',
        from: 'From',
        to: 'To',
        type: 'Type',
        all_types: 'All types',
        installation: 'Installation',
        service: 'Service',
        status: 'Status',
        all_statuses: 'All statuses',
        pending: 'Pending',
        scheduled: 'Scheduled',
        completed: 'Completed',
        cancelled: 'Cancelled',
        empty_title: 'No service requests yet',
        empty_description: 'Add your first service request',
        date: 'Date',
        invoice: 'Invoice',
        customer: 'Customer',
        product: 'Product',
        charge: 'Charge',
        free: 'Free',
        paid: 'Paid',
        page: 'Page',
        requests_count: 'requests',
        previous: 'Previous',
        next: 'Next',
        search: 'Search',
        search_placeholder: 'Invoice no or customer name...',
        no_results: 'No results found',
        start_searching: 'Start searching',
        select: 'Select',
        next_service: 'Next Service',
        choose_different_item: 'Choose a different item',
        request_date: 'Request Date',
        service_date: 'Service Date',
        technician: 'Technician (optional)',
        none: 'None',
        charge_amount: 'Charge Amount',
        account: 'Account',
        select_account: 'Select an account',
        note: 'Note',
        add_button: 'Add Service Request',
    },
    warrantyClaims: {
        title: 'Warranty Claims',
        description: 'Track warranty claims on sold units',
        add: 'Add Claim',
        empty_title: 'No warranty claims yet',
        empty_description: 'Add your first claim',
        status: 'Status',
        all_statuses: 'All statuses',
        pending: 'Pending',
        in_progress: 'In Progress',
        resolved: 'Resolved',
        rejected: 'Rejected',
        date: 'Date',
        invoice: 'Invoice',
        customer: 'Customer',
        product: 'Product',
        issue: 'Issue',
        actions: 'Actions',
        update: 'Update',
        warranty_till: 'warranty till',
        claim_date: 'Claim Date',
        add_title: 'Add Warranty Claim',
        update_title: 'Update Claim',
        resolution_note: 'Resolution Note',
    },
    productColumns: {
        product: 'Product',
        category_brand: 'Category / Brand',
        stock: 'Stock',
        price: 'Price',
        margin: 'Margin',
        status: 'Status',
        sku: 'SKU',
        barcode: 'Barcode',
        margin_percent: 'Margin %',
    },
    productsPage: {
        title: 'Products',
        description: 'All products — with stock, price and profit margin',
        add_product: 'Add Product',
        search_placeholder: 'Name, SKU or barcode',
        empty_title: 'No products yet',
        empty_description: 'Add your first product',
        deleted_toast: 'deleted.',
        delete_error: 'Could not delete product.',
        delete_title: 'Delete product?',
        delete_description: 'will be deleted. Cannot be done if it has stock movement.',
        item_label: 'products',
        total_products: 'Total Products',
        total_stock: 'Total Stock',
        total_stock_value: 'Total Stock Value',
        low_stock_products: 'Low Stock Products',
    },
    stockAdjustment: {
        title: 'Adjust Stock',
        description: 'Enter the actual counted quantity — the difference against current stock will be added as an adjustment',
        adjust: 'Adjust',
        actual_quantity: 'Actual Quantity',
        current_stock: 'Current stock',
        reason: 'Reason',
        reason_placeholder: 'damaged, count mismatch...',
        toast: 'Stock adjusted.',
    },
    lookupManager: {
        new_name_placeholder: 'Enter new name',
        parent_placeholder: 'Parent',
        no_parent: 'No parent',
        adding: 'Adding...',
        add: 'Add',
        empty: 'Nothing added yet',
        added_toast: 'added.',
        deleted_toast: 'deleted.',
        saved_toast: 'Saved.',
        delete_error: 'Could not delete.',
        delete_title: 'Delete',
        delete_description: 'Cannot be deleted if used by a product.',
    },
    contactsPage: {
        title: 'Contacts',
        title_customers: 'Customers',
        title_suppliers: 'Suppliers',
        description: 'Customer and Supplier — same list, filter by type',
        add_contact: 'Add Contact',
        search_placeholder: 'Name, phone or email',
        type: 'Type',
        all_types: 'All types',
        all_groups: 'All groups',
        selected: 'selected',
        send_notification: 'Send Notification',
        send: 'Send',
        empty_title: 'No contacts yet',
        empty_description: 'Add your first customer or supplier',
        delete_title: 'Delete contact?',
        delete_description: 'will be deleted. Cannot be done if it has ledger history.',
        bulk_delete_title_prefix: 'Delete',
        bulk_delete_title_suffix: 'contact(s)?',
        bulk_delete_description: 'Contacts with ledger history will be kept — the rest will be deleted.',
        item_label: 'contacts',
        stats_total: 'Total Contacts',
        stats_active: 'Active',
        stats_receivable: 'Total Receivable',
        stats_payable: 'Total Payable',
    },
    contactColumns: {
        contact_id: 'Contact ID',
        contact_label: 'Contact',
        address: 'Address',
        balance: 'Balance',
    },
    contactShow: {
        pay_due: 'Pay Due Amount',
        add_discount: 'Add Discount',
        balance: 'Balance',
        ledger: 'Ledger',
        purchases: 'Purchases',
        sales: 'Sales',
        documents: 'Documents',
        payments: 'Payments',
        empty_ledger_title: 'No ledger entries yet',
        empty_ledger_description: 'Opening balance or the first transaction will show here',
        empty_purchases_title: 'No purchases yet',
        empty_purchases_description: 'Nothing bought from this supplier yet',
        empty_sales_title: 'No sales yet',
        empty_sales_description: 'Nothing sold to this customer yet',
        empty_documents_title: 'No documents yet',
        empty_documents_description: 'Add an ID copy, agreement, etc. here',
        empty_payments_title: 'No payments yet',
        empty_payments_description: 'Use Pay Due Amount to record the first payment',
    },
    contactForm: {
        edit_title: 'Edit Contact',
        add_title: 'Add Contact',
        entity_type: 'Entity Type',
        individual: 'Individual',
        business: 'Business',
        business_name: 'Business Name',
        no_group: 'No group',
        opening_balance: 'Opening Balance',
        opening_balance_hint: 'Positive = they owe us, negative = we owe them',
        opening_balance_locked: 'This contact already has transactions — opening balance can no longer be changed.',
        shipping_address: 'Shipping Address',
        active_hint: "When off, this contact won't show in new transactions",
    },
    payDueModal: {
        title: 'Pay Due Amount',
        current_status: 'Current status:',
        submit: 'Record Payment',
        direction: 'Direction',
        receive_from: 'Receive from',
        pay_to: 'Pay to',
    },
    waiveDueModal: {
        title: 'Add Discount',
        current_status: 'Current status:',
        no_cash_movement_hint: 'No cash movement — just waiving the due',
        submit: 'Waive',
        reason: 'Reason',
        reason_placeholder: 'loyalty, goodwill...',
    },
    customerGroups: {
        title: 'Customer Groups',
        description: 'For filtering and segmentation — not a pricing/discount tier',
        add: 'Add Group',
        empty_title: 'No customer groups yet',
        empty_description: 'Add your first group',
        contacts_count: 'Contacts',
        delete_title: 'Delete customer group?',
        delete_description: 'will be deleted. Cannot be done if used by a contact.',
    },
    contactNotification: {
        title: 'Send Notification',
        channel: 'Channel',
        sms: 'SMS',
        whatsapp: 'WhatsApp',
        email_channel: 'Email',
        subject: 'Subject',
        message: 'Message',
        send: 'Send',
        sending_to_prefix: 'Sending to',
        sending_to_suffix: 'selected contact(s).',
        sent_toast_prefix: 'Sent to',
        sent_toast_suffix: 'contact(s).',
        error_toast: 'Could not send — check the form for errors.',
        email_unavailable_hint: "Email option isn't shown since not every selected contact has an email.",
    },
    productList: {
        all_categories: 'All categories',
        all_brands: 'All brands',
        stock_status: 'Stock status',
        all_stock_levels: 'All stock levels',
        in_stock: 'In Stock',
        low_stock: 'Low Stock',
        out_of_stock: 'Out of Stock',
        service_item: 'Service Item',
        inactive: 'Inactive',
        in_stock_suffix: 'in stock',
    },
    productForm: {
        basic_info: 'Basic Info',
        product_name: 'Product Name',
        sku: 'SKU',
        sku_helper: 'Leave blank to auto-generate one',
        barcode: 'Barcode',
        category: 'Category',
        select_category: 'Select a category',
        brand: 'Brand',
        no_brand: 'No brand',
        unit: 'Unit',
        select_unit: 'Select a unit',
        pricing_stock: 'Pricing & Stock',
        selling_price: 'Selling Price',
        minimum_stock_level: 'Minimum Stock Level',
        current_stock: 'Current Stock',
        current_stock_locked: "Can't be changed here — use Stock Adjustment",
        manage_stock: 'Manage Stock',
        manage_stock_description: "When off, this is a service item (Installation Charge) — stock won't be tracked",
        opening_stock: 'Opening Stock',
        opening_stock_cost: 'Opening Stock Unit Cost',
        opening_stock_locked:
            'This product already has stock movement — opening stock can no longer be changed, use Stock Adjustment.',
        warranty_months: 'Warranty (months)',
        installation_service: 'Installation Service',
        emi_available: 'EMI Available',
        track_serial_number: 'Track Serial Number',
        service_plan: 'Service Plan',
        service_plan_description: 'Free services per period — e.g. AC: Year 1 = 2 free, Year 2 = 0',
        add_period: 'Add Period',
        no_periods_yet: "No period added yet — without one, free service won't be tracked",
        period_label: 'Period',
        duration_months: 'Duration (months)',
        free_quota: 'Free Quota',
        visibility_media: 'Visibility & Media',
        for_sale: 'For Sale (POS)',
        for_sale_description: 'Whether this shows in POS',
        active: 'Active',
        active_description: 'When off, hidden everywhere',
        product_image: 'Product Image',
        create_product: 'Create Product',
        save_changes: 'Save Changes',
        created_toast: 'Product created.',
        updated_toast: 'Product updated.',
        manage_categories: 'Manage Categories',
        manage_brands: 'Manage Brands',
        manage_units: 'Manage Units',
    },
    lookup: {
        brands_title: 'Brands',
        brands_description: "Product brand list",
        brands_add: 'Add Brand',
        brands_empty_title: 'No brands yet',
        brands_empty_description: 'Add your first brand',
        brands_delete_title: 'Delete brand?',
        brands_delete_description: 'will be deleted. Cannot be done if used by a product.',
        categories_title: 'Categories',
        categories_description: 'Product categories, with parent-child support',
        categories_add: 'Add Category',
        categories_empty_title: 'No categories yet',
        categories_empty_description: 'Add your first category',
        categories_delete_title: 'Delete category?',
        categories_delete_description: 'will be deleted. Cannot be done if it has a product or sub-category.',
        categories_parent: 'Parent Category',
        categories_no_parent: 'No parent',
        units_title: 'Units',
        units_description: 'Pc, Kg, Box, Litre — product units',
        units_add: 'Add Unit',
        units_empty_title: 'No units yet',
        units_empty_description: 'Add your first unit',
        units_delete_title: 'Delete unit?',
        units_delete_description: 'will be deleted. Cannot be done if used by a product.',
        products_count: 'Products',
    },
};

export default en;
