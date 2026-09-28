<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->decimal('subtotal', 19, 4)->default(0)->after('purchase_date');
            $table->string('discount_type')->nullable()->after('subtotal');
            $table->decimal('discount_value', 19, 4)->default(0)->after('discount_type');
            $table->decimal('discount_amount', 19, 4)->default(0)->after('discount_value');
        });

        Schema::table('purchase_items', function (Blueprint $table) {
            $table->decimal('original_price', 19, 4)->default(0)->after('product_id');
            $table->string('discount_type')->nullable()->after('original_price');
            $table->decimal('discount_value', 19, 4)->default(0)->after('discount_type');
            $table->decimal('discount_amount', 19, 4)->default(0)->after('discount_value');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropColumn(['subtotal', 'discount_type', 'discount_value', 'discount_amount']);
        });

        Schema::table('purchase_items', function (Blueprint $table) {
            $table->dropColumn(['original_price', 'discount_type', 'discount_value', 'discount_amount']);
        });
    }
};
