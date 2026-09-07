<?php

namespace App\Http\Controllers\Ciian\System;

use App\Actions\System\DeleteSystem;
use App\Actions\System\PublishSystem;
use App\Actions\System\SaveSystemDraft;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ciian\System\StoreSystemRequest;
use App\Http\Requests\Ciian\System\UpdateCiianConfigRequest;
use App\Http\Requests\Ciian\System\UpdateSystemRequest;
use App\Models\Ciian\Core\CiianConfig;
use App\Models\Ciian\System\System as CreatedSystem;
use App\Support\SystemIndexPresenter;
use App\Support\TagColors;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SystemController extends Controller
{
    /**
     * List the platform Ciian config row plus created systems.
     */
    public function index(SystemIndexPresenter $presenter): Response
    {
        // The platform's own config is edited under Settings, so the index only
        // needs the rows and the palette its create form offers.
        return Inertia::render('core/system/index', [
            'systems' => $presenter->systems(),
            'tagColors' => TagColors::OPTIONS,
        ]);
    }

    /**
     * Store a new system draft (unpub_shape only).
     */
    public function store(StoreSystemRequest $request, SaveSystemDraft $saveSystemDraft): RedirectResponse
    {
        $saveSystemDraft->create($request->systemPayload());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('System draft saved.'),
        ]);

        return to_route('systems.index');
    }

    /**
     * Show the manage page for a single created system.
     */
    public function show(CreatedSystem $system, SystemIndexPresenter $presenter): Response
    {
        return Inertia::render('core/system/view', [
            'system' => $presenter->present($system->loadCount('tables')),
            'pages' => $presenter->pages($system),
            'tagColors' => TagColors::OPTIONS,
        ]);
    }

    /**
     * Update a system draft (metadata + unpub_shape).
     */
    public function update(
        UpdateSystemRequest $request,
        CreatedSystem $system,
        SaveSystemDraft $saveSystemDraft,
    ): RedirectResponse {
        $saveSystemDraft->update($system, $request->systemPayload());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('System draft updated.'),
        ]);

        return back();
    }

    /**
     * Publish or sync a system draft, taking it live at its entry path.
     */
    public function publish(CreatedSystem $system, PublishSystem $publishSystem): RedirectResponse
    {
        $wasSync = $system->isPublished() && $system->hasPendingChanges();

        $publishSystem->handle($system);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $wasSync
                ? __('System synced.')
                : __('System published.'),
        ]);

        return back();
    }

    /**
     * Delete a system, its pages, and everything generated for it.
     */
    public function destroy(
        Request $request,
        CreatedSystem $system,
        DeleteSystem $deleteSystem,
    ): RedirectResponse {
        $requiresPassword = $system->isPublished();

        if ($requiresPassword) {
            $this->verifyRootPassword($request);
        }

        $deleteSystem->handle($system, $requiresPassword);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('System deleted.'),
        ]);

        return to_route('systems.index');
    }

    /**
     * Require the current user's own password before deleting a system that is
     * currently published — it is live at its prefix and its pages are being
     * served. An unpublished draft never needs this.
     */
    private function verifyRootPassword(Request $request): void
    {
        $password = (string) $request->input('root_password', '');

        if ($password === '' || ! Hash::check($password, (string) $request->user()?->password)) {
            throw ValidationException::withMessages([
                'root_password' => __('Incorrect password.'),
            ]);
        }
    }

    /**
     * Show the platform Ciian config under Settings.
     */
    public function editCiianConfig(): Response
    {
        $config = CiianConfig::query()->firstOrFail();

        return Inertia::render('core/settings/ciian', [
            'ciianConfig' => [
                'id' => $config->id,
                'name' => $config->name,
                'sys_slug' => $config->sys_slug,
                'icon' => $config->icon,
                'color' => $config->color,
            ],
            'tagColors' => TagColors::OPTIONS,
        ]);
    }

    /**
     * Update platform Ciian config (name, sys_slug, icon).
     */
    public function updateCiianConfig(UpdateCiianConfigRequest $request): RedirectResponse
    {
        $config = CiianConfig::query()->firstOrFail();
        $config->update($request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Ciian settings saved.'),
        ]);

        // Back rather than a fixed route: the form lives under Settings, but the
        // endpoint is reachable from anywhere the config is editable.
        return back();
    }
}
