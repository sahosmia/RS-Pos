<?php

namespace App\Http\Middleware;

use App\Enums\Locale;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applies the authenticated user's preferred UI language (Phase 33 §4) to
 * server-rendered strings — validation messages, and anything else built
 * with `__()`. Guests get the default configured locale.
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->user()?->locale ?? Locale::En;

        App::setLocale($locale instanceof Locale ? $locale->value : $locale);

        return $next($request);
    }
}
