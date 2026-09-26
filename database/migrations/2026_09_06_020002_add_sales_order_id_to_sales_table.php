<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kept as its own migration (not folded into `create_sales_table`, unlike
 * this project's other schema tweaks) because `sales_orders` is created
 * later — folding this FK into `create_sales_table` would run before its
 * target table exists.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('sales_order_id')->nullable()->after('customer_id')->constrained('sales_orders')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sales_order_id');
        });
    }
};
