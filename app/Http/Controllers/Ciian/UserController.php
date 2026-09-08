<?php

namespace App\Http\Controllers\Ciian;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ciian\StoreUserRequest;
use App\Models\Ciian\User;
use App\Support\UserIndexPresenter;
use Illuminate\Http\RedirectResponse;
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
            'roles' => $presenter->roles(),
        ]);
    }

    /**
     * Create an account from the admin side.
     *
     * Unlike registration, the role is chosen here rather than forced to the
     * default one, so this does not go through Fortify's CreateNewUser.
     */
    public function store(StoreUserRequest $request): RedirectResponse
    {
        $user = User::create($request->userPayload());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __(':name created.', ['name' => $user->username]),
        ]);

        return to_route('users.index');
    }
}
