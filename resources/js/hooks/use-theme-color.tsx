import { applyThemeColor, type ThemeColorValue } from '@/lib/theme-colors';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';

/**
 * The user's personal accent-color preference (corrections.md #6) — falls
 * back to the shop's global default when they haven't picked their own.
 * The initial value is already applied with no flash by `ThemeColorComposer`
 * (a `data-theme-color` attribute rendered straight into app.blade.php), so
 * this hook only needs to handle switching it afterwards.
 */
export function useThemeColor() {
    const { auth, shop } = usePage<SharedData>().props;

    const themeColor = (auth.user.theme_color ?? shop.theme_color) as ThemeColorValue;
    const isPersonalOverride = auth.user.theme_color !== null;

    /** `null` clears the personal override and falls back to the shop default again. */
    const updateThemeColor = (color: ThemeColorValue | null) => {
        applyThemeColor(color ?? (shop.theme_color as ThemeColorValue));

        router.patch(route('theme-color.update'), { theme_color: color }, { preserveScroll: true, preserveState: true });
    };

    return { themeColor, isPersonalOverride, updateThemeColor };
}
