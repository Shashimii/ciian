<?php

namespace Database\Factories\Ciian\Database;

use App\Models\Ciian\Database\InternalTable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<InternalTable>
 */
class InternalTableFactory extends Factory
{
    /**
     * @var class-string<InternalTable>
     */
    protected $model = InternalTable::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);
        $slug = Str::snake($name);

        return [
            'name' => Str::title($name),
            'slug' => $slug,
            'tag' => InternalTable::TAG_CIIAN,
            'icon' => 'Sparkles',
            'status' => InternalTable::STATUS_UNPUBLISHED,
            'unpub_shape' => [
                'tbl_name' => Str::title($name),
                'tbl_db_name' => $slug,
                'tbl_sys' => InternalTable::TAG_CIIAN,
                'columns' => [
                    [
                        'name' => 'id',
                        'type' => 'id',
                        'nullable' => false,
                        'auto_increment' => true,
                    ],
                ],
                'timestamps' => true,
            ],
            'pub_shape' => null,
        ];
    }

    public function noSystem(): static
    {
        return $this->state(fn (array $attributes) => [
            'tag' => InternalTable::TAG_NO_SYSTEM,
            'icon' => 'CircleDashed',
            'unpub_shape' => array_merge($attributes['unpub_shape'] ?? [], [
                'tbl_sys' => InternalTable::TAG_NO_SYSTEM,
            ]),
        ]);
    }

    public function published(): static
    {
        return $this->state(function (array $attributes) {
            $shape = $attributes['unpub_shape'] ?? null;

            return [
                'status' => InternalTable::STATUS_PUBLISHED,
                'pub_shape' => $shape,
            ];
        });
    }
}
