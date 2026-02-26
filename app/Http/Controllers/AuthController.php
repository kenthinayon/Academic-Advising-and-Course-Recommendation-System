<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],

            // Basic info
            'age' => ['nullable', 'integer', 'min:1', 'max:120'],
            'gender' => ['nullable', 'string', 'max:32'],
            'high_school' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:32'],

            // Security: allow self-registration ONLY for student/advisor. Admin must be created manually.
            'role' => ['nullable', 'in:student,advisor'],
        ]);

        $role = $validated['role'] ?? 'student';

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $role,
        ]);

        // Profile is primarily for student info; still safe for other roles.
        $profile = Profile::create([
            'user_id' => $user->id,
            'age' => $validated['age'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'high_school' => $validated['high_school'] ?? null,
            'contact_number' => $validated['contact_number'] ?? null,
        ]);

        $token = $user->createToken('spa')->plainTextToken;

        return response()->json([
            'message' => 'Registered successfully.',
            'token' => $token,
            'user' => $user,
            'profile' => $profile,
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            // Optional: when provided, enforce that the user is logging in under the correct role tab.
            'role' => ['nullable', 'in:student,advisor,admin'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 422);
        }

        if (!empty($validated['role']) && $user->role !== $validated['role']) {
            return response()->json([
                'message' => 'Wrong role selected for this account.',
                'code' => 'wrong_role',
                'actualRole' => $user->role,
            ], 422);
        }

        // Revoke old tokens for cleaner SPA behavior
        $user->tokens()->delete();

        $token = $user->createToken('spa')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $user,
            'profile' => $user->profile,
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()?->delete();
        }

        return response()->json(['message' => 'Logged out.']);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        if (!$user || !Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        // Optional security: revoke all tokens so the user must re-login on other devices.
        // Keep current token to avoid logging them out instantly.
        // $user->tokens()->where('id', '!=', optional($user->currentAccessToken())->id)->delete();

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }
}
