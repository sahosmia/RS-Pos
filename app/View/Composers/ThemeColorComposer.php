<?php

namespace App\View\Composers;

use App\Enums\ThemeColor;
use App\Models\Settings;
use Illuminate\View\View;

/**
 * Resolves the accent-color palette for the root `app` Blade view
 * (corrections.md #6), so the correct theme applies on first paint with no
 * flash — mirrors the dark-mode inline script's job, but this value is
 * known server-side (DB-backed), so it's resolved here instead of in JS.
 *
 * Priority: signed-in user's personal override > shop's global default >
 * system default ('neutral', meaning "no override" — plain app.css colors).
 */
class ThemeColorComposer
{
    public function compose(View $view): void
    {
        // Eloquent's `Builder::value()` hydrates via `first()`, so it applies the
        // model's enum cast too (unlike the base query builder's raw scalar) —
        // unwrap it the same way as the user's own (already-cast) attribute below.
        $themeColor = auth()->user()?->theme_color?->value
            ?? Settings::query()->value('theme_color')?->value
            ?? ThemeColor::Neutral->value;

        $view->with('themeColor', $themeColor);
    }
}
