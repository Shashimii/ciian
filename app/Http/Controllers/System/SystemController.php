<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Http\Requests\System\StoreSystemRequest;
use App\Http\Requests\System\UpdateCiianConfigRequest;
use App\Models\Ciian\Core\CiianConfig;
use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\System as CreatedSystem;
use App\Support\TagColors;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SystemController extends Controller
{
    /**
     * List the platform Ciian config row plus created systems.
     */
    public function index(): Response
    {
        $config = CiianConfig::query()->firstOrFail();
        $ciianTablesCount = InternalTable::query()
            ->tagged(InternalTable::TAG_CIIAN)
            ->count();

        $created = CreatedSystem::query()
            ->withCount('tables')
            ->orderBy('name')
            ->get()
            ->map(fn (CreatedSystem $system): array => [
                'key' => "system:{$system->id}",
                'kind' => 'system',
                'id' => $system->id,
                'name' => $system->name,
                'slug' => $system->slug,
                'icon' => $system->icon,
                'color' => null,
                'tables_count' => $system->tables_count,
            ])
            ->all();

        $systems = [
            [
                'key' => 'ciian',
                'kind' => 'ciian',
                'id' => $config->id,
                'name' => $config->name,
                'slug' => $config->sys_slug,
                'icon' => $config->icon,
                'color' => $config->color,
                'tables_count' => $ciianTablesCount,
            ],
            ...$created,
        ];

        return Inertia::render('system/index', [
            'systems' => $systems,
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
     * Store a newly created user system (name + slug).
     */
    public function store(StoreSystemRequest $request): RedirectResponse
    {
        CreatedSystem::query()->create([
            ...$request->validated(),
            'icon' => 'Box',
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('System created.'),
        ]);

        return to_route('systems.index');
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

        return to_route('systems.index');
    }
}
