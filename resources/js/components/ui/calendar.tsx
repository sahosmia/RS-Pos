import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
    MONTH_NAMES,
    MONTH_SHORT,
    WEEKDAY_LONG,
    WEEKDAY_SHORT,
    addDays,
    addMonths,
    clampDate,
    compareDays,
    getMonthGrid,
    isBetween,
    isSameDay,
    parseISODate,
    startOfDay,
    startOfMonth,
    startOfWeek,
    toISODate,
} from '@/lib/date-utils';
import { cn } from '@/lib/utils';

/**
 * Month calendar. Values are `YYYY-MM-DD` strings (the app's wire format), so it drops straight into
 * existing form state. Pure UI: it knows nothing about reports, invoices or periods.
 *
 * - `mode="single"`: `value` is a date string.  - `mode="range"`: `value` is `{ from, to }` (`to` is `''` while the second click is pending).
 * - Keyboard (day grid): arrows ±1 day / ±1 week, Home/End start/end of week, PageUp/PageDown ±1 month, Shift+Page ±1 year,
 *   Enter/Space selects. One tab stop for the whole grid (roving tabindex).
 * - Header title steps the hierarchy day → month → year pickers. The grid is always 6 weeks tall, so the popup never jumps in height.
 */
type CommonProps = {
    /** Earliest/latest selectable date (`YYYY-MM-DD`). */
    min?: string;
    max?: string;
    /** Extra rule, e.g. block weekends or closed accounting periods. Receives a local-midnight Date. */
    isDateDisabled?: (date: Date) => boolean;
    weekStartsOn?: 0 | 1 | 6;
    /** Month shown first when there is no value. */
    defaultMonth?: string;
    className?: string;
};

export type CalendarSingleProps = CommonProps & {
    mode?: 'single';
    value: string;
    onSelect: (value: string) => void;
};

export type DateRangeValue = { from: string; to: string };

export type CalendarRangeProps = CommonProps & {
    mode: 'range';
    value: DateRangeValue;
    onSelect: (value: DateRangeValue) => void;
};

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

type View = 'days' | 'months' | 'years';

const YEARS_PER_PAGE = 12;

function dayCellClasses(state: { selected: boolean; rangeStart: boolean; rangeEnd: boolean; inRange: boolean; outside: boolean; today: boolean }) {
    return cn(
        'relative flex size-8 items-center justify-center text-[0.8125rem] leading-none tabular-nums outline-hidden',
        'motion-colors',
        'focus-visible:ring-2 focus-visible:ring-brand-focus-ring focus-visible:z-10',
        'disabled:pointer-events-none disabled:text-muted-foreground/40 disabled:line-through',
        state.outside && !state.selected && !state.inRange && 'text-muted-foreground/60',
        // Plain day
        !state.selected && !state.inRange && 'rounded-[calc(var(--brand-control-radius)-3px)] hover:bg-brand-secondary',
        // Selected single day or range endpoints: solid brand
        state.selected && 'bg-brand-primary text-brand-primary-foreground font-semibold',
        state.selected && !state.rangeStart && !state.rangeEnd && 'rounded-[calc(var(--brand-control-radius)-3px)]',
        state.rangeStart && 'rounded-l-[calc(var(--brand-control-radius)-3px)] rounded-r-none',
        state.rangeEnd && 'rounded-r-[calc(var(--brand-control-radius)-3px)] rounded-l-none',
        state.rangeStart && state.rangeEnd && 'rounded-[calc(var(--brand-control-radius)-3px)]',
        // Days strictly inside the range: flat tint band
        state.inRange && !state.selected && 'rounded-none bg-brand-primary/10 text-foreground',
        // Today: a ring + dot so it stays visible whether or not it is selected, and isn't colour-only
        state.today && !state.selected && 'font-semibold text-brand-primary-text ring-1 ring-inset ring-brand-primary/60',
    );
}

