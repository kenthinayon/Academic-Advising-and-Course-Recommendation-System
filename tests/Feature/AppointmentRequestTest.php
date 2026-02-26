<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_request_appointment(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
        ]);

        $payload = [
            'session_type' => 'Initial Consultation',
            'preferred_at' => now()->addDays(1)->setTime(10, 0, 0)->toISOString(),
            'notes' => 'Need help selecting courses',
        ];

        $res = $this->actingAs($student, 'sanctum')
            ->postJson('/api/appointments', $payload);

        $res->assertOk();
        $res->assertJsonPath('appointment.status', 'requested');
        $this->assertDatabaseHas('appointments', [
            'student_id' => $student->id,
            'status' => 'requested',
            'session_type' => 'Initial Consultation',
        ]);
    }
}
