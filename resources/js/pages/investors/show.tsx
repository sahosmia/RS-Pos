import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import LedgerTable, { type LedgerRow } from '@/components/shared/ledger-table';
import LedgerTransactionModal, { type LedgerTransactionTypeOption } from '@/components/shared/ledger-transaction-modal';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type InvestorDetail, type LedgerTransactionRow } from '@/types/models';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface InvestorShowProps {
    investor: InvestorDetail;
    transactions: LedgerTransactionRow[];
    accounts: Account[];
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

const typeOptions: LedgerTransactionTypeOption[] = [
    { value: 'investment', label: 'Investment (capital in)', needsAccount: true },
    { value: 'profit_share', label: 'Profit Share / Dividend', needsAccount: true, hint: 'total_invested অপরিবর্তিত থাকবে, শুধু cash যাবে' },
    { value: 'withdrawal', label: 'Withdrawal (capital out)', needsAccount: true },
    { value: 'adjustment', label: 'Adjustment', needsAccount: false, allowNegative: true, hint: 'বাড়াতে + আর কমাতে − দিন' },
];

export default function InvestorShow({ investor, transactions, accounts }: InvestorShowProps) {
    const money = useMoneyFormat();
    const [addOpen, setAddOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Investors', href: '/investors' },
        { title: investor.name, href: `/investors/${investor.id}` },
    ];

    const rows: LedgerRow[] = transactions.map((transaction) => ({
        id: transaction.id,
        date: transaction.created_at,
        description: [humanize(transaction.type), transaction.account?.name, transaction.note].filter(Boolean).join(' — '),
        amount: transaction.amount,
        balance: transaction.balance,
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={investor.name} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <HeadingSmall title={investor.name} />
                    <Button onClick={() => setAddOpen(true)}>Add Transaction</Button>
                </div>

                <div className="rounded-lg border p-4 sm:max-w-xs">
                    <p className="text-muted-foreground text-sm">Total Invested</p>
                    <p className="text-xl font-semibold tabular-nums">{money(investor.total_invested)}</p>
                </div>

                {rows.length === 0 ? (
                    <EmptyState title="No transactions yet" description="Add Transaction দিয়ে শুরু করুন" />
                ) : (
                    <LedgerTable rows={rows} />
                )}
            </div>

            <LedgerTransactionModal
                open={addOpen}
                onOpenChange={setAddOpen}
                title="Add Investor Transaction"
                routeName="investors.transactions.store"
                routeParam={investor.id}
                typeOptions={typeOptions}
                accounts={accounts}
            />
        </AppLayout>
    );
}
