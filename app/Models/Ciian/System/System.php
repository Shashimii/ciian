<?php

namespace App\Models\Ciian\System;

use Database\Factories\Ciian\System\SystemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A web application built inside Ciian: its identity, settings, and the tables it owns.
 *
 * The row carries the fields the index needs to list and filter without decoding
 * JSON; `unpub_shape` / `pub_shape` hold the full definition and stay the source
 * of truth.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $icon
 * @property string $color
 * @property string $status
 * @property array<string, mixed>|null $unpub_shape
 * @property array<string, mixed>|null $pub_shape
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, SystemTable> $tables
 * @property-read int|null $tables_count
 */
#[Fillable(['name', 'slug', 'icon', 'color', 'status', 'unpub_shape', 'pub_shape'])]
class System extends Model
{
    /** @use HasFactory<SystemFactory> */
    use HasFactory;

    public const STATUS_UNPUBLISHED = 'unpublished';

    public const STATUS_PUBLISHED = 'published';

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'icon' => 'Box',
        'color' => 'violet',
        'status' => self::STATUS_UNPUBLISHED,
    ];

    /**
     * @var string
     */
    protected $table = 'ciian_sys';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'unpub_shape' => 'array',
            'pub_shape' => 'array',
        ];
    }

    /**
     * @return HasMany<SystemTable, $this>
     */
    public function tables(): HasMany
    {
        return $this->hasMany(SystemTable::class);
    }

    /**
     * The definition consumers should run the system from: the published one once
     * it exists, otherwise the working draft.
     *
     * @return array<string, mixed>
     */
    public function shape(): array
    {
        if ($this->isPublished() && is_array($this->pub_shape)) {
            return $this->pub_shape;
        }

        return is_array($this->unpub_shape) ? $this->unpub_shape : [];
    }

    public function isPublished(): bool
    {
        return $this->status === self::STATUS_PUBLISHED;
    }

    public function hasPendingChanges(): bool
    {
        if (! $this->isPublished()) {
            return false;
        }

        return $this->unpub_shape !== $this->pub_shape;
    }

    /**
     * @param  Builder<$this>  $query
     * @return Builder<$this>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }
}
