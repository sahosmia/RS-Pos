import { type DataTableColumnOption } from '@/components/data-table/types';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Columns3, RotateCcw } from 'lucide-react';

interface DataTableViewOptionsProps {
    columns: DataTableColumnOption[];
    visibility: Record<string, boolean>;
    onVisibilityChange: (id: string, visible: boolean) => void;
}

export default function DataTableViewOptions({ columns, visibility, onVisibilityChange }: DataTableViewOptionsProps) {
    const visibleCount = columns.filter((column) => visibility[column.id] !== false).length;

    const totalCount = columns.length;
    const allVisible = visibleCount === totalCount;
    const noneVisible = visibleCount === 0;

    const showAllColumns = () => {
        columns.forEach((column) => {
            if (visibility[column.id] === false) {
                onVisibilityChange(column.id, true);
            }
        });
    };

    const hideAllColumns = () => {
        columns.forEach((column) => {
            if (visibility[column.id] !== false) {
                onVisibilityChange(column.id, false);
            }
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="secondary"
                    disabled={totalCount === 0}
                    title="Columns"
                    aria-label={`Column visibility: ${visibleCount} of ${totalCount} visible`}
                >
                    <Columns3 />
                    <span className="bg-brand-secondary text-muted-foreground rounded-sm px-1.5 text-xs leading-5 font-medium tabular-nums">
                        {visibleCount}/{totalCount}
                    </span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60" onCloseAutoFocus={(event) => event.preventDefault()}>
                <DropdownMenuLabel className="text-foreground flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Column visibility</span>
                    <span className="text-muted-foreground text-xs font-normal tabular-nums">
                        {visibleCount} of {totalCount}
                    </span>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-xs"
                        onClick={showAllColumns}
                        disabled={allVisible}
                    >
                        <Check className="size-3.5" />
                        Show all
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-7 gap-1.5 px-2 text-xs"
                        onClick={hideAllColumns}
                        disabled={noneVisible}
                    >
                        <RotateCcw className="size-3.5" />
                        Hide all
                    </Button>
                </div>

                <DropdownMenuSeparator />

                {columns.length > 0 ? (
                    columns.map((column) => {
                        const isVisible = visibility[column.id] !== false;

                        return (
                            <DropdownMenuCheckboxItem
                                key={column.id}
                                checked={isVisible}
                                onCheckedChange={(checked) => onVisibilityChange(column.id, checked)}
                                onSelect={(event) => event.preventDefault()}
                                className="cursor-pointer capitalize"
                            >
                                <span className="truncate">{column.label}</span>
                            </DropdownMenuCheckboxItem>
                        );
                    })
                ) : (
                    <p className="text-muted-foreground px-2 py-4 text-center text-sm">No columns available</p>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
