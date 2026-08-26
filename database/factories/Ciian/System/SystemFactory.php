<?php

namespace Database\Factories\Ciian\System;

use App\Models\Ciian\System\System;
use Illuminate\Database\Eloquent\Factories\Factory;
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
        $name = fake()->unique()->words(2, true);

        return [
            'name' => Str::title($name),
            'slug' => Str::slug($name),
            'icon' => 'Box',
        ];
    }
}
