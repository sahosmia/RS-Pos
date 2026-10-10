import { type SaleStatus } from '@/components/sales/form/sale-form-utils';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { Check, ClipboardList, MessageCircle } from 'lucide-react';

interface SaleActionBarProps {
    processing: boolean;
    hasItems: boolean;
    hasCustomer: boolean;
    /** Confirming a Sales Order: one Confirm button, nothing else to save as. */
    fulfilOrder?: boolean;
    /** Editing a confirmed sale: there is no Draft / Quotation to fall back to. */
    amending?: boolean;
    onSave: (status: SaleStatus) => void;
    onSaveAsOrder: () => void;
    onSaveAndWhatsapp: () => void;
}

/** One big Confirm button; Draft, Quotation, Sales Order, WhatsApp and Cancel stay quietly underneath. */
export function SaleActionBar({
    processing,
    hasItems,
    hasCustomer,
    fulfilOrder = false,
    amending = false,
    onSave,
    onSaveAsOrder,
    onSaveAndWhatsapp,
}: SaleActionBarProps) {
    if (fulfilOrder) {
        return (
            <div className="space-y-2">
                <Button type="button" size="lg" disabled={processing || !hasItems} onClick={() => onSave('confirmed')} className="w-full gap-2">
                    <Check className="size-4" />
                    {processing ? 'Saving...' : 'Confirm Sale'}
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => router.get(route('sales-orders.index'))}
                    className="text-muted-foreground w-full"
                >
                    Cancel
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <Button type="button" size="lg" disabled={processing || !hasItems} onClick={() => onSave('confirmed')} className="w-full gap-2">
                <Check className="size-4" />
                {processing ? 'Saving...' : amending ? 'Save changes' : 'Confirm Sale'}
            </Button>

            <div className={amending ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-2'}>
                {!amending && (
                    <>
                        <Button type="button" variant="outline" size="sm" disabled={processing} onClick={() => onSave('draft')}>
                            Draft
                        </Button>
                        <Button type="button" variant="outline" size="sm" disabled={processing} onClick={() => onSave('quotation')}>
                            Quotation
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={processing || !hasItems || !hasCustomer}
                            onClick={onSaveAsOrder}
                            className="gap-1 text-teal-600 dark:text-teal-400"
                            title="মাল এখনো হাতে নেই — Sales Order হিসেবে রাখুন (stock কমবে না, serial যাচাই হবে না, টাকা দিলে অগ্রিম)"
                        >
                            <ClipboardList className="size-3.5" />
                            Sales Order
                        </Button>
                    </>
                )}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={processing || !hasItems || !hasCustomer}
                    onClick={onSaveAndWhatsapp}
                    className="gap-1 text-emerald-600 dark:text-emerald-400"
                    title="Confirm করে WhatsApp-এ invoice পাঠান"
                >
                    <MessageCircle className="size-3.5" />
                    WhatsApp
                </Button>
            </div>

            <Button type="button" variant="ghost" size="sm" onClick={() => router.get(route('sales.index'))} className="text-muted-foreground w-full">
                Cancel
            </Button>
        </div>
    );
}
