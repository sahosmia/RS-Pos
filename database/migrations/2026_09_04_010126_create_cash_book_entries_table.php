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
        Schema::create('cash_book_entries', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->foreignId('category_id')->nullable()->constrained('misc_transaction_categories')->restrictOnDelete();
            $table->decimal('amount', 15, 2);
            $table->text('note')->nullable();
            $table->date('entry_date');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('entry_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_book_entries');
    }
};
