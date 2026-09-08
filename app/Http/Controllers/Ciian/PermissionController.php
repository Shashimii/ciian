<?php

namespace App\Http\Controllers\Ciian;

use App\Http\Controllers\Controller;
use App\Support\PermissionIndexPresenter;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Platform permissions.
 *
 * Read-only for now. Permissions are not hand-authored: the shipped ones come
 * from `SystemDefaultsSeeder`, and the ones a created system defines for its
 * own pages will be written by the System Builder rather than typed in here.
 */
class PermissionController extends Controller
{
    /**
     * List the permissions a role can be given.
     */
    public function index(PermissionIndexPresenter $presenter): Response
    {
        return Inertia::render('core/permission/index', [
            'permissions' => $presenter->permissions(),
        ]);
    }
}
