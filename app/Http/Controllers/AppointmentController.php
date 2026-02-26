<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

class AppointmentController extends Controller
{
    /**
     * Student appointments list.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'scope' => ['nullable', 'in:upcoming,past,all'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $scope = $validated['scope'] ?? 'upcoming';
        $limit = $validated['limit'] ?? null;

        $q = Appointment::query()
            ->where('student_id', $user->id)
            ->with(['advisor:id,name,email,role']);

        $now = Carbon::now();
        if ($scope === 'upcoming') {
            // Requested (no scheduled_at yet) should appear first, then scheduled by date.
            $q->orderByRaw("CASE WHEN scheduled_at IS NULL THEN 0 ELSE 1 END ASC")
                ->orderBy('scheduled_at', 'asc')
                ->orderBy('created_at', 'desc');
        } elseif ($scope === 'past') {
            $q->whereNotNull('scheduled_at')
                ->where('scheduled_at', '<', $now)
                ->orderBy('scheduled_at', 'desc');
        } else {
            $q->orderBy('created_at', 'desc');
        }

        if ($limit) {
            $q->limit($limit);
        }

        return response()->json([
            'appointments' => $q->get(),
        ]);
    }

    /**
     * Student creates an appointment REQUEST.
     * Only session_type + notes.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'session_type' => ['required', 'string', 'max:64'],
            'preferred_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $preferredAt = null;
        if (!empty($validated['preferred_at'])) {
            $preferredAt = Carbon::parse($validated['preferred_at']);
        }

        $appt = Appointment::create([
            'student_id' => $user->id,
            'advisor_id' => null,
            'session_type' => $validated['session_type'],
            'preferred_at' => $preferredAt,
            'scheduled_at' => null,
            'status' => 'requested',
            'notes' => $validated['notes'] ?? null,
        ]);

        // Notify all advisors (simple broadcast). Email is best-effort.
        try {
            $advisors = User::query()
                ->whereIn('role', ['advisor', 'admin'])
                ->whereNotNull('email')
                ->get(['email']);

            $to = $advisors->pluck('email')->filter()->values()->all();
            if (count($to)) {
                Mail::raw(
                    "New appointment request\n\nStudent: {$user->name} ({$user->email})\nSession Type: {$appt->session_type}\nNotes: " . ($appt->notes ?: "(none)"),
                    function ($m) use ($to) {
                        $m->to($to)->subject('New Appointment Request');
                    }
                );
            }
        } catch (\Throwable $e) {
            // ignore mail errors
        }

        return response()->json([
            'message' => 'Appointment request sent. Awaiting advisor confirmation.',
            'appointment' => $appt->load(['advisor:id,name,email,role']),
        ]);
    }

    /**
     * Advisor: list requests and appointments.
     */
    public function advisorIndex(Request $request)
    {
        $user = $request->user();
        if (!in_array(($user->role ?? 'student'), ['advisor', 'admin'], true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'status' => ['nullable', 'in:requested,scheduled,completed,cancelled,rejected,all'],
        ]);
        $status = $validated['status'] ?? 'requested';

        $q = Appointment::query()->with([
            'student:id,name,email,role',
            'advisor:id,name,email,role',
        ]);

        if ($status !== 'all') {
            $q->where('status', $status);
        }

        $q->orderByRaw("CASE WHEN status = 'requested' THEN 0 ELSE 1 END ASC")
            ->orderByRaw("CASE WHEN scheduled_at IS NULL THEN 0 ELSE 1 END ASC")
            ->orderBy('scheduled_at', 'asc')
            ->orderBy('created_at', 'desc');

        return response()->json([
            'appointments' => $q->limit(300)->get(),
        ]);
    }

