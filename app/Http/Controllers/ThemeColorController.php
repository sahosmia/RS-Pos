<?php

namespace App\Http\Controllers;

use App\Enums\ThemeColor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ThemeColorController extends Controller
{
    /**
     * Switch the authenticated user's personal accent-color preference
     * (corrections.md #6) — a per-user override on top of the shop's global
     * `Settings::theme_color`. `null` clears the override and falls back to
     * the shop default again.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'theme_color' => ['nullable', Rule::enum(ThemeColor::class)],
        ]);

        $request->user()->update(['theme_color' => $validated['theme_color']]);

        return back();
    }
}
