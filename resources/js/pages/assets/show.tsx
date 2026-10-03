import { MetricCard, MetricGrid } from '@/components/shared/metric-card';
import AddAssetTransactionModal from '@/components/assets/add-asset-transaction-modal';
import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import LedgerTable, { type LedgerRow } from '@/components/shared/ledger-table';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type AssetDetail, type LedgerTransactionRow } from '@/types/models';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface AssetShowProps {
    asset: AssetDetail;
    transactions: LedgerTransactionRow[];
    accounts: Account[];
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function AssetShow({ asset, transactions, accounts }: AssetShowProps) {
    const money = useMoneyFormat();
    const [addOpen, setAddOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Assets', href: '/assets' },
        { title: asset.name, href: `/assets/${asset.id}` },
    ];

    const rows: LedgerRow[] = transactions.map((transaction) => ({
        id: transaction.id,
        date: transaction.created_at,
        description: [humanize(transaction.type), transaction.account?.name, transaction.note].filter(Boolean).join(' — '),
        amount: transaction.amount,
        balance: transaction.balance,
        by: transaction.added_by,
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={asset.name} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <HeadingSmall title={asset.name} />
                    <Button onClick={() => setAddOpen(true)}>Add Transaction</Button>
                </div>

                <MetricGrid columns={2}>
                    <MetricCard label="Current Value" value={money(asset.current_value)} accent="success" />
                    <MetricCard label="Purchase Date" value={asset.purchase_date ?? '—'} />
                </MetricGrid>

                {rows.length === 0 ? (
                    <EmptyState title="No transactions yet" description="Add Transaction দিয়ে শুরু করুন" />
                ) : (
                    <LedgerTable rows={rows} />
                )}
            </div>

            <AddAssetTransactionModal open={addOpen} onOpenChange={setAddOpen} assetId={asset.id} accounts={accounts} />
        </AppLayout>
    );
}
