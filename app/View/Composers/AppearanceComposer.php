<?php

namespace App\View\Composers;

use App\Enums\Appearance;
use Illuminate\View\View;

/**
 * Resolves the signed-in user's dark/light preference for the root `app`
 * Blade view (corrections.md #7) so `dark`/`light` apply on first paint
 * with no flash, same idea as {@see ThemeColorComposer}. `system` (the
 * default, and the only option for guests) can't be resolved server-side —
 * the view still renders a small inline script for that case, mirroring
 * how this worked before this was DB-persisted.
 */
class AppearanceComposer
{
    public function compose(View $view): void
    {
        $appearance = auth()->user()?->appearance?->value ?? Appearance::System->value;

        $view->with('appearance', $appearance);
    }
}
