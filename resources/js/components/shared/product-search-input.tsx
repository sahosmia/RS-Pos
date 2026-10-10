import { Input } from '@/components/ui/input';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ProductOption {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    selling_price: number;
    current_stock: number;
    track_serial_number: boolean;
    has_installation_service: boolean;
    /** The warranty the product carries by default; a sale line starts from it. */
    warranty_period_months?: number | null;
    service_plan_templates_count?: number;
    unit?: {
        id: number;
        name: string;
        short_name?: string | null;
    } | null;
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
 *
 * The dropdown renders through a portal into document.body, positioned from the input's own
 * on-screen rect (same approach as SearchableSelect) — a plain absolute panel got clipped by
 * the overflow-hidden card and covered by the sections below it.
 */
const ProductSearchInput = forwardRef<HTMLInputElement, ProductSearchInputProps>(function ProductSearchInput(
    { products, onSelect, placeholder = 'Search product name, SKU or scan barcode (F2)' },
    ref,
) {
    const money = useMoneyFormat();
    const [query, setQuery] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

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

    const updatePosition = useCallback(() => {
        const rect = containerRef.current?.getBoundingClientRect();

        if (rect) {
            setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
        }
    }, []);

    const isOpen = matches.length > 0;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        updatePosition();

        // Capture phase so scrolling inside any ancestor scroll container repositions it too.
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, updatePosition]);

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
        <div ref={containerRef} className="relative">
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

            {isOpen &&
                position &&
                createPortal(
                    <div
                        style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
                        className="bg-popover z-50 max-h-80 overflow-y-auto rounded-md border shadow-md"
                    >
                        {matches.map((product, index) => (
                            <button
                                type="button"
                                key={product.id}
                                // Keep focus in the search input so a click doesn't blur it before the pick lands.
                                onMouseDown={(e) => e.preventDefault()}
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
                    </div>,
                    document.body,
                )}
        </div>
    );
});

export default ProductSearchInput;
