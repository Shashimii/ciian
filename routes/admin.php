<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Platform administration
|--------------------------------------------------------------------------
|
| Ciian control-panel routes for developers / admins (dashboard, tables,
| system builder, etc.). Prefixed with /admin and require auth.
|
*/

Route::prefix('admin')->group(function () {
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::inertia('dashboard', 'dashboard')->name('dashboard');
    });
});
