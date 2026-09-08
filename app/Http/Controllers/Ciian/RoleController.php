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
            'permissions' => $presenter->permissions(),
        ]);
    }

    /**
     * Create a role with the permissions it was given.
     */
    public function store(StoreRoleRequest $request): RedirectResponse
    {
        $role = Role::create($request->rolePayload());

        $role->permissions()->sync($request->permissionIds());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Role Created'),
        ]);

        return to_route('roles.index');
    }

    /**
     * Update a role's details and permissions.
     *
     * Its slug is immutable, and Root's permissions are refused outright —
     * both are explained in UpdateRoleRequest.
     */
    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        $role->update($request->rolePayload());

        if (! $role->isRoot()) {
            $role->permissions()->sync($request->permissionIds());
        }

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