function Calendar(props: CalendarProps) {
    const { min, max, isDateDisabled, weekStartsOn = 0, defaultMonth, className } = props;
    const isRange = props.mode === 'range';
    const minDate = parseISODate(min);
    const maxDate = parseISODate(max);

    const selectedSingle = !isRange ? parseISODate(props.value) : null;
    const rangeFrom = isRange ? parseISODate(props.value.from) : null;
    const rangeTo = isRange ? parseISODate(props.value.to) : null;

    const initial = selectedSingle ?? rangeFrom ?? parseISODate(defaultMonth) ?? startOfDay(new Date());
    const [viewMonth, setViewMonth] = React.useState(() => startOfMonth(initial));
    const [focused, setFocused] = React.useState<Date>(() => clampDate(initial, minDate, maxDate));
    const [view, setView] = React.useState<View>('days');
    const [yearPageStart, setYearPageStart] = React.useState(() => initial.getFullYear() - (initial.getFullYear() % YEARS_PER_PAGE));
    const [hovered, setHovered] = React.useState<Date | null>(null);
    const gridRef = React.useRef<HTMLDivElement>(null);
    const shouldFocusDay = React.useRef(false);
    const headingId = React.useId();
    const today = React.useMemo(() => startOfDay(new Date()), []);

    const days = React.useMemo(() => getMonthGrid(viewMonth, weekStartsOn), [viewMonth, weekStartsOn]);
    const weekdays = React.useMemo(() => Array.from({ length: 7 }, (_, index) => (index + weekStartsOn) % 7), [weekStartsOn]);

    const disabled = React.useCallback(
        (date: Date) => (minDate && compareDays(date, minDate) < 0) || (maxDate && compareDays(date, maxDate) > 0) || (isDateDisabled?.(date) ?? false),
        [minDate, maxDate, isDateDisabled],
    );

    // After a keyboard move, put DOM focus on the newly focused day once it has rendered.
    React.useEffect(() => {
        if (shouldFocusDay.current && view === 'days') {
            shouldFocusDay.current = false;
            gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${toISODate(focused)}"]`)?.focus();
        }
    }, [focused, viewMonth, view]);

    const moveFocus = (next: Date) => {
        const clamped = clampDate(next, minDate, maxDate);
        shouldFocusDay.current = true;
        setFocused(clamped);

        if (clamped.getMonth() !== viewMonth.getMonth() || clamped.getFullYear() !== viewMonth.getFullYear()) {
            setViewMonth(startOfMonth(clamped));
        }
    };

    const commit = (date: Date) => {
        if (disabled(date)) {
            return;
        }

        if (props.mode === 'range') {
            const { from, to } = props.value;
            const start = parseISODate(from);

            if (!start || to) {
                props.onSelect({ from: toISODate(date), to: '' });
            } else if (compareDays(date, start) < 0) {
                props.onSelect({ from: toISODate(date), to: '' });
            } else {
                props.onSelect({ from, to: toISODate(date) });
            }
        } else {
            props.onSelect(toISODate(date));
        }

        setFocused(date);
    };

    const onDayKeyDown = (event: React.KeyboardEvent, date: Date) => {
        const keyMoves: Record<string, Date | undefined> = {
            ArrowLeft: addDays(date, -1),
            ArrowRight: addDays(date, 1),
            ArrowUp: addDays(date, -7),
            ArrowDown: addDays(date, 7),
            Home: startOfWeek(date, weekStartsOn),
            End: addDays(startOfWeek(date, weekStartsOn), 6),
            PageUp: addMonths(date, event.shiftKey ? -12 : -1),
            PageDown: addMonths(date, event.shiftKey ? 12 : 1),
        };
        const next = keyMoves[event.key];

        if (next) {
            event.preventDefault();
            moveFocus(next);
        }
    };

    const stepMonth = (amount: number) => {
        const next = addMonths(viewMonth, amount);
        setViewMonth(startOfMonth(next));
        setFocused((current) => addMonths(current, amount));
    };

    const previewTo = isRange && rangeFrom && !rangeTo ? hovered : null;
    const effectiveTo = rangeTo ?? (previewTo && compareDays(previewTo, rangeFrom!) >= 0 ? previewTo : null);

    // ---- header -----------------------------------------------------------------------------------------
    const title =
        view === 'days'
            ? `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`
            : view === 'months'
              ? String(viewMonth.getFullYear())
              : `${yearPageStart} – ${yearPageStart + YEARS_PER_PAGE - 1}`;

    const prev = () => (view === 'days' ? stepMonth(-1) : view === 'months' ? setViewMonth(addMonths(viewMonth, -12)) : setYearPageStart(yearPageStart - YEARS_PER_PAGE));
    const next = () => (view === 'days' ? stepMonth(1) : view === 'months' ? setViewMonth(addMonths(viewMonth, 12)) : setYearPageStart(yearPageStart + YEARS_PER_PAGE));
    const prevLabel = view === 'days' ? 'Previous month' : view === 'months' ? 'Previous year' : 'Previous years';
    const nextLabel = view === 'days' ? 'Next month' : view === 'months' ? 'Next year' : 'Next years';

    return (
        <div className={cn('w-64 p-3 select-none', className)} data-slot="calendar">
            <div className="mb-2 flex items-center justify-between gap-1">
                <Button type="button" variant="ghost" size="icon-sm" onClick={prev} aria-label={prevLabel}>
                    <ChevronLeft />
                </Button>
                <button
                    type="button"
                    id={headingId}
                    aria-live="polite"
                    onClick={() => {
                        if (view === 'days') {
                            setView('months');
                        } else if (view === 'months') {
                            setYearPageStart(viewMonth.getFullYear() - (viewMonth.getFullYear() % YEARS_PER_PAGE));
                            setView('years');
                        } else {
                            setView('days');
                        }
                    }}
                    className="hover:bg-brand-secondary focus-visible:ring-brand-focus-ring rounded-[calc(var(--brand-control-radius)-2px)] px-2 py-1 text-sm font-semibold outline-hidden motion-colors focus-visible:ring-2"
                >
                    {title}
                </button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={next} aria-label={nextLabel}>
                    <ChevronRight />
                </Button>
            </div>

            {view === 'days' && (
                <div role="grid" aria-labelledby={headingId} ref={gridRef} onMouseLeave={() => setHovered(null)}>
                    <div role="row" className="mb-1 grid grid-cols-7">
                        {weekdays.map((weekday) => (
                            <div
                                key={weekday}
                                role="columnheader"
                                aria-label={WEEKDAY_LONG[weekday]}
                                className="text-muted-foreground flex size-8 items-center justify-center text-[0.6875rem] font-medium"
                            >
                                {WEEKDAY_SHORT[weekday]}
                            </div>
                        ))}
                    </div>
                    {Array.from({ length: 6 }).map((_, week) => (
                        <div key={week} role="row" className="grid grid-cols-7">
                            {days.slice(week * 7, week * 7 + 7).map((date) => {
                                const iso = toISODate(date);
                                const outside = date.getMonth() !== viewMonth.getMonth();
                                const isStart = isSameDay(date, rangeFrom);
                                const selected = isRange ? isStart || (!!rangeTo && isSameDay(date, rangeTo)) : isSameDay(date, selectedSingle);
                                const inRange = isRange && !!rangeFrom && !!effectiveTo && isBetween(date, rangeFrom, effectiveTo) && !selected;
                                const isFocusTarget = isSameDay(date, focused);

                                return (
                                    <div key={iso} role="gridcell" aria-selected={selected || inRange || undefined} className="flex">
                                        <button
                                            type="button"
                                            data-date={iso}
                                            tabIndex={isFocusTarget ? 0 : -1}
                                            disabled={disabled(date)}
                                            aria-current={isSameDay(date, today) ? 'date' : undefined}
                                            aria-label={`${WEEKDAY_LONG[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`}
                                            onClick={() => commit(date)}
                                            onFocus={() => setFocused(date)}
                                            onMouseEnter={() => setHovered(date)}
                                            onKeyDown={(event) => onDayKeyDown(event, date)}
                                            className={dayCellClasses({
                                                selected,
                                                rangeStart: isRange && isStart && !!effectiveTo,
                                                rangeEnd: isRange && isSameDay(date, effectiveTo) && !!rangeFrom && !isSameDay(rangeFrom, effectiveTo),
                                                inRange,
                                                outside,
                                                today: isSameDay(date, today),
                                            })}
                                        >
                                            {date.getDate()}
                                            {isSameDay(date, today) && (
                                                <span aria-hidden="true" className={cn('absolute bottom-0.5 size-[3px] rounded-full', selected ? 'bg-brand-primary-foreground' : 'bg-brand-primary')} />
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            {view === 'months' && (
                <div className="grid grid-cols-3 gap-1" role="group" aria-labelledby={headingId}>
                    {MONTH_SHORT.map((label, month) => {
                        const isCurrent = month === viewMonth.getMonth();

                        return (
                            <button
                                key={label}
                                type="button"
                                aria-label={`${MONTH_NAMES[month]} ${viewMonth.getFullYear()}`}
                                aria-pressed={isCurrent}
                                onClick={() => {
                                    setViewMonth(new Date(viewMonth.getFullYear(), month, 1));
                                    setFocused(new Date(viewMonth.getFullYear(), month, 1));
                                    setView('days');
                                }}
                                className={cn(
                                    'focus-visible:ring-brand-focus-ring h-9 rounded-[calc(var(--brand-control-radius)-3px)] text-sm outline-hidden motion-colors focus-visible:ring-2',
                                    isCurrent ? 'bg-brand-primary text-brand-primary-foreground font-semibold' : 'hover:bg-brand-secondary',
                                )}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}

            {view === 'years' && (
                <div className="grid grid-cols-3 gap-1" role="group" aria-labelledby={headingId}>
                    {Array.from({ length: YEARS_PER_PAGE }).map((_, index) => {
                        const year = yearPageStart + index;
                        const isCurrent = year === viewMonth.getFullYear();

                        return (
                            <button
                                key={year}
                                type="button"
                                aria-pressed={isCurrent}
                                onClick={() => {
                                    setViewMonth(new Date(year, viewMonth.getMonth(), 1));
                                    setView('months');
                                }}
                                className={cn(
                                    'focus-visible:ring-brand-focus-ring h-9 rounded-[calc(var(--brand-control-radius)-3px)] text-sm tabular-nums outline-hidden motion-colors focus-visible:ring-2',
                                    isCurrent ? 'bg-brand-primary text-brand-primary-foreground font-semibold' : 'hover:bg-brand-secondary',
                                )}
                            >
                                {year}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export { Calendar };
