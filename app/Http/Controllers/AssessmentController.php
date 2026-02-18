<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use Illuminate\Http\Request;

class AssessmentController extends Controller
{
    // How strongly different data sources influence the final ranking
    private const WEIGHTS = [
        // program_interest_ratings is user-declared preference, so it should have meaningful impact
        'program_interest_rating' => 2.5,
        // SHS strand is a prior, not a hard rule
        'strand_boost' => 2.0,
        // grade-based boost is a weak signal (kept small to avoid biasing too hard)
        'grade_boost' => 0.75,
    ];

    // Strand-to-category affinities (soft boosts)
    private const STRAND_BOOSTS = [
        'STEM' => [
            'Engineering & Technology' => 2.0,
            'Computer Studies' => 2.0,
            'Nursing' => 0.75,
            'Arts & Sciences' => 0.75,
        ],
        'ABM' => [
            'Accountancy' => 2.0,
            'Business Administration' => 2.0,
            'Law' => 0.75,
        ],
        'HUMSS' => [
            'Arts & Sciences' => 2.0,
            'Teacher Education' => 1.25,
            'Law' => 1.25,
        ],
        'TVL' => [
            'Engineering & Technology' => 1.5,
            'Computer Studies' => 1.5,
            'Business Administration' => 0.75,
        ],
    ];

    private const PART1_CATEGORY_MAP = [
        'Accountancy' => [1, 9],
        'Arts & Sciences' => [2, 10],
        'Business Administration' => [3, 11],
        'Computer Studies' => [4, 12],
        'Criminal Justice Education' => [5, 13],
        'Engineering & Technology' => [6, 12],
        'Nursing' => [7, 14],
        'Teacher Education' => [8, 15],
    ];

    // Concrete degree programs shown to the student (mapped from categories).
    // This keeps the student-facing output specific (e.g., BSIT) while still using category scoring.
    private const DEGREE_PROGRAMS = [
        // category => [ [code, name], ... ]
        'Computer Studies' => [
            ['BSIT', 'Bachelor of Science in Information Technology'],
            ['BSCS', 'Bachelor of Science in Computer Science'],
        ],
        'Engineering & Technology' => [
            ['BSCE', 'Bachelor of Science in Civil Engineering'],
            ['BSEE', 'Bachelor of Science in Electrical Engineering'],
            ['BSME', 'Bachelor of Science in Mechanical Engineering'],
        ],
        'Accountancy' => [
            ['BSA', 'Bachelor of Science in Accountancy'],
            ['BSMA', 'Bachelor of Science in Management Accounting'],
        ],
        'Business Administration' => [
            ['BSBA', 'Bachelor of Science in Business Administration'],
        ],
        'Arts & Sciences' => [
            ['BSPSY', 'Bachelor of Science in Psychology'],
            ['BAComm', 'Bachelor of Arts in Communication'],
        ],
        'Criminal Justice Education' => [
            ['BSCrim', 'Bachelor of Science in Criminology'],
        ],
        'Nursing' => [
            ['BSN', 'Bachelor of Science in Nursing'],
        ],
        'Teacher Education' => [
            ['BEEd', 'Bachelor of Elementary Education'],
            ['BSEd', 'Bachelor of Secondary Education'],
        ],
        'Law' => [
            ['LLB', 'Bachelor of Laws (legacy) / Pre-Law Track'],
            ['BA-PolSci', 'Bachelor of Arts in Political Science'],
        ],
    ];

    // Threshold rules to improve accuracy (soft disqualify or reduce).
    // If a threshold isn't met, we lower the score for that category/program.
    private const THRESHOLDS = [
        'Nursing' => [
            'min_gwa' => 85,
            'needs_science' => true,
        ],
        'Engineering & Technology' => [
            'min_gwa' => 83,
            'needs_math' => true,
        ],
        'Computer Studies' => [
            'min_gwa' => 80,
            'needs_math' => true,
        ],
        'Accountancy' => [
            'min_gwa' => 82,
            'needs_math' => true,
        ],
    ];

    private const PART2_QUESTIONS = [
        1 => ['correct' => 'B', 'category' => 'Accountancy'],
        2 => ['correct' => 'C', 'category' => 'Arts & Sciences'],
        3 => ['correct' => 'B', 'category' => 'Business Administration'],
        4 => ['correct' => 'C', 'category' => 'Computer Studies'],
        5 => ['correct' => 'B', 'category' => 'Criminal Justice Education'],
        6 => ['correct' => 'B', 'category' => 'Engineering & Technology'],
        7 => ['correct' => 'B', 'category' => 'Nursing'],
        8 => ['correct' => 'B', 'category' => 'Teacher Education'],
    ];

