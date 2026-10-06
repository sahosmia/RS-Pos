import ListTable from '@/components/data-table/list-table';
import HeadingSmall from '@/components/heading-small';
import {
    PURCHASE_EXPORT_COLUMN_MAP,
    PURCHASE_EXPORT_COLUMNS,
    PURCHASE_VISIBILITY_COLUMNS,
    usePurchaseColumns,
} from '@/components/purchases/purchase-columns';
import { PurchaseFilters } from '@/components/purchases/purchase-filters';
import { PurchaseGridCard } from '@/components/purchases/purchase-grid-card';
import { AddButton } from '@/components/shared/action-buttons';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import { DocumentStatCards } from '@/components/shared/document-stat-cards';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useConfirmDelete } from '@/hooks/use-confirm-delete';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Paginated, type PaymentStatusValue, type PurchaseListItem, type PurchaseStatusValue, type SupplierOption } from '@/types/models';
import { Head } from '@inertiajs/react';
import { ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Purchases', href: '/purchases' }];

interface PurchaseFilterState extends TableFilterBase {
    from: string | null;
    to: string | null;
    supplier_id: number | null;
    status: PurchaseStatusValue | null;
    payment_status: PaymentStatusValue | null;
    per_page: number | 'all';
}

export interface PurchaseStats {
    total_purchases: number;
    total_amount: number;
    total_paid: number;
    total_due: number;
}

interface PurchasesIndexProps {
    purchases: Paginated<PurchaseListItem>;
    stats: PurchaseStats;
    /** The currently-filtered supplier's own label, or `null` when no supplier filter is active. */
    initialSupplier: SupplierOption | null;
    filters: PurchaseFilterState;
}

export default function PurchasesIndex({ purchases, stats, initialSupplier, filters }: PurchasesIndexProps) {
    const money = useMoneyFormat();
    const [supplier, setSupplier] = useState<SupplierOption | null>(initialSupplier);

    // `initialSupplier` comes from the server on every filtered request (this page reuses one
    // instance via `preserveState`, so a prop change alone wouldn't otherwise re-sync local state).
    useEffect(() => {
        setSupplier(initialSupplier);
    }, [initialSupplier]);

    const list = useListPage({
        routeName: 'purchases.index',
        filters,
        emptyFilters: { from: null, to: null, supplier_id: null, status: null, payment_status: null },
        rows: purchases.data,
        getId: (purchase) => purchase.id,
        export: {
            routeName: 'purchases.export',
            filterKeys: ['search', 'from', 'to', 'supplier_id', 'status', 'payment_status'],
            columnMap: PURCHASE_EXPORT_COLUMN_MAP,
        },
    });

    const deletion = useConfirmDelete<PurchaseListItem>({
        routeName: 'purchases.destroy',
        errorKey: 'purchase',
        fallbackError: 'Could not delete this purchase.',
        label: (purchase) => purchase.invoice_no,
    });

    const columns = usePurchaseColumns({
        sort: filters.sort,
        direction: filters.direction,
        onSort: list.handleSort,
        selection: list.selection,
        money,
        onDelete: deletion.setTarget,
    });

    const addPurchaseHref = filters.supplier_id ? route('purchases.create', { supplier_id: filters.supplier_id }) : route('purchases.create');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchases" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Purchases" description="Supplier থেকে কেনা পণ্যের তালিকা" />
                    <AddButton href={addPurchaseHref} title="Add Purchase" />
                </div>

                {stats && (
                    <DocumentStatCards
                        noun="Purchases"
                        icon={ShoppingBag}
                        count={stats.total_purchases}
                        totalAmount={stats.total_amount}
                        totalPaid={stats.total_paid}
                        totalDue={stats.total_due}
                    />
                )}

                <ListTable
                    list={list}
                    data={purchases}
                    filters={filters}
                    columns={columns}
                    getRowKey={(purchase) => purchase.id}
                    renderGridCard={(purchase) => (
                        <PurchaseGridCard
                            purchase={purchase}
                            selected={list.selection.isSelected(purchase.id)}
                            onToggleSelected={(checked) => list.selection.toggle(purchase.id, checked)}
                            onDelete={deletion.setTarget}
                        />
                    )}
                    itemLabel="purchases"
                    searchPlaceholder="Invoice or supplier name"
                    visibilityColumns={PURCHASE_VISIBILITY_COLUMNS}
                    exportColumns={PURCHASE_EXPORT_COLUMNS}
                    filterSlot={<PurchaseFilters filters={filters} supplier={supplier} onSupplierChange={setSupplier} onChange={list.applyFilters} />}
                    emptyState={
                        <EmptyState title="No purchases yet" description="প্রথম purchase যোগ করুন">
                            <AddButton href={addPurchaseHref} title="Add Purchase" className="mt-2" />
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No purchases match your filters" description="অন্য filter/date range দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={list.resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                />
            </div>

            <ConfirmDialog
                open={deletion.target !== null}
                onOpenChange={(open) => !open && deletion.setTarget(null)}
                title="Delete purchase?"
                description={`"${deletion.target?.invoice_no}" will be permanently deleted.`}
                confirmLabel="Delete"
                onConfirm={deletion.confirm}
            />
        </AppLayout>
    );
}
