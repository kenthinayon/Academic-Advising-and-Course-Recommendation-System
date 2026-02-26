<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'advisor_id',
        'session_type',
        'preferred_at',
        'scheduled_at',
        'status',
        'notes',
        'advisor_comment',
        'location',
    ];

    protected $casts = [
        'preferred_at' => 'datetime',
        'scheduled_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function advisor()
    {
        return $this->belongsTo(User::class, 'advisor_id');
    }
}
