import { type SaleStatus } from '@/components/sales/form/sale-form-utils';
import { Button } from '@/components/ui/button';
// import { Kbd } from '@/components/ui/kbd';
import { router } from '@inertiajs/react';
import { Check, MessageCircle } from 'lucide-react';

interface SaleActionBarProps {
    processing: boolean;
    hasItems: boolean;
    hasCustomer: boolean;
    onSave: (status: SaleStatus) => void;
    onSaveAndWhatsapp: () => void;
}

/** One big Confirm button; Draft, Quotation, WhatsApp and Cancel stay quietly underneath. */
export function SaleActionBar({ processing, hasItems, hasCustomer, onSave, onSaveAndWhatsapp }: SaleActionBarProps) {
    return (
        <div className="space-y-2">
            <Button type="button" size="lg" disabled={processing || !hasItems} onClick={() => onSave('confirmed')} className="w-full gap-2">
                <Check className="size-4" />
                {processing ? 'Saving...' : 'Confirm Sale'}
                {/* <Kbd>↵</Kbd> */}
            </Button>

            <div className="grid grid-cols-3 gap-2">
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
                {/* <Kbd className="ml-1">Esc</Kbd> */}
            </Button>
        </div>
    );
}
