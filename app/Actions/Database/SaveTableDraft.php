<?php

namespace App\Actions\Database;

use App\Models\Ciian\Core\CiianConfig;
use App\Models\Ciian\Database\InternalTable;
use App\Models\Ciian\System\System;
use App\Models\Ciian\System\SystemTable;
use App\Support\TableShapeBuilder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class SaveTableDraft
{
    public function __construct(private TableShapeBuilder $shapes) {}

    /**
     * Create a user table draft on ciian_sys_tbl (requires a created system).
     *
     * Seeded platform shapes stay on ciian_int_tbl and are not created here.
     *
     * @param  array{
     *     name: string,
     *     slug: string,
     *     system: string,
     *     icon?: string|null,
     *     shape: array<string, mixed>
     * }  $input
     */
    public function create(array $input): SystemTable
    {
        $system = $this->resolveCreatedSystem($input['system']);
        $shape = $this->buildShape(
            shape: $input['shape'],
            name: $input['name'],
            slug: $input['slug'],
            tblSys: $system->slug,
        );

        return DB::transaction(function () use ($input, $system, $shape) {
            return SystemTable::query()->create([
                'system_id' => $system->id,
                'name' => $input['name'],
                'slug' => $input['slug'],
                'status' => SystemTable::STATUS_UNPUBLISHED,
                'unpub_shape' => $shape,
                'pub_shape' => null,
            ]);
        });
    }

    /**
     * Update draft metadata and/or unpub_shape. System ownership and slug stay locked.
     *
     * @param  array{
     *     name?: string,
     *     icon?: string|null,
     *     shape: array<string, mixed>
     * }  $input
     */
    public function update(InternalTable|SystemTable $table, array $input): InternalTable|SystemTable
    {
        $name = $input['name'] ?? $table->name;
        $shape = $this->buildShape(
            shape: $input['shape'],
            name: $name,
            slug: $table->slug,
            tblSys: $this->tblSysFor($table),
        );

        return DB::transaction(function () use ($table, $input, $name, $shape) {
            $table->name = $name;
            $table->unpub_shape = $shape;

            if ($table instanceof InternalTable && array_key_exists('icon', $input) && $input['icon'] !== null) {
                $table->icon = $input['icon'];
            }

            $table->save();

            return $table->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $shape
     * @return array<string, mixed>
     */
    private function buildShape(array $shape, string $name, string $slug, string $tblSys): array
    {
        $columns = $shape['columns'] ?? [];

        if (! is_array($columns) || $columns === []) {
            $normalized = $this->shapes->make($name, $slug, $tblSys, timestamps: (bool) ($shape['timestamps'] ?? true));
        } else {
            $normalized = $this->shapes->normalize([
                ...$shape,
                'tbl_name' => $name,
                'tbl_db_name' => $slug,
                'tbl_sys' => $tblSys,
            ]);
        }

        try {
            $this->shapes->validate($normalized);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'shape' => $exception->getMessage(),
            ]);
        }

        return $normalized;
    }

    private function resolveCreatedSystem(string $system): System
    {
        $createdSystem = System::query()->where('slug', $system)->first();

        if ($createdSystem === null) {
            throw ValidationException::withMessages([
                'system' => __('The selected system is invalid. Create a system first.'),
            ]);
        }

        return $createdSystem;
    }

    private function tblSysFor(InternalTable|SystemTable $table): string
    {
        if ($table instanceof SystemTable) {
            $table->loadMissing('system');

            return $table->system->slug;
        }

        if ($table->tag === InternalTable::TAG_NO_SYSTEM) {
            return InternalTable::TAG_NO_SYSTEM;
        }

        return $this->ciianSysSlug();
    }

    private function ciianSysSlug(): string
    {
        return CiianConfig::query()->value('sys_slug') ?? InternalTable::TAG_CIIAN;
    }
}
