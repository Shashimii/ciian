<?php

namespace App\Models\Ciian\System;

use Database\Factories\Ciian\System\PageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A page inside a created system.
 *
 * Every system owns exactly one page with `is_index` set: the entry point served
 * at the system's own path. It is created with the system and cannot be deleted.
 *
 * @property int $id
 * @property int $system_id
 * @property string $name
 * @property string $slug
 * @property bool $is_index
 * @property string $status
 * @property array<string, mixed>|null $unpub_shape
 * @property array<string, mixed>|null $pub_shape
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read System $system
 */
#[Fillable(['system_id', 'name', 'slug', 'is_index', 'status', 'unpub_shape', 'pub_shape'])]
class Page extends Model
{
    /** @use HasFactory<PageFactory> */
    use HasFactory;

    public const STATUS_UNPUBLISHED = 'unpublished';

    public const STATUS_PUBLISHED = 'published';

    /** Slug and name every system's starting page is created with. */
    public const INDEX_SLUG = 'index';

    public const INDEX_NAME = 'Index';

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'is_index' => false,
        'status' => self::STATUS_UNPUBLISHED,
    ];

    /**
     * @var string
     */
    protected $table = 'ciian_sys_pg';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_index' => 'boolean',
            'unpub_shape' => 'array',
            'pub_shape' => 'array',
        ];
    }

    /**
     * @return BelongsTo<System, $this>
     */
    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    /**
     * The definition consumers should render from: the published one once it
     * exists, otherwise the working draft.
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
    public function scopeIndex(Builder $query): Builder
    {
        return $query->where('is_index', true);
    }
}
