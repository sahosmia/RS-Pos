import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type CashBookEntry, type CashBookEntryType, type MiscTransactionCategory, type Paginated } from '@/types/models';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Petty Cash',
        href: '/cash-book',
    },
];

interface CashBookIndexProps {
    cashBook: { id: number; current_balance: number };
    entries: Paginated<CashBookEntry>;
    categories: MiscTransactionCategory[];
    filters: { category_id: number | null };
    openingBalanceSet: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function CashBookIndex({ cashBook, entries, categories, filters, openingBalanceSet }: CashBookIndexProps) {
    const money = useMoneyFormat();
    const [entryModalOpen, setEntryModalOpen] = useState(false);

    const entryForm = useForm({
        type: 'expense' as CashBookEntryType,
        category_id: null as number | null,
        amount: 0,
        entry_date: today(),
        note: '',
    });

    const categoryOptions = categories.filter((category) => category.type === entryForm.data.type);

    const openEntryModal = () => {
        entryForm.clearErrors();
        entryForm.setData({ type: 'expense', category_id: null, amount: 0, entry_date: today(), note: '' });
        setEntryModalOpen(true);
    };

    const submitEntry: FormEventHandler = (e) => {
        e.preventDefault();

        entryForm.post(route('cash-book.store'), {
            preserveScroll: true,
            onSuccess: () => setEntryModalOpen(false),
        });
    };

    const filterByCategory = (value: string) => {
        router.get(
            route('cash-book.index'),
            value === 'all' ? {} : { category_id: Number(value) },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Petty Cash" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall
                        title="Petty Cash"
                        description="ছোট দৈনন্দিন খরচের আলাদা খাতা — Accounts বা Financial Position-এ ধরা হয় না"
                    />
                    <Button onClick={openEntryModal}>Add Entry</Button>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Cash book balance</p>
                        <p className="text-2xl font-semibold tabular-nums">{money(cashBook.current_balance)}</p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="category_filter">Category</Label>
                        <Select value={filters.category_id ? String(filters.category_id) : 'all'} onValueChange={filterByCategory}>
                            <SelectTrigger id="category_filter" className="w-56">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={String(category.id)}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {entries.data.length === 0 ? (
                    <EmptyState title="No entries yet" description="চা, রিকশা ভাড়ার মতো ছোট খরচ এখানে দ্রুত লিখে রাখুন" />
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Date</th>
                                        <th className="px-4 py-2 text-left font-medium">Category</th>
                                        <th className="px-4 py-2 text-left font-medium">Note</th>
                                        <th className="px-4 py-2 text-right font-medium">In</th>
                                        <th className="px-4 py-2 text-right font-medium">Out</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.data.map((entry) => (
                                        <tr key={entry.id} className="border-t">
                                            <td className="px-4 py-2 whitespace-nowrap">{entry.entry_date}</td>
                                            <td className="px-4 py-2">{entry.category?.name ?? 'Opening Balance'}</td>
                                            <td className="text-muted-foreground px-4 py-2">{entry.note}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">
                                                {entry.type === 'expense' ? '' : money(entry.amount)}
                                            </td>
                                            <td className="px-4 py-2 text-right tabular-nums">
                                                {entry.type === 'expense' ? money(entry.amount) : ''}
                                            </td>
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
                                            <Link href={entries.prev_page_url} preserveScroll>
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
                                            <Link href={entries.next_page_url} preserveScroll>
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

            <FormModal
                open={entryModalOpen}
                onOpenChange={setEntryModalOpen}
                title="Add Petty Cash Entry"
                processing={entryForm.processing}
                onSubmit={submitEntry}
            >
                <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                        value={entryForm.data.type}
                        onValueChange={(value) => entryForm.setData({ ...entryForm.data, type: value as CashBookEntryType, category_id: null })}
                    >
                        <SelectTrigger id="type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            {!openingBalanceSet && <SelectItem value="opening_balance">Opening Balance</SelectItem>}
                        </SelectContent>
                    </Select>
                    <InputError message={entryForm.errors.type} />
                </div>

                {entryForm.data.type !== 'opening_balance' && (
                    <div className="grid gap-2">
                        <Label htmlFor="category_id">Category</Label>
                        <Select
                            value={entryForm.data.category_id ? String(entryForm.data.category_id) : ''}
                            onValueChange={(value) => entryForm.setData('category_id', Number(value))}
                        >
                            <SelectTrigger id="category_id">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categoryOptions.map((category) => (
                                    <SelectItem key={category.id} value={String(category.id)}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={entryForm.errors.category_id} />
                    </div>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <MoneyInput
                        id="amount"
                        value={entryForm.data.amount}
                        onChange={(e) => entryForm.setData('amount', Number(e.target.value))}
                        required
                    />
                    <InputError message={entryForm.errors.amount} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="entry_date">Date</Label>
                    <Input
                        id="entry_date"
                        type="date"
                        value={entryForm.data.entry_date}
                        onChange={(e) => entryForm.setData('entry_date', e.target.value)}
                        required
                    />
                    <InputError message={entryForm.errors.entry_date} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="entry_note">Note</Label>
                    <Textarea id="entry_note" value={entryForm.data.note} onChange={(e) => entryForm.setData('note', e.target.value)} />
                    <InputError message={entryForm.errors.note} />
                </div>
            </FormModal>
        </AppLayout>
    );
}
