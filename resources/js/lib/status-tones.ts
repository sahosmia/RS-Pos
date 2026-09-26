/**
 * Soft badge colors for status/type pills — one definition per tone so
 * product, sale and contact tables (and any future one) stay visually
 * identical in light and dark mode (corrections.md #12).
 */
export const statusTone = {
    success: 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    warning: 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    danger: 'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    info: 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
} as const;
