<?php

namespace Database\Factories\Ciian;

use App\Models\Ciian\Permission;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Permission>
 */
class PermissionFactory extends Factory
{
    /**
     * @var class-string<Permission>
     */
    protected $model = Permission::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'name' => Str::title($name),
            'slug' => Str::of($name)->slug('.')->toString(),
            'description' => fake()->sentence(),
        ];
    }
}
