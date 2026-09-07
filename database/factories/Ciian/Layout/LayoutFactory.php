<?php

namespace Database\Factories\Ciian\Layout;

use App\Models\Ciian\Layout\Layout;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Layout>
 */
class LayoutFactory extends Factory
{
    /**
     * @var class-string<Layout>
     */
    protected $model = Layout::class;

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
            'type' => Layout::TYPE_SHELL,
            'status' => Layout::STATUS_UNPUBLISHED,
            'can_delete' => true,
            'thumbnail' => null,
            'unpub_shape' => [
                'creator' => fake()->name(),
                'information' => [
                    'name' => $name,
                    'slug' => $slug,
                    'category' => 'shell',
                    'can_delete' => true,
                    'description' => fake()->sentence(),
                ],
                'regions' => [
                    'main' => [
                        'label' => 'Main',
                    ],
                ],
                'tsx' => "export default function Shell({ main }: { main: ReactNode }) {\n  return <main>{main}</main>;\n}\n",
            ],
            'pub_shape' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => Layout::STATUS_PUBLISHED,
                'pub_shape' => $attributes['unpub_shape'] ?? null,
            ];
        });
    }

    /**
     * A seeded default shell: shipped with Ciian and not deletable from the UI.
     */
    public function protected(): static
    {
        return $this->state(fn (): array => ['can_delete' => false]);
    }
}
