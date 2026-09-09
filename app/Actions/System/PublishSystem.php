<?php

namespace App\Actions\System;

use App\Models\Ciian\System\System;
use App\Support\SystemShapeBuilder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class PublishSystem
{
    public function __construct(
        private SystemShapeBuilder $shapes,
        private GeneratePageFile $files,
        private GenerateSystemRoutes $routes,
        private PublishPage $pages,
    ) {}

    /**
     * Publish or sync a system draft: copy unpub_shape → pub_shape, status=published.
     *
     * Publishing takes the system live at its entry path, and its starting page
     * goes live with it — an entry path that answers nothing is not live. It does
     * not touch the tables the system owns. Those carry their own draft/published
     * state and are published from the Tables module, so a system going live
     * never runs DDL.
     */
    public function handle(System $system): System
    {
        $shape = $system->unpub_shape;

        if (! is_array($shape) || $shape === []) {
            throw ValidationException::withMessages([
                'shape' => __('This system has no draft shape to publish.'),
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

        if ($system->isPublished() && ! $system->hasPendingChanges()) {
            throw ValidationException::withMessages([
                'shape' => __('This system has no pending changes to sync.'),
            ]);
        }

        $system = DB::transaction(function () use ($system, $normalized): System {
            $system->unpub_shape = $normalized;
            $system->pub_shape = $normalized;
            $system->status = System::STATUS_PUBLISHED;
            $system->save();

            return $system->refresh();
        });

        $this->publishIndexPage($system);

        // Going live gives the system its own page folder under resources/js/pages,
        // holding a file for each page that is already published, and puts those
        // pages on the route table.
        $this->files->handleSystem($system);
        $this->routes->handle();

        return $system;
    }

    /**
     * Take the starting page live alongside the system. Runs after the system
     * row is published, since a page refuses to publish under a draft system.
     * A page already live with nothing pending is left alone.
     */
    private function publishIndexPage(System $system): void
    {
        $index = $system->indexPage()->first();

        if ($index === null) {
            return;
        }

        if ($index->isPublished() && ! $index->hasPendingChanges()) {
            return;
        }

        $this->pages->handle($index);
    }
}
