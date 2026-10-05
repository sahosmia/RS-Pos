import ListTable from '@/components/data-table/list-table';
import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddClaimModal } from '@/components/warranty-claims/add-claim-modal';
import { UpdateClaimModal } from '@/components/warranty-claims/update-claim-modal';
import {
    useWarrantyClaimColumns,
    WARRANTY_EXPORT_COLUMN_MAP,
    WARRANTY_EXPORT_COLUMNS,
    WARRANTY_VISIBILITY_COLUMNS,
} from '@/components/warranty-claims/warranty-claim-columns';
import { WarrantyClaimGridCard } from '@/components/warranty-claims/warranty-claim-grid-card';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Paginated, type WarrantyableSaleItem, type WarrantyClaimListItem, type WarrantyClaimStatusValue } from '@/types/models';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface WarrantyClaimFilters extends TableFilterBase {
    status: WarrantyClaimStatusValue | null;
    per_page: number | 'all';
}

interface WarrantyClaimsIndexProps {
    claims: Paginated<WarrantyClaimListItem>;
    searchQuery: string;
    searchResults: WarrantyableSaleItem[];
    filters: WarrantyClaimFilters;
}

export default function WarrantyClaimsIndex({ claims, searchQuery, searchResults, filters }: WarrantyClaimsIndexProps) {
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [{ title: t('warrantyClaims', 'title'), href: '/warranty-claims' }];

    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<WarrantyClaimListItem | null>(null);

    const list = useListPage({
        routeName: 'warranty-claims.index',
        filters,
        emptyFilters: { status: null },
        rows: claims.data,
        getId: (claim) => claim.id,
        export: { routeName: 'warranty-claims.export', filterKeys: ['status'], columnMap: WARRANTY_EXPORT_COLUMN_MAP },
    });

    const columns = useWarrantyClaimColumns({ selection: list.selection, onUpdate: setEditing });

    const emptyState = (action: React.ReactNode) => (
        <EmptyState title={t('warrantyClaims', 'empty_title')} description={t('warrantyClaims', 'empty_description')}>
            {action}
        </EmptyState>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('warrantyClaims', 'title')} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title={t('warrantyClaims', 'title')} description={t('warrantyClaims', 'description')} />
                    <Button onClick={() => setAddOpen(true)}>{t('warrantyClaims', 'add')}</Button>
                </div>

                <ListTable
                    list={list}
                    data={claims}
                    filters={filters}
                    columns={columns}
                    getRowKey={(claim) => claim.id}
                    renderGridCard={(claim) => (
                        <WarrantyClaimGridCard
                            claim={claim}
                            selected={list.selection.isSelected(claim.id)}
                            onToggleSelected={(checked) => list.selection.toggle(claim.id, checked)}
                            onUpdate={setEditing}
                        />
                    )}
                    itemLabel="claims"
                    visibilityColumns={WARRANTY_VISIBILITY_COLUMNS}
                    exportColumns={WARRANTY_EXPORT_COLUMNS}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="grid min-w-0 content-start gap-2">
                                <Label htmlFor="status">{t('warrantyClaims', 'status')}</Label>
                                <Select
                                    value={filters.status ?? 'all'}
                                    onValueChange={(value) =>
                                        list.applyFilters({ status: value === 'all' ? null : (value as WarrantyClaimStatusValue) })
                                    }
                                >
                                    <SelectTrigger id="status" className="w-48">
                                        <SelectValue placeholder={t('warrantyClaims', 'status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('warrantyClaims', 'all_statuses')}</SelectItem>
                                        <SelectItem value="pending">{t('warrantyClaims', 'pending')}</SelectItem>
                                        <SelectItem value="in_progress">{t('warrantyClaims', 'in_progress')}</SelectItem>
                                        <SelectItem value="resolved">{t('warrantyClaims', 'resolved')}</SelectItem>
                                        <SelectItem value="rejected">{t('warrantyClaims', 'rejected')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    }
                    emptyState={emptyState(
                        <Button className="mt-2" onClick={() => setAddOpen(true)}>
                            {t('warrantyClaims', 'add')}
                        </Button>,
                    )}
                    filteredEmptyState={emptyState(
                        <Button className="mt-2" variant="outline" onClick={list.resetFilters}>
                            {t('common', 'clear_filters')}
                        </Button>,
                    )}
                />
            </div>

            <AddClaimModal open={addOpen} onOpenChange={setAddOpen} searchQuery={searchQuery} searchResults={searchResults} />
            <UpdateClaimModal claim={editing} onClose={() => setEditing(null)} />
        </AppLayout>
    );
}