    /**
     * Advisor approves an appointment request and sets the schedule.
     */
    public function advisorApprove(Request $request, int $appointmentId)
    {
        $advisor = $request->user();
        if (!in_array(($advisor->role ?? 'student'), ['advisor', 'admin'], true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'scheduled_at' => ['required', 'date'],
            'location' => ['nullable', 'string', 'max:128'],
            'advisor_comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $scheduledAt = Carbon::parse($validated['scheduled_at']);
        if ($scheduledAt->isPast()) {
            return response()->json(['message' => 'Scheduled time must be in the future.'], 422);
        }

        $appt = Appointment::with(['student:id,name,email'])->findOrFail($appointmentId);
        if ($appt->status !== 'requested') {
            return response()->json(['message' => 'Only requested appointments can be approved.'], 422);
        }

        $appt->advisor_id = $advisor->id;
        $appt->scheduled_at = $scheduledAt;
    $appt->location = $validated['location'] ?? $appt->location;
    $appt->advisor_comment = $validated['advisor_comment'] ?? $appt->advisor_comment;
        $appt->status = 'scheduled';
        $appt->save();

        // Notify student by email (best-effort)
        try {
            $studentEmail = $appt->student?->email;
            if ($studentEmail) {
                $when = $scheduledAt->toDayDateTimeString();
                $where = $appt->location ? "\nLocation: {$appt->location}" : "";
                $comment = $appt->advisor_comment ? "\nAdvisor note: {$appt->advisor_comment}" : "";
                Mail::raw(
                    "Your advising appointment has been confirmed.\n\nSession Type: {$appt->session_type}\nScheduled: {$when}{$where}\nAdvisor: {$advisor->name}{$comment}",
                    function ($m) use ($studentEmail) {
                        $m->to($studentEmail)->subject('Appointment Confirmed');
                    }
                );
            }
        } catch (\Throwable $e) {
            // ignore mail errors
        }

        return response()->json([
            'message' => 'Appointment approved and scheduled.',
            'appointment' => $appt->load(['student:id,name,email,role', 'advisor:id,name,email,role']),
        ]);
    }

    /**
     * Advisor cancels a scheduled appointment.
     */
    public function advisorCancel(Request $request, int $appointmentId)
    {
        $advisor = $request->user();
        if (!in_array(($advisor->role ?? 'student'), ['advisor', 'admin'], true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'advisor_comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $appt = Appointment::with(['student:id,name,email'])->findOrFail($appointmentId);
        if (!in_array($appt->status, ['scheduled'], true)) {
            return response()->json(['message' => 'Only scheduled appointments can be cancelled.'], 422);
        }

        // Only the assigned advisor (or admin) can change the appointment.
        if ($advisor->role !== 'admin' && $appt->advisor_id && (int) $appt->advisor_id !== (int) $advisor->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $appt->status = 'cancelled';
        if (array_key_exists('advisor_comment', $validated)) {
            $appt->advisor_comment = $validated['advisor_comment'] ?? $appt->advisor_comment;
        }
        $appt->save();

        // Best-effort email to student
        try {
            $studentEmail = $appt->student?->email;
            if ($studentEmail) {
                Mail::raw(
                    "Your advising appointment has been cancelled.\n\nSession Type: {$appt->session_type}\nAdvisor: {$advisor->name}" . ($appt->advisor_comment ? "\nReason: {$appt->advisor_comment}" : ""),
                    function ($m) use ($studentEmail) {
                        $m->to($studentEmail)->subject('Appointment Cancelled');
                    }
                );
            }
        } catch (\Throwable $e) {
            // ignore mail errors
        }

        return response()->json([
            'message' => 'Appointment cancelled.',
            'appointment' => $appt->load(['student:id,name,email,role', 'advisor:id,name,email,role']),
        ]);
    }

    /**
     * Advisor marks a scheduled appointment as completed.
     */
    public function advisorComplete(Request $request, int $appointmentId)
    {
        $advisor = $request->user();
        if (!in_array(($advisor->role ?? 'student'), ['advisor', 'admin'], true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'advisor_comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $appt = Appointment::with(['student:id,name,email'])->findOrFail($appointmentId);
        if (!in_array($appt->status, ['scheduled'], true)) {
            return response()->json(['message' => 'Only scheduled appointments can be completed.'], 422);
        }

        if ($advisor->role !== 'admin' && $appt->advisor_id && (int) $appt->advisor_id !== (int) $advisor->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $appt->status = 'completed';
        if (array_key_exists('advisor_comment', $validated)) {
            $appt->advisor_comment = $validated['advisor_comment'] ?? $appt->advisor_comment;
        }
        $appt->save();

        return response()->json([
            'message' => 'Appointment marked as completed.',
            'appointment' => $appt->load(['student:id,name,email,role', 'advisor:id,name,email,role']),
        ]);
    }

    /**
     * Advisor rejects a requested appointment.
     */
    public function advisorReject(Request $request, int $appointmentId)
    {
        $advisor = $request->user();
        if (!in_array(($advisor->role ?? 'student'), ['advisor', 'admin'], true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'advisor_comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $appt = Appointment::with(['student:id,name,email'])->findOrFail($appointmentId);
        if ($appt->status !== 'requested') {
            return response()->json(['message' => 'Only requested appointments can be rejected.'], 422);
        }

        // Assign advisor so the student can see who rejected.
        $appt->advisor_id = $advisor->id;
        $appt->status = 'rejected';
        if (array_key_exists('advisor_comment', $validated)) {
            $appt->advisor_comment = $validated['advisor_comment'] ?? $appt->advisor_comment;
        }
        $appt->save();

        // Best-effort email to student
        try {
            $studentEmail = $appt->student?->email;
            if ($studentEmail) {
                Mail::raw(
                    "Your advising appointment request was rejected.\n\nSession Type: {$appt->session_type}\nAdvisor: {$advisor->name}" . ($appt->advisor_comment ? "\nNote: {$appt->advisor_comment}" : ""),
                    function ($m) use ($studentEmail) {
                        $m->to($studentEmail)->subject('Appointment Rejected');
                    }
                );
            }
        } catch (\Throwable $e) {
            // ignore mail errors
        }

        return response()->json([
            'message' => 'Appointment rejected.',
            'appointment' => $appt->load(['student:id,name,email,role', 'advisor:id,name,email,role']),
        ]);
    }

    /**
     * Student notifications for bell.
     * Returns recent scheduled appointments (and recent requests) with full info.
     */
    public function studentNotifications(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:30'],
        ]);

        $limit = $validated['limit'] ?? 10;

        $items = Appointment::query()
            ->where('student_id', $user->id)
            ->whereIn('status', ['scheduled', 'requested', 'completed', 'cancelled', 'rejected'])
            ->with(['advisor:id,name,email,role'])
            ->orderByRaw("CASE WHEN status = 'scheduled' THEN 0 WHEN status = 'cancelled' THEN 1 WHEN status = 'rejected' THEN 2 WHEN status = 'completed' THEN 3 ELSE 4 END ASC")
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->get();

        return response()->json([
            'notifications' => $items,
        ]);
    }
}
