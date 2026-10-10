<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A Sales Order carries everything a Sale will: invoice and per-line discount, installation, warranty / service plan,
 * the planned serial numbers and the EMI terms. Converting the order then builds the Sale from these, nothing is typed twice.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->decimal('subtotal', 19, 4)->default(0)->after('status');
            $table->string('discount_type')->nullable()->after('subtotal');
            $table->decimal('discount_value', 19, 4)->default(0)->after('discount_type');
            $table->decimal('discount_amount', 19, 4)->default(0)->after('discount_value');
            $table->decimal('installation_amount', 19, 4)->default(0)->after('discount_amount');
            $table->string('financing_type')->default('one_time')->after('installation_amount');
            $table->unsignedInteger('installment_count')->nullable()->after('financing_type');
            $table->string('emi_interest_method')->nullable()->after('installment_count');
            $table->decimal('emi_annual_rate', 7, 4)->default(0)->after('emi_interest_method');
            $table->string('emi_frequency')->nullable()->after('emi_annual_rate');
            $table->unsignedSmallInteger('emi_tenure_value')->nullable()->after('emi_frequency');
            $table->string('emi_tenure_unit')->nullable()->after('emi_tenure_value');
            $table->boolean('emi_installation_upfront')->default(false)->after('emi_tenure_unit');
        });

        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->decimal('original_price', 19, 4)->nullable()->after('quantity');
            $table->string('discount_type')->nullable()->after('unit_price');
            $table->decimal('discount_value', 19, 4)->default(0)->after('discount_type');
            $table->decimal('discount_amount', 19, 4)->default(0)->after('discount_value');
            $table->boolean('installation_required')->default(false)->after('subtotal');
            $table->decimal('installation_charge', 19, 4)->nullable()->after('installation_required');
            $table->boolean('emi_financed')->default(true)->after('installation_charge');
            $table->unsignedInteger('warranty_months')->nullable()->after('emi_financed');
            $table->boolean('service_plan_included')->default(true)->after('warranty_months');
            $table->string('note')->nullable()->after('service_plan_included');
            $table->json('serial_numbers')->nullable()->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->dropColumn(['original_price', 'discount_type', 'discount_value', 'discount_amount', 'installation_required', 'installation_charge', 'emi_financed', 'warranty_months', 'service_plan_included', 'note', 'serial_numbers']);
        });

        Schema::table('sales_orders', function (Blueprint $table) {
            $table->dropColumn(['subtotal', 'discount_type', 'discount_value', 'discount_amount', 'installation_amount', 'financing_type', 'installment_count', 'emi_interest_method', 'emi_annual_rate', 'emi_frequency', 'emi_tenure_value', 'emi_tenure_unit', 'emi_installation_upfront']);
        });
    }
};
