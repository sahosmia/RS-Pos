import BrandingImageUploader from '@/components/branding-image-uploader';
import { SETTINGS_SECTION, SettingsTab } from '@/components/business-settings/settings-tab';
import { type BusinessSettingsApi } from '@/components/business-settings/types';
import { FormSection } from '@/components/form/form-section';
import InputError from '@/components/input-error';
import ThemeColorPicker from '@/components/theme-color-picker';
import { type Settings } from '@/types/models';
import { Palette } from 'lucide-react';

/** Logos and favicon (uploaded immediately, outside the form) and the shop's default accent colour. */
export function BrandingTab({ form, settings }: { form: BusinessSettingsApi; settings: Settings }) {
    const { data, setData, errors } = form;

    return (
        <SettingsTab value="branding">
            <FormSection
                {...SETTINGS_SECTION}
                title="Brand Identity"
                description="Manage your shop logo, favicon and application appearance."
                icon={Palette}
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <BrandingImageUploader
                        slot="logo"
                        label="Main Logo"
                        description="Displayed in the expanded sidebar and login page."
                        imageUrl={settings.shop_logo_url}
                        previewClassName="h-20 w-full"
                    />

                    <BrandingImageUploader
                        slot="logo-small"
                        label="Small Logo"
                        description="Displayed when the sidebar is collapsed."
                        imageUrl={settings.shop_logo_small_url}
                        previewClassName="size-20"
                    />

                    <BrandingImageUploader
                        slot="favicon"
                        label="Favicon"
                        description="The icon displayed in your browser tab."
                        imageUrl={settings.favicon_url}
                        accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/webp,image/jpeg,.ico"
                        previewClassName="size-20"
                    />
                </div>
            </FormSection>

            <FormSection
                {...SETTINGS_SECTION}
                title="Default Accent Color"
                description="Choose the default color used throughout your application. Personal user preferences take priority."
                icon={Palette}
            >
                <ThemeColorPicker value={data.theme_color} onChange={(color) => setData('theme_color', color)} />
                <InputError message={errors.theme_color} />
            </FormSection>
        </SettingsTab>
    );
}
