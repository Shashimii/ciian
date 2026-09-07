<?php

namespace App\Http\Controllers\Ciian\Core;

use App\Http\Controllers\Controller;
use App\Models\Ciian\Component\Component;
use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\System;
use App\Models\Ciian\System\SystemTable;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * The control panel's landing page: what version is running, and a way into
     * each module without going through the sidebar.
     */
    public function index(): Response
    {
        return Inertia::render('core/dashboard', [
            'release' => [
                'version' => config('ciian.version'),
                'stage' => config('ciian.stage'),
            ],
            'counts' => [
                'systems' => System::query()->count(),
                'components' => Component::query()->count(),
                // Both stores are listed together in the Tables module, so the
                // shortcut counts them the same way.
                'tables' => InternalTable::query()->count() + SystemTable::query()->count(),
            ],
        ]);
    }
}
