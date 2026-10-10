import ListTable from '@/components/data-table/list-table';
import {
    INVESTOR_EXPORT_COLUMN_MAP,
    INVESTOR_EXPORT_COLUMNS,
    INVESTOR_VISIBILITY_COLUMNS,
    useInvestorColumns,
} from '@/components/investors/investor-columns';
import { InvestorFormModal } from '@/components/investors/investor-form-modal';
import { InvestorGridCard } from '@/components/investors/investor-grid-card';
import { AddButton } from '@/components/shared/action-buttons';
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
import { type InvestorListItem, type Paginated } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Investors', href: '/investors' },
    { title: 'Investors', href: '/investors' },
];

interface InvestorFilters extends TableFilterBase {
    per_page: number | 'all';
}

interface InvestorsIndexProps {
    investors: Paginated<InvestorListItem>;
    totalInvested: number;
    filters: InvestorFilters;
}

export default function InvestorsIndex({ investors, totalInvested, filters }: InvestorsIndexProps) {
    const money = useMoneyFormat();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<InvestorListItem | null>(null);

    const list = useListPage({
        routeName: 'investors.index',
        filters,
        emptyFilters: {},
        rows: investors.data,
        getId: (investor) => investor.id,
        export: { routeName: 'investors.export', filterKeys: [], columnMap: INVESTOR_EXPORT_COLUMN_MAP },
    });

    const deletion = useConfirmDelete<InvestorListItem>({
        routeName: 'investors.destroy',
        errorKey: 'investor',
        fallbackError: 'Could not delete investor.',
    });

    const openForm = (investor: InvestorListItem | null) => {
        setEditing(investor);
        setModalOpen(true);
    };

    const columns = useInvestorColumns({
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
            <Head title="Investors" />

            <div className="space-y-6 px-4 py-6">
                <Tabs value="/investors" onValueChange={(url) => router.visit(url)}>
                    <TabsList>
                        <TabsTrigger value="/investors">Investors</TabsTrigger>
                        <TabsTrigger value="/company-loans">Company Loans</TabsTrigger>
                    </TabsList>
                </Tabs>

                <PageHeader
                    title="Investors"
                    description="দোকানে যারা মূলধন বিনিয়োগ করেছেন"
                    actions={
                        <>
                            <AddButton onClick={() => openForm(null)} title="Add Investor" />
                        </>
                    }
                />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard label="Total invested" value={money(totalInvested)} />
                </div>

                <ListTable
                    selectionSlot={
                        <BulkDeleteBar selection={list.selection} routeName="investors.bulk-delete" noun="investors" permission="finance.delete" />
                    }
                    list={list}
                    data={investors}
                    filters={filters}
                    columns={columns}
                    getRowKey={(investor) => investor.id}
                    renderGridCard={(investor) => (
                        <InvestorGridCard
                            investor={investor}
                            selected={list.selection.isSelected(investor.id)}
                            onToggleSelected={(checked) => list.selection.toggle(investor.id, checked)}
                            onEdit={openForm}
                            onDelete={deletion.setTarget}
                        />
                    )}
                    itemLabel="investors"
                    visibilityColumns={INVESTOR_VISIBILITY_COLUMNS}
                    exportColumns={INVESTOR_EXPORT_COLUMNS}
                    emptyState={
                        <EmptyState title="No investors yet" description="প্রথম investor যোগ করুন">
                            <AddButton onClick={() => openForm(null)} title="Add Investor" className="mt-2" />
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No investors match your filters" description="অন্য filter দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={list.resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                />
            </div>

            <InvestorFormModal open={modalOpen} onOpenChange={setModalOpen} editing={editing} />

            <ConfirmDialog
                open={deletion.target !== null}
                onOpenChange={(open) => !open && deletion.setTarget(null)}
                title="Delete investor?"
                description={`"${deletion.target?.name}" মুছে ফেলা হবে। কোনো লেনদেন থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={deletion.confirm}
            />
        </AppLayout>
    );
}
