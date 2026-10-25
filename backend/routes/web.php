<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'Absensi & Kolaborasi Divisi API is running.',
    ]);
});
