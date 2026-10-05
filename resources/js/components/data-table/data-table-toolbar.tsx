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
import { Download, Loader2, RotateCcw, Search } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useState } from 'react';

interface DataTableToolbarProps {
    search?: string;
    onSearchChange?: (value: string) => void;
    onSearchSubmit?: () => void;
    isSearching?: boolean;
    searchPlaceholder?: string;

    activeFilterCount: number;
    canReset: boolean;
    onReset: () => void;

    visibilityColumns?: DataTableColumnOption[];
    columnVisibility?: Record<string, boolean>;
    onVisibilityChange?: (id: string, visible: boolean) => void;

    exportColumns?: DataTableColumnOption[];
    defaultExportColumns?: string[];
    totalCount?: number;
    selectedCount?: number;
    onExport?: (params: DataTableExportParams) => void;

    viewMode: TableViewMode;
    onViewModeChange: (mode: TableViewMode) => void;

    filterSlot?: ReactNode;
}

export default function DataTableToolbar({
    search,
    onSearchChange,
    onSearchSubmit,
    isSearching = false,
    searchPlaceholder = 'Search...',

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

    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && onSearchSubmit) {
            event.preventDefault();
            onSearchSubmit();
        }
    };

    return (
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="bg-card rounded-xl border p-3 shadow-sm sm:p-4 print:hidden">
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    {hasSearch && (
                        <div className="relative w-full sm:w-64 lg:w-72">
                            <Search
                                aria-hidden="true"
                                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                            />

                            <Input
                                type="search"
                                placeholder={searchPlaceholder}
                                value={search ?? ''}
                                onChange={(event) => onSearchChange!(event.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                aria-label={searchPlaceholder}
                                aria-busy={isSearching}
                                className={cn('h-9 w-full pl-9', isSearching && 'pr-9')}
                            />

                            {isSearching && (
                                <Loader2
                                    aria-label="Searching"
                                    role="status"
                                    className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin"
                                />
                            )}
                        </div>
                    )}

                    {/* Filter toggle */}
                    {filterSlot && (
                        <CollapsibleTrigger asChild>
                            <FilterToggleButton open={filtersOpen} activeCount={activeFilterCount} />
                        </CollapsibleTrigger>
                    )}

                    {/* Reset */}
                    {canReset && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground h-9 gap-1.5"
                            onClick={onReset}
                        >
                            <RotateCcw className="size-3.5" />
                            <span className="hidden sm:inline">Reset</span>
                        </Button>
                    )}

                    {/* Right-side actions */}
                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                        {hasViewOptions && (
                            <DataTableViewOptions
                                columns={visibilityColumns!}
                                visibility={columnVisibility!}
                                onVisibilityChange={onVisibilityChange!}
                            />
                        )}

                        {hasExport && (
                            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setExportDialogOpen(true)}>
                                <Download className="size-3.5" />
                                <span className="hidden sm:inline">Export</span>
                            </Button>
                        )}

                        {(hasViewOptions || hasExport) && <div className="bg-border mx-1 hidden h-6 w-px sm:block" aria-hidden="true" />}

                        <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
                    </div>
                </div>

                {/* Filter panel */}
                {filterSlot && (
                    <CollapsibleContent className="overflow-hidden">
                        {/* The toolbar card already draws the border; the divider alone separates the filters from it. */}
                        <div className="border-t pt-3">{filterSlot}</div>
                    </CollapsibleContent>
                )}
            </div>

            {/* Export dialog */}
            {hasExport && (
                <DataTableExportDialog
                    open={exportDialogOpen}
                    onOpenChange={setExportDialogOpen}
                    columns={exportColumns!}
                    defaultVisibleColumns={defaultExportColumns!}
                    totalCount={totalCount ?? 0}
                    selectedCount={selectedCount ?? 0}
                    onExport={onExport!}
                />
            )}
        </Collapsible>
    );
}
