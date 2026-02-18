<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

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

        return response()->json([
            'totalStudents' => $totalStudents,
            'pending' => $pending,
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

        return response()->json([
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
            ],
            'profile' => $p,
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
            'advisor_status' => ['required', 'in:pending,approved,rejected'],
            'advisor_comment' => ['nullable', 'string', 'max:5000'],
            'advisor_recommended_degrees' => ['nullable', 'array'],
            'advisor_recommended_degrees.*.code' => ['required_with:advisor_recommended_degrees', 'string', 'max:32'],
            'advisor_recommended_degrees.*.name' => ['required_with:advisor_recommended_degrees', 'string', 'max:255'],
            'advisor_recommended_degrees.*.track' => ['nullable', 'string', 'max:64'],
        ]);

        $student = User::where('role', 'student')->with('profile')->findOrFail($userId);
        $profile = $student->profile ?: Profile::create(['user_id' => $student->id]);

        $profile->advisor_status = $validated['advisor_status'];
        $profile->advisor_comment = $validated['advisor_comment'] ?? null;
        $profile->advisor_recommended_degrees = $validated['advisor_recommended_degrees'] ?? [];
        $profile->advisor_reviewed_at = now();
        $profile->advisor_reviewed_by = $advisor?->id;
        $profile->save();

        return response()->json([
            'message' => 'Advisor review saved.',
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

        // Typical quiz scoring ends up around ~0-10; map that roughly into 0-100.
        $pct = max(0, min(100, ((float) $top) / 10.0 * 100.0));
        return round($pct, 1);
    }
}
