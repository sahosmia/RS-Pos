import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (appearance: Appearance) => {
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());

    document.documentElement.classList.toggle('dark', isDark);
};

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * DB-persisted per-user preference (corrections.md #7) — the initial value
 * is already applied with no flash by `AppearanceComposer` (app.blade.php),
 * so this hook only needs to handle switching it afterwards and keeping
 * 'system' in sync with live OS theme changes. `auth.user` can be null on
 * guest pages (this hook is consumed by the globally-mounted `<Toaster>`),
 * hence the fallback to 'system'.
 */
/** Keeps the `dark` class in step with live OS theme changes while the preference is 'system'. */
function useSystemThemeSync(appearance: Appearance) {
    useEffect(() => {
        if (appearance !== 'system') {
            return;
        }

        const handleSystemThemeChange = () => applyTheme('system');
        mediaQuery.addEventListener('change', handleSystemThemeChange);

        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, [appearance]);
}

export function useAppearance() {
    const { auth } = usePage<SharedData>().props;
    const appearance = (auth.user?.appearance ?? 'system') as Appearance;

    useSystemThemeSync(appearance);

    const updateAppearance = (mode: Appearance) => {
        applyTheme(mode);

        router.patch(route('appearance.update'), { appearance: mode }, { preserveScroll: true, preserveState: true });
    };

    return { appearance, updateAppearance };
}

/**
 * Read-only variant for components mounted *outside* the Inertia `<App>`
 * tree (the global `<Toaster>` in app.tsx), where `usePage()` throws. Seeds
 * from the server-rendered page object and follows every later navigation.
 */
export function useGlobalAppearance(): Appearance {
    const [appearance, setAppearance] = useState<Appearance>(() => {
        try {
            const page = JSON.parse(document.getElementById('app')?.dataset.page ?? '{}');

            return (page.props?.auth?.user?.appearance ?? 'system') as Appearance;
        } catch {
            return 'system';
        }
    });

    useEffect(
        () =>
            router.on('navigate', (event) =>
                setAppearance(((event.detail.page.props as unknown as SharedData).auth.user?.appearance ?? 'system') as Appearance),
            ),
        [],
    );

    useSystemThemeSync(appearance);

    return appearance;
}
