const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Matches a bare `YYYY-MM-DD` (date-only, no time/timezone) backend value. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Centralized date display formatter (corrections.md #2) — every page shows
 * dates the same way: `27 Aug, 2026`. Use this instead of writing
 * `toLocaleDateString()`/manual formatting per-page.
 *
 * Bare `YYYY-MM-DD` values (e.g. `sale_date`, `purchase_date` — no time
 * component) are parsed as calendar-date components directly rather than
 * `new Date(value)`, which would parse them as UTC midnight and then shift
 * a day in timezones behind UTC when read back with local getters. Values
 * that already carry a time/timezone (e.g. `created_at` timestamps) are
 * left to the normal `Date` parser, since converting an actual instant to
 * the viewer's local time there is correct.
 */
export function formatDate(value: string | Date | null | undefined): string {
    if (!value) {
        return '';
    }

    let date: Date;

    if (value instanceof Date) {
        date = value;
    } else if (DATE_ONLY.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        date = new Date(year, month - 1, day);
    } else {
        date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

/**
 * Same `27 Aug, 2026` style as `formatDate`, plus a 12-hour time — for
 * ledger-style rows where the order of same-day entries matters (unlike a
 * sale/purchase date, which is date-only).
 */
export function formatDateTime(value: string | Date | null | undefined): string {
    if (!value) {
        return '';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const hours24 = date.getHours();
    const hours12 = hours24 % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const meridiem = hours24 < 12 ? 'AM' : 'PM';

    return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}, ${hours12}:${minutes} ${meridiem}`;
}

/** Today's date as `YYYY-MM-DD` in the user's local timezone — for date-input defaults (`toISOString()` is UTC and can show yesterday early in the day). */
export function today(): string {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
