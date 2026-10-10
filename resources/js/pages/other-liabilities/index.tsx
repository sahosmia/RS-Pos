import ListTable from '@/components/data-table/list-table';
import {
    LIABILITY_EXPORT_COLUMN_MAP,
    LIABILITY_EXPORT_COLUMNS,
    LIABILITY_VISIBILITY_COLUMNS,
    useLiabilityColumns,
} from '@/components/other-liabilities/liability-columns';
import { LiabilityFormModal } from '@/components/other-liabilities/liability-form-modal';
import { LiabilityGridCard } from '@/components/other-liabilities/liability-grid-card';
import BulkDeleteBar from '@/components/shared/bulk-delete-bar';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import { MetricCard } from '@/components/shared/metric-card';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useConfirmDelete } from '@/hooks/use-confirm-delete';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type OtherLiabilityListItem, type Paginated } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Assets & Liabilities', href: '/assets' },
    { title: 'Other Liabilities', href: '/other-liabilities' },
];

interface OtherLiabilityFilters extends TableFilterBase {
    per_page: number | 'all';
}

interface OtherLiabilitiesIndexProps {
    liabilities: Paginated<OtherLiabilityListItem>;
    totalBalance: number;
    filters: OtherLiabilityFilters;
}

export default function OtherLiabilitiesIndex({ liabilities, totalBalance, filters }: OtherLiabilitiesIndexProps) {
    const money = useMoneyFormat();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<OtherLiabilityListItem | null>(null);

    const list = useListPage({
        routeName: 'other-liabilities.index',
        filters,
        emptyFilters: {},
        rows: liabilities.data,
        getId: (liability) => liability.id,
        export: { routeName: 'other-liabilities.export', filterKeys: [], columnMap: LIABILITY_EXPORT_COLUMN_MAP },
    });

    const deletion = useConfirmDelete<OtherLiabilityListItem>({
        routeName: 'other-liabilities.destroy',
        errorKey: 'liability',
        fallbackError: 'Could not delete liability.',
    });

    const openForm = (liability: OtherLiabilityListItem | null) => {
        setEditing(liability);
        setModalOpen(true);
    };

    const columns = useLiabilityColumns({
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
            <Head title="Other Liabilities" />

            <div className="space-y-6 px-4 py-6">
                <Tabs value="/other-liabilities" onValueChange={(url) => router.visit(url)}>
                    <TabsList>
                        <TabsTrigger value="/assets">Assets</TabsTrigger>
                        <TabsTrigger value="/other-liabilities">Other Liabilities</TabsTrigger>
                    </TabsList>
                </Tabs>

                <PageHeader
                    title="Other Liabilities"
                    description="Loan/Supplier/Expense-এর বাইরের অন্য দেনা"
                    actions={
                        <>
                            <Button onClick={() => openForm(null)}>Add Liability</Button>
                        </>
                    }
                />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard label="Total balance" value={money(totalBalance)} />
                </div>

                <ListTable
                    selectionSlot={
                        <BulkDeleteBar
                            selection={list.selection}
                            routeName="other-liabilities.bulk-delete"
                            noun="liabilities"
                            permission="asset.delete"
                        />
                    }
                    list={list}
                    data={liabilities}
                    filters={filters}
                    columns={columns}
                    getRowKey={(liability) => liability.id}
                    renderGridCard={(liability) => (
                        <LiabilityGridCard
                            liability={liability}
                            selected={list.selection.isSelected(liability.id)}
                            onToggleSelected={(checked) => list.selection.toggle(liability.id, checked)}
                            onEdit={openForm}
                            onDelete={deletion.setTarget}
                        />
                    )}
                    itemLabel="liabilities"
                    visibilityColumns={LIABILITY_VISIBILITY_COLUMNS}
                    exportColumns={LIABILITY_EXPORT_COLUMNS}
                    emptyState={
                        <EmptyState title="No liabilities yet" description="প্রথম liability যোগ করুন">
                            <Button className="mt-2" onClick={() => openForm(null)}>
                                Add Liability
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No liabilities match your filters" description="অন্য filter দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={list.resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                />
            </div>

            <LiabilityFormModal open={modalOpen} onOpenChange={setModalOpen} editing={editing} />

            <ConfirmDialog
                open={deletion.target !== null}
                onOpenChange={(open) => !open && deletion.setTarget(null)}
                title="Delete liability?"
                description={`"${deletion.target?.name}" মুছে ফেলা হবে। কোনো লেনদেন থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={deletion.confirm}
            />
        </AppLayout>
    );
}
