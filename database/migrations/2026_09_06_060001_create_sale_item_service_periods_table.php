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
        Schema::create('sale_item_service_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_item_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('period_number');
            $table->unsignedInteger('period_months');
            $table->unsignedInteger('free_quota')->default(0);
            $table->date('period_start_date');
            $table->date('period_end_date');
            $table->timestamps();

            $table->index(['sale_item_id', 'period_start_date', 'period_end_date'], 'sale_item_service_periods_range_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sale_item_service_periods');
    }
};
