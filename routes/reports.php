<?php

use App\Http\Controllers\Reports\BalanceSheetController;
use App\Http\Controllers\Reports\CashFlowController;
use App\Http\Controllers\Reports\DueReportController;
use App\Http\Controllers\Reports\FinancialPositionController;
use App\Http\Controllers\Reports\ProfitLossController;
use App\Http\Controllers\Reports\StockReportController;
use App\Http\Controllers\Reports\TrendingProductsController;
use App\Http\Controllers\Reports\TrialBalanceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'module:report'])->prefix('reports')->name('reports.')->group(function () {
    Route::get('profit-loss', ProfitLossController::class)->name('profit-loss');
    Route::get('balance-sheet', BalanceSheetController::class)->name('balance-sheet');
    Route::get('trial-balance', TrialBalanceController::class)->name('trial-balance');
    Route::get('cash-flow', CashFlowController::class)->name('cash-flow');
    Route::get('stock', StockReportController::class)->name('stock');
    Route::get('due', DueReportController::class)->name('due');
    Route::get('trending-products', TrendingProductsController::class)->name('trending-products');
});

// Its own dedicated permission (not the general `report.view` every report
// above shares) — see FinancialPositionController's docblock.
Route::middleware(['auth', 'module:financial_position'])
    ->get('reports/financial-position', FinancialPositionController::class)->name('reports.financial-position');
