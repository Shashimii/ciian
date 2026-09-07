<?php

namespace App\Support;

use App\Models\Ciian\Core\CiianConfig;
use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\Page;
use App\Models\Ciian\System\System;

class SystemIndexPresenter
{
    /**
     * The Ciian platform row followed by every created system.
     *
     * @return list<array<string, mixed>>
     */
    public function systems(): array
    {
        $created = System::query()
            ->withCount('tables')
            ->orderBy('name')
            ->get()
            ->map(fn (System $system): array => $this->present($system))
            ->all();

        return [
            $this->presentCiian(),
            ...$created,
        ];
    }

    /**
     * The system's pages, starting page first, for its manage page.
     *
     * @return list<array<string, mixed>>
     */
    public function pages(System $system): array
    {
        $pages = [];

        foreach ($system->pages()->orderByDesc('is_index')->orderBy('name')->get() as $page) {
            $pages[] = $this->presentPage($page, $system);
        }

        return $pages;
    }

    /**
     * @return array<string, mixed>
     */
    public function present(System $system): array
    {
        $shape = is_array($system->unpub_shape) ? $system->unpub_shape : [];

        return [
            'key' => "system:{$system->id}",
            'kind' => 'system',
            'id' => $system->id,
            'name' => $system->name,
            'slug' => $system->slug,
            'prefix' => $system->prefix,
            'icon' => $system->icon,
            'color' => $system->color,
            'description' => $shape['description'] ?? null,
            'entry' => $shape['entry'] ?? null,
            'status' => $system->status,
            'has_pending_changes' => $system->hasPendingChanges(),
            'can_publish' => ! $system->isPublished() || $system->hasPendingChanges(),
            'is_sync' => $system->isPublished() && $system->hasPendingChanges(),
            // The slug is the live entry path, so it locks on publish.
            // The slug names the generated page folder and the prefix is the live
            // URL, so both lock together when the system is published.
            'can_edit_slug' => ! $system->isPublished(),
            'tables_count' => $system->tables_count ?? $system->tables()->count(),
            'unpub_shape' => $system->unpub_shape,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function presentPage(Page $page, System $system): array
    {
        $shape = is_array($page->unpub_shape) ? $page->unpub_shape : [];
        $path = is_string($shape['path'] ?? null) ? $shape['path'] : '/';

        return [
            'key' => "page:{$page->id}",
            'id' => $page->id,
            'name' => $page->name,
            'slug' => $page->slug,
            'is_index' => $page->is_index,
            'path' => $path,
            // What the page will answer on once the system is live.
            'url' => rtrim(rtrim((string) ($system->unpub_shape['entry'] ?? ''), '/').$path, '/') ?: '/',
            'status' => $page->status,
            'has_pending_changes' => $page->hasPendingChanges(),
            'can_publish' => ! $page->isPublished() || $page->hasPendingChanges(),
            'is_sync' => $page->isPublished() && $page->hasPendingChanges(),
            // The starting page is the system's entry point: it never goes away,
            // and its slug is not the user's to change.
            'can_delete' => ! $page->is_index,
            'can_edit_slug' => ! $page->is_index && ! $page->isPublished(),
        ];
    }

    /**
     * The platform itself. It has no shape and is always live, so it never
     * publishes — it is edited through the Ciian settings panel instead.
     *
     * @return array<string, mixed>
     */
    private function presentCiian(): array
    {
        $config = CiianConfig::query()->firstOrFail();

        return [
            'key' => 'ciian',
            'kind' => 'ciian',
            'id' => $config->id,
            'name' => $config->name,
            'slug' => $config->sys_slug,
            // The platform is the site root, not a prefixed system.
            'prefix' => '',
            'icon' => $config->icon,
            'color' => $config->color,
            'description' => null,
            'entry' => '/',
            'status' => System::STATUS_PUBLISHED,
            'has_pending_changes' => false,
            'can_publish' => false,
            'is_sync' => false,
            'can_edit_slug' => false,
            'tables_count' => InternalTable::query()
                ->tagged(InternalTable::TAG_CIIAN)
                ->count(),
            'unpub_shape' => null,
        ];
    }
}
