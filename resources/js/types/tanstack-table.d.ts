import '@tanstack/react-table';

declare module '@tanstack/react-table' {
    interface ColumnMeta<TData extends RowData, TValue> {
        headerClassName?: string;
        cellClassName?: string;
        /** Human label for the column-visibility menu and the export dialog's column checklist. Omit to keep a column always-on (e.g. row select/actions). */
        label?: string;
        /** Excluded from `window.print()` output — for columns meaningless on paper (row-select checkbox, row actions menu). */
        printHidden?: boolean;
    }
}
