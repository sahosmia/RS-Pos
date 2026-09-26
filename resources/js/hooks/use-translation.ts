import bn from '@/lib/translations/bn';
import en, { type Dictionary } from '@/lib/translations/en';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

const dictionaries = { en, bn };

/**
 * Per-user UI language (erp-design-decisions.md Phase 33 §4). Reads
 * `auth.user.locale` (server-persisted, defaults to 'bn') rather than a
 * client-only preference like `useAppearance`, since the same value also
 * drives server-rendered strings via Laravel's `__()`.
 *
 * Only the sidebar navigation and Dashboard page are wired up so far —
 * this is the infrastructure other pages will adopt incrementally.
 */
export function useTranslation() {
    const { auth } = usePage<SharedData>().props;
    const locale = auth.user.locale === 'en' ? 'en' : 'bn';
    const dictionary: Dictionary = dictionaries[locale];

    function t<Section extends keyof Dictionary>(section: Section, key: keyof Dictionary[Section]): string {
        return dictionary[section][key] as string;
    }

    return { t, locale };
}
