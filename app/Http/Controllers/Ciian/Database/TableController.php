<?php

namespace App\Http\Controllers\Ciian\Database;

use App\Actions\Database\PublishTable;
use App\Actions\Database\SaveTableDraft;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ciian\Database\StoreTableRequest;
use App\Http\Requests\Ciian\Database\UpdateTableRequest;
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
            'relationTables' => $presenter->relationTables(),
        ]);
    }

    /**
     * Store a new table draft (unpub_shape only).
     */
    public function store(StoreTableRequest $request, SaveTableDraft $saveTableDraft): RedirectResponse
    {
        $saveTableDraft->create($request->tablePayload());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Table draft saved.'),
        ]);

        return to_route('tables.index');
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
            'relationTables' => $presenter->relationTables(),
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
            'relationTables' => $presenter->relationTables(),
        ]);
    }

    /**
     * Update an internal (seeded Ciian) table draft.
     */
    public function updateInternal(
        UpdateTableRequest $request,
        InternalTable $internalTable,
        SaveTableDraft $saveTableDraft,
    ): RedirectResponse {
        $saveTableDraft->update($internalTable, $request->tablePayload());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Table draft updated.'),
        ]);

        return to_route('tables.index');
    }

    /**
     * Update a system-owned table draft.
     */
    public function updateSystem(
        UpdateTableRequest $request,
        SystemTable $systemTable,
        SaveTableDraft $saveTableDraft,
    ): RedirectResponse {
        $saveTableDraft->update($systemTable, $request->tablePayload());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Table draft updated.'),
        ]);

        return to_route('tables.index');
    }

    /**
     * Publish or sync an internal table draft to a physical table.
     */
    public function publishInternal(
        InternalTable $internalTable,
        PublishTable $publishTable,
    ): RedirectResponse {
        $wasSync = $internalTable->isPublished() && $internalTable->hasPendingChanges();

        $publishTable->handle($internalTable);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $wasSync
                ? __('Table synced.')
                : __('Table published.'),
        ]);

        return back();
    }

    /**
     * Publish or sync a system-owned table draft to a physical table.
     */
    public function publishSystem(
        SystemTable $systemTable,
        PublishTable $publishTable,
    ): RedirectResponse {
        $wasSync = $systemTable->isPublished() && $systemTable->hasPendingChanges();

        $publishTable->handle($systemTable);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $wasSync
                ? __('Table synced.')
                : __('Table published.'),
        ]);

        return back();
    }
}
