<?php

namespace App\Exceptions;

use App\Models\Asset;
use RuntimeException;

/**
 * Thrown when trying to sell or dispose of an asset whose book value is
 * already 0 — nothing left to sell.
 */
class AssetAlreadyDisposedException extends RuntimeException
{
    public function __construct(Asset $asset)
    {
        parent::__construct("\"{$asset->name}\" has no remaining book value to sell or dispose of.");
    }
}
