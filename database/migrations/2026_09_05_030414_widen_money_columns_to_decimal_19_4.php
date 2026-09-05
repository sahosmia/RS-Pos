<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * V2 P0 fix (Task 2.5.0a): every money column widened from decimal(15,2) to
 * decimal(19,4) — the project-wide standard from here on (never float/double
 * in any table). `quantity` columns are left untouched; they're a unit
 * count, not money.
 *
 * Raw MODIFY COLUMN statements (not Schema::table()->decimal()->change())
 * since doctrine/dbal isn't installed, and MySQL's MODIFY COLUMN requires
 * the full column definition to be restated or NOT NULL/DEFAULT are lost —
 * every clause below matches the original create-table migration exactly,
 * only the precision changes.
 *
 * MySQL-only: SQLite (the test suite's driver) has no real fixed-precision
 * decimal type — everything is stored the same regardless of declared
 * scale — so this is a no-op there, nothing to widen.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        $this->modify([
            'accounts' => [
                'opening_balance' => 'MODIFY opening_balance DECIMAL(19,4) NOT NULL DEFAULT 0',
                'current_balance' => 'MODIFY current_balance DECIMAL(19,4) NOT NULL DEFAULT 0',
            ],
            'account_transactions' => [
                'amount' => 'MODIFY amount DECIMAL(19,4) NOT NULL',
            ],
            'fund_transfers' => [
                'amount' => 'MODIFY amount DECIMAL(19,4) NOT NULL',
            ],
            'cash_book' => [
                'current_balance' => 'MODIFY current_balance DECIMAL(19,4) NOT NULL DEFAULT 0',
            ],
            'cash_book_entries' => [
                'amount' => 'MODIFY amount DECIMAL(19,4) NOT NULL',
            ],
            'purchases' => [
                'total_amount' => 'MODIFY total_amount DECIMAL(19,4) NOT NULL DEFAULT 0',
                'paid_amount' => 'MODIFY paid_amount DECIMAL(19,4) NOT NULL DEFAULT 0',
                'due_amount' => 'MODIFY due_amount DECIMAL(19,4) NOT NULL DEFAULT 0',
            ],
            'purchase_items' => [
                'unit_price' => 'MODIFY unit_price DECIMAL(19,4) NOT NULL',
                'subtotal' => 'MODIFY subtotal DECIMAL(19,4) NOT NULL',
            ],
            'sales' => [
                'subtotal' => 'MODIFY subtotal DECIMAL(19,4) NOT NULL DEFAULT 0',
                'discount_value' => 'MODIFY discount_value DECIMAL(19,4) NOT NULL DEFAULT 0',
                'discount_amount' => 'MODIFY discount_amount DECIMAL(19,4) NOT NULL DEFAULT 0',
                'total_amount' => 'MODIFY total_amount DECIMAL(19,4) NOT NULL DEFAULT 0',
                'paid_amount' => 'MODIFY paid_amount DECIMAL(19,4) NOT NULL DEFAULT 0',
                'due_amount' => 'MODIFY due_amount DECIMAL(19,4) NOT NULL DEFAULT 0',
            ],
            'sale_items' => [
                'original_price' => 'MODIFY original_price DECIMAL(19,4) NOT NULL',
                'unit_price' => 'MODIFY unit_price DECIMAL(19,4) NOT NULL',
                'discount_amount' => 'MODIFY discount_amount DECIMAL(19,4) NOT NULL DEFAULT 0',
                'cost_at_sale' => 'MODIFY cost_at_sale DECIMAL(19,4) NOT NULL DEFAULT 0',
                'subtotal' => 'MODIFY subtotal DECIMAL(19,4) NOT NULL',
                'installation_charge' => 'MODIFY installation_charge DECIMAL(19,4) NULL',
            ],
            // Not in Phase 2/5/6, but built in the same V1 pass as this
            // fix's neighbors and equally money — widened alongside them
            // rather than left at the old precision.
            'chart_of_accounts' => [
                'balance' => 'MODIFY balance DECIMAL(19,4) NOT NULL DEFAULT 0',
            ],
            'journal_entry_lines' => [
                'debit' => 'MODIFY debit DECIMAL(19,4) NOT NULL DEFAULT 0',
                'credit' => 'MODIFY credit DECIMAL(19,4) NOT NULL DEFAULT 0',
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        $this->modify([
            'accounts' => [
                'opening_balance' => 'MODIFY opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0',
                'current_balance' => 'MODIFY current_balance DECIMAL(15,2) NOT NULL DEFAULT 0',
            ],
            'account_transactions' => [
                'amount' => 'MODIFY amount DECIMAL(15,2) NOT NULL',
            ],
            'fund_transfers' => [
                'amount' => 'MODIFY amount DECIMAL(15,2) NOT NULL',
            ],
            'cash_book' => [
                'current_balance' => 'MODIFY current_balance DECIMAL(15,2) NOT NULL DEFAULT 0',
            ],
            'cash_book_entries' => [
                'amount' => 'MODIFY amount DECIMAL(15,2) NOT NULL',
            ],
            'purchases' => [
                'total_amount' => 'MODIFY total_amount DECIMAL(15,2) NOT NULL DEFAULT 0',
                'paid_amount' => 'MODIFY paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0',
                'due_amount' => 'MODIFY due_amount DECIMAL(15,2) NOT NULL DEFAULT 0',
            ],
            'purchase_items' => [
                'unit_price' => 'MODIFY unit_price DECIMAL(15,2) NOT NULL',
                'subtotal' => 'MODIFY subtotal DECIMAL(15,2) NOT NULL',
            ],
            'sales' => [
                'subtotal' => 'MODIFY subtotal DECIMAL(15,2) NOT NULL DEFAULT 0',
                'discount_value' => 'MODIFY discount_value DECIMAL(15,2) NOT NULL DEFAULT 0',
                'discount_amount' => 'MODIFY discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0',
                'total_amount' => 'MODIFY total_amount DECIMAL(15,2) NOT NULL DEFAULT 0',
                'paid_amount' => 'MODIFY paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0',
                'due_amount' => 'MODIFY due_amount DECIMAL(15,2) NOT NULL DEFAULT 0',
            ],
            'sale_items' => [
                'original_price' => 'MODIFY original_price DECIMAL(15,2) NOT NULL',
                'unit_price' => 'MODIFY unit_price DECIMAL(15,2) NOT NULL',
                'discount_amount' => 'MODIFY discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0',
                'cost_at_sale' => 'MODIFY cost_at_sale DECIMAL(15,2) NOT NULL DEFAULT 0',
                'subtotal' => 'MODIFY subtotal DECIMAL(15,2) NOT NULL',
                'installation_charge' => 'MODIFY installation_charge DECIMAL(15,2) NULL',
            ],
            'chart_of_accounts' => [
                'balance' => 'MODIFY balance DECIMAL(15,2) NOT NULL DEFAULT 0',
            ],
            'journal_entry_lines' => [
                'debit' => 'MODIFY debit DECIMAL(15,2) NOT NULL DEFAULT 0',
                'credit' => 'MODIFY credit DECIMAL(15,2) NOT NULL DEFAULT 0',
            ],
        ]);
    }

    /**
     * @param  array<string, array<string, string>>  $tables
     */
    private function modify(array $tables): void
    {
        foreach ($tables as $table => $columns) {
            foreach ($columns as $clause) {
                DB::statement("ALTER TABLE `{$table}` {$clause}");
            }
        }
    }
};
