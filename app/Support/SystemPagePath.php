<?php

namespace App\Support;

use App\Models\Ciian\System\Page;
use App\Models\Ciian\System\System;
use Illuminate\Support\Str;

/**
 * Resolves where a created system's generated page files live.
 *
 * Each system owns a folder named after its slug directly under
 * `resources/js/pages/`, as a sibling of Ciian's own `core/` folder, so the
 * Inertia page name is `{system}/{page}` — e.g. `payroll/index`.
 */
class SystemPagePath
{
    /**
     * Top-level folders under `resources/js/pages/` that a system slug may not
     * claim, because Ciian already owns them.
     *
     * @var list<string>
     */
    public const RESERVED_FOLDERS = ['core'];

    public function directoryFor(System $system): string
    {
        return $this->directoryForSlug($system->slug);
    }

    public function directoryForSlug(string $slug): string
    {
        return resource_path("js/pages/{$slug}");
    }

    public function fileFor(System $system, Page $page): string
    {
        return $this->directoryFor($system).DIRECTORY_SEPARATOR."{$page->slug}.tsx";
    }

    /**
     * The Inertia page name a controller renders this page with.
     */
    public function pageNameFor(System $system, Page $page): string
    {
        return "{$system->slug}/{$page->slug}";
    }

    /**
     * The React component name for a generated page, unique enough to read well
     * in a stack trace: `payroll` + `index` → `PayrollIndex`.
     */
    public function componentNameFor(System $system, Page $page): string
    {
        return Str::studly($system->slug).Str::studly($page->slug);
    }

    /**
     * A repo-relative path, for messages the user has to act on.
     */
    public function relative(string $absolute): string
    {
        $base = base_path().DIRECTORY_SEPARATOR;

        return str_replace(DIRECTORY_SEPARATOR, '/', str_replace($base, '', $absolute));
    }
}
