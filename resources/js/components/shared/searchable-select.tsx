import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface SearchableSelectOption {
    id: number;
}

interface SearchableSelectProps<T extends SearchableSelectOption> {
    /** The currently selected option (its full data, not just an id) — `null` for none. Comes from
     * whatever the caller last picked, or from the server for an already-filled-in edit form. */
    value: T | null;
    onChange: (option: T | null) => void;
    getLabel: (option: T) => string;
    getSublabel?: (option: T) => string;
    placeholder?: string;
    disabled?: boolean;
    /** Small, already-known list (e.g. Category, Brand) — filtered client-side as the user types, no network round-trip. */
    options?: T[];
    /**
     * Large/unbounded list (e.g. Product, Supplier) — hits this URL (a Ziggy `route()` result) with a
     * `q` query param, debounced (doc/corrections2.md #8).
     */
    searchUrl?: string;
    /** Extra static query params merged into every async search request, e.g. `{ type: 'supplier' }`. */
    searchParams?: Record<string, string>;
    /** Async mode only — default 1 (search as soon as anything's typed; debounce alone keeps request volume sane). */
    minChars?: number;
    /** Async mode only — default 350ms. */
    debounceMs?: number;
    /** Shows a small "×" to clear the current value back to `null` (e.g. Brand, which is optional). */
    clearable?: boolean;
    id?: string;
    className?: string;
}

/**
 * A single-select combobox: click to open a search box + dropdown, pick one,
 * the trigger then shows the selected label. Two data sources, one shared
 * interaction (keyboard nav, click-outside, loading/empty states):
 *
 * - `options` — the whole list is already in memory (Category/Brand-sized:
 *   a handful of rows), so typing just filters it instantly, no network.
 * - `searchUrl` — the list is large/unbounded (Product/Supplier-sized), so
 *   typing debounces into a server search instead of ever loading it all.
 *
 * The dropdown itself renders through a portal into `document.body`,
 * positioned by the trigger's own on-screen rect (doc/corrections2.md #11)
 * — a plain `position: absolute` panel would get clipped by any
 * `overflow-x-auto`/`overflow-hidden` ancestor (e.g. the Purchase item
 * table's horizontal-scroll wrapper), which is exactly what was happening.
 */
export default function SearchableSelect<T extends SearchableSelectOption>({
    value,
    onChange,
    getLabel,
    getSublabel,
    placeholder = 'Search...',
    disabled = false,
    options,
    searchUrl,
    searchParams,
    minChars = 1,
    debounceMs = 350,
    clearable = false,
    id,
    className,
}: SearchableSelectProps<T>) {
    const isAsync = searchUrl !== undefined;
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [asyncResults, setAsyncResults] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const trimmed = query.trim();

    // Local mode: filter the given list by name/sublabel. Async mode: debounced server search once
    // the query reaches `minChars` — mirrors the fetch/AbortController/debounce pattern already used
    // by GlobalSearchDialog, just parameterized per field instead of one global palette.
    useEffect(() => {
        if (!isAsync) {
            return;
        }

        abortRef.current?.abort();

        if (trimmed.length < minChars) {
            setAsyncResults([]);
            setLoading(false);

            return;
        }

        setLoading(true);
        const controller = new AbortController();
        abortRef.current = controller;

        const timeout = setTimeout(() => {
            const params = new URLSearchParams({ q: trimmed, ...searchParams });

            fetch(`${searchUrl}?${params.toString()}`, { headers: { Accept: 'application/json' }, signal: controller.signal })
                .then((response) => response.json())
                .then((data: { data: T[] }) => {
                    setAsyncResults(data.data);
                    setHighlighted(0);
                })
                .catch((error: unknown) => {
                    if (!(error instanceof DOMException && error.name === 'AbortError')) {
                        setAsyncResults([]);
                    }
                })
                .finally(() => setLoading(false));
        }, debounceMs);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams is a fresh object each render; comparing it would refetch every keystroke for no reason.
    }, [trimmed, isAsync, minChars, debounceMs, searchUrl]);

    const localMatches = (options ?? []).filter((option) => {
        if (trimmed === '') {
            return true;
        }

        const haystack = `${getLabel(option)} ${getSublabel?.(option) ?? ''}`.toLowerCase();

        return haystack.includes(trimmed.toLowerCase());
    });

    const matches = isAsync ? asyncResults : localMatches;

    const updatePosition = useCallback(() => {
        const rect = containerRef.current?.getBoundingClientRect();

        if (rect) {
            setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
        }
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }

        updatePosition();

        const onClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (!containerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
                setOpen(false);
                setQuery('');
            }
        };

        // Capture phase so this also fires for scroll inside an ancestor scroll container
        // (e.g. the Purchase item table's `overflow-x-auto` wrapper), not just the window.
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        document.addEventListener('mousedown', onClickOutside);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
            document.removeEventListener('mousedown', onClickOutside);
        };
    }, [open, updatePosition]);

    const openDropdown = () => {
        if (disabled) {
            return;
        }

        setOpen(true);
        setQuery('');
        setHighlighted(0);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const select = (option: T) => {
        onChange(option);
        setOpen(false);
        setQuery('');
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setOpen(false);
            setQuery('');

            return;
        }

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
        }
    };

    const showHint = isAsync && trimmed.length > 0 && trimmed.length < minChars;
    const showEmpty = !loading && !showHint && trimmed.length >= (isAsync ? minChars : 0) && matches.length === 0;

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            {open ? (
                <div className="relative">
                    <Input
                        id={id}
                        ref={inputRef}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setHighlighted(0);
                        }}
                        onKeyDown={onKeyDown}
                        placeholder={placeholder}
                        autoComplete="off"
                        className="pr-8"
                    />
                    <Loader2
                        className={cn(
                            'text-muted-foreground pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin transition-opacity duration-200',
                            loading ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                </div>
            ) : (
                <button
                    type="button"
                    id={id}
                    disabled={disabled}
                    onClick={openDropdown}
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <span className={cn('truncate', !value && 'text-muted-foreground')}>{value ? getLabel(value) : placeholder}</span>
                    <span className="ml-2 flex shrink-0 items-center gap-1">
                        {clearable && value && (
                            <X
                                className="text-muted-foreground hover:text-foreground size-4"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange(null);
                                }}
                            />
                        )}
                        <ChevronDown className="text-muted-foreground size-4 opacity-50" />
                    </span>
                </button>
            )}

            {open &&
                position &&
                createPortal(
                    <div
                        ref={panelRef}
                        style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
                        className="bg-popover z-50 max-h-72 overflow-y-auto rounded-md border shadow-md"
                    >
                        {showHint && <p className="text-muted-foreground px-3 py-2 text-sm">Type at least {minChars} characters to search</p>}
                        {!showHint && loading && matches.length === 0 && <p className="text-muted-foreground px-3 py-2 text-sm">Searching...</p>}
                        {showEmpty && <p className="text-muted-foreground px-3 py-2 text-sm">No results found</p>}
                        {matches.map((option, index) => (
                            <button
                                type="button"
                                key={option.id}
                                onClick={() => select(option)}
                                onMouseEnter={() => setHighlighted(index)}
                                className={cn(
                                    'flex w-full items-center justify-between px-3 py-2 text-left text-sm',
                                    index === highlighted && 'bg-accent text-accent-foreground',
                                )}
                            >
                                <span className="truncate">{getLabel(option)}</span>
                                {getSublabel && <span className="text-muted-foreground ml-2 shrink-0 text-xs">{getSublabel(option)}</span>}
                            </button>
                        ))}
                    </div>,
                    document.body,
                )}
        </div>
    );
}
