<?php

use App\Http\Controllers\Database\TableController;
use App\Http\Controllers\System\SystemController;
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

        Route::middleware('permission:systems.manage')->group(function () {
            Route::get('systems', [SystemController::class, 'index'])->name('systems.index');
            Route::post('systems', [SystemController::class, 'store'])->name('systems.store');
        });

        Route::middleware('permission:tables.manage')->group(function () {
            Route::get('tables', [TableController::class, 'index'])->name('tables.index');
            Route::get('tables/create', [TableController::class, 'create'])->name('tables.create');
            Route::post('tables', [TableController::class, 'store'])->name('tables.store');

            Route::get('tables/internal/{internalTable}', [TableController::class, 'editInternal'])
                ->name('tables.internal.edit');
            Route::patch('tables/internal/{internalTable}', [TableController::class, 'updateInternal'])
                ->name('tables.internal.update');
            Route::post('tables/internal/{internalTable}/publish', [TableController::class, 'publishInternal'])
                ->name('tables.internal.publish');

            Route::get('tables/system/{systemTable}', [TableController::class, 'editSystem'])
                ->name('tables.system.edit');
            Route::patch('tables/system/{systemTable}', [TableController::class, 'updateSystem'])
                ->name('tables.system.update');
            Route::post('tables/system/{systemTable}/publish', [TableController::class, 'publishSystem'])
                ->name('tables.system.publish');
        });
    });
});
