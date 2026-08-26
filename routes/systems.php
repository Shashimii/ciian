<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Created systems
|--------------------------------------------------------------------------
|
| Pages belonging to systems built inside Ciian. These require
| authentication; per-system UAC will be applied here later.
|
*/

Route::middleware(['auth', 'verified'])->prefix('s')->name('systems.')->group(function () {
    // System routes will be registered here.
});
