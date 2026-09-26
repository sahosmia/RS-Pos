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
        Schema::create('company_loans', function (Blueprint $table) {
            $table->id();
            $table->string('lender_name');
            $table->decimal('loan_amount', 19, 4);
            $table->decimal('interest_rate', 5, 2)->nullable();
            $table->decimal('outstanding_balance', 19, 4)->default(0);
            $table->date('start_date');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_loans');
    }
};
