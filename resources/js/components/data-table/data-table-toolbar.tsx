import DataTableExportDialog, { type DataTableExportParams } from '@/components/data-table/data-table-export-dialog';
import DataTableViewOptions from '@/components/data-table/data-table-view-options';
import { type DataTableColumnOption } from '@/components/data-table/types';
import { SearchInput } from '@/components/shared/search-input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import FilterToggleButton from '@/components/ui/filter-toggle-button';
import ViewModeToggle from '@/components/ui/view-mode-toggle';
import { type TableViewMode } from '@/hooks/use-table-view-mode';
import { Download, RotateCcw } from 'lucide-react';
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
    /** Shown in the search row while rows are ticked (selected count + bulk actions). */
    selectionSlot?: ReactNode;
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
    selectionSlot,
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
        <Collapsible
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            className="rounded-brand-card bg-card p-3 shadow-[var(--brand-card-shadow-elevated)] sm:p-3.5 print:hidden"
        >
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    {hasSearch && (
                        <SearchInput
                            value={search ?? ''}
                            onChange={(event) => onSearchChange!(event.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            onClear={search ? () => onSearchChange!('') : undefined}
                            loading={isSearching}
                            placeholder={searchPlaceholder}
                            aria-label={searchPlaceholder}
                            aria-busy={isSearching}
                            className="bg-brand-secondary/60 hover:bg-brand-secondary/80 focus-within:bg-card w-full border-transparent shadow-none sm:w-64 lg:w-80"
                        />
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
                            variant="secondary"
                            size="icon"
                            onClick={onReset}
                            title="Reset filters"
                            aria-label="Reset filters"
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <RotateCcw className="size-3.5" />
                        </Button>
                    )}

                    {/* Right-side actions */}
                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                        {selectionSlot}

                        {hasViewOptions && (
                            <DataTableViewOptions
                                columns={visibilityColumns!}
                                visibility={columnVisibility!}
                                onVisibilityChange={onVisibilityChange!}
                            />
                        )}

                        {hasExport && (
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                onClick={() => setExportDialogOpen(true)}
                                title="Export"
                                aria-label="Export"
                            >
                                <Download className="size-3.5" />
                            </Button>
                        )}

                        {(hasViewOptions || hasExport) && <div className="bg-brand-table-divider mx-1 hidden h-5 w-px sm:block" aria-hidden="true" />}

                        <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
                    </div>
                </div>

                {/* Filter panel */}
                {filterSlot && (
                    <CollapsibleContent className="overflow-hidden">
                        {/* The toolbar card already draws the border; the divider alone separates the filters from it. */}
                        <div className="border-brand-table-divider border-t pt-3">{filterSlot}</div>
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
