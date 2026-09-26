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
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={asset.name} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <HeadingSmall title={asset.name} description={asset.category ?? undefined} />
                    <Button onClick={() => setAddOpen(true)}>Add Transaction</Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Current Value</p>
                        <p className="text-xl font-semibold tabular-nums">{money(asset.current_value)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Purchase Date</p>
                        <p className="text-xl font-semibold">{asset.purchase_date ?? '—'}</p>
                    </div>
                </div>

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
