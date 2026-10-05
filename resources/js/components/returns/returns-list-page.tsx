import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions, { type RowAction } from '@/components/data-table/data-table-row-actions';
import ListTable from '@/components/data-table/list-table';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import ContactLink from '@/components/shared/contact-link';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { useListPage } from '@/hooks/table/use-list-page';
import { type TableFilterBase } from '@/hooks/table/use-table-filters';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Paginated } from '@/types/models';
import { Head, Link } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

/** A sale return or purchase return, normalised so one page can list either. */
export interface ReturnRow {
    id: number;
    return_date: string;
    total_amount: number;
    added_by: string | null;
    /** Invoice number of the sale / purchase that was returned against. */
    parentNo: string;
    /** The customer (sale return) or supplier (purchase return). */
    party: { id: number; name: string };
}

export interface ReturnFilters extends TableFilterBase {
    from: string | null;
    to: string | null;
    per_page: number | 'all';
}

interface ReturnsListPageProps<TRow extends { id: number }> {
    /** `'sale-returns'` or `'purchase-returns'` — the route prefix for index / show / export. */
    routeBase: string;
    title: string;
    description: string;
    /** What the returned-against document is called ("Sale" / "Purchase") and who the other side is ("Customer" / "Supplier"). */
    parentLabel: string;
    partyLabel: string;
    /** Export column ids: `parent` is the invoice-number column, `party` is the customer / supplier column. */
    exportKeys: { parent: string; party: string };
    emptyDescription: string;
    returns: Paginated<TRow>;
    filters: ReturnFilters;
    /** Turns the page's own row type into the shared shape. */
    toRow: (row: TRow) => ReturnRow;
    getActions: (row: TRow) => RowAction[];
}

/**
 * The list page shared by Sale Returns and Purchase Returns — they differ only in names, routes and export keys.
 * Returns are immutable, so rows only offer "View".
 */
export default function ReturnsListPage<TRow extends { id: number }>({
    routeBase,
    title,
    description,
    parentLabel,
    partyLabel,
    exportKeys,
    emptyDescription,
    returns,
    filters,
    toRow,
    getActions,
}: ReturnsListPageProps<TRow>) {
    const money = useMoneyFormat();
    const breadcrumbs: BreadcrumbItem[] = [{ title, href: `/${routeBase}` }];

    const list = useListPage({
        routeName: `${routeBase}.index`,
        filters,
        emptyFilters: { from: null, to: null },
        rows: returns.data,
        getId: (row) => row.id,
        export: {
            routeName: `${routeBase}.export`,
            filterKeys: ['from', 'to'],
            // `reason` has no table column of its own, so it always starts ticked
            columnMap: { sale: [exportKeys.parent], party: [exportKeys.party], date: ['return_date'], amount: ['total_amount'], reason: ['reason'] },
        },
    });

    const visibilityColumns: DataTableColumnOption[] = [
        { id: 'date', label: 'Date' },
        { id: 'sale', label: parentLabel },
        { id: 'party', label: partyLabel },
        { id: 'amount', label: 'Amount' },
        { id: 'added_by', label: 'Added by' },
    ];

    const exportColumns: DataTableColumnOption[] = [
        { id: exportKeys.parent, label: `${parentLabel} Invoice No` },
        { id: exportKeys.party, label: partyLabel },
        { id: 'return_date', label: 'Return Date' },
        { id: 'total_amount', label: 'Amount' },
        { id: 'reason', label: 'Reason' },
    ];

    const { selection, handleSort } = list;
    const sort = filters.sort ?? '';
    const direction = filters.direction ?? 'desc';

    const columns = useMemo<ColumnDef<TRow>[]>(
        () => [
            {
                id: 'select',
                header: () => (
                    <DataTableCheckbox
                        checked={selection.isAllSelected ? true : selection.isSomeSelected ? 'indeterminate' : false}
                        onCheckedChange={selection.toggleAll}
                    />
                ),
                meta: { headerClassName: 'w-10', cellClassName: 'w-10', printHidden: true },
                cell: ({ row }) => (
                    <DataTableCheckbox
                        checked={selection.isSelected(row.original.id)}
                        onCheckedChange={(checked) => selection.toggle(row.original.id, checked)}
                    />
                ),
            },
            {
                id: 'actions',
                header: '',
                meta: { headerClassName: 'w-10', cellClassName: 'w-10', printHidden: true },
                cell: ({ row }) => <DataTableRowActions actions={getActions(row.original)} />,
            },
            {
                id: 'date',
                header: () => (
                    <DataTableColumnHeader title="Date" sortKey="return_date" currentSort={sort} currentDirection={direction} onSort={handleSort} />
                ),
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => toRow(row.original).return_date,
            },
            {
                id: 'sale',
                header: parentLabel,
                cell: ({ row }) => (
                    <Link href={route(`${routeBase}.show`, row.original.id)} className="font-medium underline-offset-2 hover:underline">
                        {toRow(row.original).parentNo}
                    </Link>
                ),
            },
            {
                id: 'party',
                header: partyLabel,
                cell: ({ row }) => {
                    const { party } = toRow(row.original);
                    return <ContactLink id={party.id} name={party.name} />;
                },
            },
            {
                id: 'amount',
                header: () => (
                    <DataTableColumnHeader
                        title="Amount"
                        sortKey="total_amount"
                        currentSort={sort}
                        currentDirection={direction}
                        onSort={handleSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(toRow(row.original).total_amount),
            },
            {
                id: 'added_by',
                header: 'Added by',
                cell: ({ row }) => <span className="text-muted-foreground">{toRow(row.original).added_by ?? '—'}</span>,
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [money, selection, sort, direction, handleSort],
    );

    const renderGridCard = (raw: TRow) => {
        const row = toRow(raw);

        return (
            <div className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <DataTableCheckbox checked={selection.isSelected(row.id)} onCheckedChange={(checked) => selection.toggle(row.id, checked)} />
                        <div className="min-w-0">
                            <Link href={route(`${routeBase}.show`, row.id)} className="truncate font-medium underline-offset-2 hover:underline">
                                {row.parentNo}
                            </Link>
                            <div className="text-muted-foreground text-xs">
                                <ContactLink id={row.party.id} name={row.party.name} />
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <span className="font-medium tabular-nums">{money(row.total_amount)}</span>
                        <DataTableRowActions actions={getActions(raw)} />
                    </div>
                </div>

                <div className="text-muted-foreground mt-2 text-xs whitespace-nowrap">{row.return_date}</div>
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title={title} description={description} />

                <ListTable
                    list={list}
                    data={returns}
                    filters={filters}
                    columns={columns}
                    getRowKey={(row) => row.id}
                    renderGridCard={renderGridCard}
                    itemLabel="returns"
                    visibilityColumns={visibilityColumns}
                    exportColumns={exportColumns}
                    filterSlot={
                        <div className="flex flex-wrap items-end gap-3">
                            <FormInput
                                id="from"
                                label="From"
                                type="date"
                                value={filters.from ?? ''}
                                onChange={(e) => list.applyFilters({ from: e.target.value || null })}
                                className="w-40"
                            />
                            <FormInput
                                id="to"
                                label="To"
                                type="date"
                                value={filters.to ?? ''}
                                onChange={(e) => list.applyFilters({ to: e.target.value || null })}
                                className="w-40"
                            />
                        </div>
                    }
                    emptyState={<EmptyState title={`No ${title.toLowerCase()} yet`} description={emptyDescription} />}
                    filteredEmptyState={
                        <EmptyState title={`No ${title.toLowerCase()} match your filters`} description="অন্য date range দিয়ে আবার চেষ্টা করুন">
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
