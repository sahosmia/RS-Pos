import ListTable from '@/components/data-table/list-table';
import AddSalePaymentModal from '@/components/sales/add-sale-payment-modal';
import { SaleFilters, type SaleFilterValues } from '@/components/sales/sale-filters';
import { SaleGridCard } from '@/components/sales/sale-grid-card';
import ViewSalePaymentsModal from '@/components/sales/view-sale-payments-modal';
import { AddButton } from '@/components/shared/action-buttons';
import BulkDeleteBar from '@/components/shared/bulk-delete-bar';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import { DocumentStatCards } from '@/components/shared/document-stat-cards';
import EmptyState from '@/components/shared/empty-state';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useConfirmDelete } from '@/hooks/use-confirm-delete';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type CustomerOption, type Paginated, type PaymentStatusValue, type SaleListItem, type SaleStatusValue } from '@/types/models';
import { Head } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getExportColumns, getVisibilityColumns, useSaleColumns } from './table/columns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sales', href: '/sales' }];

/** No `sort` here — the backend's `SaleController::index()` doesn't accept it today. */
interface SaleFilterState extends TableFilterBase {
    preset: SaleFilterValues['preset'];
    from: string | null;
    to: string | null;
    customer_id: number | null;
    status: SaleStatusValue | null;
    payment_status: PaymentStatusValue | null;
    per_page: number | 'all';
}

export interface SaleStats {
    total_sales: number;
    total_amount: number;
    total_paid: number;
    total_due: number;
}

interface SalesIndexProps {
    sales: Paginated<SaleListItem>;
    stats: SaleStats;
    accounts: Account[];
    /** The currently-filtered customer's own label, or `null` when no customer filter is active. */
    initialCustomer: CustomerOption | null;
    filters: SaleFilterState;
}

export default function SalesIndex({ sales, stats, accounts, initialCustomer, filters }: SalesIndexProps) {
    const money = useMoneyFormat();
    const [customer, setCustomer] = useState<CustomerOption | null>(initialCustomer);
    const [addingPayment, setAddingPayment] = useState<SaleListItem | null>(null);
    const [viewingPayments, setViewingPayments] = useState<SaleListItem | null>(null);

    // `initialCustomer` comes from the server on every filtered request (this page reuses one
    // instance via `preserveState`, so a prop change alone wouldn't otherwise re-sync local state).
    useEffect(() => {
        setCustomer(initialCustomer);
    }, [initialCustomer]);

    const list = useListPage({
        routeName: 'sales.index',
        filters,
        emptyFilters: { preset: 'today', from: null, to: null, customer_id: null, status: null, payment_status: null },
        rows: sales.data,
        getId: (sale) => sale.id,
        export: {
            routeName: 'sales.export',
            filterKeys: ['search', 'preset', 'from', 'to', 'customer_id', 'status', 'payment_status'],
            columnMap: {
                invoice: ['invoice_no'],
                customer: ['customer'],
                date: ['sale_date'],
                total: ['total_amount'],
                due: ['due_amount'],
                payment_status: ['payment_status'],
                status: ['status'],
            },
        },
    });

    const deletion = useConfirmDelete<SaleListItem>({
        routeName: 'sales.destroy',
        errorKey: 'sale',
        fallbackError: 'Could not delete this sale.',
        label: (sale) => sale.invoice_no,
    });

    const rowHandlers = { onDelete: deletion.setTarget, onAddPayment: setAddingPayment, onViewPayments: setViewingPayments };

    const columns = useSaleColumns({
        sort: filters.sort,
        direction: filters.direction,
        onSort: list.handleSort,
        money,
        selection: list.selection,
        ...rowHandlers,
    });

    const addSaleHref = filters.customer_id ? route('sales.create', { customer_id: filters.customer_id }) : route('sales.create');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales" />

            <div className="space-y-6 px-4 py-6">
                <PageHeader
                    title="Sales"
                    description="Draft, Quotation ও Confirmed — একই তালিকা, filter করে দেখুন"
                    actions={
                        <>
                            <AddButton href={addSaleHref} title="Add Sale" />
                        </>
                    }
                />

                {stats && (
                    <DocumentStatCards
                        noun="Sales"
                        icon={ShoppingCart}
                        count={stats.total_sales}
                        totalAmount={stats.total_amount}
                        totalPaid={stats.total_paid}
                        totalDue={stats.total_due}
                    />
                )}

                <ListTable
                    selectionSlot={<BulkDeleteBar selection={list.selection} routeName="sales.bulk-delete" noun="sales" permission="sale.delete" />}
                    list={list}
                    data={sales}
                    filters={filters}
                    columns={columns}
                    getRowKey={(sale) => sale.id}
                    renderGridCard={(sale) => (
                        <SaleGridCard
                            sale={sale}
                            selected={list.selection.isSelected(sale.id)}
                            onToggleSelected={(checked) => list.selection.toggle(sale.id, checked)}
                            handlers={rowHandlers}
                        />
                    )}
                    itemLabel="sales"
                    searchPlaceholder="Invoice, customer name or phone"
                    visibilityColumns={getVisibilityColumns()}
                    exportColumns={getExportColumns()}
                    filterSlot={<SaleFilters filters={filters} customer={customer} onCustomerChange={setCustomer} onChange={list.applyFilters} />}
                    emptyState={
                        <EmptyState title="No sales yet" description="প্রথম sale যোগ করুন">
                            <AddButton href={addSaleHref} title="Add Sale" className="mt-2" />
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No sales match your filters" description="অন্য filter/date range দিয়ে আবার চেষ্টা করুন">
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
                title="Delete sale?"
                description={`"${deletion.target?.invoice_no}" will be permanently deleted.`}
                confirmLabel="Delete"
                onConfirm={deletion.confirm}
            />

            {addingPayment && (
                <AddSalePaymentModal
                    open={addingPayment !== null}
                    onOpenChange={(open) => !open && setAddingPayment(null)}
                    sale={addingPayment}
                    accounts={accounts}
                />
            )}

            <ViewSalePaymentsModal
                open={viewingPayments !== null}
                onOpenChange={(open) => !open && setViewingPayments(null)}
                sale={viewingPayments}
            />
        </AppLayout>
    );
}
