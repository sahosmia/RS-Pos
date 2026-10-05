import { unitLabel } from '@/components/sales/form/sale-form-utils';
import { type ProductOption } from '@/components/shared/product-search-input';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type SaleFormItem } from '@/types/models';
import { Pencil, Trash2 } from 'lucide-react';

interface SaleItemsListProps {
    items: SaleFormItem[];
    productById: (id: number) => ProductOption | undefined;
    onEdit: (index: number) => void;
    onRemove: (index: number) => void;
    /** The form's validation errors — a bad serial number is shown under that line. */
    errors?: Record<string, string | undefined>;
}

/** The cart on mobile: a compact card per product; tapping edit opens the bottom sheet. */
export function SaleItemsList({ items, productById, onEdit, onRemove, errors = {} }: SaleItemsListProps) {
    const money = useMoneyFormat();

    return (
        <div className="mt-4 space-y-2">
            {items.map((item, index) => {
                const product = productById(item.product_id);

                return (
                    <div key={index} className="bg-card flex items-center gap-3 rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{product?.name}</div>
                            <div className="text-muted-foreground text-xs tabular-nums">
                                {item.quantity} {unitLabel(product)} × {money(item.unit_price)} = {money(item.quantity * item.unit_price)}
                            </div>
                            {errors[`items.${index}.serial_numbers`] && (
                                <div className="text-destructive text-xs">{errors[`items.${index}.serial_numbers`]}</div>
                            )}
                            {item.installation_required && (
                                <div className="text-muted-foreground text-xs">+ Installation {money(item.installation_charge ?? 0)}</div>
                            )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onEdit(index)}>
                                <Pencil className="size-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onRemove(index)}>
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
