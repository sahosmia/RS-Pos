import { ASSET_EXPORT_COLUMN_MAP, ASSET_EXPORT_COLUMNS, ASSET_VISIBILITY_COLUMNS, useAssetColumns } from '@/components/assets/asset-columns';
import { AssetFormModal } from '@/components/assets/asset-form-modal';
import { AssetGridCard } from '@/components/assets/asset-grid-card';
import ListTable from '@/components/data-table/list-table';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useConfirmDelete } from '@/hooks/use-confirm-delete';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type AssetListItem, type Paginated } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Assets & Liabilities', href: '/assets' },
    { title: 'Assets', href: '/assets' },
];

interface AssetFilters extends TableFilterBase {
    per_page: number | 'all';
}

interface AssetsIndexProps {
    assets: Paginated<AssetListItem>;
    totalValue: number;
    accounts: Account[];
    filters: AssetFilters;
}

export default function AssetsIndex({ assets, totalValue, accounts, filters }: AssetsIndexProps) {
    const money = useMoneyFormat();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AssetListItem | null>(null);

    const list = useListPage({
        routeName: 'assets.index',
        filters,
        rows: assets.data,
        getId: (asset) => asset.id,
        export: { routeName: 'assets.export', filterKeys: [], columnMap: ASSET_EXPORT_COLUMN_MAP },
    });

    const deletion = useConfirmDelete<AssetListItem>({ routeName: 'assets.destroy', errorKey: 'asset', fallbackError: 'Could not delete asset.' });

    const openForm = (asset: AssetListItem | null) => {
        setEditing(asset);
        setModalOpen(true);
    };

    // The header's global "Quick Create" menu links here with `?quick_create=1`
    // since there's no standalone /assets/create page — this opens the same
    // Add Asset modal on arrival instead.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('quick_create') !== '1') return;

        openForm(null);
        params.delete('quick_create');
        const query = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
    }, []);

    const columns = useAssetColumns({
        sort: filters.sort,
        direction: filters.direction,
        onSort: list.handleSort,
        selection: list.selection,
        money,
        onEdit: openForm,
        onDelete: deletion.setTarget,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Assets" />

            <div className="space-y-6 px-4 py-6">
                <Tabs value="/assets" onValueChange={(url) => router.visit(url)}>
                    <TabsList>
                        <TabsTrigger value="/assets">Assets</TabsTrigger>
                        <TabsTrigger value="/other-liabilities">Other Liabilities</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Assets" description="দোকানের নিজস্ব সম্পদ — ফার্নিচার, গাড়ি, ইকুইপমেন্ট" />
                    <Button onClick={() => openForm(null)}>Add Asset</Button>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Total current value</p>
                    <p className="text-2xl font-semibold tabular-nums">{money(totalValue)}</p>
                </div>

                <ListTable
                    list={list}
                    data={assets}
                    filters={filters}
                    columns={columns}
                    getRowKey={(asset) => asset.id}
                    renderGridCard={(asset) => (
                        <AssetGridCard
                            asset={asset}
                            selected={list.selection.isSelected(asset.id)}
                            onToggleSelected={(checked) => list.selection.toggle(asset.id, checked)}
                            onEdit={openForm}
                            onDelete={deletion.setTarget}
                        />
                    )}
                    itemLabel="assets"
                    visibilityColumns={ASSET_VISIBILITY_COLUMNS}
                    exportColumns={ASSET_EXPORT_COLUMNS}
                    emptyState={
                        <EmptyState title="No assets yet" description="প্রথম asset যোগ করুন">
                            <Button className="mt-2" onClick={() => openForm(null)}>
                                Add Asset
                            </Button>
                        </EmptyState>
                    }
                />
            </div>

            <AssetFormModal open={modalOpen} onOpenChange={setModalOpen} editing={editing} accounts={accounts} />

            <ConfirmDialog
                open={deletion.target !== null}
                onOpenChange={(open) => !open && deletion.setTarget(null)}
                title="Delete asset?"
                description={`"${deletion.target?.name}" মুছে ফেলা হবে। কোনো লেনদেন থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={deletion.confirm}
            />
        </AppLayout>
    );
}
