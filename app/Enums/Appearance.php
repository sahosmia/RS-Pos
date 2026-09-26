<?php

namespace App\Enums;

/**
 * Per-user dark/light preference (corrections.md #7) — DB-persisted like
 * {@see Locale} rather than the old client-only localStorage value, so it
 * follows the user across devices/sessions and applies again right after
 * login with no flash (see ThemeColorComposer's sibling logic in
 * app.blade.php, which resolves this server-side for `dark`/`light`; only
 * `System` still needs a client-side `prefers-color-scheme` check).
 */
enum Appearance: string
{
    case Light = 'light';
    case Dark = 'dark';
    case System = 'system';
}
