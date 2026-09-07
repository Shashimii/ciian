---
paths:
  - 'routes/**'
---

# Routes

## routes/systems.php is generated — never edit it by hand
`routes/systems.php` is build output, rewritten in full by `App\Actions\System\GenerateSystemRoutes::handle()` whenever a system or one of its pages is published, or a page is deleted (`PublishSystem`, `PublishPage`, `DeletePage` all call it). Hand edits are overwritten on the next publish. The file is regenerated from scratch rather than appended to, so an unpublished or deleted page leaves no route behind.

It emits one `Route::inertia()` per published page of a published system, pointing at the file `GeneratePageFile` wrote. The starting page answers on the system's own path (`/s/payroll`); every other page hangs off its slug (`/s/payroll/reports`).

**Generated route names use the `sys.` prefix, not `systems.`.** The admin routes in `routes/admin.php` own `systems.`, and a system slugged `pages` with a page slugged `store` would otherwise emit `systems.pages.store` and shadow the real page-create route — `routes/web.php` requires `admin.php` first, so the generated one would win. Keep the prefixes distinct.

The file is **gitignored**, like every other artifact generated for a created system (`app/Models/Systems`, the page folders under `resources/js/pages`). A fresh checkout therefore has no `routes/systems.php` at all, so the `require` in `routes/web.php` is wrapped in `file_exists()` — keep that guard. Rebuild the file from the database with `php artisan ciian:sync-routes` (`App\Console\Commands\SyncSystemRoutes`); run it after `migrate` in any deploy, or every published system will 404.

`GenerateSystemRoutes` rebuilds the route cache when `app()->routesAreCached()` — without that, a cached route table would 404 the page that was just published.
