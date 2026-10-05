import { SETTINGS_SECTION, SettingsTab } from '@/components/business-settings/settings-tab';
import { type BusinessSettingsApi } from '@/components/business-settings/types';
import { FormInput } from '@/components/form/form-input';
import { FormSection } from '@/components/form/form-section';
import { Activity, CreditCard, ShoppingBag } from 'lucide-react';

interface NumberingSectionProps {
    form: BusinessSettingsApi;
    kind: 'invoice' | 'purchase';
}

const COPY = {
    invoice: {
        title: 'Invoice Numbering',
        description: 'Manage invoice and purchase numbering formats.',
        icon: CreditCard,
        prefixLabel: 'Invoice Prefix',
        numberLabel: 'Next Invoice Number',
        prefixPlaceholder: 'INV-',
        previewLabel: 'Invoice preview',
    },
    purchase: {
        title: 'Purchase Numbering',
        description: 'Configure the prefix and next number for purchase records.',
        icon: ShoppingBag,
        prefixLabel: 'Purchase Prefix',
        numberLabel: 'Next Purchase Number',
        prefixPlaceholder: 'PUR-',
        previewLabel: 'Purchase preview',
    },
} as const;

/** One prefix + next-number pair, with a live preview of the resulting document number. */
function NumberingSection({ form, kind }: NumberingSectionProps) {
    const { data, setData, errors } = form;
    const copy = COPY[kind];
    const prefixKey = `${kind}_prefix` as const;
    const numberKey = `${kind}_next_number` as const;

    return (
        <FormSection {...SETTINGS_SECTION} title={copy.title} description={copy.description} icon={copy.icon}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormInput
                    id={prefixKey}
                    label={copy.prefixLabel}
                    value={data[prefixKey]}
                    onChange={(e) => setData(prefixKey, e.target.value)}
                    error={errors[prefixKey]}
                    placeholder={copy.prefixPlaceholder}
                    required
                />

                <FormInput
                    id={numberKey}
                    label={copy.numberLabel}
                    type="number"
                    min={1}
                    value={data[numberKey]}
                    onChange={(e) => setData(numberKey, Number(e.target.value))}
                    error={errors[numberKey]}
                    placeholder="1001"
                    required
                />
            </div>

            <div className="bg-muted/30 rounded-lg border p-4">
                <p className="text-muted-foreground mb-2 text-xs">{copy.previewLabel}</p>
                <p className="font-mono text-lg font-semibold tracking-wide">
                    {data[prefixKey]}
                    {data[numberKey]}
                </p>
            </div>
        </FormSection>
    );
}

/** Invoice and purchase numbering, and the fiscal year's first month. */
export function NumberingTab({ form }: { form: BusinessSettingsApi }) {
    const { data, setData, errors } = form;

    return (
        <SettingsTab value="invoice">
            <NumberingSection form={form} kind="invoice" />
            <NumberingSection form={form} kind="purchase" />

            <FormSection {...SETTINGS_SECTION} title="Fiscal Year" description="Set the starting month for your fiscal year." icon={Activity}>
                <div className="max-w-sm">
                    <FormInput
                        id="fiscal_year_start_month"
                        label="Fiscal Year Start Month (1-12)"
                        type="number"
                        min={1}
                        max={12}
                        value={data.fiscal_year_start_month}
                        onChange={(e) => setData('fiscal_year_start_month', Number(e.target.value))}
                        error={errors.fiscal_year_start_month}
                        placeholder="1"
                        required
                    />
                </div>
            </FormSection>
        </SettingsTab>
    );
}
