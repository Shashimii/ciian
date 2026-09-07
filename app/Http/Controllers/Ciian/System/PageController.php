<?php

namespace App\Http\Controllers\Ciian\System;

use App\Actions\System\DeletePage;
use App\Actions\System\PublishPage;
use App\Actions\System\SavePageDraft;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ciian\System\StorePageRequest;
use App\Http\Requests\Ciian\System\UpdatePageBlocksRequest;
use App\Http\Requests\Ciian\System\UpdatePageRequest;
use App\Models\Ciian\System\Page;
use App\Models\Ciian\System\System as CreatedSystem;
use App\Support\PageBuilderPresenter;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    /**
     * Store a new page draft owned by a system.
     */
    public function store(
        StorePageRequest $request,
        CreatedSystem $system,
        SavePageDraft $savePageDraft,
    ): RedirectResponse {
        $savePageDraft->create($system, $request->pagePayload());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Page draft saved.'),
        ]);

        return back();
    }

    /**
     * Update a page draft.
     */
    public function update(
        UpdatePageRequest $request,
        CreatedSystem $system,
        Page $page,
        SavePageDraft $savePageDraft,
    ): RedirectResponse {
        $savePageDraft->update($page, $request->pagePayload());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Page draft updated.'),
        ]);

        return back();
    }

    /**
     * Open the page builder for one page.
     */
    public function edit(
        CreatedSystem $system,
        Page $page,
        PageBuilderPresenter $presenter,
    ): Response {
        return Inertia::render('core/system/page/update', [
            'system' => $presenter->system($system),
            'page' => $presenter->page($page),
            'palette' => $presenter->palette(),
        ]);
    }

    /**
     * Replace what the builder has placed on a page.
     */
    public function updateBlocks(
        UpdatePageBlocksRequest $request,
        CreatedSystem $system,
        Page $page,
        SavePageDraft $savePageDraft,
    ): RedirectResponse {
        $savePageDraft->saveBlocks($page, $request->blocks());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Page saved.'),
        ]);

        return back();
    }

    /**
     * Publish or sync a page draft.
     */
    public function publish(
        CreatedSystem $system,
        Page $page,
        PublishPage $publishPage,
    ): RedirectResponse {
        $wasSync = $page->isPublished() && $page->hasPendingChanges();

        $publishPage->handle($page);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $wasSync
                ? __('Page synced.')
                : __('Page published.'),
        ]);

        return back();
    }

    /**
     * Delete a page. The starting page is refused in the action.
     */
    public function destroy(
        CreatedSystem $system,
        Page $page,
        DeletePage $deletePage,
    ): RedirectResponse {
        $deletePage->handle($page);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Page deleted.'),
        ]);

        return back();
    }
}
