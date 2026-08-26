<?php

namespace Database\Factories\Ciian\System;

use App\Models\Ciian\System\System;
use App\Models\Ciian\System\SystemTable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<SystemTable>
 */
class SystemTableFactory extends Factory
{
    /**
     * @var class-string<SystemTable>
     */
    protected $model = SystemTable::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);
        $slug = Str::snake($name);

        return [
            'system_id' => System::factory(),
            'name' => Str::title($name),
            'slug' => $slug,
            'status' => SystemTable::STATUS_UNPUBLISHED,
            'unpub_shape' => [
                'tbl_name' => Str::title($name),
                'tbl_db_name' => $slug,
                'tbl_sys' => 'system',
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

    public function published(): static
    {
        return $this->state(function (array $attributes) {
            $shape = $attributes['unpub_shape'] ?? null;

            return [
                'status' => SystemTable::STATUS_PUBLISHED,
                'pub_shape' => $shape,
            ];
        });
    }
}
