import SalePaymentHistoryTable from '@/components/sales/sale-payment-history-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type SalePaymentHistoryEntry } from '@/types/models';
import { useEffect, useState } from 'react';

interface ViewSalePaymentsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Only these two are used to fetch/label the list. */
    sale: { id: number; invoice_no: string } | null;
}

/**
 * The Sales list's own "View Payments" row action — a quick-glance modal so
 * you don't have to leave the list. The full page (`sales/show`) shows the
 * same history inline instead of behind a click, via the same
 * `SalePaymentHistoryTable`.
 */
export default function ViewSalePaymentsModal({ open, onOpenChange, sale }: ViewSalePaymentsModalProps) {
    const [payments, setPayments] = useState<SalePaymentHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !sale) {
            return;
        }

        setLoading(true);
        fetch(route('sales.payments.index', sale.id), { headers: { Accept: 'application/json' } })
            .then((response) => (response.ok ? response.json() : { payments: [] }))
            .then((body) => setPayments(body.payments ?? []))
            .catch(() => setPayments([]))
            .finally(() => setLoading(false));
    }, [open, sale]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Payments — {sale?.invoice_no}</DialogTitle>
                </DialogHeader>

                {loading ? <p className="text-muted-foreground py-6 text-center text-sm">Loading...</p> : <SalePaymentHistoryTable rows={payments} />}
            </DialogContent>
        </Dialog>
    );
}
