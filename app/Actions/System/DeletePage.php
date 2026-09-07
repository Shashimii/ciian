<?php

namespace App\Actions\System;

use App\Models\Ciian\System\Page;
use Illuminate\Validation\ValidationException;

class DeletePage
{
    /**
     * Delete a page.
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

        $page->delete();
    }
}
