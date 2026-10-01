import { MetricCard, MetricGrid } from '@/components/shared/metric-card';
import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import LedgerTable, { type LedgerRow } from '@/components/shared/ledger-table';
import { Button } from '@/components/ui/button';
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

    const handleFromChange = (fromVal: string) => {
        const next = { ...range, from: fromVal };
        setRange(next);
        if (fromVal && next.to) {
            router.get(route('accounts.statement', account.id), next, { preserveState: true, preserveScroll: true });
        }
    };

    const handleToChange = (toVal: string) => {
        const next = { ...range, to: toVal };
        setRange(next);
        if (next.from && toVal) {
            router.get(route('accounts.statement', account.id), next, { preserveState: true, preserveScroll: true });
        }
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

                <MetricGrid columns={3}>
                    <MetricCard label="Brought forward" value={money(broughtForward)} />
                    <MetricCard label="Closing balance (range)" value={money(closingBalance)} accent="info" />
                    <MetricCard label="Current balance" value={money(account.current_balance)} accent="success" />
                </MetricGrid>

                <div className="flex flex-wrap items-end gap-3">
                    <FormInput id="from" label="From" type="date" value={range.from} onChange={(e) => handleFromChange(e.target.value)} />
                    <FormInput id="to" label="To" type="date" value={range.to} onChange={(e) => handleToChange(e.target.value)} />
                </div>

                {rows.length === 0 ? (
                    <EmptyState title="No transactions in this range" description="তারিখের সীমা বদলে দেখুন" />
                ) : (
                    <LedgerTable rows={rows} broughtForward={broughtForward} />
                )}
            </div>
        </AppLayout>
    );
}
