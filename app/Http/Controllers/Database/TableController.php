<?php

namespace App\Http\Controllers\Database;

use App\Actions\Database\SaveTableDraft;
use App\Http\Controllers\Controller;
use App\Http\Requests\Database\StoreTableRequest;
use App\Http\Requests\Database\UpdateTableRequest;
use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\SystemTable;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class TableController extends Controller
{
    /**
     * Store a new table draft (unpub_shape only).
     */
    public function store(StoreTableRequest $request, SaveTableDraft $saveTableDraft): RedirectResponse
    {
        $saveTableDraft->create($request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Table draft saved.'),
        ]);

        return back();
    }

    /**
     * Update an internal (Ciian / No System) table draft.
     */
    public function updateInternal(
        UpdateTableRequest $request,
        InternalTable $internalTable,
        SaveTableDraft $saveTableDraft,
    ): RedirectResponse {
        $saveTableDraft->update($internalTable, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Table draft updated.'),
        ]);

        return back();
    }

    /**
     * Update a system-owned table draft.
     */
    public function updateSystem(
        UpdateTableRequest $request,
        SystemTable $systemTable,
        SaveTableDraft $saveTableDraft,
    ): RedirectResponse {
        $saveTableDraft->update($systemTable, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Table draft updated.'),
        ]);

        return back();
    }
}
