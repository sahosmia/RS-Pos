import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandLoading } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Tip } from '@/components/ui/tooltip';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SearchResult {
    id: number;
    title: string;
    subtitle: string | null;
    amount: number | null;
    url: string;
}

interface SearchResponse {
    products: SearchResult[];
    contacts: SearchResult[];
    sales: SearchResult[];
    purchases: SearchResult[];
    expenses: SearchResult[];
}

const emptyResults: SearchResponse = { products: [], contacts: [], sales: [], purchases: [], expenses: [] };

const groups: { key: keyof SearchResponse; heading: string }[] = [
    { key: 'products', heading: 'Products' },
    { key: 'contacts', heading: 'Contacts' },
    { key: 'sales', heading: 'Sales' },
    { key: 'purchases', heading: 'Purchases' },
    { key: 'expenses', heading: 'Expenses' },
];

export default function GlobalSearchDialog() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResponse>(emptyResults);
    const [loading, setLoading] = useState(false);
    const money = useMoneyFormat();
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen((current) => !current);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        if (!open) {
            setQuery('');
            setResults(emptyResults);
            return;
        }
    }, [open]);

    useEffect(() => {
        abortRef.current?.abort();

        const trimmed = query.trim();
        if (trimmed === '') {
            setResults(emptyResults);
            setLoading(false);
            return;
        }

        setLoading(true);
        const controller = new AbortController();
        abortRef.current = controller;

        const timeout = setTimeout(() => {
            fetch(route('global-search', { q: trimmed }), {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            })
                .then((response) => response.json())
                .then((data: SearchResponse) => setResults(data))
                .catch((error: unknown) => {
                    if (!(error instanceof DOMException && error.name === 'AbortError')) {
                        setResults(emptyResults);
                    }
                })
                .finally(() => setLoading(false));
        }, 250);

        return () => clearTimeout(timeout);
    }, [query]);

    const select = (result: SearchResult) => {
        setOpen(false);
        router.visit(result.url);
    };

    const hasResults = groups.some((group) => results[group.key].length > 0);

    return (
        <>
            <Tip label="Search" shortcut="Ctrl K">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setOpen(true)}
                    aria-label="Search"
                    aria-keyshortcuts="Control+K Meta+K"
                >
                    <Search />
                </Button>
            </Tip>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTitle className="sr-only">Global Search</DialogTitle>
                <DialogDescription className="sr-only">Search products, contacts, sales, purchases and expenses</DialogDescription>
                <DialogContent className="overflow-hidden p-0 shadow-lg">
                    <Command
                        shouldFilter={false}
                        className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3"
                    >
                        <CommandInput placeholder="Search products, contacts, sales, purchases, expenses..." value={query} onValueChange={setQuery} />
                        <CommandList>
                            {query.trim() === '' && <CommandEmpty>Type to search across the whole system.</CommandEmpty>}
                            {query.trim() !== '' && loading && !hasResults && <CommandLoading />}
                            {query.trim() !== '' && !loading && !hasResults && <CommandEmpty>No results found.</CommandEmpty>}

                            {groups.map(
                                (group) =>
                                    results[group.key].length > 0 && (
                                        <CommandGroup key={group.key} heading={group.heading}>
                                            {results[group.key].map((result) => (
                                                <CommandItem key={result.id} value={`${group.key}-${result.id}`} onSelect={() => select(result)}>
                                                    <div className="flex w-full items-center justify-between gap-4">
                                                        <div className="min-w-0">
                                                            <div className="truncate font-medium">{result.title}</div>
                                                            {result.subtitle && (
                                                                <div className="text-muted-foreground truncate text-xs">{result.subtitle}</div>
                                                            )}
                                                        </div>
                                                        {result.amount !== null && (
                                                            <div className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                                                {money(result.amount)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    ),
                            )}
                        </CommandList>
                    </Command>
                </DialogContent>
            </Dialog>
        </>
    );
}
