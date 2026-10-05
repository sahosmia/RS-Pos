import { FormInput } from '@/components/form/form-input';
import DiscountModal, { discountAmountFor } from '@/components/sales/discount-modal';
import { type CartSheetDraft, round2, unitLabel } from '@/components/sales/form/sale-form-utils';
import MoneyInput from '@/components/shared/money-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

interface CartSheetProps {
    /** The line being added or edited; null keeps the sheet closed. */
    draft: CartSheetDraft | null;
    onChange: (draft: CartSheetDraft) => void;
    onClose: () => void;
    onConfirm: () => void;
}

/** Mobile bottom sheet for one cart line: quantity, price (with a discount modal), installation and serial numbers. */
export function CartSheet({ draft, onChange, onClose, onConfirm }: CartSheetProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const [discountOpen, setDiscountOpen] = useState(false);

    return (
        <>
            <Sheet open={draft !== null} onOpenChange={(open) => !open && onClose()}>
                <SheetContent side="bottom" className="space-y-4">
                    <SheetHeader>
                        <SheetTitle>{draft?.product.name}</SheetTitle>
                    </SheetHeader>
                    {draft && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="cart-quantity">Quantity ({unitLabel(draft.product)})</Label>
                                    <FormInput
                                        id="cart-quantity"
                                        type="number"
                                        step="1"
                                        min={0}
                                        value={draft.quantity}
                                        onChange={(e) => onChange({ ...draft, quantity: Number(e.target.value) })}
                                        placeholder="1"
                                    />
                                </div>
                                <div className="grid min-w-0 content-start gap-2">
                                    <Label htmlFor="cart-price">Price</Label>
                                    <MoneyInput
                                        id="cart-price"
                                        value={draft.originalPrice}
                                        onChange={(e) => {
                                            const originalPrice = Number(e.target.value);
                                            onChange({
                                                ...draft,
                                                originalPrice,
                                                unitPrice: round2(
                                                    originalPrice - discountAmountFor(originalPrice, draft.discountType, draft.discountValue),
                                                ),
                                            });
                                        }}
                                    />
                                    <div className="flex items-center justify-between gap-1">
                                        {draft.discountType ? (
                                            <p className="text-muted-foreground text-xs">
                                                {draft.discountType === 'percentage' ? `${draft.discountValue}%` : `-${money(draft.discountValue)}`} →{' '}
                                                {money(draft.unitPrice)}
                                            </p>
                                        ) : (
                                            <span />
                                        )}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 gap-1 px-2 text-xs"
                                            onClick={() => setDiscountOpen(true)}
                                        >
                                            <Pencil className="size-3" />
                                            Discount
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {draft.product.has_installation_service && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={draft.installationRequired}
                                            onCheckedChange={(c) => onChange({ ...draft, installationRequired: c === true })}
                                        />
                                        Installation
                                    </label>
                                    {draft.installationRequired && (
                                        <MoneyInput
                                            value={draft.installationCharge ?? 0}
                                            onChange={(e) => onChange({ ...draft, installationCharge: Number(e.target.value) })}
                                        />
                                    )}
                                </div>
                            )}

                            {shop.serial_number_module_enabled && draft.product.track_serial_number && (
                                <FormInput
                                    id="cart-serials"
                                    label="Serial numbers"
                                    placeholder="Comma separated"
                                    value={draft.serialNumbers.join(', ')}
                                    onChange={(e) => onChange({ ...draft, serialNumbers: e.target.value.split(',').map((s) => s.trim()) })}
                                />
                            )}

                            <div className="flex justify-between rounded-lg border p-3 text-sm font-medium">
                                <span>Subtotal</span>
                                <span className="tabular-nums">{money(draft.quantity * draft.unitPrice)}</span>
                            </div>
                        </div>
                    )}
                    <SheetFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={onConfirm}>
                            {draft?.index !== null ? 'Save Changes' : 'Add to Cart'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <DiscountModal
                open={discountOpen}
                onOpenChange={setDiscountOpen}
                title="Item Discount"
                baseAmount={draft?.originalPrice ?? 0}
                initialType={draft?.discountType ?? null}
                initialValue={draft?.discountValue ?? 0}
                onApply={(type, value) => {
                    if (!draft) return;
                    onChange({
                        ...draft,
                        discountType: type,
                        discountValue: value,
                        unitPrice: round2(draft.originalPrice - discountAmountFor(draft.originalPrice, type, value)),
                    });
                }}
            />
        </>
    );
}
