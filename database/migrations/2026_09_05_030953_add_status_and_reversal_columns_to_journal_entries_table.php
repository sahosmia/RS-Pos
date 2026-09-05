<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * V2 (Phase 35 §4): a journal entry is never edited or deleted — a mistake
 * is corrected by JournalService::reverse(), which posts a mirrored entry
 * and marks the original `reversed`.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->string('status')->default('posted')->after('reference_id');
            $table->timestamp('reversed_at')->nullable()->after('created_by');
            $table->foreignId('reversed_by')->nullable()->after('reversed_at')->constrained('users')->nullOnDelete();
            $table->foreignId('reversal_of_id')->nullable()->after('reversed_by')->constrained('journal_entries')->nullOnDelete();

            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reversal_of_id');
            $table->dropConstrainedForeignId('reversed_by');
            $table->dropColumn(['status', 'reversed_at']);
        });
    }
};
