<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAcademicAttachmentsToProfilesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('profiles', 'subject_grades')) {
                // [{ subject: "Mathematics", grade: 85 }, ...]
                $table->json('subject_grades')->nullable()->after('shs_general_average');
            }

            if (!Schema::hasColumn('profiles', 'report_card_path')) {
                // stored as a relative path in storage/app/public
                $table->string('report_card_path')->nullable()->after('subject_grades');
            }

            if (!Schema::hasColumn('profiles', 'skill_attachments')) {
                // array of relative paths in storage/app/public
                $table->json('skill_attachments')->nullable()->after('skills');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('profiles', function (Blueprint $table) {
            if (Schema::hasColumn('profiles', 'skill_attachments')) {
                $table->dropColumn('skill_attachments');
            }
            if (Schema::hasColumn('profiles', 'report_card_path')) {
                $table->dropColumn('report_card_path');
            }
            if (Schema::hasColumn('profiles', 'subject_grades')) {
                $table->dropColumn('subject_grades');
            }
        });
    }
}
