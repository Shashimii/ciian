<?php

namespace App\Models\Ciian\Core;

use Database\Factories\Ciian\Core\CiianConfigFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $sys_slug
 * @property string $icon
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'sys_slug', 'icon'])]
class CiianConfig extends Model
{
    /** @use HasFactory<CiianConfigFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'name' => 'Ciian',
        'sys_slug' => 'ciian',
        'icon' => 'Sparkles',
    ];

    /**
     * @var string
     */
    protected $table = 'ciian_config';
}
