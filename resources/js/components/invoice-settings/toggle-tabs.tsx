import { InvoiceTabContent, SectionToggles } from '@/components/invoice-settings/invoice-tab';
import { type InvoiceTabProps } from '@/components/invoice-settings/types';
import { Calculator, Package, Store, UserRound } from 'lucide-react';

/** Which business details (name, address, phone) are printed. */
export function BusinessTab(props: InvoiceTabProps) {
    return (
        <InvoiceTabContent
            value="business"
            title="Business Information"
            description="Invoice-এ business-এর কোন তথ্যগুলো দেখানো হবে তা নির্বাচন করুন।"
            icon={Store}
        >
            <SectionToggles
                {...props}
                section="business"
                toggles={[
                    { key: 'show_name', label: 'Business Name' },
                    { key: 'show_address', label: 'Business Address' },
                    { key: 'show_phone', label: 'Business Phone' },
                ]}
            />
        </InvoiceTabContent>
    );
}

/** Which customer details are printed. */
export function CustomerTab(props: InvoiceTabProps) {
    return (
        <InvoiceTabContent
            value="customer"
            title="Customer Information"
            description="Customer-এর কোন কোন detail invoice-এ থাকবে তা নিয়ন্ত্রণ করুন।"
            icon={UserRound}
        >
            <SectionToggles
                {...props}
                section="customer"
                toggles={[
                    { key: 'show_name', label: 'Customer Name' },
                    { key: 'show_phone', label: 'Phone Number' },
                    { key: 'show_email', label: 'Email Address' },
                    { key: 'show_address', label: 'Customer Address' },
                ]}
            />
        </InvoiceTabContent>
    );
}

/** Which extra columns the item table shows. */
export function ItemsTab(props: InvoiceTabProps) {
    return (
        <InvoiceTabContent
            value="items"
            title="Invoice Items"
            description="Item table-এ কোন অতিরিক্ত তথ্য দেখানো হবে তা নির্ধারণ করুন।"
            icon={Package}
        >
            <SectionToggles
                {...props}
                section="items"
                toggles={[
                    { key: 'show_sku', label: 'Product SKU', description: 'প্রতিটি item-এর SKU দেখাবে' },
                    { key: 'show_unit', label: 'Product Unit' },
                    { key: 'show_discount', label: 'Item Discount' },
                ]}
            />
        </InvoiceTabContent>
    );
}

/** Which amounts appear in the totals summary. */
export function TotalsTab(props: InvoiceTabProps) {
    return (
        <InvoiceTabContent
            value="totals"
            title="Invoice Totals"
            description="Invoice-এর total summary-তে কোন amount দেখাবে তা নির্বাচন করুন।"
            icon={Calculator}
        >
            <SectionToggles
                {...props}
                section="totals"
                toggles={[
                    { key: 'show_discount', label: 'Discount' },
                    { key: 'show_paid', label: 'Paid Amount' },
                    { key: 'show_due', label: 'Due Amount' },
                ]}
            />
        </InvoiceTabContent>
    );
}
