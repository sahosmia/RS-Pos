import { CalendarDays, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar, type DateRangeValue } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { controlSize, controlTriggerSurface } from '@/lib/form-control';
import { compareDays, parseISODate, rangePresets, startOfDay, toISODate } from '@/lib/date-utils';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { type VariantProps } from 'class-variance-authority';

/**
 * Date pickers. The value stays a `YYYY-MM-DD` string (or `''` for none), exactly what the backend and the
 * old `<input type="date">` forms already use, so swapping one in only changes the JSX.
 *
 * The trigger looks and sizes like `Input`, shows dates the app-wide way (`27 Aug, 2026`), and opens a
 * `Calendar` in a popover. Keyboard: Enter/Space/↓ opens, arrows move inside the calendar, Enter picks,
 * Esc closes and returns focus to the field. (Typing a date by hand isn't supported — use the calendar.)
 */

interface PickerShared extends VariantProps<typeof controlSize> {
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    /** Show a × to clear the value. Turn off for required dates. Default true. */
    clearable?: boolean;
    min?: string;
    max?: string;
    isDateDisabled?: (date: Date) => boolean;
    weekStartsOn?: 0 | 1 | 6;
    className?: string;
    /** Pass `fieldAriaProps(id, error, helperText)` so the field shows its error state and links to its message. */
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    'aria-label'?: string;
}

interface DatePickerProps extends PickerShared {
    value: string;
    onChange: (value: string) => void;
    /** Adds a "Today" shortcut in the popover footer. Default true. */
    showToday?: boolean;
}

function PickerTrigger({
    id,
    display,
    placeholder,
    disabled,
    size,
    clearable,
    onClear,
    className,
    ...aria
}: {
    id?: string;
    display: string;
    placeholder: string;
    disabled?: boolean;
    size: PickerShared['size'];
    clearable: boolean;
    onClear: () => void;
    className?: string;
} & Pick<PickerShared, 'aria-invalid' | 'aria-describedby' | 'aria-label'>) {
    return (
        <div className={cn(controlTriggerSurface, controlSize({ size }), 'pr-1.5', className)}>
            <PopoverTrigger
                id={id}
                disabled={disabled}
                className="flex h-full min-w-0 flex-1 items-center gap-2 bg-transparent text-left outline-hidden disabled:cursor-not-allowed"
                {...aria}
            >
                <CalendarDays className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                <span className={cn('truncate', !display && 'text-brand-control-placeholder')}>{display || placeholder}</span>
            </PopoverTrigger>
            {clearable && display && !disabled && (
                <button
                    type="button"
                    onClick={onClear}
                    aria-label="Clear date"
                    className="text-muted-foreground hover:text-foreground hover:bg-brand-secondary focus-visible:ring-brand-focus-ring flex size-6 shrink-0 items-center justify-center rounded-sm outline-hidden focus-visible:ring-2"
                >
                    <X className="size-3.5" />
                </button>
            )}
        </div>
    );
}

function DatePicker({
    value,
    onChange,
    placeholder = 'Select date',
    clearable = true,
    showToday = true,
    min,
    max,
    isDateDisabled,
    weekStartsOn,
    size,
    id,
    disabled,
    className,
    ...aria
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);
    const todayDate = startOfDay(new Date());
    const minDate = parseISODate(min);
    const maxDate = parseISODate(max);
    const todayBlocked = (minDate && compareDays(todayDate, minDate) < 0) || (maxDate && compareDays(todayDate, maxDate) > 0) || (isDateDisabled?.(todayDate) ?? false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PickerTrigger
                id={id}
                display={formatDate(value)}
                placeholder={placeholder}
                disabled={disabled}
                size={size}
                clearable={clearable}
                onClear={() => onChange('')}
                className={className}
                {...aria}
            />
            <PopoverContent>
                <Calendar
                    value={value}
                    onSelect={(next) => {
                        onChange(next);
                        setOpen(false);
                    }}
                    min={min}
                    max={max}
                    isDateDisabled={isDateDisabled}
                    weekStartsOn={weekStartsOn}
                />
                {(showToday || (clearable && value)) && (
                    <div className="border-brand-card-border flex items-center justify-between border-t px-2 py-1.5">
                        {showToday ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={!!todayBlocked}
                                onClick={() => {
                                    onChange(toISODate(todayDate));
                                    setOpen(false);
                                }}
                            >
                                Today
                            </Button>
                        ) : (
                            <span />
                        )}
                        {clearable && value && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                onClick={() => {
                                    onChange('');
                                    setOpen(false);
                                }}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

interface DateRangePickerProps extends PickerShared {
    value: DateRangeValue;
    /** Fires once both ends are chosen (or on a preset / Clear) — never with a half-picked range. */
    onChange: (value: DateRangeValue) => void;
    /** Quick ranges (Today, Last 7 days, This month, …) beside the calendar. Default true. */
    presets?: boolean;
}

function DateRangePicker({
    value,
    onChange,
    placeholder = 'Select date range',
    clearable = true,
    presets = true,
    min,
    max,
    isDateDisabled,
    weekStartsOn,
    size,
    id,
    disabled,
    className,
    ...aria
}: DateRangePickerProps) {
    const [open, setOpen] = React.useState(false);
    // Half-finished picks live here so the page's filters aren't refetched until the range is complete.
    const [draft, setDraft] = React.useState<DateRangeValue>(value);

    React.useEffect(() => {
        if (open) {
            setDraft(value);
        }
        // Re-seed only when the popover opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const display = value.from ? (value.to && value.to !== value.from ? `${formatDate(value.from)} – ${formatDate(value.to)}` : formatDate(value.from)) : '';
    const presetList = React.useMemo(() => (open && presets ? rangePresets() : []), [open, presets]);
    const minDate = parseISODate(min);
    const maxDate = parseISODate(max);

    const blocked = (date: Date) => (minDate && compareDays(date, minDate) < 0) || (maxDate && compareDays(date, maxDate) > 0);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PickerTrigger
                id={id}
                display={display}
                placeholder={placeholder}
                disabled={disabled}
                size={size}
                clearable={clearable}
                onClear={() => onChange({ from: '', to: '' })}
                className={className}
                {...aria}
            />
            <PopoverContent>
                <div className="flex flex-col sm:flex-row">
                    {presetList.length > 0 && (
                        <ul
                            aria-label="Quick ranges"
                            className="border-brand-card-border scrollbar-none flex gap-1 overflow-x-auto border-b p-2 sm:max-h-80 sm:w-36 sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0"
                        >
                            {presetList.map((preset) => (
                                <li key={preset.label} className="shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start"
                                        disabled={!!blocked(preset.from) || !!blocked(preset.to)}
                                        onClick={() => {
                                            onChange({ from: toISODate(preset.from), to: toISODate(preset.to) });
                                            setOpen(false);
                                        }}
                                    >
                                        {preset.label}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div>
                        <Calendar
                            mode="range"
                            value={draft}
                            onSelect={(next) => {
                                setDraft(next);

                                if (next.from && next.to) {
                                    onChange(next);
                                    setOpen(false);
                                }
                            }}
                            min={min}
                            max={max}
                            isDateDisabled={isDateDisabled}
                            weekStartsOn={weekStartsOn}
                        />
                        <p className="text-muted-foreground border-brand-card-border border-t px-3 py-2 text-xs" aria-live="polite">
                            {draft.from && !draft.to ? 'Pick the end date' : 'Pick the start date, then the end date'}
                        </p>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export { DatePicker, DateRangePicker };
export type { DatePickerProps, DateRangePickerProps };
