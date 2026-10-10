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
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('contacts')->restrictOnDelete();
            $table->foreignId('sales_order_id')->nullable()->constrained('sales_orders')->nullOnDelete();
            $table->string('invoice_no')->unique();
            $table->date('sale_date');
            $table->decimal('subtotal', 19, 4)->default(0);
            $table->string('discount_type')->nullable();
            $table->decimal('discount_value', 19, 4)->default(0);
            $table->decimal('discount_amount', 19, 4)->default(0);
            $table->decimal('total_amount', 19, 4)->default(0);
            $table->decimal('paid_amount', 19, 4)->default(0);
            $table->decimal('due_amount', 19, 4)->default(0);
            $table->string('payment_status')->default('due');
            $table->string('status')->default('draft');
            $table->string('source')->default('manual');
            $table->string('delivery_status')->default('pending');
            $table->timestamp('delivered_at')->nullable();
            $table->date('valid_until')->nullable();
            // Financing mode (pay in full vs. installments) — not payment method,
            // which is handled separately via account selection/split payment.
            $table->string('financing_type')->default('one_time');
            $table->unsignedInteger('installment_count')->nullable();
            // EMI terms: how interest is charged, the rate, how long and how often. The interest is added to the total at confirm.
            $table->string('emi_interest_method')->nullable();
            $table->decimal('emi_annual_rate', 7, 4)->default(0);
            $table->string('emi_frequency')->nullable();
            $table->unsignedSmallInteger('emi_tenure_value')->nullable();
            $table->string('emi_tenure_unit')->nullable();
            // Collect the installation charge together with the down payment (it is never financed either way).
            $table->boolean('emi_installation_upfront')->default(false);
            $table->decimal('emi_interest_total', 19, 4)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('customer_id');
            $table->index(['sale_date', 'status']);
            $table->index('payment_status');
            $table->index('delivery_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
