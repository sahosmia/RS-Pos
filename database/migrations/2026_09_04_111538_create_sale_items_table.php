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
            // Which lines of an EMI sale go on installments (an AC financed, the wiring and pipe paid now). Defaults to all.
            $table->boolean('emi_financed')->default(true);
            // The warranty chosen on this line, defaulting to the product's. null = take the product's when the sale is
            // confirmed; 0 = none. Once confirmed the resolved months are stored, so a later product edit never reaches the sale.
            $table->date('warranty_expires_at')->nullable();
            $table->unsignedInteger('warranty_months')->nullable();
            // Whether the product's service plan is copied onto this line.
            $table->boolean('service_plan_included')->default(true);
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
