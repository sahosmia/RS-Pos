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
            $table->foreignId('contact_id')->nullable()->constrained('contacts')->restrictOnDelete();
            $table->decimal('total_amount', 19, 4);
            $table->decimal('paid_amount', 19, 4)->default(0);
            $table->decimal('due_amount', 19, 4)->default(0);
            $table->string('payment_status')->default('due');
            $table->date('expense_date');
            $table->date('due_date')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('expense_category_id');
            $table->index('contact_id');
            $table->index(['expense_date', 'payment_status']);
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
