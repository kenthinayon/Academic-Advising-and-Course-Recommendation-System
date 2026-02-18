<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateProfilesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->unique();

            $table->unsignedTinyInteger('age')->nullable();
            $table->string('gender', 32)->nullable();
            $table->string('high_school')->nullable();
            $table->string('contact_number', 32)->nullable();

            // Step 2 - Academic Credentials
            $table->string('shs_strand', 64)->nullable();
            $table->decimal('shs_general_average', 5, 2)->nullable();

            // Step 2 - Skills & Competencies
            $table->json('skills')->nullable();

            // Step 2 - Career Interests
            $table->text('career_goals')->nullable();
            // Ratings 1-5 keyed by program name
            $table->json('program_interest_ratings')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('profiles');
    }
}
