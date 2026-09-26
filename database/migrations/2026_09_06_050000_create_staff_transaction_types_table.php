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
        Schema::create('staff_transaction_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('effect_on_balance');
            // Which GL shape this type posts — since types are an
            // admin-manageable lookup (not a fixed PHP enum), the journal
            // can't switch on the type's name; every type (default or
            // custom) must declare one of these four instead.
            $table->string('nature');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_transaction_types');
    }
};
