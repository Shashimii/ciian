<?php

namespace App\Http\Controllers\Ciian\Database;

use App\Actions\Database\DeleteTable;
use App\Actions\Database\PublishTable;
use App\Actions\Database\SaveTableDraft;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ciian\Database\StoreTableRequest;
use App\Http\Requests\Ciian\Database\UpdateTableRequest;
use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\SystemTable;
use App\Support\TableIndexPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
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
        Request $request,
        InternalTable $internalTable,
        PublishTable $publishTable,
    ): RedirectResponse {
        $wasSync = $internalTable->isPublished() && $internalTable->hasPendingChanges();

        if ($wasSync) {
            $this->verifyRootPassword($request);
        }

        $publishTable->handle($internalTable, $request->boolean('confirm_drops'));

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
        Request $request,
        SystemTable $systemTable,
        PublishTable $publishTable,
    ): RedirectResponse {
        $wasSync = $systemTable->isPublished() && $systemTable->hasPendingChanges();

        if ($wasSync) {
            $this->verifyRootPassword($request);
        }

        $publishTable->handle($systemTable, $request->boolean('confirm_drops'));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $wasSync
                ? __('Table synced.')
                : __('Table published.'),
        ]);

        return back();
    }

    /**
     * Require the current user's own password before syncing or deleting a table
     * that is currently published — on either the internal or a created-system
     * store. An unpublished draft never needs this: nothing physical is at risk.
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
     * Delete an internal (seeded Ciian) table draft and, if published, its physical table.
     */
    public function destroyInternal(Request $request, InternalTable $internalTable, DeleteTable $deleteTable): RedirectResponse
    {
        // A protected table is refused outright in DeleteTable regardless of this
        // flag, so there is nothing to gain by asking for a password first.
        $requiresPassword = $internalTable->can_delete && $internalTable->isPublished();

        if ($requiresPassword) {
            $this->verifyRootPassword($request);
        }

        $deleteTable->handle($internalTable, $requiresPassword);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Table deleted.'),
        ]);

        return to_route('tables.index');
    }

    /**
     * Delete a system-owned table draft and, if published, its physical table.
     */
    public function destroySystem(Request $request, SystemTable $systemTable, DeleteTable $deleteTable): RedirectResponse
    {
        // A protected table is refused outright in DeleteTable regardless of this
        // flag, so there is nothing to gain by asking for a password first.
        $requiresPassword = $systemTable->can_delete && $systemTable->isPublished();

        if ($requiresPassword) {
            $this->verifyRootPassword($request);
        }

        $deleteTable->handle($systemTable, $requiresPassword);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Table deleted.'),
        ]);

        return to_route('tables.index');
    }
}
