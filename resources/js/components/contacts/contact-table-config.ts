import { type DataTableColumnOption } from '@/components/data-table/types';

export const CONTACT_VISIBILITY_COLUMNS: DataTableColumnOption[] = [
    { id: 'contact_id', label: 'Contact ID' },
    { id: 'name', label: 'Name' },
    { id: 'contact', label: 'Contact' },
    { id: 'address', label: 'Address' },
    { id: 'type', label: 'Type' },
    { id: 'balance', label: 'Balance' },
    { id: 'status', label: 'Status' },
];

export const CONTACT_EXPORT_COLUMNS: DataTableColumnOption[] = [
    { id: 'name', label: 'Name' },
    { id: 'contact_code', label: 'Contact ID' },
    { id: 'phone', label: 'Phone' },
    { id: 'email', label: 'Email' },
    { id: 'type', label: 'Type' },
    { id: 'business_name', label: 'Business Name' },
    { id: 'address', label: 'Address' },
    { id: 'customer_group', label: 'Customer Group' },
    { id: 'balance', label: 'Balance' },
    { id: 'is_active', label: 'Status' },
];

/** Table column → export columns that start ticked while it's visible (one table column can cover several). */
export const CONTACT_EXPORT_COLUMN_MAP: Record<string, string[]> = {
    contact_id: ['contact_code'],
    name: ['name', 'business_name'],
    contact: ['phone', 'email'],
    address: ['address'],
    type: ['type', 'customer_group'],
    balance: ['balance'],
    status: ['is_active'],
};
