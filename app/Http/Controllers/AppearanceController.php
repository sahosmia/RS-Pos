<?php

namespace App\Http\Controllers;

use App\Enums\Appearance;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppearanceController extends Controller
{
    /**
     * Switch the authenticated user's dark/light preference (corrections.md
     * #7) — a per-user, DB-persisted setting rather than the old
     * client-only localStorage value, so it follows them across
     * devices/sessions and applies again right after login.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'appearance' => ['required', Rule::enum(Appearance::class)],
        ]);

        $request->user()->update(['appearance' => $validated['appearance']]);

        return back();
    }
}
