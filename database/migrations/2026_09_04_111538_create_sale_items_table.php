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
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 19, 4);
            $table->decimal('original_price', 19, 4);
            $table->decimal('unit_price', 19, 4);
            $table->string('discount_type')->nullable();
            $table->decimal('discount_value', 19, 4)->default(0);
            $table->decimal('discount_amount', 19, 4)->default(0);
            $table->decimal('cost_at_sale', 19, 4)->default(0);
            $table->decimal('subtotal', 19, 4);
            $table->boolean('installation_required')->default(false);
            $table->decimal('installation_charge', 19, 4)->nullable();
            $table->date('warranty_expires_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['sale_id', 'product_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sale_items');
    }
};
