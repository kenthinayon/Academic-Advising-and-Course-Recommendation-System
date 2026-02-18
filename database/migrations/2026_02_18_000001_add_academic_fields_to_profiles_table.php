<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAcademicFieldsToProfilesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('profiles', 'shs_strand')) {
                $table->string('shs_strand', 64)->nullable()->after('contact_number');
            }

            if (!Schema::hasColumn('profiles', 'shs_general_average')) {
                $table->decimal('shs_general_average', 5, 2)->nullable()->after('shs_strand');
            }

            if (!Schema::hasColumn('profiles', 'skills')) {
                $table->json('skills')->nullable()->after('shs_general_average');
            }

            if (!Schema::hasColumn('profiles', 'career_goals')) {
                $table->text('career_goals')->nullable()->after('skills');
            }

            if (!Schema::hasColumn('profiles', 'program_interest_ratings')) {
                $table->json('program_interest_ratings')->nullable()->after('career_goals');
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
            if (Schema::hasColumn('profiles', 'program_interest_ratings')) {
                $table->dropColumn('program_interest_ratings');
            }
            if (Schema::hasColumn('profiles', 'career_goals')) {
                $table->dropColumn('career_goals');
            }
            if (Schema::hasColumn('profiles', 'skills')) {
                $table->dropColumn('skills');
            }
            if (Schema::hasColumn('profiles', 'shs_general_average')) {
                $table->dropColumn('shs_general_average');
            }
            if (Schema::hasColumn('profiles', 'shs_strand')) {
                $table->dropColumn('shs_strand');
            }
        });
    }
}
