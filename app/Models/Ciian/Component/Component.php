<?php

namespace App\Models\Ciian\Component;

use Database\Factories\Ciian\Component\ComponentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A reusable UI building block: its identity, editable properties, and TSX source.
 *
 * Stores the component *definition*, never the prop values a page sets when it
 * places the block — those live with the page instance.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $type
 * @property string $status
 * @property bool $can_delete
 * @property string|null $thumbnail
 * @property array<string, mixed>|null $unpub_shape
 * @property array<string, mixed>|null $pub_shape
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'slug', 'type', 'status', 'can_delete', 'thumbnail', 'unpub_shape', 'pub_shape'])]
class Component extends Model
{
    /** @use HasFactory<ComponentFactory> */
    use HasFactory;

    public const STATUS_UNPUBLISHED = 'unpublished';

    public const STATUS_PUBLISHED = 'published';

    public const TYPE_BLOCK = 'block';

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'type' => self::TYPE_BLOCK,
        'status' => self::STATUS_UNPUBLISHED,
        'can_delete' => true,
    ];

    /**
     * @var string
     */
    protected $table = 'ciian_cmp';

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
     * The definition consumers should render from: the published one once it exists,
     * otherwise the working draft.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
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
    public function scopeBlocks(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_BLOCK);
    }
}
