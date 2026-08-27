<?php

namespace App\Models\Ciian\System;

use Database\Factories\Ciian\System\SystemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $icon
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, SystemTable> $tables
 * @property-read int|null $tables_count
 */
#[Fillable(['name', 'slug', 'icon'])]
class System extends Model
{
    /** @use HasFactory<SystemFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'icon' => 'Box',
    ];

    /**
     * @var string
     */
    protected $table = 'ciian_sys';

    /**
     * @return HasMany<SystemTable, $this>
     */
    public function tables(): HasMany
    {
        return $this->hasMany(SystemTable::class);
    }
}
