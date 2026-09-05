import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type ChartOfAccountOption, type JournalEntryListItem, type Paginated } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Journal Entries', href: '/journal-entries' }];

interface JournalEntriesIndexProps {
    entries: Paginated<JournalEntryListItem>;
    accounts: ChartOfAccountOption[];
    filters: {
        from: string | null;
        to: string | null;
        chart_of_account_id: number | null;
    };
}

export default function JournalEntriesIndex({ entries, accounts, filters }: JournalEntriesIndexProps) {
    const money = useMoneyFormat();

    const applyFilters = (next: Partial<JournalEntriesIndexProps['filters']>) => {
        router.get(
            route('journal-entries.index'),
            {
                from: next.from !== undefined ? next.from : filters.from,
                to: next.to !== undefined ? next.to : filters.to,
                chart_of_account_id: next.chart_of_account_id !== undefined ? next.chart_of_account_id : filters.chart_of_account_id,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Journal Entries" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Journal Entries" description="General Ledger-এ পোস্ট হওয়া প্রতিটা balanced entry" />

                <div className="flex flex-wrap items-end gap-3">
                    <div className="grid gap-2">
                        <Label htmlFor="from">From</Label>
                        <Input
                            id="from"
                            type="date"
                            value={filters.from ?? ''}
                            onChange={(e) => applyFilters({ from: e.target.value || null })}
                            className="w-40"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="to">To</Label>
                        <Input
                            id="to"
                            type="date"
                            value={filters.to ?? ''}
                            onChange={(e) => applyFilters({ to: e.target.value || null })}
                            className="w-40"
                        />
                    </div>

                    <Select
                        value={filters.chart_of_account_id ? String(filters.chart_of_account_id) : 'all'}
                        onValueChange={(value) => applyFilters({ chart_of_account_id: value === 'all' ? null : Number(value) })}
                    >
                        <SelectTrigger className="w-64">
                            <SelectValue placeholder="Account" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All accounts</SelectItem>
                            {accounts.map((account) => (
                                <SelectItem key={account.id} value={String(account.id)}>
                                    {account.code} — {account.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {entries.data.length === 0 ? (
                    <EmptyState title="No journal entries yet" description="Purchase/Sale/Fund Transfer confirm করলে এখানে দেখা যাবে" />
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Date</th>
                                        <th className="px-4 py-2 text-left font-medium">Description</th>
                                        <th className="px-4 py-2 text-left font-medium">Reference</th>
                                        <th className="px-4 py-2 text-left font-medium">Status</th>
                                        <th className="px-4 py-2 text-right font-medium">Debit</th>
                                        <th className="px-4 py-2 text-right font-medium">Credit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.data.map((entry) => (
                                        <tr key={entry.id} className="border-t">
                                            <td className="px-4 py-2 whitespace-nowrap">{entry.entry_date}</td>
                                            <td className="px-4 py-2">
                                                <Link href={route('journal-entries.show', entry.id)} className="underline-offset-2 hover:underline">
                                                    {entry.description}
                                                </Link>
                                            </td>
                                            <td className="text-muted-foreground px-4 py-2">
                                                {entry.reference_type ? `${entry.reference_type} #${entry.reference_id}` : '—'}
                                            </td>
                                            <td className="px-4 py-2">
                                                <Badge variant={entry.status === 'reversed' ? 'outline' : 'secondary'}>
                                                    {entry.status === 'reversed' ? 'Reversed' : 'Posted'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-2 text-right tabular-nums">{money(entry.total_debit)}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{money(entry.total_credit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {entries.last_page > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-muted-foreground text-sm">
                                    Page {entries.current_page} of {entries.last_page} · {entries.total} entries
                                </p>
                                <div className="flex gap-2">
                                    {entries.prev_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={entries.prev_page_url} preserveScroll preserveState>
                                                Previous
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled>
                                            Previous
                                        </Button>
                                    )}

                                    {entries.next_page_url ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={entries.next_page_url} preserveScroll preserveState>
                                                Next
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" disabled>
                                            Next
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
