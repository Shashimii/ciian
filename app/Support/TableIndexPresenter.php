<?php

namespace App\Support;

use App\Models\Ciian\Core\CiianConfig;
use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\System;
use App\Models\Ciian\System\SystemTable;

class TableIndexPresenter
{
    /**
     * @return list<array<string, mixed>>
     */
    public function tables(): array
    {
        $internal = InternalTable::query()
            ->orderBy('name')
            ->get()
            ->map(fn (InternalTable $table) => $this->presentInternal($table));

        $system = SystemTable::query()
            ->with('system')
            ->orderBy('name')
            ->get()
            ->map(fn (SystemTable $table) => $this->presentSystem($table));

        return $internal
            ->concat($system)
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }

    /**
     * @return list<array{value: string, label: string, icon: string}>
     */
    public function systemOptions(): array
    {
        $config = CiianConfig::query()->first();
        $ciianSlug = $config?->sys_slug ?? InternalTable::TAG_CIIAN;

        $options = [
            [
                'value' => $ciianSlug,
                'label' => $config?->name ?? 'Ciian',
                'icon' => $config?->icon ?? 'Sparkles',
                'internal' => true,
            ],
            [
                'value' => InternalTable::TAG_NO_SYSTEM,
                'label' => 'No System',
                'icon' => 'CircleDashed',
                'internal' => true,
            ],
        ];

        foreach (System::query()->orderBy('name')->get() as $system) {
            $options[] = [
                'value' => $system->slug,
                'label' => $system->name,
                'icon' => $system->icon,
                'internal' => false,
            ];
        }

        return $options;
    }

    /**
     * @return array<string, string>
     */
    public function columnTypeLabels(): array
    {
        return ColumnTypes::labels();
    }

    /**
     * @return array<string, mixed>
     */
    private function presentInternal(InternalTable $table): array
    {
        $ciianSlug = CiianConfig::query()->value('sys_slug') ?? InternalTable::TAG_CIIAN;

        return [
            'key' => "internal:{$table->id}",
            'store' => 'internal',
            'id' => $table->id,
            'name' => $table->name,
            'slug' => $table->slug,
            'icon' => $table->icon,
            'status' => $table->status,
            'has_pending_changes' => $table->hasPendingChanges(),
            'can_publish' => ! $table->isPublished() || $table->hasPendingChanges(),
            'is_sync' => $table->isPublished() && $table->hasPendingChanges(),
            'system' => $this->systemBadgeForInternal($table, $ciianSlug),
            'unpub_shape' => $table->unpub_shape,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function presentSystem(SystemTable $table): array
    {
        return [
            'key' => "system:{$table->id}",
            'store' => 'system',
            'id' => $table->id,
            'name' => $table->name,
            'slug' => $table->slug,
            'icon' => $table->system->icon,
            'status' => $table->status,
            'has_pending_changes' => $table->hasPendingChanges(),
            'can_publish' => ! $table->isPublished() || $table->hasPendingChanges(),
            'is_sync' => $table->isPublished() && $table->hasPendingChanges(),
            'system' => [
                'type' => 'system',
                'label' => $table->system->name,
                'slug' => $table->system->slug,
                'icon' => $table->system->icon,
            ],
            'unpub_shape' => $table->unpub_shape,
        ];
    }

    /**
     * @return array{type: string, label: string, slug: string, icon: string}
     */
    private function systemBadgeForInternal(InternalTable $table, string $ciianSlug): array
    {
        if ($table->tag === InternalTable::TAG_NO_SYSTEM) {
            return [
                'type' => 'no_system',
                'label' => 'No System',
                'slug' => InternalTable::TAG_NO_SYSTEM,
                'icon' => 'CircleDashed',
            ];
        }

        $config = CiianConfig::query()->first();

        return [
            'type' => 'ciian',
            'label' => $config?->name ?? 'Ciian',
            'slug' => $ciianSlug,
            'icon' => 'Sparkles',
        ];
    }
}
