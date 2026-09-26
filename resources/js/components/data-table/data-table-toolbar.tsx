import DataTableExportDialog, { type DataTableExportParams } from '@/components/data-table/data-table-export-dialog';
import DataTableViewOptions from '@/components/data-table/data-table-view-options';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import FilterToggleButton from '@/components/ui/filter-toggle-button';
import { Input } from '@/components/ui/input';
import ViewModeToggle from '@/components/ui/view-mode-toggle';
import { type TableViewMode } from '@/hooks/use-table-view-mode';
import { cn } from '@/lib/utils';
import { Download, Loader2, RotateCcw } from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface DataTableToolbarProps {
    /** Omit entirely for a list with no free-text search (e.g. a pure date/status filter page). */
    search?: string;
    onSearchChange?: (value: string) => void;
    onSearchSubmit?: () => void;
    isSearching?: boolean;
    searchPlaceholder?: string;

    activeFilterCount: number;
    canReset: boolean;
    onReset: () => void;

    /** Omit entirely for a list with no per-column Table-view visibility toggle. */
    visibilityColumns?: DataTableColumnOption[];
    columnVisibility?: Record<string, boolean>;
    onVisibilityChange?: (id: string, visible: boolean) => void;

    /**
     * Omit entirely for a list without the format/scope/columns export dialog
     * (e.g. one with its own simpler "export selected" action) — provide all
     * five together, or none.
     */
    exportColumns?: DataTableColumnOption[];
    defaultExportColumns?: string[];
    totalCount?: number;
    selectedCount?: number;
    onExport?: (params: DataTableExportParams) => void;

    viewMode: TableViewMode;
    onViewModeChange: (mode: TableViewMode) => void;

    /**
     * Domain-specific filter controls (Category/Brand selects, date ranges, ...),
     * rendered inside the collapsible panel. This component never looks at what's
     * inside — omit it entirely for a page with no filters beyond search.
     */
    filterSlot?: ReactNode;
}

/**
 * The search/filter/export/view-mode row every list page renders above its
 * table. Fully generic — domain filters live in `filterSlot`, this only owns
 * the shell (search debounce/cancel-on-submit wiring is the caller's, via
 * `useTableFilters` — this component only forwards keystrokes/Enter). Search,
 * column-visibility, and export are each independently optional: not every
 * list has a search box, a toggleable Table view, or the generic export
 * dialog (some have their own simpler export instead).
 */
export default function DataTableToolbar({
    search,
    onSearchChange,
    onSearchSubmit,
    isSearching,
    searchPlaceholder,
    activeFilterCount,
    canReset,
    onReset,
    visibilityColumns,
    columnVisibility,
    onVisibilityChange,
    exportColumns,
    defaultExportColumns,
    totalCount,
    selectedCount,
    onExport,
    viewMode,
    onViewModeChange,
    filterSlot,
}: DataTableToolbarProps) {
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [exportDialogOpen, setExportDialogOpen] = useState(false);

    const hasSearch = onSearchChange !== undefined;
    const hasViewOptions = visibilityColumns !== undefined && columnVisibility !== undefined && onVisibilityChange !== undefined;
    const hasExport = onExport !== undefined && exportColumns !== undefined && defaultExportColumns !== undefined;

    return (
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="bg-muted/30 rounded-lg border p-3 print:hidden">
            <div className="flex flex-wrap items-end gap-3">
                {hasSearch && (
                    <div className="relative grid w-full gap-2 sm:w-auto">
                        <Input
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit?.()}
                            className="w-full pr-8 sm:w-56"
                        />
                        <Loader2
                            className={cn(
                                'text-muted-foreground pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin transition-opacity duration-200',
                                isSearching ? 'opacity-100' : 'opacity-0',
                            )}
                        />
                    </div>
                )}

                {filterSlot && (
                    <CollapsibleTrigger asChild>
                        <FilterToggleButton open={filtersOpen} activeCount={activeFilterCount} />
                    </CollapsibleTrigger>
                )}

                {canReset && (
                    <Button type="button" variant="ghost" className="gap-2" onClick={onReset}>
                        <RotateCcw className="size-4" />
                        <span className="hidden sm:inline">Reset</span>
                    </Button>
                )}

                <div className="ml-auto flex flex-wrap items-center gap-2">
                    {hasViewOptions && (
                        <DataTableViewOptions columns={visibilityColumns} visibility={columnVisibility} onVisibilityChange={onVisibilityChange} />
                    )}
                    {hasExport && (
                        <Button type="button" variant="outline" className="gap-2" onClick={() => setExportDialogOpen(true)}>
                            <Download className="size-4" />
                            <span className="hidden sm:inline">Export</span>
                        </Button>
                    )}
                    <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
                </div>
            </div>

            {filterSlot && (
                <CollapsibleContent className="-m-1 overflow-hidden p-1 data-[state=closed]:animate-[collapsible-up_200ms_ease-out] data-[state=open]:animate-[collapsible-down_200ms_ease-out]">
                    {filterSlot}
                </CollapsibleContent>
            )}

            {hasExport && (
                <DataTableExportDialog
                    open={exportDialogOpen}
                    onOpenChange={setExportDialogOpen}
                    columns={exportColumns}
                    defaultVisibleColumns={defaultExportColumns}
                    totalCount={totalCount ?? 0}
                    selectedCount={selectedCount ?? 0}
                    onExport={onExport}
                />
            )}
        </Collapsible>
    );
}
