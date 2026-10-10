import { FormInput } from '@/components/form/form-input';
import { discountAmountFor } from '@/components/sales/discount-modal';
import { LineWarranty } from '@/components/sales/form/line-warranty';
import { round2, unitLabel } from '@/components/sales/form/sale-form-utils';
import { ItemDiscountDetail } from '@/components/sales/item-discount-detail';
import MoneyInput from '@/components/shared/money-input';
import { type ProductOption } from '@/components/shared/product-search-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type SharedData } from '@/types';
import { type SaleFormItem } from '@/types/models';
import { usePage } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';

interface SaleItemsTableProps {
    items: SaleFormItem[];
    productById: (id: number) => ProductOption | undefined;
    onUpdate: (index: number, changes: Partial<SaleFormItem>) => void;
    onRemove: (index: number) => void;
    onEditDiscount: (index: number) => void;
    /** The form's validation errors — a bad serial number is shown under that line's serial input. */
    errors?: Record<string, string | undefined>;
}

const HEAD = 'py-2.5 text-right text-xs font-medium uppercase tracking-wide';

/** The cart on desktop: one editable row per product — quantity, price, discount, installation and serial numbers. */
export function SaleItemsTable({ items, productById, onUpdate, onRemove, onEditDiscount, errors = {} }: SaleItemsTableProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    // The Discount column only appears once a line has a discount (the pencil beside the product name adds one).
    const hasDiscount = items.some((item) => item.discount_type);

    return (
        <div className="rounded-brand-card bg-card mt-4 overflow-x-auto shadow-[var(--brand-card-shadow-elevated)]">
            <table className="w-full text-sm">
                <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                    <tr>
                        <th className="py-2.5 pl-3 text-left text-xs font-medium tracking-wide uppercase">Product</th>
                        <th className={`w-20 ${HEAD}`}>Qty</th>
                        <th className={`w-40 ${HEAD}`}>Price</th>
                        {hasDiscount && <th className={`w-44 ${HEAD}`}>Discount</th>}
                        <th className={`w-28 pr-3 ${HEAD}`}>Subtotal</th>
                        <th className="w-10 py-2.5"></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => {
                        const product = productById(item.product_id);

                        return (
                            <tr
                                key={index}
                                className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors hover:bg-muted/30 border-t align-top transition-colors"
                            >
                                <td className="py-2.5 pr-2 pl-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium">{product?.name}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground size-5 shrink-0"
                                            onClick={() => onEditDiscount(index)}
                                            aria-label="Edit discount"
                                            title="Edit discount"
                                        >
                                            <Pencil className="size-3" />
                                        </Button>
                                    </div>
                                    <div className="text-muted-foreground text-xs">{product?.sku}</div>
                                    {product?.has_installation_service && (
                                        <label className="mt-1.5 flex items-center gap-1.5 text-xs">
                                            <Checkbox
                                                checked={item.installation_required}
                                                onCheckedChange={(c) => onUpdate(index, { installation_required: c === true })}
                                            />
                                            Installation
                                            {item.installation_required && (
                                                <MoneyInput
                                                    value={item.installation_charge ?? 0}
                                                    onChange={(e) => onUpdate(index, { installation_charge: Number(e.target.value) })}
                                                    className="ml-1 h-7 w-24"
                                                />
                                            )}
                                        </label>
                                    )}
                                    <LineWarranty
                                        product={product}
                                        months={item.warranty_months}
                                        serviceIncluded={item.service_plan_included}
                                        onChange={(changes) => onUpdate(index, changes)}
                                        idPrefix={`sale-item-${index}`}
                                    />
                                    {shop.serial_number_module_enabled && product?.track_serial_number && (
                                        <FormInput
                                            id={`sale-item-${index}-serials`}
                                            placeholder="Serial numbers, comma separated"
                                            value={item.serial_numbers.join(', ')}
                                            error={errors[`items.${index}.serial_numbers`]}
                                            onChange={(e) => onUpdate(index, { serial_numbers: e.target.value.split(',').map((s) => s.trim()) })}
                                            className="mt-1.5 h-7 text-xs"
                                        />
                                    )}
                                </td>
                                <td className="py-2.5 pr-2">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <FormInput
                                            id={`sale-item-${index}-quantity`}
                                            type="number"
                                            step="1"
                                            min={0}
                                            value={item.quantity}
                                            onChange={(e) => onUpdate(index, { quantity: Number(e.target.value) })}
                                            placeholder="1"
                                            className="w-20 text-right"
                                        />
                                        <span className="text-muted-foreground shrink-0 text-xs font-medium">{unitLabel(product)}</span>
                                    </div>
                                </td>
                                <td className="py-2.5 pr-2">
                                    <MoneyInput
                                        value={item.original_price}
                                        onChange={(e) => {
                                            const originalPrice = Number(e.target.value);
                                            onUpdate(index, {
                                                original_price: originalPrice,
                                                unit_price: round2(
                                                    originalPrice - discountAmountFor(originalPrice, item.discount_type, item.discount_value),
                                                ),
                                            });
                                        }}
                                        className="ml-auto w-36 text-right"
                                    />
                                </td>
                                {hasDiscount && (
                                    <td className="py-2.5 pr-2">
                                        <ItemDiscountDetail
                                            type={item.discount_type}
                                            value={item.discount_value}
                                            originalPrice={item.original_price}
                                            unitPrice={item.unit_price}
                                            quantity={item.quantity}
                                        />
                                    </td>
                                )}
                                <td className="py-2.5 pr-3 text-right font-medium tabular-nums">{money(item.quantity * item.unit_price)}</td>
                                <td className="py-2.5 text-right">
                                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => onRemove(index)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
