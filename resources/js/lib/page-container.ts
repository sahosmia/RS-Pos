/**
 * Page-level width + rhythm, so every page of a given kind lines up the same way. Use on the page's outer
 * wrapper: `<div className={pageContainer.medium}>`.
 *
 * - `narrow` (max-w-2xl): one short form — bill pay/receive, a single request.
 * - `medium` (max-w-5xl): small tables, statement-style reports, return forms.
 * - `wide`: the default full-width page with big DataTables (no max width).
 */
const base = 'space-y-6 px-4 py-6';

export const pageContainer = {
    narrow: `mx-auto w-full max-w-2xl ${base}`,
    medium: `mx-auto w-full max-w-5xl ${base}`,
    wide: base,
} as const;
