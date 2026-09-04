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
        Schema::create('settings', function (Blueprint $table) {
            $table->id();

            $table->string('shop_name');
            $table->string('shop_logo')->nullable();
            $table->string('shop_address')->nullable();
            $table->string('shop_phone')->nullable();
            $table->string('currency_symbol')->default('৳');

            $table->string('invoice_prefix')->default('INV-');
            $table->unsignedInteger('invoice_next_number')->default(1);
            $table->string('purchase_prefix')->default('PUR-');
            $table->unsignedInteger('purchase_next_number')->default(1);

            $table->boolean('thermal_printer_enabled')->default(false);
            $table->boolean('emi_module_enabled')->default(false);
            $table->boolean('serial_number_module_enabled')->default(false);
            $table->unsignedTinyInteger('fiscal_year_start_month')->default(7);

            $table->text('license_key')->nullable();
            $table->string('license_status')->nullable();
            $table->timestamp('license_last_verified_at')->nullable();

            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
