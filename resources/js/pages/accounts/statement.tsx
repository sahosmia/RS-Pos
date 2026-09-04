import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import LedgerTable, { type LedgerRow } from '@/components/shared/ledger-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type StatementRow } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface StatementProps {
    account: Account;
    transactions: StatementRow[];
    broughtForward: number;
    closingBalance: number;
    filters: { from: string; to: string };
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function AccountStatement({ account, transactions, broughtForward, closingBalance, filters }: StatementProps) {
    const money = useMoneyFormat();
    const [range, setRange] = useState(filters);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Accounts', href: '/accounts' },
        { title: account.name, href: `/accounts/${account.id}/statement` },
    ];

    const applyRange: FormEventHandler = (e) => {
        e.preventDefault();

        router.get(route('accounts.statement', account.id), range, { preserveState: true, preserveScroll: true });
    };

    const rows: LedgerRow[] = transactions.map((transaction) => ({
        id: transaction.id,
        date: transaction.operation_date,
        description: transaction.note ? `${humanize(transaction.type)} — ${transaction.note}` : humanize(transaction.type),
        amount: transaction.amount,
        balance: transaction.balance,
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${account.name} — Statement`} />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title={`${account.name} — Statement`} description={`${account.account_type.name} • operation date অনুযায়ী সাজানো`} />

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Brought forward</p>
                        <p className="text-xl font-semibold tabular-nums">{money(broughtForward)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Closing balance (range)</p>
                        <p className="text-xl font-semibold tabular-nums">{money(closingBalance)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Current balance</p>
                        <p className="text-xl font-semibold tabular-nums">{money(account.current_balance)}</p>
                    </div>
                </div>

                <form onSubmit={applyRange} className="flex flex-wrap items-end gap-3">
                    <div className="grid gap-2">
                        <Label htmlFor="from">From</Label>
                        <Input id="from" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="to">To</Label>
                        <Input id="to" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
                    </div>
                    <Button type="submit" variant="outline">
                        Apply
                    </Button>
                </form>

                {rows.length === 0 ? (
                    <EmptyState title="No transactions in this range" description="তারিখের সীমা বদলে দেখুন" />
                ) : (
                    <LedgerTable rows={rows} broughtForward={broughtForward} />
                )}
            </div>
        </AppLayout>
    );
}
