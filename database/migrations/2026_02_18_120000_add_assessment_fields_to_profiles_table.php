<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAssessmentFieldsToProfilesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('profiles', 'assessment_part1_selected')) {
                $table->json('assessment_part1_selected')->nullable();
            }

            if (!Schema::hasColumn('profiles', 'assessment_part2_answers')) {
                $table->json('assessment_part2_answers')->nullable();
            }

            if (!Schema::hasColumn('profiles', 'recommended_top3')) {
                $table->json('recommended_top3')->nullable();
            }

            if (!Schema::hasColumn('profiles', 'recommended_degrees')) {
                $table->json('recommended_degrees')->nullable();
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
            if (Schema::hasColumn('profiles', 'assessment_part1_selected')) {
                $table->dropColumn('assessment_part1_selected');
            }

            if (Schema::hasColumn('profiles', 'assessment_part2_answers')) {
                $table->dropColumn('assessment_part2_answers');
            }

            if (Schema::hasColumn('profiles', 'recommended_top3')) {
                $table->dropColumn('recommended_top3');
            }

            if (Schema::hasColumn('profiles', 'recommended_degrees')) {
                $table->dropColumn('recommended_degrees');
            }
        });
    }
}
