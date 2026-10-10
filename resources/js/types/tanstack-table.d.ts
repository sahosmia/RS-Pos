import '@tanstack/react-table';

declare module '@tanstack/react-table' {
    // The library's own `ColumnMeta<TData, TValue>` signature dictates these two
    // type params — declaration merging requires this augmentation to repeat them
    // verbatim even though neither is referenced in the body below.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        headerClassName?: string;
        cellClassName?: string;
        /** Human label for the column-visibility menu and the export dialog's column checklist. Omit to keep a column always-on (e.g. row select/actions). */
        label?: string;
        /** Excluded from `window.print()` output — for columns meaningless on paper (row-select checkbox, row actions menu). */
        printHidden?: boolean;
        /** Horizontal alignment of header and cells. Numbers/currency/actions → `right`; omit for text. */
        align?: 'left' | 'center' | 'right';
    }
}
