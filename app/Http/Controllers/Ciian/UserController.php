<?php

namespace App\Http\Controllers\Ciian;

use App\Actions\User\DeleteUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ciian\StoreUserRequest;
use App\Http\Requests\Ciian\UpdateUserRequest;
use App\Models\Ciian\User;
use App\Support\UserIndexPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        User::create($request->userPayload());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('User Created'),
        ]);

        return to_route('users.index');
    }

    /**
     * Update an account's details and role.
     */
    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $user->update($request->userPayload());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('User Updated'),
        ]);

        return to_route('users.index');
    }

    /**
     * Delete an account. The refusals live in the action, not here.
     */
    public function destroy(Request $request, User $user, DeleteUser $deleteUser): RedirectResponse
    {
        $deleteUser->handle($user, $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('User Deleted'),
        ]);

        return to_route('users.index');
    }
}
