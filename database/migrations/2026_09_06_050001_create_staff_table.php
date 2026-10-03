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
        Schema::create('staff', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->string('designation')->nullable();
            $table->date('joining_date')->nullable();
            $table->decimal('salary_amount', 19, 4)->default(0);
            $table->string('status')->default('active');
            // Nullable — a staff member is only an investor if this is set,
            // reusing the Investor module (Phase 10) as-is (no new structure).
            $table->foreignId('investor_id')->nullable()->constrained('investors')->nullOnDelete();
            // Nullable — a Technician may never need to log in.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('balance', 19, 4)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff');
    }
};
