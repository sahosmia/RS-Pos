import { FormSection } from '@/components/form/form-section';
import { ToggleRow } from '@/components/form/toggle-row';
import { type InvoiceTabProps } from '@/components/invoice-settings/types';
import { TabsContent } from '@/components/ui/tabs';
import { type InvoiceSettingsConfig } from '@/types/models';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface InvoiceTabContentProps {
    value: string;
    title: string;
    description: string;
    icon: LucideIcon;
    children: ReactNode;
}

/** One tab: a single titled card holding that tab's settings. */
export function InvoiceTabContent({ value, title, description, icon, children }: InvoiceTabContentProps) {
    return (
        <TabsContent value={value} className="mt-0">
            <FormSection accent="primary" contentClassName="space-y-4 sm:p-5" title={title} description={description} icon={icon}>
                {children}
            </FormSection>
        </TabsContent>
    );
}

type BooleanKeys<T> = { [K in keyof T]: T[K] extends boolean ? K : never }[keyof T] & string;

export interface ToggleSpec<S extends keyof InvoiceSettingsConfig> {
    key: BooleanKeys<InvoiceSettingsConfig[S]>;
    label: string;
    description?: string;
}

interface SectionTogglesProps<S extends keyof InvoiceSettingsConfig> extends InvoiceTabProps {
    section: S;
    toggles: ToggleSpec<S>[];
}

/** A stack of on/off rows, one per boolean setting of a config section. */
export function SectionToggles<S extends keyof InvoiceSettingsConfig>({ form, updateSection, section, toggles }: SectionTogglesProps<S>) {
    const values = form.data[section] as Record<string, unknown>;

    return (
        <>
            {toggles.map(({ key, label, description }) => (
                <ToggleRow
                    key={key}
                    id={`${section}_${key}`}
                    label={label}
                    description={description}
                    checked={values[key] === true}
                    onCheckedChange={(checked) => updateSection(section, { [key]: checked } as unknown as Partial<InvoiceSettingsConfig[S]>)}
                />
            ))}
        </>
    );
}
