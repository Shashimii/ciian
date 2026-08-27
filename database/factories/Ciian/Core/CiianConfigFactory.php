<?php

namespace Database\Factories\Ciian\Core;

use App\Models\Ciian\Core\CiianConfig;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CiianConfig>
 */
class CiianConfigFactory extends Factory
{
    /**
     * @var class-string<CiianConfig>
     */
    protected $model = CiianConfig::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Ciian',
            'sys_slug' => 'ciian',
            'icon' => 'Sparkles',
            'color' => 'violet',
        ];
    }
}
