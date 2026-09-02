<?php

namespace App\Models\Ciian\Database;

use Database\Factories\Ciian\Database\InternalTableFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $tag
 * @property string $icon
 * @property string $status
 * @property bool $can_delete
 * @property array<string, mixed>|null $unpub_shape
 * @property array<string, mixed>|null $pub_shape
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'slug', 'tag', 'icon', 'status', 'can_delete', 'unpub_shape', 'pub_shape'])]
class InternalTable extends Model
{
    /** @use HasFactory<InternalTableFactory> */
    use HasFactory;

    public const TAG_CIIAN = 'ciian';

    public const TAG_NO_SYSTEM = 'no_system';

    public const STATUS_UNPUBLISHED = 'unpublished';

    public const STATUS_PUBLISHED = 'published';

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'tag' => self::TAG_CIIAN,
        'icon' => 'Sparkles',
        'status' => self::STATUS_UNPUBLISHED,
        'can_delete' => true,
    ];

    /**
     * @var string
     */
    protected $table = 'ciian_int_tbl';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'can_delete' => 'boolean',
            'unpub_shape' => 'array',
            'pub_shape' => 'array',
        ];
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeTagged(Builder $query, string $tag): Builder
    {
        return $query->where('tag', $tag);
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
}
