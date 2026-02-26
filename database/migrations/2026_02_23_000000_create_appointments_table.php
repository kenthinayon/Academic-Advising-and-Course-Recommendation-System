<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('advisor_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('session_type', 64)->default('Initial Consultation');
            $table->dateTime('scheduled_at')->nullable();
            $table->string('status', 24)->default('requested'); // requested|scheduled|completed|cancelled|rejected
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['student_id', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
