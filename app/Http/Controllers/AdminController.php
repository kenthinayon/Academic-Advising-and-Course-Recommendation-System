<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Admin dashboard metrics.
     */
    public function stats(Request $request)
    {
        $totalStudents = User::where('role', 'student')->count();

        // "Completed" means recommendation exists (student-generated degree list or legacy top3).
        $completedAssessments = Profile::whereHas('user', fn ($q) => $q->where('role', 'student'))
            ->where(function ($q) {
                $q->whereNotNull('recommended_degrees')
                    ->orWhereNotNull('recommended_top3');
            })
            ->count();

        // Pending review = not approved yet, but has a recommendation to review.
        $pendingReview = Profile::whereHas('user', fn ($q) => $q->where('role', 'student'))
            ->where(function ($q) {
                $q->whereNotNull('recommended_degrees')
                    ->orWhereNotNull('recommended_top3');
            })
            ->where(function ($q) {
                $q->whereNull('advisor_status')->orWhere('advisor_status', 'pending');
            })
            ->count();

        // Average GPA based on SHS general average.
        $avgGpa = Profile::whereHas('user', fn ($q) => $q->where('role', 'student'))
            ->whereNotNull('shs_general_average')
            ->avg('shs_general_average');

        return response()->json([
            'totalStudents' => $totalStudents,
            'completedAssessments' => $completedAssessments,
            'pendingReview' => $pendingReview,
            'averageGpa' => $avgGpa ? round((float) $avgGpa, 2) : 0.0,
        ]);
    }

    /**
     * Analytics summary.
     */
    public function analytics(Request $request)
    {
        $totalStudents = User::where('role', 'student')->count();

        $completed = Profile::whereHas('user', fn ($q) => $q->where('role', 'student'))
            ->where(function ($q) {
                $q->whereNotNull('recommended_degrees')
                    ->orWhereNotNull('recommended_top3');
            })
            ->count();

        $approved = Profile::whereHas('user', fn ($q) => $q->where('role', 'student'))
            ->where('advisor_status', 'approved')
            ->count();

        $completionRate = $totalStudents > 0 ? round(($completed / $totalStudents) * 100, 1) : 0.0;
        $approvalRate = $completed > 0 ? round(($approved / $completed) * 100, 1) : 0.0;

        $pendingReviews = Profile::whereHas('user', fn ($q) => $q->where('role', 'student'))
            ->where(function ($q) {
                $q->whereNotNull('recommended_degrees')
                    ->orWhereNotNull('recommended_top3');
            })
            ->where(function ($q) {
                $q->whereNull('advisor_status')->orWhere('advisor_status', 'pending');
            })
            ->count();

        // "Top Recommended Programs" (category) counts from student's computed recommendations.
        // We store degree recommendations with a `track` field which corresponds to the category.
        $tracks = [];
        $profiles = Profile::whereHas('user', fn ($q) => $q->where('role', 'student'))
            ->whereNotNull('recommended_degrees')
            ->limit(500)
            ->get();

        foreach ($profiles as $p) {
            $degrees = is_array($p->recommended_degrees) ? $p->recommended_degrees : [];
            foreach ($degrees as $d) {
                $track = is_array($d) ? ($d['track'] ?? ($d['category'] ?? null)) : null;
                $track = $track ? trim((string) $track) : null;
                if ($track) {
                    $tracks[$track] = ($tracks[$track] ?? 0) + 1;
                }
            }
        }

        arsort($tracks);
        $topRecommendedPrograms = [];
        foreach (array_slice($tracks, 0, 8, true) as $track => $count) {
            $topRecommendedPrograms[] = [
                'name' => $track,
                'count' => $count,
            ];
        }

        return response()->json([
            'completionRate' => $completionRate,
            'approvalRate' => $approvalRate,
            'pendingReviews' => $pendingReviews,
            'topRecommendedPrograms' => $topRecommendedPrograms,
        ]);
    }
}
