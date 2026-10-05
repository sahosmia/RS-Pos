import { type SaleFormApi, type SaleStatus } from '@/components/sales/form/sale-form-utils';
import { type PaymentRow, paymentRowsError } from '@/components/shared/account-payment-rows';
import { type ProductOption } from '@/components/shared/product-search-input';
import { buildSaleWhatsappMessage, openWhatsapp } from '@/lib/sale-whatsapp-message';
import { type CustomerOption, type SaleFormDetail } from '@/types/models';
import { type Page } from '@inertiajs/core';
import { type FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface Options {
    form: SaleFormApi;
    mode: 'create' | 'edit';
    sale?: SaleFormDetail;
    customer: CustomerOption | null;
    payments: PaymentRow[];
    /** "Historical record": saved without touching stock or balances. */
    historical: boolean;
    productById: (id: number) => ProductOption | undefined;
    totals: { subtotal: number; discountAmount: number };
    money: (amount: number) => string;
}

/** Saving the sale as a draft / quotation / confirmed invoice — and "Save & WhatsApp", which also opens the customer's chat. */
export function useSaleSubmit({ form, mode, sale, customer, payments, historical, productById, totals, money }: Options) {
    // Pressing Enter inside a field submits the form with whichever status was used last.
    const [pendingStatus, setPendingStatus] = useState<SaleStatus>('confirmed');

    const submitAs = (status: SaleStatus, onSuccess?: (page: Page) => void) => {
        if (form.data.items.length === 0) return;

        setPendingStatus(status);
        form.transform((data) => ({
            ...data,
            status,
            source: historical ? 'imported' : 'manual',
            payments: status === 'confirmed' ? payments.filter((r) => r.account_id && r.amount > 0) : [],
        }));

        const options = {
            preserveScroll: true,
            onSuccess: (page: Page) => {
                form.setDefaults(); // saved: what's on screen is now the baseline, not an unsaved change
                toast.success(mode === 'edit' ? 'Sale invoice updated.' : 'Sale invoice saved.');
                onSuccess?.(page);
            },
            onError: (errors: Record<string, string>) => {
                // A bad serial number is also shown under its input; the toast just says what went wrong.
                const serialError = Object.entries(errors).find(([key]) => key.endsWith('.serial_numbers'))?.[1];

                toast.error(paymentRowsError(errors) ?? serialError ?? errors.error ?? 'Could not save the sale — check the form for errors.');
            },
        };

        if (mode === 'edit' && sale) form.patch(route('sales.update', sale.id), options);
        else form.post(route('sales.store'), options);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        submitAs(pendingStatus);
    };

    const submitWithWhatsapp = () => {
        if (!customer) return;

        if (!customer.phone) {
            toast.error('এই গ্রাহকের কোনো ফোন নাম্বার নেই — হোয়াটসঅ্যাপ পাঠানো যাবে না।');
            return;
        }

        const oldDue = Math.max(customer.balance, 0);
        const itemLines = form.data.items.map((i) => ({
            name: productById(i.product_id)?.name ?? 'Item',
            quantity: i.quantity,
            unitPrice: i.unit_price,
        }));

        submitAs('confirmed', (page) => {
            const savedSale = page.props.sale as unknown as {
                invoice_no: string;
                total_amount: number;
                due_amount: number;
                customer: { balance: number };
            };

            openWhatsapp(
                customer.phone!,
                buildSaleWhatsappMessage(
                    {
                        customerName: customer.name,
                        invoiceNo: savedSale.invoice_no,
                        saleDate: form.data.sale_date,
                        items: itemLines,
                        subtotal: totals.subtotal,
                        discountAmount: totals.discountAmount,
                        totalAmount: savedSale.total_amount,
                        saleDueAmount: savedSale.due_amount,
                        oldDue,
                        newTotalDue: Math.max(savedSale.customer.balance, 0),
                    },
                    money,
                ),
            );
        });
    };

    return { submit, submitAs, submitWithWhatsapp };
}
