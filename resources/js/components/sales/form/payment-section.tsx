import { AdvancedOptions } from '@/components/sales/form/advanced-options';
import { OrderSummary } from '@/components/sales/form/order-summary';
import { SaleActionBar } from '@/components/sales/form/sale-action-bar';
import { type SaleFormApi, type SaleStatus } from '@/components/sales/form/sale-form-utils';
import AccountPaymentRows, { paymentRowsError, type PaymentRow } from '@/components/shared/account-payment-rows';
import { type Account } from '@/types/models';
import { type Ref } from 'react';

interface PaymentSectionProps {
    form: SaleFormApi;
    accounts: Account[];
    payments: PaymentRow[];
    onPaymentsChange: (rows: PaymentRow[]) => void;
    totals: { subtotal: number; discountAmount: number; installation: number; total: number };
    historical: boolean;
    onHistoricalChange: (historical: boolean) => void;
    hasCustomer: boolean;
    /** The F4 shortcut scrolls here. */
    sectionRef: Ref<HTMLDivElement>;
    onEditFinancing: () => void;
    onEditInvoiceDiscount: () => void;
    onSave: (status: SaleStatus) => void;
    onSaveAndWhatsapp: () => void;
}

/** The right-hand column: totals, how the customer pays (one or more accounts), a few extras and the save buttons — one card, sticky on desktop. */
export function PaymentSection({
    form,
    accounts,
    payments,
    onPaymentsChange,
    totals,
    historical,
    onHistoricalChange,
    hasCustomer,
    sectionRef,
    onEditFinancing,
    onEditInvoiceDiscount,
    onSave,
    onSaveAndWhatsapp,
}: PaymentSectionProps) {
    return (
        <div ref={sectionRef} className="bg-card space-y-5 rounded-xl border p-4 lg:sticky lg:top-4">
            <OrderSummary
                form={form}
                subtotal={totals.subtotal}
                discountAmount={totals.discountAmount}
                installation={totals.installation}
                total={totals.total}
                onEditFinancing={onEditFinancing}
                onEditDiscount={onEditInvoiceDiscount}
            />

            <AccountPaymentRows
                accounts={accounts}
                rows={payments}
                onChange={onPaymentsChange}
                label="Payment"
                emptyHint="পেমেন্ট না দিলে পুরোটা বকেয়া থাকবে"
                total={totals.total}
                error={paymentRowsError(form.errors)}
            />

            <AdvancedOptions form={form} historical={historical} onHistoricalChange={onHistoricalChange} />

            <SaleActionBar
                processing={form.processing}
                hasItems={form.data.items.length > 0}
                hasCustomer={hasCustomer}
                onSave={onSave}
                onSaveAndWhatsapp={onSaveAndWhatsapp}
            />
        </div>
    );
}
