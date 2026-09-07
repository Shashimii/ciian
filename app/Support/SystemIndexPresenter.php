<?php

namespace App\Support;

use App\Models\Ciian\Core\CiianConfig;
use App\Models\Ciian\Database\InternalTable;
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
            'icon' => $system->icon,
            'color' => $system->color,
            'description' => $shape['description'] ?? null,
            'entry' => $shape['entry'] ?? null,
            'status' => $system->status,
            'has_pending_changes' => $system->hasPendingChanges(),
            'can_publish' => ! $system->isPublished() || $system->hasPendingChanges(),
            'is_sync' => $system->isPublished() && $system->hasPendingChanges(),
            // The slug is the live entry path, so it locks on publish.
            'can_edit_slug' => ! $system->isPublished(),
            'tables_count' => $system->tables_count ?? $system->tables()->count(),
            'unpub_shape' => $system->unpub_shape,
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
