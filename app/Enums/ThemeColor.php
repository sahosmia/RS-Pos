<?php

namespace App\Enums;

/**
 * The app's selectable accent-color palette (corrections.md #6). `Neutral`
 * means "no override" — the shop/user simply gets the default grayscale
 * palette already defined in app.css's `:root`/`.dark` blocks. Every other
 * case has a matching `[data-theme-color="..."]` CSS block in app.css that
 * overrides just the brand-accent variables (--primary, --ring, --sidebar-
 * primary, --sidebar-ring) — add a case here and its CSS block to introduce
 * a new palette.
 */
enum ThemeColor: string
{
    case Neutral = 'neutral';
    case Blue = 'blue';
    case Green = 'green';
    case Violet = 'violet';
    case Rose = 'rose';
    case Orange = 'orange';
}
