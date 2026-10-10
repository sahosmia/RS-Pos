import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { getServiceRequestActions } from '@/components/service-requests/service-request-actions';
import ContactLink from '@/components/shared/contact-link';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate } from '@/lib/format-date';
import { type ServiceRequestListItem, type ServiceRequestStatusValue, type ServiceRequestTypeValue } from '@/types/models';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const SERVICE_REQUEST_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'date', label: 'Date' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'customer', label: 'Customer' },
    { id: 'product', label: 'Product' },
    { id: 'type', label: 'Type' },
    { id: 'technician', label: 'Technician' },
    { id: 'charge', label: 'Charge' },
    { id: 'status', label: 'Status' },
];

/** Matches `ServiceRequestExportController::COLUMN_LABELS` on the backend. */
export const SERVICE_REQUEST_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'request_date', label: 'Date' },
    { id: 'invoice_no', label: 'Invoice' },
    { id: 'customer', label: 'Customer' },
    { id: 'product', label: 'Product' },
    { id: 'type', label: 'Type' },
    { id: 'charge_amount', label: 'Charge' },
    { id: 'staff', label: 'Staff' },
    { id: 'status', label: 'Status' },
];

/** Table column → export columns that start ticked while it's visible. */
export const SERVICE_REQUEST_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    date: ['request_date'],
    invoice: ['invoice_no'],
    customer: ['customer'],
    product: ['product'],
    type: ['type'],
    technician: ['staff'],
    charge: ['charge_amount'],
    status: ['status'],
};

/** The translated names of a request's status and type. */
export function useServiceRequestLabels() {
    const { t } = useTranslation();

    return useMemo(
        () => ({
            status: {
                pending: t('serviceRequests', 'pending'),
                scheduled: t('serviceRequests', 'scheduled'),
                completed: t('serviceRequests', 'completed'),
                cancelled: t('serviceRequests', 'cancelled'),
            } satisfies Record<ServiceRequestStatusValue, string>,
            type: {
                installation: t('serviceRequests', 'installation'),
                service: t('serviceRequests', 'service'),
            } satisfies Record<ServiceRequestTypeValue, string>,
        }),
        [t],
    );
}

interface Options {
    selection: ListPageState<never>['selection'];
    money: (amount: number) => string;
    /** Opens the update dialog (see getServiceRequestActions). */
    onUpdate: (request: ServiceRequestListItem, preset: ServiceRequestStatusValue | null) => void;
}

export function useServiceRequestColumns({ selection, money, onUpdate }: Options) {
    const { t } = useTranslation();
    const labels = useServiceRequestLabels();

    return useMemo<ColumnDef<ServiceRequestListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getServiceRequestActions(row.original, { onUpdate })} />,
            },
            {
                id: 'date',
                header: t('serviceRequests', 'date'),
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => formatDate(row.original.request_date),
            },
            { id: 'invoice', header: t('serviceRequests', 'invoice'), cell: ({ row }) => row.original.invoice_no },
            {
                id: 'customer',
                header: t('serviceRequests', 'customer'),
                cell: ({ row }) => <ContactLink id={row.original.customer.id} name={row.original.customer.name} />,
            },
            {
                id: 'product',
                header: t('serviceRequests', 'product'),
                cell: ({ row }) => (
                    <>
                        {row.original.product.name} <span className="text-muted-foreground">({row.original.product.sku})</span>
                    </>
                ),
            },
            { id: 'type', header: t('serviceRequests', 'type'), cell: ({ row }) => labels.type[row.original.type] },
            {
                id: 'technician',
                header: t('serviceRequests', 'technician'),
                cell: ({ row }) => row.original.staff?.name ?? <span className="text-muted-foreground">—</span>,
            },
            {
                id: 'charge',
                header: t('serviceRequests', 'charge'),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) =>
                    row.original.is_free ? <Badge variant="secondary">{t('serviceRequests', 'free')}</Badge> : money(row.original.charge_amount),
            },
            {
                id: 'status',
                header: t('serviceRequests', 'status'),
                cell: ({ row }) => <StatusBadge status={row.original.status} label={labels.status[row.original.status]} />,
            },
        ],
        [selection, money, t, labels, onUpdate],
    );
}
