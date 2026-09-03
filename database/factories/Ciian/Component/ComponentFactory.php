<?php

namespace Database\Factories\Ciian\Component;

use App\Models\Ciian\Component\Component;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Component>
 */
class ComponentFactory extends Factory
{
    /**
     * @var class-string<Component>
     */
    protected $model = Component::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // words() is typed array|string whichever way it is called, so it cannot feed
        // Str:: helpers without a cast. Two word() calls are plainly strings.
        $name = Str::title(fake()->unique()->word().' '.fake()->word());
        $slug = Str::snake($name);

        return [
            'name' => $name,
            'slug' => $slug,
            'type' => Component::TYPE_BLOCK,
            'status' => Component::STATUS_UNPUBLISHED,
            'can_delete' => true,
            'thumbnail' => null,
            'unpub_shape' => [
                'info' => [
                    'name' => $name,
                    'slug' => $slug,
                    'category' => 'application',
                    'description' => fake()->sentence(),
                ],
                'properties' => [
                    'label' => [
                        'type' => 'string',
                        'label' => 'Label',
                        'default' => $name,
                    ],
                ],
                'tsx' => "export default function Block({ label }: { label: string }) {\n  return <span>{label}</span>;\n}\n",
            ],
            'pub_shape' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => Component::STATUS_PUBLISHED,
                'pub_shape' => $attributes['unpub_shape'] ?? null,
            ];
        });
    }

    /**
     * A seeded default block: shipped with Ciian and not deletable from the UI.
     */
    public function protected(): static
    {
        return $this->state(fn (): array => ['can_delete' => false]);
    }
}
