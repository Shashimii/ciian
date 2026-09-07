<?php

namespace App\Actions\System;

use App\Models\Ciian\System\Page;
use App\Support\PageShapeBuilder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class PublishPage
{
    public function __construct(
        private PageShapeBuilder $shapes,
        private GeneratePageFile $files,
        private GenerateSystemRoutes $routes,
    ) {}

    /**
     * Publish or sync a page draft: copy unpub_shape → pub_shape, status=published.
     *
     * Like a system publish, this is metadata only — a page going live never
     * touches the database schema.
     */
    public function handle(Page $page): Page
    {
        $page->loadMissing('system');

        // A page is served from its system's URL prefix and lives in the folder
        // named after its slug, neither of which is settled until the system goes
        // live. Publishing one first would generate a file and a route under a
        // name still free to change.
        if (! $page->system->isPublished()) {
            throw ValidationException::withMessages([
                'shape' => __('Publish :system before publishing its pages.', [
                    'system' => $page->system->name,
                ]),
            ]);
        }

        $shape = $page->unpub_shape;

        if (! is_array($shape) || $shape === []) {
            throw ValidationException::withMessages([
                'shape' => __('This page has no draft shape to publish.'),
            ]);
        }

        try {
            $normalized = $this->shapes->normalize($shape);
            $this->shapes->validate($normalized);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'shape' => $exception->getMessage(),
            ]);
        }

        if ($page->isPublished() && ! $page->hasPendingChanges()) {
            throw ValidationException::withMessages([
                'shape' => __('This page has no pending changes to sync.'),
            ]);
        }

        $page = DB::transaction(function () use ($page, $normalized): Page {
            $page->unpub_shape = $normalized;
            $page->pub_shape = $normalized;
            $page->status = Page::STATUS_PUBLISHED;
            $page->save();

            return $page->refresh();
        });

        // Written after the row commits: a row without its file regenerates on the
        // next publish, while a file without a row is invisible and confusing.
        $page->loadMissing('system');
        $this->files->handle($page->system, $page);
        $this->routes->handle();

        return $page;
    }
}
