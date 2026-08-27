<?php

use App\Http\Controllers\Database\TableController;
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

        Route::middleware('permission:tables.manage')->group(function () {
            Route::get('tables', [TableController::class, 'index'])->name('tables.index');
            Route::post('tables', [TableController::class, 'store'])->name('tables.store');
            Route::patch('tables/internal/{internalTable}', [TableController::class, 'updateInternal'])
                ->name('tables.internal.update');
            Route::patch('tables/system/{systemTable}', [TableController::class, 'updateSystem'])
                ->name('tables.system.update');
        });
    });
});
