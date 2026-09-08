<?php

use App\Http\Controllers\Ciian\Component\ComponentController;
use App\Http\Controllers\Ciian\Core\DashboardController;
use App\Http\Controllers\Ciian\Database\TableController;
use App\Http\Controllers\Ciian\System\PageController;
use App\Http\Controllers\Ciian\System\SystemController;
use App\Http\Controllers\Ciian\UserController;
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
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

        Route::middleware('permission:systems.manage')->group(function () {
            Route::get('systems', [SystemController::class, 'index'])->name('systems.index');
            Route::post('systems', [SystemController::class, 'store'])->name('systems.store');
            // Registered before `systems/{system}` so that the literal path wins.
            Route::patch('systems/ciian', [SystemController::class, 'updateCiianConfig'])
                ->name('systems.ciian.update');
            Route::get('systems/{system}', [SystemController::class, 'show'])
                ->name('systems.show');
            Route::patch('systems/{system}', [SystemController::class, 'update'])
                ->name('systems.update');
            Route::post('systems/{system}/publish', [SystemController::class, 'publish'])
                ->name('systems.publish');
            Route::delete('systems/{system}', [SystemController::class, 'destroy'])
                ->name('systems.destroy');

            Route::post('systems/{system}/pages', [PageController::class, 'store'])
                ->name('systems.pages.store');
            Route::get('systems/{system}/pages/{page}/edit', [PageController::class, 'edit'])
                ->name('systems.pages.edit');
            Route::patch('systems/{system}/pages/{page}', [PageController::class, 'update'])
                ->name('systems.pages.update');
            Route::put('systems/{system}/pages/{page}/blocks', [PageController::class, 'updateBlocks'])
                ->name('systems.pages.blocks.update');
            Route::post('systems/{system}/pages/{page}/publish', [PageController::class, 'publish'])
                ->name('systems.pages.publish');
            Route::delete('systems/{system}/pages/{page}', [PageController::class, 'destroy'])
                ->name('systems.pages.destroy');
        });

        Route::middleware('permission:users.manage')->group(function () {
            Route::get('users', [UserController::class, 'index'])->name('users.index');
            Route::post('users', [UserController::class, 'store'])->name('users.store');
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
            Route::delete('tables/internal/{internalTable}', [TableController::class, 'destroyInternal'])
                ->name('tables.internal.destroy');

            Route::get('tables/system/{systemTable}', [TableController::class, 'editSystem'])
                ->name('tables.system.edit');
            Route::patch('tables/system/{systemTable}', [TableController::class, 'updateSystem'])
                ->name('tables.system.update');
            Route::post('tables/system/{systemTable}/publish', [TableController::class, 'publishSystem'])
                ->name('tables.system.publish');
            Route::delete('tables/system/{systemTable}', [TableController::class, 'destroySystem'])
                ->name('tables.system.destroy');
        });

        Route::middleware('permission:components.manage')->group(function () {
            Route::get('components', [ComponentController::class, 'index'])->name('components.index');
            Route::get('components/create', [ComponentController::class, 'create'])->name('components.create');
            Route::post('components', [ComponentController::class, 'store'])->name('components.store');
            // Registered after `components/create` so that literal path wins.
            Route::get('components/{component}', [ComponentController::class, 'show'])->name('components.show');
            Route::delete('components/{component}', [ComponentController::class, 'destroy'])->name('components.destroy');
        });
    });
});
