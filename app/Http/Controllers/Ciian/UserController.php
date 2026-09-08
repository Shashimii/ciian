<?php

namespace App\Http\Controllers\Ciian;

use App\Http\Controllers\Controller;
use App\Support\UserIndexPresenter;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Platform accounts.
 *
 * Sits at the `Ciian/` root rather than in a concern folder, mirroring where
 * the User, Role and Permission models live until Accounts gets one.
 */
class UserController extends Controller
{
    /**
     * List the accounts that can sign in to the platform.
     */
    public function index(UserIndexPresenter $presenter): Response
    {
        return Inertia::render('core/user/index', [
            'users' => $presenter->users(),
        ]);
    }
}
