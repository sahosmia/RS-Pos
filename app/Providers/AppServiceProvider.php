<?php

namespace App\Providers;

use App\Models\Purchase;
use App\Models\Sale;
use App\View\Composers\AppearanceComposer;
use App\View\Composers\ThemeColorComposer;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        View::composer('app', ThemeColorComposer::class);
        View::composer('app', AppearanceComposer::class);

        $this->scopeRecordsToTheirOwner();
    }

    /**
     * `sale.view_own` / `purchase.view_own` mean "only the records I created". The lists already filter that way;
     * resolving {sale} / {purchase} through the same rule makes every address (show, edit, confirm, cancel,
     * payments…) answer 404 for someone else's record, instead of trusting that nobody types the id.
     */
    private function scopeRecordsToTheirOwner(): void
    {
        Route::bind('sale', fn (string $value) => Sale::query()->visibleTo(Auth::user())->findOrFail($value));

        Route::bind('purchase', fn (string $value) => Purchase::query()->visibleTo(Auth::user())->findOrFail($value));
    }
}
