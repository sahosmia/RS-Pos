import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import LanguageTabs from '@/components/language-tabs';
import ThemeColorPicker from '@/components/theme-color-picker';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/hooks/use-translation';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appearance settings',
        href: '/settings/appearance',
    },
];

export default function Appearance() {
    const { themeColor, isPersonalOverride, updateThemeColor } = useThemeColor();
    const { t } = useTranslation();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Appearance settings" description="Update your account's appearance settings" />
                    <AppearanceTabs />

                    <div className="space-y-3">
                        <HeadingSmall title="Panel color" description="Pick your own accent color, or leave it to follow the shop's default" />
                        <ThemeColorPicker
                            value={themeColor}
                            onChange={(color) => updateThemeColor(color)}
                            onReset={isPersonalOverride ? () => updateThemeColor(null) : undefined}
                        />
                    </div>

                    <div className="space-y-3">
                        <HeadingSmall title={t('language', 'label')} description="Choose the language the app is shown in" />
                        <LanguageTabs />
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
