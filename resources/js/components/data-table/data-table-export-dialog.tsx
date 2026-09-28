import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FileSpreadsheet, FileText, FileType2, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

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

const FORMATS: { value: DataTableExportFormat; label: string; description: string; icon: LucideIcon }[] = [
    { value: 'csv', label: 'CSV', description: 'Plain text, universal', icon: FileText },
    { value: 'xlsx', label: 'Excel', description: 'Best for analysis', icon: FileSpreadsheet },
    { value: 'pdf', label: 'PDF', description: 'Print-ready', icon: FileType2 },
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
    const [checkedColumns, setCheckedColumns] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (open) {
            setCheckedColumns(
                Object.fromEntries(columns.map((column) => [column.id, defaultVisibleColumns.includes(column.id)])),
            );
        }
    }, [open, columns, defaultVisibleColumns]);

    const selectedColumnIds = columns.filter((column) => checkedColumns[column.id]).map((column) => column.id);
    const scope: DataTableExportScope = selectedCount > 0 ? 'selected' : 'all';

    const allChecked = selectedColumnIds.length === columns.length;
    const toggleAll = () => {
        const next = !allChecked;
        setCheckedColumns(Object.fromEntries(columns.map((column) => [column.id, next])));
    };

    const submit = () => {
        onExport({ format, scope, columns: selectedColumnIds });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Export data</DialogTitle>
                    <DialogDescription>Choose a format and which columns to include.</DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Format picker — card tiles instead of tabs */}
                    <div className="grid gap-2">
                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Format</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {FORMATS.map(({ value, label, description, icon: Icon }) => {
                                const active = format === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setFormat(value)}
                                        className={cn(
                                            'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all',
                                            active
                                                ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                                                : 'hover:border-primary/30 hover:bg-muted/40',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'flex size-8 items-center justify-center rounded-md transition-colors',
                                                active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            <Icon className="size-4" />
                                        </div>
                                        <div className="text-sm font-medium">{label}</div>
                                        <div className="text-[10px] leading-tight text-muted-foreground">{description}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Scope hint */}
                    <div className="bg-muted/40 text-muted-foreground rounded-lg border p-3 text-xs">
                        {scope === 'selected'
                            ? `${selectedCount} selected row${selectedCount === 1 ? '' : 's'} will be exported.`
                            : `Nothing is selected — all ${totalCount} row${totalCount === 1 ? '' : 's'} matching the current filters will be exported.`}
                    </div>

                    {/* Columns */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Columns</Label>
                            <button
                                type="button"
                                onClick={toggleAll}
                                className="text-primary text-xs font-medium hover:underline"
                            >
                                {allChecked ? 'Deselect all' : 'Select all'}
                            </button>
                        </div>
                        <div className="grid max-h-56 grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto rounded-lg border p-3">
                            {columns.map((column) => (
                                <label
                                    key={column.id}
                                    className="flex cursor-pointer items-center gap-2 text-sm hover:text-foreground"
                                >
                                    <DataTableCheckbox
                                        checked={checkedColumns[column.id] ?? false}
                                        onCheckedChange={(checked) =>
                                            setCheckedColumns((current) => ({ ...current, [column.id]: checked }))
                                        }
                                    />
                                    <span className="truncate">{column.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={submit} disabled={selectedColumnIds.length === 0}>
                        Export {selectedColumnIds.length > 0 && `(${selectedColumnIds.length})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
