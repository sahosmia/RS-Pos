import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type ProductListItem } from '@/types/models';
import { Eye, Pencil, ShoppingBag, ShoppingCart, SlidersHorizontal, Trash2 } from 'lucide-react';

interface ProductActionHandlers {
    onAdjustStock: (product: ProductListItem) => void;
    onDelete: (product: ProductListItem) => void;
}

/** Row actions shared by the table's action menu and the mobile card. */
export function getProductActions(product: ProductListItem, { onAdjustStock, onDelete }: ProductActionHandlers): RowAction[] {
    return [
        { label: 'View Details', icon: Eye, href: route('products.show', product.id) },
        { label: 'Adjust Stock', icon: SlidersHorizontal, onClick: () => onAdjustStock(product), hidden: !product.manage_stock },
        { label: 'Add Purchase', icon: ShoppingCart, href: route('purchases.create', { product_id: product.id }), hidden: !product.manage_stock },
        { label: 'Add Sale', icon: ShoppingBag, href: route('sales.create', { product_id: product.id }), hidden: !product.is_for_sale },
        { label: 'Edit', icon: Pencil, href: route('products.edit', product.id) },
        { label: 'Delete', icon: Trash2, variant: 'destructive', separatorBefore: true, onClick: () => onDelete(product) },
    ];
}
