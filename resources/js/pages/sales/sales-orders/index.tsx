import ListTable from '@/components/data-table/list-table';
import HeadingSmall from '@/components/heading-small';
import {
    SALES_ORDER_EXPORT_COLUMN_MAP,
    SALES_ORDER_EXPORT_COLUMNS,
    SALES_ORDER_VISIBILITY_COLUMNS,
    useSalesOrderColumns,
} from '@/components/sales/sales-order-columns';
import { SalesOrderFilters } from '@/components/sales/sales-order-filters';
import { SalesOrderGridCard } from '@/components/sales/sales-order-grid-card';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type CustomerOption, type Paginated, type SalesOrderListItem, type SalesOrderStatusValue } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sales Order', href: '/sales-orders' }];

interface SalesOrderFilterState extends TableFilterBase {
    from: string | null;
    to: string | null;
    customer_id: number | null;
    status: SalesOrderStatusValue | null;
    per_page: number | 'all';
}

interface SalesOrdersIndexProps {
    orders: Paginated<SalesOrderListItem>;
    /** The currently-filtered customer's own label, or `null` when no customer filter is active. */
    initialCustomer: CustomerOption | null;
    filters: SalesOrderFilterState;
}

export default function SalesOrdersIndex({ orders, initialCustomer, filters }: SalesOrdersIndexProps) {
    const money = useMoneyFormat();
    const [customer, setCustomer] = useState<CustomerOption | null>(initialCustomer);

    // `initialCustomer` comes from the server on every filtered request (this page reuses one
    // instance via `preserveState`, so a prop change alone wouldn't otherwise re-sync local state).
    useEffect(() => {
        setCustomer(initialCustomer);
    }, [initialCustomer]);

    const list = useListPage({
        routeName: 'sales-orders.index',
        filters,
        emptyFilters: { from: null, to: null, customer_id: null, status: null },
        rows: orders.data,
        getId: (order) => order.id,
        export: {
            routeName: 'sales-orders.export',
            filterKeys: ['from', 'to', 'customer_id', 'status'],
            columnMap: SALES_ORDER_EXPORT_COLUMN_MAP,
        },
    });

    const columns = useSalesOrderColumns({
        sort: filters.sort,
        direction: filters.direction,
        onSort: list.handleSort,
        selection: list.selection,
        money,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Order" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Sales Order" description="অগ্রিম বুকিং — নির্দিষ্ট সময়ে ডেলিভারির জন্য" />
                    <Button asChild>
                        <Link href={route('sales-orders.create')}>Add Sales Order</Link>
                    </Button>
                </div>

                <ListTable
                    list={list}
                    data={orders}
                    filters={filters}
                    columns={columns}
                    getRowKey={(order) => order.id}
                    renderGridCard={(order) => (
                        <SalesOrderGridCard
                            order={order}
                            selected={list.selection.isSelected(order.id)}
                            onToggleSelected={(checked) => list.selection.toggle(order.id, checked)}
                        />
                    )}
                    itemLabel="orders"
                    visibilityColumns={SALES_ORDER_VISIBILITY_COLUMNS}
                    exportColumns={SALES_ORDER_EXPORT_COLUMNS}
                    filterSlot={
                        <SalesOrderFilters filters={filters} customer={customer} onCustomerChange={setCustomer} onChange={list.applyFilters} />
                    }
                    emptyState={
                        <EmptyState title="No sales orders yet" description="প্রথম sales order যোগ করুন">
                            <Button className="mt-2" asChild>
                                <Link href={route('sales-orders.create')}>Add Sales Order</Link>
                            </Button>
                        </EmptyState>
                    }
                    filteredEmptyState={
                        <EmptyState title="No sales orders match your filters" description="অন্য filter/date range দিয়ে আবার চেষ্টা করুন">
                            <Button className="mt-2" variant="outline" onClick={list.resetFilters}>
                                Clear filters
                            </Button>
                        </EmptyState>
                    }
                />
            </div>
        </AppLayout>
    );
}
