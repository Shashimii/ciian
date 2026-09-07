<?php

namespace App\Actions\System;

use App\Models\Ciian\System\System;
use App\Support\SystemShapeBuilder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class SaveSystemDraft
{
    public function __construct(
        private SystemShapeBuilder $shapes,
        private SavePageDraft $pages,
        private GeneratePageFile $files,
    ) {}

    /**
     * Create a draft system row and store the normalized shape in unpub_shape.
     *
     * The system's starting page is created in the same transaction, so a system
     * never exists without an entry point to serve.
     *
     * @param  array{
     *     name: string,
     *     slug: string,
     *     prefix: string,
     *     icon?: string|null,
     *     color?: string|null,
     *     description?: string|null
     * }  $input
     */
    public function create(array $input): System
    {
        $icon = $input['icon'] ?? 'Box';
        $color = $input['color'] ?? 'violet';

        $shape = $this->buildShape([
            'sys_name' => $input['name'],
            'sys_slug' => $input['slug'],
            'prefix' => $input['prefix'],
            'icon' => $icon,
            'color' => $color,
            'description' => $input['description'] ?? null,
        ]);

        return DB::transaction(function () use ($input, $shape): System {
            $system = System::query()->create([
                'name' => $input['name'],
                'slug' => $shape['sys_slug'],
                'prefix' => $shape['prefix'],
                'icon' => $shape['icon'],
                'color' => $shape['color'],
                'status' => System::STATUS_UNPUBLISHED,
                'unpub_shape' => $shape,
                'pub_shape' => null,
            ]);

            $this->pages->createIndex($system);

            return $system;
        });
    }

    /**
     * Update draft metadata and unpub_shape.
     *
     * The slug names the system's generated page folder and the prefix is the URL
     * it answers on, so both are only editable while the system is still a draft —
     * the same rule the Database Engine applies to a published table's physical
     * name.
     *
     * @param  array{
     *     name?: string,
     *     slug?: string,
     *     prefix?: string,
     *     icon?: string|null,
     *     color?: string|null,
     *     description?: string|null
     * }  $input
     */
    public function update(System $system, array $input): System
    {
        $current = is_array($system->unpub_shape) ? $system->unpub_shape : [];
        $locked = $system->isPublished();

        $slug = $locked ? $system->slug : ($input['slug'] ?? $system->slug);
        $prefix = $locked ? $system->prefix : ($input['prefix'] ?? $system->prefix);

        $shape = $this->buildShape([
            ...$current,
            'sys_name' => $input['name'] ?? $system->name,
            'sys_slug' => $slug,
            'prefix' => $prefix,
            'icon' => $input['icon'] ?? $system->icon,
            'color' => $input['color'] ?? $system->color,
            'description' => array_key_exists('description', $input)
                ? $input['description']
                : ($current['description'] ?? null),
        ]);

        $previousSlug = $system->slug;

        $system = DB::transaction(function () use ($system, $shape, $previousSlug): System {
            $system->name = $shape['sys_name'];
            $system->slug = $shape['sys_slug'];
            $system->prefix = $shape['prefix'];
            $system->icon = $shape['icon'];
            $system->color = $shape['color'];
            $system->unpub_shape = $shape;
            $system->save();

            if ($previousSlug !== $system->slug) {
                $this->pages->reslugSystem($system);
            }

            return $system->refresh();
        });

        // The system's page folder is named after its slug, so a rename has to take
        // any already generated pages with it rather than stranding them.
        $this->files->moveDirectory($previousSlug, $system->slug);

        return $system;
    }

    /**
     * @param  array<string, mixed>  $shape
     * @return array<string, mixed>
     */
    private function buildShape(array $shape): array
    {
        $normalized = $this->shapes->normalize($shape);

        try {
            $this->shapes->validate($normalized);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'shape' => $exception->getMessage(),
            ]);
        }

        return $normalized;
    }
}
