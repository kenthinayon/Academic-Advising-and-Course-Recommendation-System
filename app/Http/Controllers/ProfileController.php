<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /**
     * Step 1 (Basic Information): fetch the authenticated user's current info.
     */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => $user,
            'profile' => $user?->profile,
        ]);
    }

    /**
     * Step 1 (Basic Information): create/update the authenticated user's basic info.
     */
    public function upsertBasicInfo(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'age' => ['required', 'integer', 'min:1', 'max:120'],
            'gender' => ['required', 'string', 'max:32'],
            'high_school' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'contact_number' => ['required', 'string', 'max:32'],
        ]);

        // Keep the User table as the source of truth for name/email
        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        $profile = Profile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'age' => $validated['age'],
                'gender' => $validated['gender'],
                'high_school' => $validated['high_school'],
                'contact_number' => $validated['contact_number'],
            ]
        );

        return response()->json([
            'message' => 'Basic information saved.',
            'user' => $user,
            'profile' => $profile,
        ]);
    }

    /**
     * Step 2 (Academic Credentials): create/update strand, grades, skills, and career interests.
     */
    public function upsertAcademicCredentials(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'shs_strand' => ['required', 'string', 'max:64'],
            'shs_general_average' => ['required', 'numeric', 'min:60', 'max:100'],

            // Academic Records (subject + grade)
            'subject_grades' => ['nullable', 'array'],
            'subject_grades.*.subject' => ['required_with:subject_grades', 'string', 'max:80'],
            'subject_grades.*.grade' => ['required_with:subject_grades', 'numeric', 'min:0', 'max:100'],

            // free-form list of skills (strings)
            'skills' => ['nullable', 'array'],
            'skills.*' => ['string', 'max:64'],

            // short paragraph/answer
            'career_goals' => ['required', 'string', 'max:2000'],

            // { "Nursing": 4, "Law": 2, ... }
            'program_interest_ratings' => ['required', 'array'],
            'program_interest_ratings.*' => ['integer', 'min:1', 'max:5'],

            // optional uploads
            // Allow any file type (pdf/images/docs/etc). Max is in KB.
            'report_card' => ['nullable', 'file', 'max:20480'],
            // When sent as multipart with repeated `skill_attachments[]`, Laravel receives this as an array of UploadedFile.
            // Validate the files directly (no need to validate the parent as an 'array').
            'skill_attachments' => ['nullable'],
            'skill_attachments.*' => ['file', 'max:20480'],
        ]);

        $existing = $user->profile;

        $reportCardPath = $existing?->report_card_path;
        if ($request->hasFile('report_card')) {
            $reportCardPath = $request->file('report_card')->store('report_cards', 'public');
        }

        $skillAttachmentPaths = $existing?->skill_attachments ?? [];
        if ($request->hasFile('skill_attachments')) {
            $uploaded = [];
            $files = $request->file('skill_attachments') ?? [];
            if (!is_array($files)) {
                $files = [$files];
            }
            foreach ($files as $file) {
                if ($file) {
                    $uploaded[] = $file->store('skill_attachments', 'public');
                }
            }
            // Keep prior uploads and append new ones
            $skillAttachmentPaths = array_values(array_filter(array_merge($skillAttachmentPaths, $uploaded)));
        }

        $subjectGrades = $validated['subject_grades'] ?? [];
        // Normalize + trim
        $subjectGrades = array_values(array_filter(array_map(function ($row) {
            $subject = isset($row['subject']) ? trim((string) $row['subject']) : '';
            $grade = $row['grade'] ?? null;
            if ($subject === '' || $grade === null || $grade === '') {
                return null;
            }
            return ['subject' => $subject, 'grade' => (float) $grade];
        }, $subjectGrades)));

        $profile = Profile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'shs_strand' => $validated['shs_strand'],
                'shs_general_average' => $validated['shs_general_average'],
                'subject_grades' => $subjectGrades,
                'report_card_path' => $reportCardPath,
                'skills' => $validated['skills'] ?? [],
                'skill_attachments' => $skillAttachmentPaths,
                'career_goals' => $validated['career_goals'],
                'program_interest_ratings' => $validated['program_interest_ratings'],
            ]
        );

        return response()->json([
            'message' => 'Academic credentials saved.',
            'profile' => $profile,
        ]);
    }
}
