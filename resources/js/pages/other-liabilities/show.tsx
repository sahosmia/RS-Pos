import { MetricCard } from '@/components/shared/metric-card';
import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import LedgerTable, { type LedgerRow } from '@/components/shared/ledger-table';
import LedgerTransactionModal, { type LedgerTransactionTypeOption } from '@/components/shared/ledger-transaction-modal';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type LedgerTransactionRow, type OtherLiabilityDetail } from '@/types/models';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface OtherLiabilityShowProps {
    liability: OtherLiabilityDetail;
    transactions: LedgerTransactionRow[];
    accounts: Account[];
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

const typeOptions: LedgerTransactionTypeOption[] = [
    { value: 'increase', label: 'Increase (new debt)', needsAccount: true },
    { value: 'payment', label: 'Payment (settle it)', needsAccount: true },
    { value: 'adjustment', label: 'Adjustment', needsAccount: false, allowNegative: true, hint: 'বাড়াতে + আর কমাতে − দিন' },
];

export default function OtherLiabilityShow({ liability, transactions, accounts }: OtherLiabilityShowProps) {
    const money = useMoneyFormat();
    const [addOpen, setAddOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Other Liabilities', href: '/other-liabilities' },
        { title: liability.name, href: `/other-liabilities/${liability.id}` },
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
            <Head title={liability.name} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <HeadingSmall title={liability.name} />
                    <Button onClick={() => setAddOpen(true)}>Add Transaction</Button>
                </div>

                <MetricCard label="Current Balance" value={money(liability.current_balance)} accent="warning" className="sm:max-w-xs" />

                {rows.length === 0 ? (
                    <EmptyState title="No transactions yet" description="Add Transaction দিয়ে শুরু করুন" />
                ) : (
                    <LedgerTable rows={rows} />
                )}
            </div>

            <LedgerTransactionModal
                open={addOpen}
                onOpenChange={setAddOpen}
                title="Add Liability Transaction"
                routeName="other-liabilities.transactions.store"
                routeParam={liability.id}
                typeOptions={typeOptions}
                accounts={accounts}
            />
        </AppLayout>
    );
}
