<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            // Advisor interview schedule (when advisor_status = interview)
            $table->date('advisor_interview_date')->nullable()->after('advisor_reviewed_by');
            $table->time('advisor_interview_time')->nullable()->after('advisor_interview_date');
            $table->string('advisor_interview_venue', 255)->nullable()->after('advisor_interview_time');

            $table->timestamp('advisor_interview_scheduled_at')->nullable()->after('advisor_interview_venue');
            $table->unsignedBigInteger('advisor_interview_scheduled_by')->nullable()->after('advisor_interview_scheduled_at');

            $table->index('advisor_interview_date');
            $table->foreign('advisor_interview_scheduled_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropForeign(['advisor_interview_scheduled_by']);
            $table->dropIndex(['advisor_interview_date']);

            $table->dropColumn([
                'advisor_interview_date',
                'advisor_interview_time',
                'advisor_interview_venue',
                'advisor_interview_scheduled_at',
                'advisor_interview_scheduled_by',
            ]);
        });
    }
};
