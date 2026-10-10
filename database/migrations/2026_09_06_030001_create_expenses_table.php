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
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_category_id')->constrained()->restrictOnDelete();
            // The account the expense was paid from — an expense is always paid in full, on the spot.
            $table->foreignId('account_id')->nullable()->constrained('accounts')->restrictOnDelete();
            $table->decimal('total_amount', 19, 4);
            $table->date('expense_date');
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            // Never hard-deleted: a removed record keeps its row (its money and journal are reversed first).
            $table->softDeletes();

            $table->index('expense_category_id');
            $table->index('account_id');
            $table->index('expense_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
