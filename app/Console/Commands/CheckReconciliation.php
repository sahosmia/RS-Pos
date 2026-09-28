<?php

namespace App\Console\Commands;

use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Daily safety net against subsidiary-ledger/General-Ledger divergence
 * (পর্ব ৬.৫) — since every module writes both a fast operational
 * subsidiary ledger (Contact.balance, Product.current_stock) and a
 * General Ledger journal entry in the same transaction, a bug in either
 * path could silently desync them. This never auto-corrects anything —
 * only logs a warning naming the mismatch, so it gets investigated
 * immediately (there's no notification system yet — Phase 17 — to alert
 * through instead, same deferral `emi:mark-overdue` already made).
 */
class CheckReconciliation extends Command
{
    protected $signature = 'reconciliation:check {--fix : Recalculate contact balances and product stocks before checking}';

    protected $description = 'Compare subsidiary ledger totals against their General Ledger counterparts and log any mismatch';

    private const TOLERANCE = 0.01;

    public function handle(): void
    {
        if ($this->option('fix')) {
            $this->info('Recalculating contact balances and product stocks...');
            Contact::query()->each(fn (Contact $c) => $c->recalculateBalance());
            Product::query()->each(fn (Product $p) => $p->recalculateStock());
            $this->info('Recalculation complete.');
        }

        $this->checkReceivable();
        $this->checkPayable();
        $this->checkInventory();
    }

    private function checkReceivable(): void
    {
        $subsidiary = (float) Contact::query()
            ->whereIn('type', ['customer', 'both'])
            ->where('balance', '>', 0)
            ->sum('balance');

        $this->compare('Accounts Receivable', $subsidiary, '1100');
    }

    private function checkPayable(): void
    {
        $subsidiary = abs((float) Contact::query()
            ->whereIn('type', ['supplier', 'both'])
            ->where('balance', '<', 0)
            ->sum('balance'));

        $this->compare('Accounts Payable', $subsidiary, '2100');
    }

    private function checkInventory(): void
    {
        $subsidiary = (float) DB::table('products')->selectRaw('SUM(current_stock * avg_cost) as value')->value('value');

        $this->compare('Inventory', $subsidiary, '1200');
    }

    private function compare(string $label, float $subsidiaryTotal, string $chartOfAccountCode): void
    {
        $glBalance = (float) (ChartOfAccount::query()->where('code', $chartOfAccountCode)->value('balance') ?? 0);
        $difference = round($subsidiaryTotal - $glBalance, 2);

        if (abs($difference) > self::TOLERANCE) {
            Log::warning("Reconciliation mismatch: {$label}", [
                'subsidiary_total' => $subsidiaryTotal,
                'gl_balance' => $glBalance,
                'difference' => $difference,
                'chart_of_account_code' => $chartOfAccountCode,
            ]);

            $this->warn("{$label} mismatch: subsidiary={$subsidiaryTotal}, GL={$glBalance}, diff={$difference}");

            return;
        }

        $this->info("{$label}: reconciled ({$subsidiaryTotal})");
    }
}
