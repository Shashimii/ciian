<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Models\Ciian\System\System;
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
}
