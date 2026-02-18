<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            // Advisor-controlled recommendation + review metadata
            $table->json('advisor_recommended_degrees')->nullable()->after('recommended_degrees');
            $table->string('advisor_status', 32)->nullable()->after('advisor_recommended_degrees'); // pending|approved|rejected
            $table->text('advisor_comment')->nullable()->after('advisor_status');
            $table->timestamp('advisor_reviewed_at')->nullable()->after('advisor_comment');
            $table->unsignedBigInteger('advisor_reviewed_by')->nullable()->after('advisor_reviewed_at');

            $table->index('advisor_status');
            $table->foreign('advisor_reviewed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropForeign(['advisor_reviewed_by']);
            $table->dropIndex(['advisor_status']);

            $table->dropColumn([
                'advisor_recommended_degrees',
                'advisor_status',
                'advisor_comment',
                'advisor_reviewed_at',
                'advisor_reviewed_by',
            ]);
        });
    }
};
