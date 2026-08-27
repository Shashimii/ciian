<?php

namespace App\Http\Controllers\Database;

use App\Actions\Database\SaveTableDraft;
use App\Http\Controllers\Controller;
use App\Http\Requests\Database\StoreTableRequest;
use App\Http\Requests\Database\UpdateTableRequest;
use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\SystemTable;
use App\Support\TableIndexPresenter;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class TableController extends Controller
{
    /**
     * List Ciian internal and system-owned table shapes.
     */
    public function index(TableIndexPresenter $presenter): Response
    {
        return Inertia::render('table/index', [
            'tables' => $presenter->tables(),
        ]);
    }

    /**
     * Show the create table form.
     */
    public function create(TableIndexPresenter $presenter): Response
    {
        return Inertia::render('table/create', [
            'systems' => $presenter->systemOptions(),
            'columnTypes' => $presenter->columnTypeLabels(),
        ]);
    }

    /**
     * Store a new table draft (unpub_shape only).
     */
    public function store(StoreTableRequest $request, SaveTableDraft $saveTableDraft): RedirectResponse
    {
        $table = $saveTableDraft->create($request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Table draft saved.'),
        ]);

        if ($table instanceof InternalTable) {
            return to_route('tables.internal.edit', $table);
        }

        return to_route('tables.system.edit', $table);
    }

    /**
     * Show the edit form for an internal table draft.
     */
    public function editInternal(InternalTable $internalTable, TableIndexPresenter $presenter): Response
    {
        return Inertia::render('table/update', [
            'table' => $presenter->present($internalTable),
            'systems' => $presenter->systemOptions(),
            'columnTypes' => $presenter->columnTypeLabels(),
        ]);
    }

    /**
     * Show the edit form for a system-owned table draft.
     */
    public function editSystem(SystemTable $systemTable, TableIndexPresenter $presenter): Response
    {
        return Inertia::render('table/update', [
            'table' => $presenter->present($systemTable),
            'systems' => $presenter->systemOptions(),
            'columnTypes' => $presenter->columnTypeLabels(),
        ]);
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

        return to_route('tables.internal.edit', $internalTable);
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

        return to_route('tables.system.edit', $systemTable);
    }
}
