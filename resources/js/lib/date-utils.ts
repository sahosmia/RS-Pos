/**
 * Small, dependency-free calendar math. The app's date values are bare `YYYY-MM-DD` strings (no time,
 * no timezone), so everything here works in the viewer's *local* calendar and never goes through UTC.
 */
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** `YYYY-MM-DD` → local Date (midnight), or `null` when empty/invalid (including 2026-02-31). */
export function parseISODate(value: string | null | undefined): Date | null {
    if (!value || !ISO_DATE.test(value)) {
        return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** Local Date → `YYYY-MM-DD` (never `toISOString()`, which is UTC and can land on the previous day). */
export function toISODate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);

/** Adds months, clamping the day (Jan 31 + 1 month → Feb 28/29) instead of overflowing into March. */
export function addMonths(date: Date, amount: number): Date {
    const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();

    return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export const isSameDay = (a: Date | null | undefined, b: Date | null | undefined) =>
    !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Negative / 0 / positive like a comparator, by calendar day. */
export const compareDays = (a: Date, b: Date) => startOfDay(a).getTime() - startOfDay(b).getTime();

export const isBetween = (date: Date, from: Date, to: Date) => compareDays(date, from) >= 0 && compareDays(date, to) <= 0;

/** 6 weeks × 7 days starting on `weekStartsOn` — always 42 cells so the grid height never changes between months. */
export function getMonthGrid(month: Date, weekStartsOn: 0 | 1 | 6 = 0): Date[] {
    const first = startOfMonth(month);
    const offset = (first.getDay() - weekStartsOn + 7) % 7;
    const start = addDays(first, -offset);

    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 | 6 = 0): Date {
    return addDays(date, -((date.getDay() - weekStartsOn + 7) % 7));
}

export const clampDate = (date: Date, min?: Date | null, max?: Date | null) => {
    if (min && compareDays(date, min) < 0) {
        return min;
    }

    if (max && compareDays(date, max) > 0) {
        return max;
    }

    return date;
};

/** The ranges people ask for in reports. Pure — pass "now" in for tests. */
export function rangePresets(now: Date = new Date()): { label: string; from: Date; to: Date }[] {
    const today = startOfDay(now);
    const monthStart = startOfMonth(today);
    const lastMonth = addMonths(monthStart, -1);

    return [
        { label: 'Today', from: today, to: today },
        { label: 'Yesterday', from: addDays(today, -1), to: addDays(today, -1) },
        { label: 'Last 7 days', from: addDays(today, -6), to: today },
        { label: 'Last 30 days', from: addDays(today, -29), to: today },
        { label: 'This month', from: monthStart, to: today },
        { label: 'Last month', from: lastMonth, to: endOfMonth(lastMonth) },
        { label: 'This year', from: new Date(today.getFullYear(), 0, 1), to: today },
        { label: 'Last year', from: new Date(today.getFullYear() - 1, 0, 1), to: new Date(today.getFullYear() - 1, 11, 31) },
    ];
}
