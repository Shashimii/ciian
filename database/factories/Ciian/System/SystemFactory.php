<?php

namespace Database\Factories\Ciian\System;

use App\Models\Ciian\System\System;
use App\Support\SystemShapeBuilder;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

/**
 * @extends Factory<System>
 */
class SystemFactory extends Factory
{
    /**
     * @var class-string<System>
     */
    protected $model = System::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title(implode(' ', Arr::wrap(fake()->unique()->words(2))));
        $slug = Str::snake(Str::slug($name, '_'));

        return [
            'name' => $name,
            'slug' => $slug,
            'icon' => 'Box',
            'color' => 'violet',
            'status' => System::STATUS_UNPUBLISHED,
            'unpub_shape' => (new SystemShapeBuilder)->make(
                sysName: $name,
                sysSlug: $slug,
            ),
            'pub_shape' => null,
        ];
    }

    /**
     * A system already live at its entry path, with no pending changes.
     */
    public function published(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => System::STATUS_PUBLISHED,
            'pub_shape' => $attributes['unpub_shape'] ?? null,
        ]);
    }
}
