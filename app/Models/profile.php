<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'age',
        'gender',
        'high_school',
        'contact_number',
        'avatar_path',

        // Step 2
        'shs_strand',
        'shs_general_average',
        'subject_grades',
        'report_card_path',
        'skills',
        'skill_attachments',
        'career_goals',
        'program_interest_ratings',

        // Step 3/4
        'assessment_part1_selected',
        'assessment_part2_answers',
        'recommended_top3',
        'recommended_degrees',

        // Advisor review
        'advisor_recommended_degrees',
        'advisor_status',
        'advisor_comment',
        'advisor_reviewed_at',
        'advisor_reviewed_by',
    ];

    protected $casts = [
        'skills' => 'array',
        'skill_attachments' => 'array',
        'subject_grades' => 'array',
        'program_interest_ratings' => 'array',

        'assessment_part1_selected' => 'array',
        'assessment_part2_answers' => 'array',
        'recommended_top3' => 'array',
        'recommended_degrees' => 'array',

        'advisor_recommended_degrees' => 'array',
        'advisor_reviewed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
