<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DivisionController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// ---------- Public ----------
Route::post('/login', [AuthController::class, 'login']);

// ---------- Authenticated (admin & user) ----------
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Profile
    Route::prefix('profile')->group(function () {
        Route::put('/', [ProfileController::class, 'update']);
        Route::post('/avatar', [ProfileController::class, 'updateAvatar']);
        Route::delete('/avatar', [ProfileController::class, 'destroyAvatar']);
        Route::put('/password', [ProfileController::class, 'updatePassword']);
    });

    // Attendance
    Route::prefix('attendances')->group(function () {
        Route::get('/stats', [AttendanceController::class, 'stats']);
        Route::get('/today', [AttendanceController::class, 'today']);
        Route::get('/today-colleagues', [AttendanceController::class, 'todayColleagues']);
        Route::get('/history', [AttendanceController::class, 'history']);
        Route::post('/check-in', [AttendanceController::class, 'checkIn']);
        Route::post('/check-out', [AttendanceController::class, 'checkOut']);
        Route::post('/leave', [AttendanceController::class, 'requestLeave']);
    });

    // Divisions (read-only untuk semua user)
    Route::get('/divisions', [DivisionController::class, 'index']);
    Route::get('/divisions/{division}', [DivisionController::class, 'show']);

    // Schedules (read)
    Route::get('/schedules', [ScheduleController::class, 'index']);
    Route::get('/schedules/{schedule}', [ScheduleController::class, 'show']);

    // Shared notes & Discussion Comments
    Route::patch('/notes/{note}/pin', [NoteController::class, 'togglePin']);
    Route::get('/notes/{note}/comments', [NoteController::class, 'comments']);
    Route::post('/notes/{note}/comments', [NoteController::class, 'storeComment']);
    Route::delete('/notes/{note}/comments/{comment}', [NoteController::class, 'destroyComment']);
    Route::apiResource('notes', NoteController::class);

    // ---------- Admin only ----------
    Route::middleware('role:admin')->group(function () {
        Route::get('/attendances/recap', [AttendanceController::class, 'recap']);
        Route::get('/attendances/export', [AttendanceController::class, 'exportCsv']);

        Route::post('/schedules', [ScheduleController::class, 'store']);
        Route::put('/schedules/{schedule}', [ScheduleController::class, 'update']);
        Route::delete('/schedules/{schedule}', [ScheduleController::class, 'destroy']);

        Route::apiResource('users', UserController::class);

        Route::post('/divisions', [DivisionController::class, 'store']);
        Route::put('/divisions/{division}', [DivisionController::class, 'update']);
        Route::delete('/divisions/{division}', [DivisionController::class, 'destroy']);
    });
});
