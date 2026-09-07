<?php

namespace App\Models\Ciian\Layout;

use Database\Factories\Ciian\Layout\LayoutFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A page shell: the frame a page is assigned to, and the named regions inside it
 * that components are dropped into.
 *
 * Stores the layout *definition*, never the components a page puts in its regions —
 * those live with the page instance, the same way a component's stored definition
 * is separate from the prop values a page sets on it.
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
class Layout extends Model
{
    /** @use HasFactory<LayoutFactory> */
    use HasFactory;

    public const STATUS_UNPUBLISHED = 'unpublished';

    public const STATUS_PUBLISHED = 'published';

    public const TYPE_SHELL = 'shell';

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'type' => self::TYPE_SHELL,
        'status' => self::STATUS_UNPUBLISHED,
        'can_delete' => true,
    ];

    /**
     * @var string
     */
    protected $table = 'ciian_lyt';

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
    public function scopeShells(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_SHELL);
    }
}
