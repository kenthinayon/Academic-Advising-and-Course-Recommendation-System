<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController; // Adjust to your controller
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\AdvisorController;
use App\Http\Controllers\AdminController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [ProfileController::class, 'me']);
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar']);
        Route::put('/account/password', [AuthController::class, 'changePassword']);
    Route::put('/profile/basic-info', [ProfileController::class, 'upsertBasicInfo']);
    Route::put('/profile/academic-credentials', [ProfileController::class, 'upsertAcademicCredentials']);

    // Appointments (Student)
    Route::get('/appointments', [\App\Http\Controllers\AppointmentController::class, 'index']);
    Route::post('/appointments', [\App\Http\Controllers\AppointmentController::class, 'store']);
    Route::get('/notifications', [\App\Http\Controllers\AppointmentController::class, 'studentNotifications']);

    // Appointments (Advisor/Admin)
    Route::middleware('role:advisor,admin')->group(function () {
        Route::get('/advisor/appointments', [\App\Http\Controllers\AppointmentController::class, 'advisorIndex']);
        Route::put('/advisor/appointments/{appointmentId}/approve', [\App\Http\Controllers\AppointmentController::class, 'advisorApprove']);
        Route::put('/advisor/appointments/{appointmentId}/cancel', [\App\Http\Controllers\AppointmentController::class, 'advisorCancel']);
        Route::put('/advisor/appointments/{appointmentId}/complete', [\App\Http\Controllers\AppointmentController::class, 'advisorComplete']);
        Route::put('/advisor/appointments/{appointmentId}/reject', [\App\Http\Controllers\AppointmentController::class, 'advisorReject']);
    });

    // Step 3/4 - Assessment + Recommendations
    Route::get('/assessment', [AssessmentController::class, 'show']);
    Route::put('/assessment', [AssessmentController::class, 'upsert']);

    // Advisor/Admin review endpoints
    Route::middleware('role:advisor,admin')->group(function () {
        Route::get('/advisor/stats', [AdvisorController::class, 'stats']);
        Route::get('/advisor/students', [AdvisorController::class, 'students']);
        Route::get('/advisor/students/{userId}', [AdvisorController::class, 'studentDetail']);
        Route::put('/advisor/students/{userId}/recommendation', [AdvisorController::class, 'updateRecommendation']);
    });

    // Admin dashboard endpoints
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/stats', [AdminController::class, 'stats']);
        Route::get('/admin/analytics', [AdminController::class, 'analytics']);

        // Student details (admin)
        Route::get('/admin/students/{userId}', [AdvisorController::class, 'studentDetail']);
    });
});
