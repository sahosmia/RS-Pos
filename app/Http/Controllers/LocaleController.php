<?php

namespace App\Http\Controllers;

use App\Enums\Locale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LocaleController extends Controller
{
    /**
     * Switch the authenticated user's UI language (Phase 33 §4) — a
     * per-user preference, not a shop-wide setting.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'locale' => ['required', Rule::enum(Locale::class)],
        ]);

        $request->user()->update(['locale' => $validated['locale']]);

        return back();
    }
}
