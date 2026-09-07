<?php

namespace App\Actions\System;

use App\Models\Ciian\System\Page;
use App\Models\Ciian\System\System;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;

/**
 * Rewrites `routes/systems.php` from what is currently published.
 *
 * Every published page of a published system gets a `Route::inertia()` pointing
 * at the file `GeneratePageFile` wrote for it. The whole file is regenerated
 * each time rather than appended to, so a deleted or unpublished page leaves no
 * route behind.
 */
class GenerateSystemRoutes
{
    /**
     * Rebuild the file from the database.
     */
    public function handle(): void
    {
        $path = base_path('routes/systems.php');

        if (File::put($path, $this->render()) === false) {
            throw ValidationException::withMessages([
                'shape' => __('The system routes could not be written to routes/systems.php.'),
            ]);
        }

        // A cached route table does not know about the file that was just written,
        // so the new page would 404 until the cache was rebuilt by hand.
        if (app()->routesAreCached()) {
            Artisan::call('route:cache');
        }
    }

    private function render(): string
    {
        $lines = [];

        $systems = System::query()
            ->where('status', System::STATUS_PUBLISHED)
            ->orderBy('slug')
            ->get();

        foreach ($systems as $system) {
            $pages = $system->pages()
                ->where('status', Page::STATUS_PUBLISHED)
                ->orderByDesc('is_index')
                ->orderBy('slug')
                ->get();

            if ($pages->isEmpty()) {
                continue;
            }

            $lines[] = '    // '.$this->comment($system->name);

            foreach ($pages as $page) {
                $lines[] = '    '.$this->routeFor($system, $page);
            }

            $lines[] = '';
        }

        $body = $lines === []
            ? '    // No published system pages yet.'
            : rtrim(implode("\n", $lines));

        return <<<PHP
        <?php

        use Illuminate\\Support\\Facades\\Route;

        /*
        |--------------------------------------------------------------------------
        | Created systems
        |--------------------------------------------------------------------------
        |
        | Pages belonging to systems built inside Ciian. These require
        | authentication; per-system UAC will be applied here later.
        |
        | GENERATED FILE — rewritten by App\\Actions\\System\\GenerateSystemRoutes
        | whenever a system or one of its pages is published, unpublished or
        | deleted. Do not edit by hand; your changes will be overwritten.
        |
        | Each system answers on its own top-level URL prefix, chosen when the
        | system is created. Segments Ciian itself uses are refused at validation
        | (App\\Support\\SystemUrlPrefix), and this file is required last in
        | routes/web.php so a platform route always wins a tie.
        |
        | Names use the `sys.` prefix, not `systems.`: the admin routes own that
        | one, and a system slugged `pages` would otherwise shadow
        | `systems.pages.store` with a route of its own.
        |
        */

        Route::middleware(['auth', 'verified'])->name('sys.')->group(function () {
        {$body}
        });

        PHP;
    }

    /**
     * The starting page answers on the system's own prefix; every other page
     * hangs off its slug beneath it. The page *file* is still addressed by the
     * system slug — that is the folder name, independent of the public URL.
     */
    private function routeFor(System $system, Page $page): string
    {
        $uri = $page->is_index
            ? $system->prefix
            : "{$system->prefix}/{$page->slug}";

        $component = "{$system->slug}/{$page->slug}";
        $name = "{$system->slug}.{$page->slug}";

        return "Route::inertia('{$uri}', '{$component}')->name('{$name}');";
    }

    /**
     * Names are user input and end up in a `//` comment, so anything that could
     * break out of that line is dropped.
     */
    private function comment(string $name): string
    {
        return trim(preg_replace('/\s+/', ' ', $name) ?? '');
    }
}