    /**
     * Get current saved assessment for the authenticated user.
     */
    public function show(Request $request)
    {
        $user = $request->user();
        $profile = $user?->profile;

        return response()->json([
            'assessment' => $profile ? [
                'part1_selected' => $profile->assessment_part1_selected ?? [],
                'part2_answers' => $profile->assessment_part2_answers ?? (object) [],
                'scores' => $this->computeScores(
                    $profile->assessment_part1_selected ?? [],
                    $profile->assessment_part2_answers ?? []
                ),
                'recommended_top3' => $profile->recommended_top3 ?? [],
                // New: degree/major suggestions
                'recommended_degrees' => $profile->recommended_degrees ?? [],
            ] : null,
        ]);
    }

    /**
     * Save assessment answers and compute top-3 recommendation categories.
     */
    public function upsert(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'part1_selected' => ['required', 'array', 'min:1'],
            'part1_selected.*' => ['integer', 'min:1', 'max:15'],

            'part2_answers' => ['required', 'array'],
            'part2_answers.*' => ['string', 'size:1'],
        ]);

        $part1 = array_values(array_unique(array_map('intval', $validated['part1_selected'])));
        sort($part1);

        $part2 = $validated['part2_answers'] ?? [];
        // normalize answers to uppercase A-D
        foreach ($part2 as $k => $v) {
            $part2[$k] = strtoupper(trim((string) $v));
        }

        $scores = $this->computeScores($part1, $part2);

        // Blend in academic credentials to improve recommendation accuracy
        $profileExisting = $user->profile;
        if ($profileExisting) {
            $scores = $this->applyAcademicBoosts($scores, $profileExisting);
        }

        // Apply threshold-based adjustments (e.g., Nursing requires science + min GWA)
        $scores = $this->applyThresholdAdjustments($scores, $profileExisting);

        $top3 = $this->topN($scores, 3);

        // Convert category top results to concrete degree programs/majors
        $degrees = $this->degreesFromTop($top3, $scores);

        $profile = Profile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'assessment_part1_selected' => $part1,
                'assessment_part2_answers' => $part2,
                'recommended_top3' => $top3,
                'recommended_degrees' => $degrees,
            ]
        );

        return response()->json([
            'message' => 'Assessment saved.',
            'assessment' => [
                'part1_selected' => $profile->assessment_part1_selected ?? [],
                'part2_answers' => $profile->assessment_part2_answers ?? (object) [],
                'scores' => $scores,
                'recommended_top3' => $top3,
                'recommended_degrees' => $degrees,
            ],
        ]);
    }

    private function computeScores(array $part1Selected, array $part2Answers): array
    {
        $scores = [];
        foreach (array_keys(self::PART1_CATEGORY_MAP) as $cat) {
            $scores[$cat] = 0;
        }

        // Part 1: 1 point per checked statement mapping
        foreach (self::PART1_CATEGORY_MAP as $category => $numbers) {
            $count = 0;
            foreach ($numbers as $n) {
                if (in_array($n, $part1Selected, true)) {
                    $count++;
                }
            }
            $scores[$category] += $count;
        }

        // Part 2: 2 points per correct answer, to the matching category
        foreach (self::PART2_QUESTIONS as $qid => $meta) {
            $userAnswer = strtoupper((string) ($part2Answers[$qid] ?? ''));
            if ($userAnswer !== '' && $userAnswer === $meta['correct']) {
                $scores[$meta['category']] += 2;
            }
        }

        return $scores;
    }

    private function topN(array $scores, int $n = 3): array
    {
        arsort($scores);
        $top = array_slice($scores, 0, $n, true);

        $out = [];
        $rank = 1;
        foreach ($top as $category => $score) {
            $out[] = [
                'rank' => $rank,
                'category' => $category,
                'score' => $score,
            ];
            $rank++;
        }

        return $out;
    }

    /**
     * Add soft signals from academic credentials:
     * - SHS strand prior (STEM/ABM/HUMSS/TVL)
     * - program interest ratings (1-5 sliders)
     * - small grade-based boosts for strong Math/Science performance
     */
    private function applyAcademicBoosts(array $scores, Profile $profile): array
    {
        // 1) Strand prior
        $strand = strtoupper(trim((string) ($profile->shs_strand ?? '')));
        if (isset(self::STRAND_BOOSTS[$strand])) {
            foreach (self::STRAND_BOOSTS[$strand] as $category => $boost) {
                if (array_key_exists($category, $scores)) {
                    $scores[$category] += $boost * self::WEIGHTS['strand_boost'] / 2.0;
                }
            }
        }

        // 2) User program interest rating (strong signal)
        $ratings = $profile->program_interest_ratings;
        if (is_array($ratings)) {
            foreach ($ratings as $program => $rating) {
                $program = (string) $program;
                $r = is_numeric($rating) ? (int) $rating : null;
                if ($r === null) {
                    continue;
                }
                // Convert 1..5 into -2..+2 centered at 3
                $delta = max(-2, min(2, $r - 3));
                if ($delta === 0) {
                    continue;
                }

                // Map program names to the same categories used by the quiz
                $mapped = $this->mapProgramToCategory($program);
                if ($mapped && array_key_exists($mapped, $scores)) {
                    $scores[$mapped] += $delta * self::WEIGHTS['program_interest_rating'];
                }
            }
        }

        // 3) Grade-based boost (weak signal)
        $avg = $profile->shs_general_average;
        $avgNum = is_numeric($avg) ? (float) $avg : null;

        $subjectGrades = $profile->subject_grades;
        $mathScienceStrong = false;

        if (is_array($subjectGrades)) {
            foreach ($subjectGrades as $row) {
                $subject = strtolower(trim((string) ($row['subject'] ?? '')));
                $grade = $row['grade'] ?? null;
                $g = is_numeric($grade) ? (float) $grade : null;
                if (!$subject || $g === null) {
                    continue;
                }
                if (($subject === 'math' || str_contains($subject, 'math') || str_contains($subject, 'mathemat')) && $g >= 85) {
                    $mathScienceStrong = true;
                }
                if ((str_contains($subject, 'science') || str_contains($subject, 'physics') || str_contains($subject, 'chem') || str_contains($subject, 'bio')) && $g >= 85) {
                    $mathScienceStrong = true;
                }
            }
        }

        if (($avgNum !== null && $avgNum >= 88) || $mathScienceStrong) {
            foreach (['Engineering & Technology', 'Computer Studies'] as $cat) {
                if (array_key_exists($cat, $scores)) {
                    $scores[$cat] += self::WEIGHTS['grade_boost'];
                }
            }
        }

        return $scores;
    }

    private function applyThresholdAdjustments(array $scores, ?Profile $profile): array
    {
        if (!$profile) {
            return $scores;
        }

        $avg = $profile->shs_general_average;
        $gwa = is_numeric($avg) ? (float) $avg : null;

        $subjectGrades = $profile->subject_grades;
        $hasStrongMath = false;
        $hasStrongScience = false;

        if (is_array($subjectGrades)) {
            foreach ($subjectGrades as $row) {
                $subject = strtolower(trim((string) ($row['subject'] ?? '')));
                $grade = $row['grade'] ?? null;
                $g = is_numeric($grade) ? (float) $grade : null;
                if (!$subject || $g === null) {
                    continue;
                }

                if (($subject === 'math' || str_contains($subject, 'math') || str_contains($subject, 'mathemat')) && $g >= 85) {
                    $hasStrongMath = true;
                }
                if ((str_contains($subject, 'science') || str_contains($subject, 'physics') || str_contains($subject, 'chem') || str_contains($subject, 'bio')) && $g >= 85) {
                    $hasStrongScience = true;
                }
            }
        }

        foreach (self::THRESHOLDS as $category => $rules) {
            if (!array_key_exists($category, $scores)) {
                continue;
            }

            $penalty = 0.0;

            if (isset($rules['min_gwa']) && $gwa !== null && $gwa < (float) $rules['min_gwa']) {
                $penalty += 3.0; // reduce significantly if GWA doesn't meet expectation
            }

            if (!empty($rules['needs_math']) && !$hasStrongMath) {
                $penalty += 1.5;
            }

            if (!empty($rules['needs_science']) && !$hasStrongScience) {
                $penalty += 1.5;
            }

            if ($penalty > 0) {
                $scores[$category] = $scores[$category] - $penalty;
            }
        }

        return $scores;
    }

    private function degreesFromTop(array $categoryTop3, array $scores): array
    {
        $out = [];
        $rank = 1;

        foreach ($categoryTop3 as $item) {
            $category = (string) ($item['category'] ?? '');
            if (!$category || !isset(self::DEGREE_PROGRAMS[$category])) {
                continue;
            }

            foreach (self::DEGREE_PROGRAMS[$category] as $deg) {
                $code = $deg[0];
                $name = $deg[1];
                $out[] = [
                    'rank' => $rank,
                    'category' => $category,
                    'code' => $code,
                    'name' => $name,
                    // for transparency/debug
                    'score' => $scores[$category] ?? 0,
                ];
                $rank++;

                if ($rank > 3) {
                    break 2; // keep top 3 concrete programs total
                }
            }
        }

        return $out;
    }

    private function mapProgramToCategory(string $program): ?string
    {
        $p = strtolower(trim($program));

        // normalize some known variations
        if ($p === 'arts and sciences') return 'Arts & Sciences';
        if ($p === 'teachers education' || $p === 'teacher education') return 'Teacher Education';
        if ($p === 'engineering and technology' || $p === 'engineering & technology') return 'Engineering & Technology';
        if ($p === 'criminal justice education') return 'Criminal Justice Education';
        if ($p === 'business administration') return 'Business Administration';
        if ($p === 'computer studies') return 'Computer Studies';
        if ($p === 'accountancy') return 'Accountancy';
        if ($p === 'nursing') return 'Nursing';
        if ($p === 'law') return 'Law';

        return null;
    }
}
