<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Superseded by serial_numbers (V2 Phase 35 par 12) — the lightweight
 * sale-only, purchase-unconnected table is replaced by a proper
 * purchase-to-warranty lifecycle table.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::dropIfExists('sale_item_serials');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('sale_item_serials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_item_id')->constrained()->cascadeOnDelete();
            $table->string('serial_number');
            $table->timestamps();

            $table->index('sale_item_id');
        });
    }
};
