import { SETTINGS_SECTION, SettingsTab } from '@/components/business-settings/settings-tab';
import { type BusinessSettingsApi } from '@/components/business-settings/types';
import { FormSection } from '@/components/form/form-section';
import { ToggleRow } from '@/components/form/toggle-row';
import { SlidersHorizontal } from 'lucide-react';

/** Optional features the shop can switch on or off. */
export function ModulesTab({ form }: { form: BusinessSettingsApi }) {
    const { data, setData } = form;

    return (
        <SettingsTab value="modules">
            <FormSection
                {...SETTINGS_SECTION}
                title="Application Modules"
                description="Enable or disable optional features in your application."
                icon={SlidersHorizontal}
            >
                <div className="space-y-3">
                    <ToggleRow
                        id="thermal_printer_enabled"
                        label="Thermal Printer"
                        description="Use the thermal printer layout for invoices and challans."
                        checked={data.thermal_printer_enabled}
                        onCheckedChange={(checked) => setData('thermal_printer_enabled', checked)}
                    />

                    <ToggleRow
                        id="emi_module_enabled"
                        label="EMI Module"
                        description="Enable EMI and installment-related features throughout the application."
                        checked={data.emi_module_enabled}
                        onCheckedChange={(checked) => setData('emi_module_enabled', checked)}
                    />

                    <ToggleRow
                        id="serial_number_module_enabled"
                        label="Serial Number Tracking"
                        description="Enable serial number inputs in the sales form."
                        checked={data.serial_number_module_enabled}
                        onCheckedChange={(checked) => setData('serial_number_module_enabled', checked)}
                    />
                </div>
            </FormSection>
        </SettingsTab>
    );
}
