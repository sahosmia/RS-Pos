/**
 * Mirrors `App\Enums\ThemeColor` — the app's selectable accent-color
 * palette (corrections.md #6). `swatch` is the same HSL value as the
 * matching `[data-theme-color="..."]` block in app.css, duplicated here
 * only so the picker button can preview the color before it's applied.
 */
export type ThemeColorValue = 'neutral' | 'blue' | 'green' | 'violet' | 'rose' | 'orange';

export const THEME_COLORS: { value: ThemeColorValue; label: string; swatch: string }[] = [
    { value: 'neutral', label: 'Neutral', swatch: 'hsl(0, 0%, 45%)' },
    { value: 'blue', label: 'Blue', swatch: 'hsl(217, 91%, 60%)' },
    { value: 'green', label: 'Green', swatch: 'hsl(142, 71%, 42%)' },
    { value: 'violet', label: 'Violet', swatch: 'hsl(262, 83%, 58%)' },
    { value: 'rose', label: 'Rose', swatch: 'hsl(347, 77%, 50%)' },
    { value: 'orange', label: 'Orange', swatch: 'hsl(21, 90%, 48%)' },
];

/** Sets (or clears) the `data-theme-color` attribute that app.css's palette blocks key off. */
export function applyThemeColor(color: ThemeColorValue): void {
    if (color === 'neutral') {
        document.documentElement.removeAttribute('data-theme-color');
    } else {
        document.documentElement.setAttribute('data-theme-color', color);
    }
}
