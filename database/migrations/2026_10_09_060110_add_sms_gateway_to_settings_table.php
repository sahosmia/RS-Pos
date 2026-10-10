<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bulk SMS is set up from Business Settings instead of in code, so changing the SMS company never needs a developer:
 * the address of its HTTP API, how it wants the key / sender / number / message named, and what a good answer looks like.
 * The API key is stored encrypted (like the licence key).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->boolean('sms_enabled')->default(false);
            $table->string('sms_gateway_url', 500)->nullable();
            $table->string('sms_http_method', 8)->default('GET');
            $table->text('sms_api_key')->nullable();
            $table->string('sms_auth_mode', 16)->default('param');
            $table->string('sms_sender_id')->nullable();
            $table->string('sms_api_key_param', 64)->default('api_key');
            $table->string('sms_sender_param', 64)->default('senderid');
            $table->string('sms_phone_param', 64)->default('number');
            $table->string('sms_message_param', 64)->default('message');
            $table->text('sms_extra_params')->nullable();
            $table->string('sms_phone_format', 16)->default('international');
            $table->string('sms_success_text')->nullable();
        });

        // Why a message did not go out (no number, the SMS company refused it, ...), kept beside the message.
        Schema::table('message_logs', function (Blueprint $table) {
            $table->string('error')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('message_logs', function (Blueprint $table) {
            $table->dropColumn('error');
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn([
                'sms_enabled', 'sms_gateway_url', 'sms_http_method', 'sms_api_key', 'sms_auth_mode', 'sms_sender_id',
                'sms_api_key_param', 'sms_sender_param', 'sms_phone_param', 'sms_message_param', 'sms_extra_params',
                'sms_phone_format', 'sms_success_text',
            ]);
        });
    }
};
