<?php

/*
|--------------------------------------------------------------------------
| Guest pages (unauthenticated)
|--------------------------------------------------------------------------
*/
require __DIR__.'/guest.php';

/*
|--------------------------------------------------------------------------
| Platform administration (developers / admins)
|--------------------------------------------------------------------------
*/
require __DIR__.'/admin.php';

/*
|--------------------------------------------------------------------------
| Created systems (authenticated system pages)
|--------------------------------------------------------------------------
*/
require __DIR__.'/systems.php';

/*
|--------------------------------------------------------------------------
| Error pages
|--------------------------------------------------------------------------
|
| HTTP errors (403, 404, 500, 503, …) are not registered as routes. They are
| rendered by Inertia from AppServiceProvider via handleExceptionsUsing()
| and do not require authentication.
|
*/
