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

/** Which columns the Table view shows — the export dialog defaults its column checklist to this same state. */
export default function DataTableViewOptions({ columns, visibility, onVisibilityChange }: DataTableViewOptionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label="Toggle columns">
                    <Columns3 className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
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
