<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (!Schema::hasColumn('appointments', 'preferred_at')) {
                $table->dateTime('preferred_at')->nullable()->after('session_type');
            }
            if (!Schema::hasColumn('appointments', 'location')) {
                $table->string('location', 128)->nullable()->after('scheduled_at');
            }
            if (!Schema::hasColumn('appointments', 'advisor_comment')) {
                $table->text('advisor_comment')->nullable()->after('notes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'advisor_comment')) {
                $table->dropColumn('advisor_comment');
            }
            if (Schema::hasColumn('appointments', 'location')) {
                $table->dropColumn('location');
            }
            if (Schema::hasColumn('appointments', 'preferred_at')) {
                $table->dropColumn('preferred_at');
            }
        });
    }
};
