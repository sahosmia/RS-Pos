import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Pencil, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SaleSerial {
    serial_number: string;
    status: string;
}

interface SaleSerialListProps {
    saleId: number;
    itemId: number;
    serials: SaleSerial[];
    /** Only a confirmed sale has units that can be corrected. */
    confirmed: boolean;
}

/**
 * The serial numbers of a sold line. On the printed invoice it is just "SN: a, b". On screen, anyone who may edit
 * sales can fix a wrongly typed serial (swap in the unit that was really handed over), or put a customer-returned unit
 * back in stock so it can be sold again.
 */
export function SaleSerialList({ saleId, itemId, serials, confirmed }: SaleSerialListProps) {
    const { auth } = usePage<SharedData>().props;
    const canEdit = confirmed && auth.permissions.includes('sale.edit');

    const [correcting, setCorrecting] = useState<string | null>(null);
    const [replacement, setReplacement] = useState('');
    const [processing, setProcessing] = useState(false);

    if (serials.length === 0) {
        return null;
    }

    const done = (message: string) => ({
        preserveScroll: true,
        onSuccess: () => toast.success(message),
        onError: (errors: Record<string, string>) => toast.error(errors.serial ?? Object.values(errors)[0] ?? 'Could not update the serial number.'),
        onFinish: () => {
            setProcessing(false);
            setCorrecting(null);
            setReplacement('');
        },
    });

    const correct = () => {
        if (correcting === null) return;
        setProcessing(true);
        router.patch(
            route('sales.serials.update', { sale: saleId, saleItem: itemId }),
            { from: correcting, to: replacement.trim() },
            done('Serial number corrected.'),
        );
    };

    const restock = (serial: string) => {
        setProcessing(true);
        router.post(route('sales.serials.restock', { sale: saleId, saleItem: itemId }), { from: serial }, done(`${serial} is back in stock.`));
    };

    return (
        <>
            {/* Printed invoice: plain text only. */}
            <div className="text-muted-foreground hidden text-xs print:block">SN: {serials.map((serial) => serial.serial_number).join(', ')}</div>

            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs print:hidden">
                <span>SN:</span>
                {serials.map((serial) => (
                    <span key={serial.serial_number} className="inline-flex items-center gap-1">
                        <span className={serial.status === 'sold' ? undefined : 'line-through'}>{serial.serial_number}</span>
                        {serial.status === 'returned' && <span className="text-brand-warning-text">(returned)</span>}
                        {canEdit && serial.status === 'sold' && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="size-5"
                                title="Wrong serial? Change it"
                                aria-label={`Change serial ${serial.serial_number}`}
                                onClick={() => setCorrecting(serial.serial_number)}
                            >
                                <Pencil className="size-3" />
                            </Button>
                        )}
                        {canEdit && serial.status === 'returned' && (
                            <Button
                                type="button"
                                variant="soft"
                                size="xs"
                                disabled={processing}
                                title="The unit is back on the shelf — make it sellable again"
                                onClick={() => restock(serial.serial_number)}
                            >
                                <RotateCcw />
                                Restock
                            </Button>
                        )}
                    </span>
                ))}
            </div>

            <Dialog open={correcting !== null} onOpenChange={(open) => !open && setCorrecting(null)}>
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>Change serial number</DialogTitle>
                        <DialogDescription>
                            Enter the serial of the unit that was really handed over. <strong>{correcting}</strong> goes back to stock and the
                            invoice, warranty and service history follow the new unit. No money or stock quantity changes.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={replacement}
                        onChange={(event) => setReplacement(event.target.value)}
                        placeholder="Correct serial number"
                        autoFocus
                    />
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setCorrecting(null)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={correct} loading={processing} disabled={replacement.trim() === ''}>
                            Change serial
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
