import { FormInput } from '@/components/form/form-input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type DateRangePresetValue } from '@/types/models';
import { useEffect, useState } from 'react';

const PRESETS: { value: DateRangePresetValue; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_month_last_year', label: 'This Month Last Year' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' },
];

/** UI-only sentinel for the "All Time" option — never a real `DateRangePresetValue`. */
const CLEAR_VALUE = 'all_time';

export interface DateRangeFilterValue {
    preset: DateRangePresetValue | null;
    from: string | null;
    to: string | null;
}

interface DateRangeFilterProps {
    range: DateRangeFilterValue;
    /**
     * Fires with the new preset, plus an explicit `from`/`to` only once a custom
     * range is applied. `preset: null` (clearing back to "All Time") only ever
     * fires when `allowClear` is set.
     */
    onChange: (next: { preset: DateRangePresetValue | null; from?: string | null; to?: string | null }) => void;
    /**
     * Adds an "All Time" option that clears the filter back to `preset: null` —
     * for list pages where the date filter is optional (e.g. Products). Off by
     * default so pages that always have an active range (the dashboard) keep
     * their current behavior unchanged.
     */
    allowClear?: boolean;
}

/**
 * Preset dropdown + custom-range date inputs (doc/corrections2.md #4).
 * Picking "Custom Range" only switches the dropdown into custom-editing
 * mode locally — it does NOT navigate yet, since there's no `from`/`to` to
 * send until the user actually picks both dates. Only "Apply" fires
 * `onChange`. `isCustom` (not `range.preset`) drives which UI shows, so the
 * date pickers appear immediately on selecting "Custom Range" instead of
 * only after a round-trip; it re-syncs from the server's `range` whenever
 * that changes from elsewhere (e.g. browser back/forward).
 */
export default function DateRangeFilter({ range, onChange, allowClear = false }: DateRangeFilterProps) {
    const [isCustom, setIsCustom] = useState(range.preset === 'custom');
    const [customFrom, setCustomFrom] = useState(range.from ?? '');
    const [customTo, setCustomTo] = useState(range.to ?? '');

    useEffect(() => {
        setIsCustom(range.preset === 'custom');
        setCustomFrom(range.from ?? '');
        setCustomTo(range.to ?? '');
    }, [range.preset, range.from, range.to]);

    const selectPreset = (value: string) => {
        if (value === CLEAR_VALUE) {
            setIsCustom(false);
            onChange({ preset: null, from: null, to: null });

            return;
        }

        if (value === 'custom') {
            setIsCustom(true);

            return;
        }

        setIsCustom(false);
        onChange({ preset: value as DateRangePresetValue });
    };

    const applyCustomRange = () => {
        if (customFrom && customTo) {
            onChange({ preset: 'custom', from: customFrom, to: customTo });
        }
    };

    return (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid gap-1.5">
                <Select value={isCustom ? 'custom' : (range.preset ?? CLEAR_VALUE)} onValueChange={selectPreset}>
                    <SelectTrigger className="w-full sm:w-56">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {allowClear && <SelectItem value={CLEAR_VALUE}>All Time</SelectItem>}
                        {PRESETS.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value}>
                                {preset.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isCustom && (
                <div className="flex flex-col gap-2 sm:flex-row">
                    <FormInput
                        id="date-range-from"
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full sm:w-auto"
                    />
                    <FormInput
                        id="date-range-to"
                        type="date"
                        value={customTo}
                        min={customFrom}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-full sm:w-auto"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={applyCustomRange}
                        disabled={!customFrom || !customTo}
                        className="w-full sm:w-auto"
                    >
                        Apply
                    </Button>
                </div>
            )}
        </div>
    );
}
