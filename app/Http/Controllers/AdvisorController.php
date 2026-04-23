<?php

namespace App\Http\Controllers;

use App\Http\Controllers\AssessmentController;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Mail;

class AdvisorController extends Controller
{
    /**
     * Dashboard counters.
     */
    public function stats(Request $request)
    {
        $totalStudents = User::where('role', 'student')->count();

        // Treat anything not explicitly approved as pending review.
        $pending = Profile::whereHas('user', fn ($q) => $q->where('role', 'student'))
            ->where(function ($q) {
                $q->whereNull('advisor_status')->orWhere('advisor_status', 'pending');
            })
            ->count();

        $approved = Profile::whereHas('user', fn ($q) => $q->where('role', 'student'))
            ->where('advisor_status', 'approved')
            ->count();

        $interview = Profile::whereHas('user', fn ($q) => $q->where('role', 'student'))
            ->where('advisor_status', 'interview')
            ->count();

        return response()->json([
            'totalStudents' => $totalStudents,
            'pending' => $pending,
            'interview' => $interview,
            'approved' => $approved,
        ]);
    }

    /**
     * List students for advisor dashboard.
     */
    public function students(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        $query = User::query()
            ->where('role', 'student')
            ->with('profile');

        if ($q !== '') {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        $students = $query
            ->orderBy('name')
            ->limit(200)
            ->get();

        $items = $students->map(function (User $u) {
            $p = $u->profile;
            $gwa = $p?->shs_general_average;

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'gwa' => $gwa,
                'strand'=> $p?->shs_strand,
                'advisor_status' => $p?->advisor_status ?? 'pending',
                'recommended_degrees' => $p?->recommended_degrees ?? [],
                'advisor_recommended_degrees' => $p?->advisor_recommended_degrees ?? [],
                'assessment_score_preview' => $this->assessmentScorePreview($p),
            ];
        })->values();

        return response()->json(['students' => $items]);
    }

    /**
     * View one student's credentials and assessment details.
     */
    public function studentDetail(Request $request, int $userId)
    {
        $student = User::where('role', 'student')->with('profile')->findOrFail($userId);
        $p = $student->profile;

        $part2 = [];
        if ($p && is_array($p->assessment_part2_answers)) {
            $part2 = $p->assessment_part2_answers;
        }

        return response()->json([
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
            ],
            'profile' => $p,
            'assessment' => $p ? [
                'breakdown' => AssessmentController::buildBreakdown($part2),
            ] : null,
            'attachments' => [
                'report_card_url' => $p?->report_card_path ? asset('storage/' . ltrim($p->report_card_path, '/')) : null,
                'skill_attachment_urls' => is_array($p?->skill_attachments)
                    ? array_values(array_map(fn ($path) => asset('storage/' . ltrim((string) $path, '/')), $p->skill_attachments))
                    : [],
            ],
        ]);
    }

    /**
     * Advisor edits recommendation + status + comment.
     */
    public function updateRecommendation(Request $request, int $userId)
    {
        $advisor = $request->user();

        $validated = $request->validate([
            'advisor_status' => ['required', 'in:pending,approved,rejected,interview'],
            'advisor_comment' => ['nullable', 'string', 'max:5000'],
            'advisor_recommended_degrees' => ['nullable', 'array'],
            'advisor_recommended_degrees.*.code' => ['required_with:advisor_recommended_degrees', 'string', 'max:32'],
            'advisor_recommended_degrees.*.name' => ['required_with:advisor_recommended_degrees', 'string', 'max:255'],
            'advisor_recommended_degrees.*.track' => ['nullable', 'string', 'max:64'],

            // Interview schedule (required when advisor_status=interview)
            'advisor_interview_date' => ['required_if:advisor_status,interview', 'date'],
            'advisor_interview_time' => ['required_if:advisor_status,interview', 'date_format:H:i'],
            'advisor_interview_venue' => ['required_if:advisor_status,interview', 'string', 'max:255'],
        ]);

        $student = User::where('role', 'student')->with('profile')->findOrFail($userId);
        $profile = $student->profile ?: Profile::create(['user_id' => $student->id]);

        $status = $validated['advisor_status'];

        $profile->advisor_status = $status;
        $profile->advisor_comment = $validated['advisor_comment'] ?? null;
        $profile->advisor_recommended_degrees = $validated['advisor_recommended_degrees'] ?? [];
        $profile->advisor_reviewed_at = now();
        $profile->advisor_reviewed_by = $advisor?->id;

        $scheduledInterview = false;
        if ($status === 'interview') {
            $profile->advisor_interview_date = $validated['advisor_interview_date'];
            $profile->advisor_interview_time = $validated['advisor_interview_time'];
            $profile->advisor_interview_venue = $validated['advisor_interview_venue'];
            $profile->advisor_interview_scheduled_at = now();
            $profile->advisor_interview_scheduled_by = $advisor?->id;
            $scheduledInterview = true;
        } else {
            // Keep data consistent when status changes away from interview
            $profile->advisor_interview_date = null;
            $profile->advisor_interview_time = null;
            $profile->advisor_interview_venue = null;
            $profile->advisor_interview_scheduled_at = null;
            $profile->advisor_interview_scheduled_by = null;
        }

        $profile->save();

        // Best-effort notification when interview is scheduled.
        if ($scheduledInterview && !empty($student->email)) {
            try {
                $date = (string) ($profile->advisor_interview_date ?? '');
                $time = (string) ($profile->advisor_interview_time ?? '');
                $venue = (string) ($profile->advisor_interview_venue ?? '');

                Mail::raw(
                    "Your advisor scheduled an interview.\n\nDate: {$date}\nTime: {$time}\nVenue: {$venue}\n\nPlease be on time.",
                    function ($m) use ($student) {
                        $m->to($student->email)->subject('Interview Scheduled');
                    }
                );
            } catch (\Throwable $e) {
                // ignore mail errors
            }
        }

        return response()->json([
            'message' => $scheduledInterview ? 'Interview scheduled.' : 'Advisor review saved.',
            'profile' => $profile,
        ]);
    }

    private function assessmentScorePreview(?Profile $p): ?float
    {
        // We don't store a final numeric assessment score; show a lightweight proxy for the dashboard.
        // If recommended_top3 exists, treat top score as a quick % by clamping to a sane range.
        $top3 = $p?->recommended_top3;
        if (!is_array($top3) || !count($top3)) {
            return null;
        }

        $top = $top3[0]['score'] ?? null;
        if (!is_numeric($top)) {
            return null;
        }

        // With the current quiz design:
        // - Part I contributes up to ~2 points per category
        // - Part II contributes up to 10 points per category (5 course questions × 2 points)
        // - Readiness questions contribute up to +5 points per category (5 questions × +1 to all)
        // Academic boosts can push slightly above that, so clamp.
        $max = 17.0;
        $pct = max(0, min(100, ((float) $top) / $max * 100.0));
        return round($pct, 1);
    }
}
