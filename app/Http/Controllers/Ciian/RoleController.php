<?php

namespace App\Http\Controllers\Ciian;

use App\Actions\Role\DeleteRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ciian\StoreRoleRequest;
use App\Http\Requests\Ciian\UpdateRoleRequest;
use App\Models\Ciian\Role;
use App\Support\RoleIndexPresenter;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Platform roles.
 *
 * Sits at the `Ciian/` root alongside UserController, mirroring where the
 * Accounts models live until they get their own concern folder.
 */
class RoleController extends Controller
{
    /**
     * List the roles an account can be given.
     */
    public function index(RoleIndexPresenter $presenter): Response
    {
        return Inertia::render('core/role/index', [
            'roles' => $presenter->roles(),
        ]);
    }

    /**
     * Create a role. Permissions are attached separately.
     */
    public function store(StoreRoleRequest $request): RedirectResponse
    {
        Role::create($request->rolePayload());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Role Created'),
        ]);

        return to_route('roles.index');
    }

    /**
     * Update a role's details. Its slug is immutable — see UpdateRoleRequest.
     */
    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        $role->update($request->rolePayload());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Role Updated'),
        ]);

        return to_route('roles.index');
    }

    /**
     * Delete a role. The refusals live in the action, not here.
     */
    public function destroy(Role $role, DeleteRole $deleteRole): RedirectResponse
    {
        $deleteRole->handle($role);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Role Deleted'),
        ]);

        return to_route('roles.index');
    }
}
