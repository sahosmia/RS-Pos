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
import { Columns3 } from 'lucide-react';

interface DataTableViewOptionsProps {
    columns: DataTableColumnOption[];
    visibility: Record<string, boolean>;
    onVisibilityChange: (id: string, visible: boolean) => void;
}

export default function DataTableViewOptions({ columns, visibility, onVisibilityChange }: DataTableViewOptionsProps) {
    const visibleCount = columns.filter((column) => visibility[column.id] !== false).length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    aria-label="Toggle columns"
                >
                    <Columns3 className="size-3.5" />
                    <span className="hidden sm:inline">Columns</span>
                    <span className="text-muted-foreground tabular-nums text-xs">
                        {visibleCount}/{columns.length}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Toggle columns</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                        {visibleCount}/{columns.length}
                    </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((column) => (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={visibility[column.id] !== false}
                        onCheckedChange={(checked) => onVisibilityChange(column.id, checked)}
                        onSelect={(e) => e.preventDefault()}
                    >
                        {column.label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
