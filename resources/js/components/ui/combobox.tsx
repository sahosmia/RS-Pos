import { Check, ChevronsUpDown, X } from 'lucide-react';
import * as React from 'react';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandLoading } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { controlSize, controlTriggerSurface } from '@/lib/form-control';
import { cn } from '@/lib/utils';
import { type VariantProps } from 'class-variance-authority';

/**
 * Searchable single-select for customers, products, accounts, warehouses, suppliers… Generic: it renders
 * the options it is given and reports the choice — it never fetches or knows what an option *is*.
 *
 * - **Local lists**: pass `options`; typing filters them in memory.
 * - **Server search**: pass `onSearchChange` (usually from `useAsyncOptions`) and `loading`; typing is reported
 *   (debounce it there) and `options` is whatever the server returned. Pass `selectedOption` so the trigger can
 *   still show the current choice when it isn't in the latest results.
 * - **Large lists**: at most `maxRendered` rows are rendered (default 100) with a "refine your search" hint.
 *
 * Accessibility: the trigger is a `combobox` button; the list is cmdk's listbox with arrow-key navigation,
 * Enter to choose, Esc to close (focus returns to the trigger). Pass `fieldAriaProps(...)` for error state.
 */
export interface ComboboxOption<T extends string | number = string | number> {
    value: T;
    label: string;
    /** Muted second line (phone number, SKU, account type…). */
    description?: string;
    /** Leading icon or avatar element. */
    icon?: React.ReactNode;
    /** Section heading; options sharing a value are grouped, in first-seen order. */
    group?: string;
    disabled?: boolean;
    /** Extra text that should match when filtering locally (without being shown). */
    keywords?: string[];
}

interface ComboboxProps<T extends string | number> extends VariantProps<typeof controlSize> {
    value: T | null | undefined;
    onValueChange: (value: T | null, option: ComboboxOption<T> | null) => void;
    options: ComboboxOption<T>[];
    /** The chosen option when it may be absent from `options` (server search results moved on). */
    selectedOption?: ComboboxOption<T> | null;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    /** Server mode: called with each query change. Local filtering is turned off. */
    onSearchChange?: (query: string) => void;
    /** Called when the popover opens/closes — lets `useAsyncOptions` load the initial list lazily. */
    onOpenChange?: (open: boolean) => void;
    loading?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    /** Row cap for rendering. Extra matches are summarised instead of rendered. */
    maxRendered?: number;
    id?: string;
    className?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    'aria-label'?: string;
}

function matches(option: ComboboxOption, query: string) {
    const haystack = `${option.label} ${option.description ?? ''} ${option.keywords?.join(' ') ?? ''}`.toLowerCase();

    return query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((term) => haystack.includes(term));
}

function Combobox<T extends string | number>({
    value,
    onValueChange,
    options,
    selectedOption,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    emptyText = 'No results found.',
    onSearchChange,
    onOpenChange,
    loading = false,
    clearable = false,
    disabled = false,
    maxRendered = 100,
    size,
    id,
    className,
    ...aria
}: ComboboxProps<T>) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const isServer = onSearchChange !== undefined;

    const selected = React.useMemo(
        () => (value === null || value === undefined ? null : (options.find((option) => option.value === value) ?? selectedOption ?? null)),
        [options, selectedOption, value],
    );

    const visible = React.useMemo(() => {
        const filtered = isServer || query.trim() === '' ? options : options.filter((option) => matches(option, query));

        return { rows: filtered.slice(0, maxRendered), hidden: Math.max(0, filtered.length - maxRendered) };
    }, [options, query, isServer, maxRendered]);

    const groups = React.useMemo(() => {
        const map = new Map<string, ComboboxOption<T>[]>();

        for (const option of visible.rows) {
            const key = option.group ?? '';
            map.set(key, [...(map.get(key) ?? []), option]);
        }

        return [...map.entries()];
    }, [visible.rows]);

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        onOpenChange?.(next);

        if (!next) {
            setQuery('');
            onSearchChange?.('');
        }
    };

    const choose = (option: ComboboxOption<T>) => {
        if (option.disabled) {
            return;
        }

        onValueChange(option.value, option);
        handleOpenChange(false);
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <div className={cn(controlTriggerSurface, controlSize({ size }), 'pr-1.5', className)}>
                <PopoverTrigger
                    id={id}
                    disabled={disabled}
                    role="combobox"
                    aria-haspopup="listbox"
                    className="flex h-full min-w-0 flex-1 items-center gap-2 bg-transparent text-left outline-hidden disabled:cursor-not-allowed"
                    {...aria}
                >
                    {selected?.icon && <span className="flex shrink-0 items-center [&_svg]:size-4">{selected.icon}</span>}
                    <span className={cn('truncate', !selected && 'text-brand-control-placeholder')}>{selected ? selected.label : placeholder}</span>
                </PopoverTrigger>
                {clearable && selected && !disabled && (
                    <button
                        type="button"
                        aria-label="Clear selection"
                        onClick={() => onValueChange(null, null)}
                        className="text-muted-foreground hover:text-foreground hover:bg-brand-secondary focus-visible:ring-brand-focus-ring flex size-6 shrink-0 items-center justify-center rounded-sm outline-hidden focus-visible:ring-2"
                    >
                        <X className="size-3.5" />
                    </button>
                )}
                <ChevronsUpDown className="text-muted-foreground pointer-events-none size-4 shrink-0" aria-hidden="true" />
            </div>

            <PopoverContent matchTriggerWidth className="min-w-64 overflow-hidden p-0" role="presentation" autoFocus>
                <Command shouldFilter={false} loop>
                    <CommandInput
                        data-autofocus=""
                        value={query}
                        onValueChange={(next) => {
                            setQuery(next);
                            onSearchChange?.(next);
                        }}
                        placeholder={searchPlaceholder}
                    />
                    <CommandList aria-busy={loading}>
                        {loading && visible.rows.length === 0 ? <CommandLoading /> : <CommandEmpty>{emptyText}</CommandEmpty>}
                        {groups.map(([group, rows]) => (
                            <CommandGroup key={group || 'ungrouped'} heading={group || undefined}>
                                {rows.map((option) => (
                                    <CommandItem
                                        key={String(option.value)}
                                        value={String(option.value)}
                                        disabled={option.disabled}
                                        onSelect={() => choose(option)}
                                        className={cn(option.description && 'items-start py-2')}
                                    >
                                        {option.icon && <span className={cn('flex shrink-0 items-center', option.description && 'mt-0.5')}>{option.icon}</span>}
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate">{option.label}</span>
                                            {option.description && <span className="text-muted-foreground truncate text-xs leading-4">{option.description}</span>}
                                        </span>
                                        {option.value === value && <Check className="text-brand-primary mt-0.5" aria-label="Selected" />}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                        {visible.hidden > 0 && (
                            <p className="text-muted-foreground px-2.5 py-2 text-center text-xs" aria-live="polite">
                                {visible.hidden} more — keep typing to narrow the list
                            </p>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export { Combobox };
export type { ComboboxProps };
