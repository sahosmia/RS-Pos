import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { getWarrantyClaimActions } from '@/components/products/warranty-claim-actions';
import ContactLink from '@/components/shared/contact-link';
import { StatusBadge } from '@/components/shared/status-badge';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate } from '@/lib/format-date';
import { type WarrantyClaimListItem, type WarrantyClaimStatusValue } from '@/types/models';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const WARRANTY_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'date', label: 'Date' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'customer', label: 'Customer' },
    { id: 'product', label: 'Product' },
    { id: 'issue', label: 'Issue' },
    { id: 'status', label: 'Status' },
];

/** Matches `WarrantyClaimExportController::COLUMN_LABELS` on the backend. */
export const WARRANTY_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'claim_date', label: 'Claim Date' },
    { id: 'invoice_no', label: 'Invoice' },
    { id: 'customer', label: 'Customer' },
    { id: 'product', label: 'Product' },
    { id: 'warranty_expires_at', label: 'Warranty Expires' },
    { id: 'issue_description', label: 'Issue' },
    { id: 'status', label: 'Status' },
    { id: 'resolution_note', label: 'Resolution Note' },
];

/** Table column → export columns that start ticked while it's visible. */
export const WARRANTY_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    date: ['claim_date'],
    invoice: ['invoice_no'],
    customer: ['customer'],
    product: ['product'],
    issue: ['issue_description'],
    status: ['status'],
};

/** The translated name of each claim status, plus the same as `{ value, label }` options for a select. */
export function useWarrantyStatusLabels() {
    const { t } = useTranslation();

    return useMemo(() => {
        const labels: Record<WarrantyClaimStatusValue, string> = {
            pending: t('warrantyClaims', 'pending'),
            in_progress: t('warrantyClaims', 'in_progress'),
            resolved: t('warrantyClaims', 'resolved'),
            rejected: t('warrantyClaims', 'rejected'),
        };

        return { labels, options: (Object.keys(labels) as WarrantyClaimStatusValue[]).map((value) => ({ value, label: labels[value] })) };
    }, [t]);
}

interface Options {
    selection: ListPageState<never>['selection'];
    onUpdate: (claim: WarrantyClaimListItem) => void;
}

export function useWarrantyClaimColumns({ selection, onUpdate }: Options) {
    const { t } = useTranslation();
    const { labels } = useWarrantyStatusLabels();

    return useMemo<ColumnDef<WarrantyClaimListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getWarrantyClaimActions(row.original, { onUpdate })} />,
            },
            {
                id: 'date',
                header: t('warrantyClaims', 'date'),
                meta: { cellClassName: 'whitespace-nowrap' },
                cell: ({ row }) => formatDate(row.original.claim_date),
            },
            { id: 'invoice', header: t('warrantyClaims', 'invoice'), cell: ({ row }) => row.original.invoice_no },
            {
                id: 'customer',
                header: t('warrantyClaims', 'customer'),
                cell: ({ row }) => <ContactLink id={row.original.customer.id} name={row.original.customer.name} />,
            },
            {
                id: 'product',
                header: t('warrantyClaims', 'product'),
                cell: ({ row }) => (
                    <>
                        {row.original.product.name} <span className="text-muted-foreground">({row.original.product.sku})</span>
                    </>
                ),
            },
            {
                id: 'issue',
                header: t('warrantyClaims', 'issue'),
                meta: { cellClassName: 'max-w-xs' },
                cell: ({ row }) => row.original.issue_description,
            },
            {
                id: 'status',
                header: t('warrantyClaims', 'status'),
                cell: ({ row }) => <StatusBadge status={row.original.status} label={labels[row.original.status]} />,
            },
        ],
        [selection, onUpdate, t, labels],
    );
}
