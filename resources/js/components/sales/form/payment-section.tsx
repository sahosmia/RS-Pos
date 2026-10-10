import InputError from '@/components/input-error';
import { AdvancedOptions } from '@/components/sales/form/advanced-options';
import { OrderSummary } from '@/components/sales/form/order-summary';
import { SaleActionBar } from '@/components/sales/form/sale-action-bar';
import { type SaleFormApi, type SaleStatus } from '@/components/sales/form/sale-form-utils';
import AccountPaymentRows, { paymentRowsError, type PaymentRow } from '@/components/shared/account-payment-rows';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type EmiPreview } from '@/hooks/use-emi-preview';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account } from '@/types/models';
import { type Ref } from 'react';

interface PaymentSectionProps {
    form: SaleFormApi;
    /** Confirming a Sales Order: only the order's Confirm button is offered, and the advance already taken is shown. */
    fulfilOrder?: { id: number; order_no: string; advance_paid: number };
    accounts: Account[];
    payments: PaymentRow[];
    onPaymentsChange: (rows: PaymentRow[]) => void;
    totals: { subtotal: number; discountAmount: number; installation: number; total: number };
    historical: boolean;
    onHistoricalChange: (historical: boolean) => void;
    hasCustomer: boolean;
    /** Live installment quote when the sale is on EMI (null otherwise). */
    emiPreview?: EmiPreview | null;
    /** Why the quote could not be worked out (e.g. the down payment is not below the total), shown instead of the EMI lines. */
    emiError?: string | null;
    /** Editing a confirmed sale: asks for the reason and offers only "save the changes". */
    amending?: boolean;
    /** The F4 shortcut scrolls here. */
    sectionRef: Ref<HTMLDivElement>;
    onEditFinancing: () => void;
    onEditInvoiceDiscount: () => void;
    onSave: (status: SaleStatus) => void;
    onSaveAsOrder: () => void;
    onSaveAndWhatsapp: () => void;
}

/** The right-hand column: totals, how the customer pays (one or more accounts), a few extras and the save buttons — one card, sticky on desktop. */
export function PaymentSection({
    form,
    fulfilOrder,
    accounts,
    payments,
    onPaymentsChange,
    totals,
    historical,
    onHistoricalChange,
    hasCustomer,
    emiPreview = null,
    emiError = null,
    amending = false,
    sectionRef,
    onEditFinancing,
    onEditInvoiceDiscount,
    onSave,
    onSaveAsOrder,
    onSaveAndWhatsapp,
}: PaymentSectionProps) {
    const money = useMoneyFormat();

    return (
        <div
            ref={sectionRef}
            className="bg-card rounded-brand-card space-y-5 p-4 shadow-[var(--brand-card-shadow-elevated)] sm:p-5 lg:sticky lg:top-20"
        >
            {/* The figures sit on a soft panel so the total reads first, apart from the payment inputs below. */}
            <div className="bg-brand-secondary/50 rounded-brand-control p-3.5">
                <OrderSummary
                    form={form}
                    subtotal={totals.subtotal}
                    discountAmount={totals.discountAmount}
                    installation={totals.installation}
                    total={totals.total}
                    emiPreview={emiPreview}
                    emiError={emiError}
                    onEditFinancing={onEditFinancing}
                    onEditDiscount={onEditInvoiceDiscount}
                />
            </div>

            {fulfilOrder && (
                <p className="text-muted-foreground text-xs leading-5">
                    {fulfilOrder.order_no}: অগ্রিম <strong className="tabular-nums">{money(fulfilOrder.advance_paid)}</strong> আগেই নেওয়া হয়েছে —
                    Confirm করলে সেটা এই sale-এর পেমেন্ট হিসেবে ধরা হবে।
                </p>
            )}

            <AccountPaymentRows
                accounts={accounts}
                rows={payments}
                onChange={onPaymentsChange}
                label={fulfilOrder ? 'Payment now (on top of the advance)' : 'Payment'}
                emptyHint={
                    fulfilOrder
                        ? 'আরও টাকা এখন না নিলে বাকিটা due থেকে যাবে'
                        : 'পেমেন্ট না দিলে পুরোটা বকেয়া থাকবে (Sales Order করলে এই টাকা অগ্রিম হিসেবে থাকবে)'
                }
                total={totals.total}
                error={paymentRowsError(form.errors)}
            />

            {!fulfilOrder && <AdvancedOptions form={form} historical={historical} onHistoricalChange={onHistoricalChange} />}

            {amending && (
                <div className="space-y-1.5">
                    <Label htmlFor="amend_reason" required>
                        Reason for the change
                    </Label>
                    <Input
                        id="amend_reason"
                        value={form.data.amend_reason}
                        onChange={(event) => form.setData('amend_reason', event.target.value)}
                        placeholder="e.g. wrong price typed"
                        maxLength={255}
                        aria-invalid={form.errors.amend_reason ? true : undefined}
                    />
                    <InputError message={form.errors.amend_reason} />
                    <p className="text-muted-foreground text-xs leading-5">
                        Saving reverses this sale and records the corrected one on the same invoice. The reason is kept in the Activity Log.
                    </p>
                </div>
            )}

            <SaleActionBar
                fulfilOrder={fulfilOrder !== undefined}
                amending={amending}
                processing={form.processing}
                hasItems={form.data.items.length > 0}
                hasCustomer={hasCustomer}
                onSave={onSave}
                onSaveAsOrder={onSaveAsOrder}
                onSaveAndWhatsapp={onSaveAndWhatsapp}
            />
        </div>
    );
}
