import ListTable from '@/components/data-table/list-table';
import HeadingSmall from '@/components/heading-small';
import {
    EMI_EXPORT_COLUMN_MAP,
    EMI_EXPORT_COLUMNS,
    EMI_VISIBILITY_COLUMNS,
    useEmiInstallmentColumns,
} from '@/components/sales/emi-installment-columns';
import { EmiInstallmentGridCard } from '@/components/sales/emi-installment-grid-card';
import { PayInstallmentModal } from '@/components/sales/pay-installment-modal';
import EmptyState from '@/components/shared/empty-state';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type EmiInstallmentListItem, type EmiInstallmentStatusValue, type Paginated } from '@/types/models';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'EMI Installments', href: '/emi-installments' }];

interface EmiInstallmentFilters extends TableFilterBase {
    status: EmiInstallmentStatusValue | null;
    search: string | null;
    per_page: number | 'all';
}

interface EmiInstallmentsIndexProps {
    installments: Paginated<EmiInstallmentListItem>;
    accounts: Account[];
    filters: EmiInstallmentFilters;
}

export default function EmiInstallmentsIndex({ installments, accounts, filters }: EmiInstallmentsIndexProps) {
    const money = useMoneyFormat();
    const [paying, setPaying] = useState<EmiInstallmentListItem | null>(null);

    const list = useListPage({
        routeName: 'emi-installments.index',
        filters,
        emptyFilters: { status: null },
        rows: installments.data,
        getId: (installment) => installment.id,
        export: { routeName: 'emi-installments.export', filterKeys: ['status'], columnMap: EMI_EXPORT_COLUMN_MAP },
    });

    const columns = useEmiInstallmentColumns({
        sort: filters.sort,
        direction: filters.direction,
        onSort: list.handleSort,
        selection: list.selection,
        money,
        onPay: setPaying,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="EMI Installments" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="EMI Installments" description="সব বিক্রির কিস্তির সময়সূচি ও পেমেন্ট" />

                <ListTable
                    list={list}
                    data={installments}
                    filters={filters}
                    columns={columns}
                    getRowKey={(installment) => installment.id}
                    renderGridCard={(installment) => (
                        <EmiInstallmentGridCard
                            installment={installment}
                            selected={list.selection.isSelected(installment.id)}
                            onToggleSelected={(checked) => list.selection.toggle(installment.id, checked)}
                            onPay={setPaying}
                        />
                    )}
                    itemLabel="installments"
                    searchPlaceholder="Invoice no বা customer name..."
                    visibilityColumns={EMI_VISIBILITY_COLUMNS}
                    exportColumns={EMI_EXPORT_COLUMNS}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="grid min-w-0 content-start gap-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={filters.status ?? 'all'}
                                    onValueChange={(value) =>
                                        list.applyFilters({ status: value === 'all' ? null : (value as EmiInstallmentStatusValue) })
                                    }
                                >
                                    <SelectTrigger id="status" className="w-48">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="overdue">Overdue</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    }
                    emptyState={<EmptyState title="No installments yet" description="কোনো installment নেই" />}
                    filteredEmptyState={<EmptyState title="No installments match your filters" description="অন্য filter দিয়ে আবার চেষ্টা করুন" />}
                />
            </div>

            <PayInstallmentModal installment={paying} onClose={() => setPaying(null)} accounts={accounts} />
        </AppLayout>
    );
}
