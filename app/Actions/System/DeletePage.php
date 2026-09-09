<?php

namespace App\Actions\System;

use App\Models\Ciian\System\Page;
use Illuminate\Validation\ValidationException;

class DeletePage
{
    public function __construct(
        private GeneratePageFile $files,
        private GenerateSystemRoutes $routes,
        private SyncSystemPermissions $permissions,
    ) {}

    /**
     * Delete a page and the file it was published to.
     *
     * The starting page is refused outright: a system without an entry point
     * has nothing to serve at its own path.
     */
    public function handle(Page $page): void
    {
        if ($page->is_index) {
            throw ValidationException::withMessages([
                'page' => __('The starting page cannot be deleted.'),
            ]);
        }

        $page->loadMissing('system');
        $system = $page->system;

        $page->delete();

        // The page's permission goes with it: a permission guarding a page that
        // no longer exists can still be attached to a role, where it grants
        // access to nothing and reads as a mistake.
        $this->permissions->removeFor($system, $page);

        // The row goes first, mirroring how a component is deleted: a file that
        // outlives its row is invisible to the builder and blocks reusing the slug.
        // Routes are rebuilt from what is left, so the deleted page stops serving.
        $this->routes->handle();
        $this->files->remove($system, $page);
    }
}
