<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Guest pages
|--------------------------------------------------------------------------
|
| Public entry points for unauthenticated users. The main index / welcome
| page lives here and does not require authentication.
|
*/

Route::inertia('/', 'welcome')->name('home');
