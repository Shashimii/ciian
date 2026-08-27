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
     * Created systems available when creating a user table (ciian_sys_tbl).
     *
     * @return list<array{value: string, label: string, icon: string, internal: bool}>
     */
    public function systemOptions(): array
    {
        return System::query()
            ->orderBy('name')
            ->get()
            ->map(fn (System $system): array => [
                'value' => $system->slug,
                'label' => $system->name,
                'icon' => $system->icon,
                'internal' => false,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, string>
     */
    public function columnTypeLabels(): array
    {
        return ColumnTypes::labels();
    }

    /**
     * Published tables available as foreign-key targets.
     *
     * @return list<array{label: string, value: string}>
     */
    public function relationTables(): array
    {
        $shapes = new TableShapeBuilder;

        $internal = InternalTable::query()
            ->where('status', InternalTable::STATUS_PUBLISHED)
            ->orderBy('name')
            ->get()
            ->map(function (InternalTable $table) use ($shapes) {
                $physical = is_array($table->pub_shape)
                    ? $shapes->physicalTableName($table->pub_shape)
                    : $table->slug;

                return [
                    'label' => $table->name,
                    'value' => $physical !== '' ? $physical : $table->slug,
                ];
            });

        $system = SystemTable::query()
            ->where('status', SystemTable::STATUS_PUBLISHED)
            ->orderBy('name')
            ->get()
            ->map(function (SystemTable $table) use ($shapes) {
                $physical = is_array($table->pub_shape)
                    ? $shapes->physicalTableName($table->pub_shape)
                    : $table->slug;

                return [
                    'label' => $table->name,
                    'value' => $physical !== '' ? $physical : $table->slug,
                ];
            });

        return $internal
            ->concat($system)
            ->unique('value')
            ->sortBy('label', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function present(InternalTable|SystemTable $table): array
    {
        if ($table instanceof SystemTable) {
            $table->loadMissing('system');

            return $this->presentSystem($table);
        }

        return $this->presentInternal($table);
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
            'icon' => $config?->icon ?? 'Sparkles',
            'color' => $config?->color ?? 'violet',
        ];
    }
}
