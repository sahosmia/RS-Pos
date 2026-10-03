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
        Schema::create('other_liability_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('other_liability_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->decimal('amount', 19, 4);
            $table->foreignId('account_id')->nullable()->constrained('accounts')->restrictOnDelete();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('other_liability_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('other_liability_transactions');
    }
};
