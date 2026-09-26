import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { HTMLAttributes } from 'react';

/**
 * Settings-page counterpart of the old header `LanguageDropdown`
 * (corrections.md #7 moved it out of the permanent header) — same tab
 * styling as `AppearanceTabs` so the two preference pickers read as one
 * group on the Appearance settings page.
 */
export default function LanguageTabs({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    const { t, locale } = useTranslation();

    const tabs: { value: 'en' | 'bn'; label: string }[] = [
        { value: 'en', label: t('language', 'english') },
        { value: 'bn', label: t('language', 'bangla') },
    ];

    const setLocale = (value: 'en' | 'bn') => {
        if (value === locale) {
            return;
        }

        router.patch(route('locale.update'), { locale: value }, { preserveScroll: true, preserveState: false });
    };

    return (
        <div className={cn('inline-flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800', className)} {...props}>
            {tabs.map(({ value, label }) => (
                <button
                    key={value}
                    onClick={() => setLocale(value)}
                    className={cn(
                        'flex items-center rounded-md px-3.5 py-1.5 text-sm transition-colors',
                        locale === value
                            ? 'bg-white shadow-xs dark:bg-neutral-700 dark:text-neutral-100'
                            : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-700/60',
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
