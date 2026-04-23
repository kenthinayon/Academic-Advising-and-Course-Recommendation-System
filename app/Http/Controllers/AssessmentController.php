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
        ],
        'HUMSS' => [
            'Arts & Sciences' => 2.0,
            'Teacher Education' => 1.25,
            'Criminal Justice Education' => 1.25,
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

    // Part II question bank: 5 readiness/aptitude questions per category (not degree-specific memorization).
    // Keys must match the frontend question IDs.
    private const PART2_BANK = [
        // Accountancy
        'acc_1' => ['correct' => 'B', 'category' => 'Accountancy'],
        'acc_2' => ['correct' => 'B', 'category' => 'Accountancy'],
        'acc_3' => ['correct' => 'B', 'category' => 'Accountancy'],
        'acc_4' => ['correct' => 'B', 'category' => 'Accountancy'],
        'acc_5' => ['correct' => 'B', 'category' => 'Accountancy'],

        // Arts & Sciences
        'arts_1' => ['correct' => 'C', 'category' => 'Arts & Sciences'],
        'arts_2' => ['correct' => 'B', 'category' => 'Arts & Sciences'],
        'arts_3' => ['correct' => 'C', 'category' => 'Arts & Sciences'],
        'arts_4' => ['correct' => 'B', 'category' => 'Arts & Sciences'],
        'arts_5' => ['correct' => 'C', 'category' => 'Arts & Sciences'],

        // Business Administration
        'bus_1' => ['correct' => 'B', 'category' => 'Business Administration'],
        'bus_2' => ['correct' => 'B', 'category' => 'Business Administration'],
        'bus_3' => ['correct' => 'B', 'category' => 'Business Administration'],
        'bus_4' => ['correct' => 'C', 'category' => 'Business Administration'],
        'bus_5' => ['correct' => 'B', 'category' => 'Business Administration'],

        // Computer Studies
        'cs_1' => ['correct' => 'C', 'category' => 'Computer Studies'],
        'cs_2' => ['correct' => 'B', 'category' => 'Computer Studies'],
        'cs_3' => ['correct' => 'B', 'category' => 'Computer Studies'],
        'cs_4' => ['correct' => 'C', 'category' => 'Computer Studies'],
        'cs_5' => ['correct' => 'A', 'category' => 'Computer Studies'],

        // Criminal Justice Education
        'cje_1' => ['correct' => 'B', 'category' => 'Criminal Justice Education'],
        'cje_2' => ['correct' => 'B', 'category' => 'Criminal Justice Education'],
        'cje_3' => ['correct' => 'B', 'category' => 'Criminal Justice Education'],
        'cje_4' => ['correct' => 'B', 'category' => 'Criminal Justice Education'],
        'cje_5' => ['correct' => 'B', 'category' => 'Criminal Justice Education'],

        // Engineering & Technology
        'eng_1' => ['correct' => 'B', 'category' => 'Engineering & Technology'],
        'eng_2' => ['correct' => 'B', 'category' => 'Engineering & Technology'],
        'eng_3' => ['correct' => 'B', 'category' => 'Engineering & Technology'],
        'eng_4' => ['correct' => 'B', 'category' => 'Engineering & Technology'],
        'eng_5' => ['correct' => 'A', 'category' => 'Engineering & Technology'],

        // Nursing
        'nurs_1' => ['correct' => 'B', 'category' => 'Nursing'],
        'nurs_2' => ['correct' => 'B', 'category' => 'Nursing'],
        'nurs_3' => ['correct' => 'B', 'category' => 'Nursing'],
        'nurs_4' => ['correct' => 'B', 'category' => 'Nursing'],
        'nurs_5' => ['correct' => 'C', 'category' => 'Nursing'],

        // Teacher Education
        'teach_1' => ['correct' => 'B', 'category' => 'Teacher Education'],
        'teach_2' => ['correct' => 'B', 'category' => 'Teacher Education'],
        'teach_3' => ['correct' => 'A', 'category' => 'Teacher Education'],
        'teach_4' => ['correct' => 'B', 'category' => 'Teacher Education'],
        'teach_5' => ['correct' => 'B', 'category' => 'Teacher Education'],
    ];

    // General readiness questions: skill-tagged and weighted per category/program.
    private const READINESS_POINT_PER_CORRECT = 0.4;

    private const CATEGORY_SKILL_WEIGHTS = [
        'Accountancy' => ['numerical' => 0.6, 'logical' => 0.3, 'verbal' => 0.1],
        'Arts & Sciences' => ['numerical' => 0.2, 'logical' => 0.4, 'verbal' => 0.4],
        'Business Administration' => ['numerical' => 0.35, 'logical' => 0.35, 'verbal' => 0.3],
        'Computer Studies' => ['numerical' => 0.35, 'logical' => 0.5, 'verbal' => 0.15],
        'Criminal Justice Education' => ['numerical' => 0.15, 'logical' => 0.25, 'verbal' => 0.6],
        'Engineering & Technology' => ['numerical' => 0.5, 'logical' => 0.4, 'verbal' => 0.1],
        'Nursing' => ['numerical' => 0.4, 'logical' => 0.2, 'verbal' => 0.4],
        'Teacher Education' => ['numerical' => 0.1, 'logical' => 0.2, 'verbal' => 0.7],
    ];

    private const READINESS_QUESTIONS = [
        // NUMERICAL (1–5)
        'gen_1' => ['correct' => 'D', 'skill' => 'numerical'],
        'gen_2' => ['correct' => 'B', 'skill' => 'numerical'],
        'gen_3' => ['correct' => 'C', 'skill' => 'numerical'],
        'gen_4' => ['correct' => 'B', 'skill' => 'numerical'],
        'gen_5' => ['correct' => 'B', 'skill' => 'numerical'],

        // LOGICAL (6–10)
        'gen_6' => ['correct' => 'B', 'skill' => 'logical'],
        'gen_7' => ['correct' => 'D', 'skill' => 'logical'],
        'gen_8' => ['correct' => 'B', 'skill' => 'logical'],
        'gen_9' => ['correct' => 'A', 'skill' => 'logical'],
        'gen_10' => ['correct' => 'B', 'skill' => 'logical'],

        // VERBAL (11–15)
        'gen_11' => ['correct' => 'B', 'skill' => 'verbal'],
        'gen_12' => ['correct' => 'B', 'skill' => 'verbal'],
        'gen_13' => ['correct' => 'C', 'skill' => 'verbal'],
        'gen_14' => ['correct' => 'B', 'skill' => 'verbal'],
        'gen_15' => ['correct' => 'C', 'skill' => 'verbal'],
    ];

    /**
     * Get current saved assessment for the authenticated user.
     */
    public function show(Request $request)
    {
        $user = $request->user();
        $profile = $user?->profile;

        $part2 = [];
        if ($profile && is_array($profile->assessment_part2_answers)) {
            $part2 = $profile->assessment_part2_answers;
        }

        return response()->json([
            'assessment' => $profile ? [
                'part1_selected' => $profile->assessment_part1_selected ?? [],
                'part2_answers' => $profile->assessment_part2_answers ?? (object) [],
                'breakdown' => self::buildBreakdown($part2),
                'scores' => $this->computeScores(
                    $profile->assessment_part1_selected ?? [],
                    $part2
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

            // Part II is dynamic (top 3 categories × 5 questions each) + 15 skill-based readiness questions
            'part2_answers' => ['required', 'array', 'min:30'],
            'part2_answers.*' => ['string', 'size:1', 'in:A,B,C,D,a,b,c,d'],
        ]);

        $part1 = array_values(array_unique(array_map('intval', $validated['part1_selected'])));
        sort($part1);

        $part2Raw = $validated['part2_answers'] ?? [];

        // normalize + whitelist question IDs to prevent unexpected payload keys
        $part2 = [];
        foreach ($part2Raw as $qid => $v) {
            $qid = trim((string) $qid);
            if ($qid === '' || (!isset(self::PART2_BANK[$qid]) && !isset(self::READINESS_QUESTIONS[$qid]))) {
                continue;
            }
            $part2[$qid] = strtoupper(trim((string) $v));
        }

        if (count($part2) < 30) {
            return response()->json([
                'message' => 'Please answer all Part II questions before saving.',
            ], 422);
        }

        $breakdown = self::buildBreakdown($part2);

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
        $readinessCorrect = $breakdown['readiness']['by_skill']['correct'] ?? [];
        $degrees = $this->degreesFromTop($top3, $scores, $readinessCorrect);

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
                'breakdown' => $breakdown,
                'scores' => $scores,
                'recommended_top3' => $top3,
                'recommended_degrees' => $degrees,
            ],
        ]);
    }

    /**
     * Clear/reset saved assessment and recommendations for the authenticated user.
     */
    public function destroy(Request $request)
    {
        $user = $request->user();
        $profile = $user?->profile;

        if (!$profile) {
            // Create a profile row if it doesn't exist yet (keeps behavior consistent)
            $profile = Profile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'assessment_part1_selected' => [],
                    'assessment_part2_answers' => [],
                    'recommended_top3' => [],
                    'recommended_degrees' => [],
                ]
            );
        } else {
            $profile->assessment_part1_selected = [];
            $profile->assessment_part2_answers = [];
            $profile->recommended_top3 = [];
            $profile->recommended_degrees = [];
            $profile->save();
        }

        return response()->json([
            'message' => 'Assessment reset.',
            'assessment' => [
                'part1_selected' => [],
                'part2_answers' => (object) [],
                'breakdown' => self::buildBreakdown([]),
                'scores' => $this->computeScores([], []),
                'recommended_top3' => [],
                'recommended_degrees' => [],
            ],
        ]);
    }

    /**
     * Build a structured, UI-friendly breakdown for Part II.
     *
     * This is intentionally separate from final recommendation scoring/boosts;
     * it only reports quiz/readiness correctness.
     */
    public static function buildBreakdown(array $part2Answers): array
    {
        $skillKeyToLabel = [
            'numerical' => 'numerical_reasoning',
            'logical' => 'logical_reasoning',
            'verbal' => 'verbal_reasoning',
        ];

        $readinessTotalBySkill = [
            'numerical_reasoning' => 0,
            'logical_reasoning' => 0,
            'verbal_reasoning' => 0,
        ];

        foreach (self::READINESS_QUESTIONS as $qid => $meta) {
            $skillKey = strtolower((string) ($meta['skill'] ?? ''));
            $label = $skillKeyToLabel[$skillKey] ?? null;
            if ($label) {
                $readinessTotalBySkill[$label] += 1;
            }
        }

        $readinessCorrectBySkill = [
            'numerical_reasoning' => 0,
            'logical_reasoning' => 0,
            'verbal_reasoning' => 0,
        ];

        $selectedCategories = [];
        $categoryTotalByCategory = [];
        $categoryCorrectByCategory = [];

        $items = [];

        foreach ($part2Answers as $qid => $ansRaw) {
            $qid = trim((string) $qid);
            if ($qid === '') {
                continue;
            }

            $userAnswer = strtoupper(trim((string) $ansRaw));
            if ($userAnswer === '') {
                continue;
            }

            // Readiness
            if (isset(self::READINESS_QUESTIONS[$qid])) {
                $meta = self::READINESS_QUESTIONS[$qid];
                $correct = strtoupper((string) ($meta['correct'] ?? ''));
                $skillKey = strtolower((string) ($meta['skill'] ?? ''));
                $skillLabel = $skillKeyToLabel[$skillKey] ?? $skillKey;

                $isCorrect = ($correct !== '' && $userAnswer === $correct);

                if (isset($readinessCorrectBySkill[$skillLabel]) && $isCorrect) {
                    $readinessCorrectBySkill[$skillLabel] += 1;
                }

                $items[] = [
                    'qid' => $qid,
                    'type' => 'readiness',
                    'skill' => $skillLabel,
                    'user_answer' => $userAnswer,
                    'correct_answer' => $correct,
                    'is_correct' => $isCorrect,
                ];
                continue;
            }

            // Category-bank
            if (isset(self::PART2_BANK[$qid])) {
                $meta = self::PART2_BANK[$qid];
                $category = (string) ($meta['category'] ?? '');
                $correct = strtoupper((string) ($meta['correct'] ?? ''));
                $isCorrect = ($correct !== '' && $userAnswer === $correct);

                if ($category !== '') {
                    $selectedCategories[$category] = true;
                }

                $items[] = [
                    'qid' => $qid,
                    'type' => 'category',
                    'category' => $category,
                    'user_answer' => $userAnswer,
                    'correct_answer' => $correct,
                    'is_correct' => $isCorrect,
                ];

                if ($category !== '') {
                    if (!isset($categoryCorrectByCategory[$category])) {
                        $categoryCorrectByCategory[$category] = 0;
                    }
                    if ($isCorrect) {
                        $categoryCorrectByCategory[$category] += 1;
                    }
                }
            }
        }

        $selectedCategoriesList = array_keys($selectedCategories);
        sort($selectedCategoriesList);

        // Totals per category are derived from the bank (expected question count for that category).
        $bankCountByCategory = [];
        foreach (self::PART2_BANK as $qid => $meta) {
            $cat = (string) ($meta['category'] ?? '');
            if ($cat === '') {
                continue;
            }
            if (!isset($bankCountByCategory[$cat])) {
                $bankCountByCategory[$cat] = 0;
            }
            $bankCountByCategory[$cat] += 1;
        }

        foreach ($selectedCategoriesList as $cat) {
            $categoryTotalByCategory[$cat] = (int) ($bankCountByCategory[$cat] ?? 0);
            if (!isset($categoryCorrectByCategory[$cat])) {
                $categoryCorrectByCategory[$cat] = 0;
            }
        }

        $readinessTotal = array_sum($readinessTotalBySkill);
        $readinessCorrect = array_sum($readinessCorrectBySkill);
        $categoryTotal = array_sum($categoryTotalByCategory);
        $categoryCorrect = array_sum($categoryCorrectByCategory);

        return [
            'readiness' => [
                'correct_total' => $readinessCorrect,
                'total' => $readinessTotal,
                'by_skill' => [
                    'correct' => $readinessCorrectBySkill,
                    'total' => $readinessTotalBySkill,
                ],
            ],
            'part2_categories' => [
                'selected_categories' => $selectedCategoriesList,
                'correct_total' => $categoryCorrect,
                'total' => $categoryTotal,
                'by_category' => [
                    'correct' => $categoryCorrectByCategory,
                    'total' => $categoryTotalByCategory,
                ],
            ],
            'items' => $items,
        ];
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

        // Part 2: course questions (+2 to their category) + skill-tagged readiness questions
        $skillCorrect = [
            'numerical' => 0,
            'logical' => 0,
            'verbal' => 0,
        ];

        if (is_array($part2Answers)) {
            foreach ($part2Answers as $qid => $ans) {
                $qid = (string) $qid;
                $userAnswer = strtoupper((string) $ans);

                if ($userAnswer === '') {
                    continue;
                }

                // Readiness questions
                if (isset(self::READINESS_QUESTIONS[$qid])) {
                    $correct = self::READINESS_QUESTIONS[$qid]['correct'] ?? '';
                    $skill = strtolower((string) (self::READINESS_QUESTIONS[$qid]['skill'] ?? ''));
                    if ($correct !== '' && $userAnswer === $correct && isset($skillCorrect[$skill])) {
                        $skillCorrect[$skill] += 1;
                    }
                    continue;
                }

                // Course questions
                if (!isset(self::PART2_BANK[$qid])) {
                    continue;
                }
                $meta = self::PART2_BANK[$qid];
                if ($userAnswer === $meta['correct']) {
                    $cat = $meta['category'];
                    if (array_key_exists($cat, $scores)) {
                        $scores[$cat] += 2;
                    }
                }
            }
        }

        // Apply skill-weighted readiness contribution per category.
        foreach (array_keys($scores) as $category) {
            $w = self::CATEGORY_SKILL_WEIGHTS[$category] ?? null;
            if (!is_array($w)) {
                continue;
            }

            $add = 0.0;
            foreach ($skillCorrect as $skill => $count) {
                $weight = isset($w[$skill]) && is_numeric($w[$skill]) ? (float) $w[$skill] : 0.0;
                if ($weight <= 0) {
                    continue;
                }
                $add += ((int) $count) * self::READINESS_POINT_PER_CORRECT * $weight;
            }
            $scores[$category] += $add;
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
    * - program interest ratings (0-5 sliders; 0 = not set)
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
                // UI allows 0..5 where 0 means "not set".
                // Ignore 0 so defaults don't negatively skew recommendations.
                if ($r === 0) {
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

    private function degreesFromTop(array $categoryTop3, array $scores, array $readinessCorrectBySkill = []): array
    {
        $out = [];
        $rank = 1;

        $readinessCorrectBySkill = $this->normalizeReadinessCorrectBySkill($readinessCorrectBySkill);

        foreach ($categoryTop3 as $item) {
            $category = (string) ($item['category'] ?? '');
            if (!$category || !isset(self::DEGREE_PROGRAMS[$category])) {
                continue;
            }

            // Pick one representative degree per category.
            // For categories with multiple degrees, apply a transparent readiness-based tie-breaker.
            $deg = $this->pickDegreeForCategory($category, $readinessCorrectBySkill)
                ?? (self::DEGREE_PROGRAMS[$category][0] ?? null);
            if (!$deg) {
                continue;
            }

            $out[] = [
                'rank' => $rank,
                'category' => $category,
                'code' => $deg[0],
                'name' => $deg[1],
                // for transparency/debug
                'score' => $scores[$category] ?? 0,
            ];
            $rank++;

            if ($rank > 3) {
                break; // keep top 3 concrete programs total
            }
        }

        return $out;
    }

    private function normalizeReadinessCorrectBySkill(array $readinessCorrectBySkill): array
    {
        return [
            'numerical_reasoning' => (int) ($readinessCorrectBySkill['numerical_reasoning'] ?? 0),
            'logical_reasoning' => (int) ($readinessCorrectBySkill['logical_reasoning'] ?? 0),
            'verbal_reasoning' => (int) ($readinessCorrectBySkill['verbal_reasoning'] ?? 0),
        ];
    }

    private function pickDegreeForCategory(string $category, array $readinessCorrectBySkill): ?array
    {
        $programs = self::DEGREE_PROGRAMS[$category] ?? null;
        if (!is_array($programs) || count($programs) === 0) {
            return null;
        }

        // Default behavior: first program in list.
        if (count($programs) === 1) {
            return $programs[0];
        }

        $numerical = (int) ($readinessCorrectBySkill['numerical_reasoning'] ?? 0);
        $logical = (int) ($readinessCorrectBySkill['logical_reasoning'] ?? 0);
        $verbal = (int) ($readinessCorrectBySkill['verbal_reasoning'] ?? 0);

        // Rule 1: use strongest readiness skill as a transparent tie-breaker.
        // If there's a tie, this intentionally prefers the earlier condition.
        if ($category === 'Computer Studies') {
            return ($logical >= $numerical && $logical >= $verbal)
                ? $this->findDegreeByCode($programs, 'BSCS')
                : $this->findDegreeByCode($programs, 'BSIT');
        }

        if ($category === 'Engineering & Technology') {
            if ($numerical >= $logical && $numerical >= $verbal) {
                return $this->findDegreeByCode($programs, 'BSCE');
            }
            if ($logical >= $numerical && $logical >= $verbal) {
                return $this->findDegreeByCode($programs, 'BSEE');
            }

            return $this->findDegreeByCode($programs, 'BSME');
        }

        if ($category === 'Accountancy') {
            return ($numerical >= $logical && $numerical >= $verbal)
                ? $this->findDegreeByCode($programs, 'BSA')
                : $this->findDegreeByCode($programs, 'BSMA');
        }

        if ($category === 'Arts & Sciences') {
            return ($verbal >= $numerical && $verbal >= $logical)
                ? $this->findDegreeByCode($programs, 'BAComm')
                : $this->findDegreeByCode($programs, 'BSPSY');
        }

        if ($category === 'Teacher Education') {
            return ($verbal >= $numerical && $verbal >= $logical)
                ? $this->findDegreeByCode($programs, 'BSEd')
                : $this->findDegreeByCode($programs, 'BEEd');
        }

        return $programs[0];
    }

    private function findDegreeByCode(array $programs, string $code): ?array
    {
        foreach ($programs as $p) {
            if (is_array($p) && isset($p[0]) && strtoupper((string) $p[0]) === strtoupper($code)) {
                return $p;
            }
        }

        return $programs[0] ?? null;
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

        return null;
    }
}
