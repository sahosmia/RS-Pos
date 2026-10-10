import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';
import { router } from '@inertiajs/react';

/**
 * Settings-page counterpart of the old header `LanguageDropdown`
 * (corrections.md #7 moved it out of the permanent header) — the same
 * segmented `Tabs` as `AppearanceTabs`, so the two preference pickers read as one group.
 */
export default function LanguageTabs() {
    const { t, locale } = useTranslation();

    const options: { value: 'en' | 'bn'; label: string }[] = [
        { value: 'en', label: t('language', 'english') },
        { value: 'bn', label: t('language', 'bangla') },
    ];

    const setLocale = (value: string) => {
        if (value === locale) {
            return;
        }

        router.patch(route('locale.update'), { locale: value as 'en' | 'bn' }, { preserveScroll: true, preserveState: false });
    };

    return (
        <Tabs value={locale} onValueChange={setLocale}>
            <TabsList aria-label={t('language', 'label')}>
                {options.map(({ value, label }) => (
                    <TabsTrigger key={value} value={value}>
                        {label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
