<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Http\Requests\System\StoreSystemRequest;
use App\Models\Ciian\System\System;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SystemController extends Controller
{
    /**
     * List created systems.
     */
    public function index(): Response
    {
        $systems = System::query()
            ->withCount('tables')
            ->orderBy('name')
            ->get()
            ->map(fn (System $system): array => [
                'id' => $system->id,
                'name' => $system->name,
                'slug' => $system->slug,
                'icon' => $system->icon,
                'tables_count' => $system->tables_count,
            ])
            ->all();

        return Inertia::render('system/index', [
            'systems' => $systems,
        ]);
    }

    /**
     * Store a newly created system.
     */
    public function store(StoreSystemRequest $request): RedirectResponse
    {
        System::query()->create($request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('System created.'),
        ]);

        return to_route('systems.index');
    }
}
