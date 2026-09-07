<?php

namespace Database\Factories\Ciian\System;

use App\Models\Ciian\System\Page;
use App\Models\Ciian\System\System;
use App\Support\PageShapeBuilder;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

/**
 * @extends Factory<Page>
 */
class PageFactory extends Factory
{
    /**
     * @var class-string<Page>
     */
    protected $model = Page::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title(implode(' ', Arr::wrap(fake()->unique()->words(2))));
        $slug = Str::snake(Str::slug($name, '_'));

        return [
            'system_id' => System::factory(),
            'name' => $name,
            'slug' => $slug,
            'is_index' => false,
            'status' => Page::STATUS_UNPUBLISHED,
            'unpub_shape' => fn (array $attributes): array => (new PageShapeBuilder)->make(
                pgName: $name,
                pgSlug: $slug,
                pgSys: System::query()->whereKey($attributes['system_id'])->value('slug') ?? '',
            ),
            'pub_shape' => null,
        ];
    }

    /**
     * The starting page a system is created with.
     */
    public function index(): static
    {
        return $this->state(fn (): array => [
            'name' => Page::INDEX_NAME,
            'slug' => Page::INDEX_SLUG,
            'is_index' => true,
        ]);
    }

    /**
     * A page already live at its path, with no pending changes.
     */
    public function published(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => Page::STATUS_PUBLISHED,
            'pub_shape' => $attributes['unpub_shape'] ?? null,
        ]);
    }
}
