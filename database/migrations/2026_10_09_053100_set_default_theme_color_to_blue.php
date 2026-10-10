<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A new shop starts on the blue palette instead of "neutral" (the plain grayscale fallback). A shop that never changed
 * its colour is still on the old default, so it moves to blue too; a colour somebody chose on purpose is left alone, and
 * so is every person's own override.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->string('theme_color')->default('blue')->change();
        });

        DB::table('settings')->where('theme_color', 'neutral')->update(['theme_color' => 'blue']);
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->string('theme_color')->default('neutral')->change();
        });
    }
};
