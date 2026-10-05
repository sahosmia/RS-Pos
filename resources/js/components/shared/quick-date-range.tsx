import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CalendarRange } from 'lucide-react';

type DatePreset = 'today' | 'yesterday' | 'this_month' | 'last_month' | 'this_year' | 'last_year';

const PRESET_LABELS: Record<DatePreset, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    this_month: 'This Month',
    last_month: 'Last Month',
    this_year: 'This Year',
    last_year: 'Last Year',
};

/** Local-date "YYYY-MM-DD" for query params — avoids the off-by-one day `toISOString()` causes by converting to UTC first. */
const toQueryDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

function rangeFor(preset: DatePreset): { from: Date; to: Date } {
    const today = new Date();

    switch (preset) {
        case 'today':
            return { from: today, to: today };
        case 'yesterday': {
            const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
            return { from: yesterday, to: yesterday };
        }
        case 'this_month':
            return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
        case 'last_month':
            return { from: new Date(today.getFullYear(), today.getMonth() - 1, 1), to: new Date(today.getFullYear(), today.getMonth(), 0) };
        case 'this_year':
            return { from: new Date(today.getFullYear(), 0, 1), to: today };
        case 'last_year':
            return { from: new Date(today.getFullYear() - 1, 0, 1), to: new Date(today.getFullYear() - 1, 11, 31) };
    }
}

interface QuickDateRangeProps {
    /** Called with ready-to-use `YYYY-MM-DD` strings for the chosen preset. */
    onSelect: (range: { from: string; to: string }) => void;
    onClear: () => void;
}

/** "Quick Range" dropdown for a list page's date filter: Today, Yesterday, This / Last Month, This / Last Year. */
export function QuickDateRange({ onSelect, onClear }: QuickDateRangeProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="gap-2">
                    <CalendarRange className="size-4" />
                    Quick Range
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {(Object.keys(PRESET_LABELS) as DatePreset[]).map((preset) => (
                    <DropdownMenuItem
                        key={preset}
                        onClick={() => {
                            const { from, to } = rangeFor(preset);
                            onSelect({ from: toQueryDate(from), to: toQueryDate(to) });
                        }}
                    >
                        {PRESET_LABELS[preset]}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClear}>Clear dates</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
