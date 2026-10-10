import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { FileSpreadsheet, FileText, FileType2, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export type DataTableExportFormat = 'csv' | 'xlsx' | 'pdf';
export type DataTableExportScope = 'all' | 'selected';

export interface DataTableExportParams {
    format: DataTableExportFormat;
    scope: DataTableExportScope;
    columns: string[];
}

interface DataTableExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    columns: DataTableColumnOption[];
    defaultVisibleColumns: string[];
    totalCount: number;
    selectedCount: number;
    onExport: (params: DataTableExportParams) => void;
}

const FORMATS: {
    value: DataTableExportFormat;
    label: string;
    description: string;
    icon: LucideIcon;
}[] = [
    {
        value: 'csv',
        label: 'CSV',
        description: 'Plain text, universal',
        icon: FileText,
    },
    {
        value: 'xlsx',
        label: 'Excel',
        description: 'Best for analysis',
        icon: FileSpreadsheet,
    },
    {
        value: 'pdf',
        label: 'PDF',
        description: 'Print-ready',
        icon: FileType2,
    },
];

export default function DataTableExportDialog({
    open,
    onOpenChange,
    columns,
    defaultVisibleColumns,
    totalCount,
    selectedCount,
    onExport,
}: DataTableExportDialogProps) {
    const [format, setFormat] = useState<DataTableExportFormat>('xlsx');
    const [scope, setScope] = useState<DataTableExportScope>('all');
    const [checkedColumns, setCheckedColumns] = useState<Record<string, boolean>>({});
    const { exportLimits } = usePage<SharedData>().props;

    const exportCount = scope === 'selected' ? selectedCount : totalCount;

    // Excel/PDF are built in memory server-side, so they have a row cap; CSV streams and has none.
    const limitOf = (value: DataTableExportFormat): number | null => (value === 'csv' ? null : exportLimits[value]);
    const overLimit = (value: DataTableExportFormat): boolean => {
        const limit = limitOf(value);
        return limit !== null && exportCount > limit;
    };

    useEffect(() => {
        if (overLimit(format)) setFormat('csv');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exportCount, format, exportLimits]);

    useEffect(() => {
        if (!open) return;

        setCheckedColumns(Object.fromEntries(columns.map((column) => [column.id, defaultVisibleColumns.includes(column.id)])));

        setScope(selectedCount > 0 ? 'selected' : 'all');
    }, [open, columns, defaultVisibleColumns, selectedCount]);

    const selectedColumnIds = useMemo(
        () => columns.filter((column) => checkedColumns[column.id] === true).map((column) => column.id),
        [columns, checkedColumns],
    );

    const allChecked = columns.length > 0 && selectedColumnIds.length === columns.length;

    const someChecked = selectedColumnIds.length > 0 && !allChecked;

    const toggleAll = () => {
        const next = !allChecked;

        setCheckedColumns(Object.fromEntries(columns.map((column) => [column.id, next])));
    };

    const toggleColumn = (id: string, checked: boolean | 'indeterminate') => {
        setCheckedColumns((current) => ({
            ...current,
            [id]: checked === true,
        }));
    };

    const handleExport = () => {
        if (selectedColumnIds.length === 0 || exportCount === 0) return;

        onExport({
            format,
            scope,
            columns: selectedColumnIds,
        });

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Export data</DialogTitle>
                    <DialogDescription>Choose a format, rows, and columns to include in your export.</DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Format */}
                    <section className="grid min-w-0 gap-2">
                        <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Format</Label>

                        <div className="grid grid-cols-3 gap-2">
                            {FORMATS.map(({ value, label, description, icon: Icon }) => {
                                const active = format === value;
                                const blocked = overLimit(value);
                                const limit = limitOf(value);

                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        aria-pressed={active}
                                        disabled={blocked}
                                        onClick={() => setFormat(value)}
                                        className={cn(
                                            'motion-colors flex min-w-0 flex-col items-center gap-1.5 rounded-lg border p-3 text-center disabled:cursor-not-allowed disabled:opacity-50',
                                            active
                                                ? 'border-primary/50 bg-primary/5 ring-primary/20 ring-1'
                                                : 'hover:border-primary/30 hover:bg-muted/40',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-8 items-center justify-center rounded-md',
                                                active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            <Icon className="size-4" aria-hidden="true" />
                                        </span>

                                        <span className="text-sm font-medium">{label}</span>

                                        <span className="text-muted-foreground text-[10px] leading-tight">
                                            {blocked && limit !== null ? `Max ${limit.toLocaleString()} rows` : description}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {(overLimit('xlsx') || overLimit('pdf')) && (
                            <p className="text-xs text-amber-600 dark:text-amber-500">
                                {exportCount.toLocaleString()} rows is too many for{' '}
                                {[overLimit('xlsx') && 'Excel', overLimit('pdf') && 'PDF'].filter(Boolean).join(' and ')}. Use CSV, or narrow the
                                filters first.
                            </p>
                        )}
                    </section>

                    {/* Export scope */}
                    <section className="grid gap-2">
                        <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Rows</Label>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                aria-pressed={scope === 'all'}
                                onClick={() => setScope('all')}
                                className={cn(
                                    'motion-colors rounded-lg border p-3 text-left text-sm',
                                    scope === 'all' ? 'border-primary/50 bg-primary/5 ring-primary/20 ring-1' : 'hover:bg-muted/40',
                                )}
                            >
                                <span className="block font-medium">All rows</span>
                                <span className="text-muted-foreground text-xs">{totalCount.toLocaleString()} available</span>
                            </button>

                            <button
                                type="button"
                                aria-pressed={scope === 'selected'}
                                disabled={selectedCount === 0}
                                onClick={() => setScope('selected')}
                                className={cn(
                                    'motion-colors rounded-lg border p-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50',
                                    scope === 'selected' ? 'border-primary/50 bg-primary/5 ring-primary/20 ring-1' : 'hover:bg-muted/40',
                                )}
                            >
                                <span className="block font-medium">Selected rows</span>
                                <span className="text-muted-foreground text-xs">{selectedCount} selected</span>
                            </button>
                        </div>

                        <p className="bg-muted/40 text-muted-foreground rounded-lg border p-3 text-xs">
                            {scope === 'selected'
                                ? `${selectedCount} selected row${selectedCount === 1 ? '' : 's'} will be exported.`
                                : `All ${totalCount.toLocaleString()} row${totalCount === 1 ? '' : 's'} matching the current filters will be exported.`}
                        </p>
                    </section>

                    {/* Columns */}
                    <section className="grid min-w-0 gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                Columns ({selectedColumnIds.length} of {columns.length})
                            </Label>

                            <button
                                type="button"
                                onClick={toggleAll}
                                disabled={columns.length === 0}
                                className="text-primary text-xs font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {allChecked ? 'Deselect all' : 'Select all'}
                            </button>
                        </div>

                        {someChecked && (
                            <span className="sr-only" aria-live="polite">
                                {selectedColumnIds.length} of {columns.length} columns selected
                            </span>
                        )}

                        <div className="grid max-h-56 grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto rounded-lg border p-3">
                            {columns.length > 0 ? (
                                columns.map((column) => (
                                    <label key={column.id} className="hover:text-foreground flex min-w-0 cursor-pointer items-center gap-2 text-sm">
                                        <DataTableCheckbox
                                            checked={checkedColumns[column.id] ?? false}
                                            onCheckedChange={(checked) => toggleColumn(column.id, checked)}
                                        />
                                        <span className="truncate">{column.label}</span>
                                    </label>
                                ))
                            ) : (
                                <p className="text-muted-foreground col-span-2 py-3 text-center text-sm">No exportable columns available.</p>
                            )}
                        </div>
                    </section>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>

                    <Button type="button" onClick={handleExport} disabled={selectedColumnIds.length === 0 || exportCount === 0}>
                        {exportCount > 0 ? `Export ${exportCount.toLocaleString()} ${exportCount === 1 ? 'row' : 'rows'}` : 'Nothing to export'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
