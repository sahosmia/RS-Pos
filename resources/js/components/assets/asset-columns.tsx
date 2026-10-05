import { getAssetActions } from '@/components/assets/asset-actions';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableColumnHeader from '@/components/data-table/data-table-column-header';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { type ListPageState } from '@/hooks/table/use-list-page';
import { type AssetListItem } from '@/types/models';
import { Link } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const ASSET_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'name', label: 'Name' },
    { id: 'current_value', label: 'Current Value' },
];

/** Matches `AssetExportController::COLUMN_LABELS` on the backend. */
export const ASSET_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'name', label: 'Name' },
    { id: 'opening_value', label: 'Opening Value' },
    { id: 'current_value', label: 'Current Value' },
    { id: 'purchase_date', label: 'Purchase Date' },
];

/** Table column → export columns that start ticked while it's visible. */
export const ASSET_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    name: ['name'],
    current_value: ['current_value'],
};

interface Options {
    sort?: string;
    direction?: 'asc' | 'desc';
    onSort: (column: string) => void;
    selection: ListPageState<never>['selection'];
    money: (amount: number) => string;
    onEdit: (asset: AssetListItem) => void;
    onDelete: (asset: AssetListItem) => void;
}

export function useAssetColumns({ sort, direction = 'asc', onSort, selection, money, onEdit, onDelete }: Options) {
    return useMemo<ColumnDef<AssetListItem>[]>(
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
                cell: ({ row }) => <DataTableRowActions actions={getAssetActions(row.original, { onEdit, onDelete })} />,
            },
            {
                id: 'name',
                header: () => (
                    <DataTableColumnHeader title="Name" sortKey="name" currentSort={sort ?? ''} currentDirection={direction} onSort={onSort} />
                ),
                cell: ({ row }) => (
                    <Link href={route('assets.show', row.original.id)} className="font-medium underline-offset-2 hover:underline">
                        {row.original.name}
                    </Link>
                ),
            },
            {
                id: 'current_value',
                header: () => (
                    <DataTableColumnHeader
                        title="Current Value"
                        sortKey="current_value"
                        currentSort={sort ?? ''}
                        currentDirection={direction}
                        onSort={onSort}
                        align="right"
                    />
                ),
                meta: { headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
                cell: ({ row }) => money(row.original.current_value),
            },
        ],
        [money, selection, sort, direction, onSort, onEdit, onDelete],
    );
}
