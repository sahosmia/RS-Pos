import { Input } from '@/components/ui/input';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { forwardRef, useMemo, useState } from 'react';

export interface ProductOption {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    selling_price: number;
    current_stock: number;
    track_serial_number: boolean;
    has_installation_service: boolean;
}

interface ProductSearchInputProps {
    products: ProductOption[];
    onSelect: (product: ProductOption) => void;
    placeholder?: string;
}

/**
 * Search-as-you-type product picker — name/SKU/barcode, filtered
 * client-side against the already-loaded catalog. Enter adds the
 * highlighted match, Esc closes the dropdown. F2 (Task 6.9) focuses this
 * input from the parent page via the forwarded ref.
 */
const ProductSearchInput = forwardRef<HTMLInputElement, ProductSearchInputProps>(function ProductSearchInput(
    { products, onSelect, placeholder = 'Search product name, SKU or scan barcode (F2)' },
    ref,
) {
    const money = useMoneyFormat();
    const [query, setQuery] = useState('');
    const [highlighted, setHighlighted] = useState(0);

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q === '') {
            return [];
        }

        return products
            .filter(
                (product) =>
                    product.name.toLowerCase().includes(q) ||
                    product.sku.toLowerCase().includes(q) ||
                    (product.barcode && product.barcode.toLowerCase().includes(q)),
            )
            .slice(0, 8);
    }, [products, query]);

    const select = (product: ProductOption) => {
        onSelect(product);
        setQuery('');
        setHighlighted(0);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (matches.length === 0) {
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((current) => Math.min(current + 1, matches.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted((current) => Math.max(current - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            select(matches[highlighted]);
        } else if (e.key === 'Escape') {
            setQuery('');
        }
    };

    return (
        <div className="relative">
            <Input
                ref={ref}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlighted(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                autoComplete="off"
            />

            {matches.length > 0 && (
                <div className="bg-popover absolute z-10 mt-1 w-full rounded-md border shadow-md">
                    {matches.map((product, index) => (
                        <button
                            type="button"
                            key={product.id}
                            onClick={() => select(product)}
                            onMouseEnter={() => setHighlighted(index)}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                index === highlighted ? 'bg-accent text-accent-foreground' : ''
                            }`}
                        >
                            <span>
                                {product.name} <span className="text-muted-foreground">({product.sku})</span>
                            </span>
                            <span className="text-muted-foreground text-xs tabular-nums">
                                {money(product.selling_price)} · stock {product.current_stock}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});

export default ProductSearchInput;
