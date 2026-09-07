<?php

namespace App\Actions\Component;

use App\Models\Ciian\Component\Component;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Removes a component: its `ciian_cmp` row and the generated TSX file that
 * `UploadComponent` wrote under `resources/js/components/custom/`.
 */
class DeleteComponent
{
    /**
     * Refused unconditionally when the row's `can_delete` column is false — the
     * seeded `default/` blocks ship with it off, and only a developer clearing the
     * column directly in the database can make one deletable again.
     *
     * @throws ValidationException
     */
    public function handle(Component $component): void
    {
        if (! $component->can_delete) {
            throw ValidationException::withMessages([
                'component' => __('This is a protected component and cannot be deleted.'),
            ]);
        }

        $relative = "resources/js/components/custom/{$component->slug}.tsx";
        $path = resource_path("js/components/custom/{$component->slug}.tsx");

        try {
            DB::transaction(fn () => $component->delete());
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'component' => __('Deleting the component failed: :message', [
                    'message' => $exception->getMessage(),
                ]),
            ]);
        }

        // The row goes first on purpose: a row outliving its file is a state the app
        // already tolerates (a fresh deploy starts with an empty `custom/` folder),
        // while a file outliving its row is invisible to the builder and blocks
        // re-uploading the same slug.
        if (File::exists($path) && ! File::delete($path)) {
            throw ValidationException::withMessages([
                'component' => __('The component was removed, but :path could not be deleted. Remove it manually.', [
                    'path' => $relative,
                ]),
            ]);
        }
    }
}
