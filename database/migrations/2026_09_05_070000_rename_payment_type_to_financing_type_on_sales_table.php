<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `payment_type` was confusingly named — it's about financing mode (pay in
 * full vs. installments), not payment method (already handled via account
 * selection/split payment). enum('cash','emi') -> enum('one_time','emi').
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->renameColumn('payment_type', 'financing_type');
        });

        DB::table('sales')->where('financing_type', 'cash')->update(['financing_type' => 'one_time']);

        // doctrine/dbal isn't installed, so Schema::table()->change() isn't
        // available to update the column's DEFAULT clause — raw SQL instead.
        // MySQL only: SQLite (the test driver) has no real ALTER COLUMN
        // DEFAULT support, and the app always sets this column explicitly
        // on every write path anyway, so its stale default there is inert.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `sales` MODIFY `financing_type` VARCHAR(255) NOT NULL DEFAULT 'one_time'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('sales')->where('financing_type', 'one_time')->update(['financing_type' => 'cash']);

        Schema::table('sales', function (Blueprint $table) {
            $table->renameColumn('financing_type', 'payment_type');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `sales` MODIFY `payment_type` VARCHAR(255) NOT NULL DEFAULT 'cash'");
        }
    }
};
