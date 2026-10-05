import { type InvoiceSettingsConfig } from '@/types/models';
import { type InertiaFormProps } from '@inertiajs/react';

/** What the Invoice Settings form submits: the layout config plus an optional new logo upload. */
export type InvoiceSettingsData = InvoiceSettingsConfig & { logo: File | null };

export type InvoiceSettingsApi = InertiaFormProps<InvoiceSettingsData>;

/** Merges a patch into one section of the config (general, branding, ...), keeping its other fields. */
export type UpdateSection = <K extends keyof InvoiceSettingsConfig>(section: K, patch: Partial<InvoiceSettingsConfig[K]>) => void;

/** Props every tab receives. */
export interface InvoiceTabProps {
    form: InvoiceSettingsApi;
    updateSection: UpdateSection;
}

/** Validation errors are keyed by dotted path ("general.title"), which the typed `errors` object doesn't model. */
export const fieldError = (form: InvoiceSettingsApi, path: string): string | undefined => (form.errors as Record<string, string | undefined>)[path];
