import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    /** Column ids currently visible in the table — the checklist starts pre-checked to match. */
    defaultVisibleColumns: string[];
    totalCount: number;
    selectedCount: number;
    onExport: (params: DataTableExportParams) => void;
}

/**
 * Format × column picker shared by every list page's export button — the row
 * scope isn't a choice the user makes (doc/corrections2.md #7): checking any
 * rows exports just those, and with nothing checked it exports everything
 * matching the current filters. The page itself turns `onExport`'s params
 * into the actual download URL — this dialog only collects the choice.
 * Nothing here is trusted server-side: the backend must re-validate
 * `format`/`scope`, whitelist `columns` against its own known set, and
 * re-scope `selected` ids through the same filtered query rather than
 * trusting the id list as-is (see `ProductExportController` for the pattern
 * this follows).
 */
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

    // Re-seed the column checklist from the table's current visibility each time
    // the dialog opens (or if that visibility changes while it's still open).
    useEffect(() => {
        if (open) {
            setCheckedColumns(Object.fromEntries(columns.map((column) => [column.id, defaultVisibleColumns.includes(column.id)])));
        }
    }, [open, columns, defaultVisibleColumns]);

    const selectedColumnIds = columns.filter((column) => checkedColumns[column.id]).map((column) => column.id);
    const scope: DataTableExportScope = selectedCount > 0 ? 'selected' : 'all';

    const submit = () => {
        onExport({ format, scope, columns: selectedColumnIds });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Export</DialogTitle>
                    <DialogDescription>Choose a format and which columns to include.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Format</Label>
                        <Tabs value={format} onValueChange={(value) => setFormat(value as DataTableExportFormat)}>
                            <TabsList>
                                <TabsTrigger value="csv">CSV</TabsTrigger>
                                <TabsTrigger value="xlsx">Excel</TabsTrigger>
                                <TabsTrigger value="pdf">PDF</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <p className="bg-muted/40 text-muted-foreground rounded-md border p-3 text-sm">
                        {scope === 'selected'
                            ? `${selectedCount} selected row${selectedCount === 1 ? '' : 's'} will be exported.`
                            : `Nothing is selected — all ${totalCount} row${totalCount === 1 ? '' : 's'} matching the current filters will be exported.`}
                    </p>

                    <div className="grid gap-2">
                        <Label>Columns</Label>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border p-3">
                            {columns.map((column) => (
                                <label key={column.id} className="flex cursor-pointer items-center gap-2 text-sm">
                                    <DataTableCheckbox
                                        checked={checkedColumns[column.id] ?? false}
                                        onCheckedChange={(checked) => setCheckedColumns((current) => ({ ...current, [column.id]: checked }))}
                                    />
                                    {column.label}
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
                        Export
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
