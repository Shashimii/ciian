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
 * @property array<string, mixed>|null $unpub_shape
 * @property array<string, mixed>|null $pub_shape
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'slug', 'tag', 'icon', 'status', 'unpub_shape', 'pub_shape'])]
class InternalTable extends Model
{
    /** @use HasFactory<InternalTableFactory> */
    use HasFactory;

    public const TAG_CIIAN = 'ciian';

    public const TAG_NO_SYSTEM = 'no_system';

    /**
     * Seeded Accounts tables (`Database\Seeders\CiianInternalTableSeeder`) that back
     * platform auth and must never be deleted through the Tables UI. Deliberately a
     * superset of `App\Support\EloquentModelPath::PROTECTED`: `permission_role` has
     * no hand-written (or any) Eloquent model, so it needs its own guard here rather
     * than relying on model protection to imply it's safe.
     *
     * @var list<string>
     */
    public const CORE_ACCOUNTS_SLUGS = ['users', 'roles', 'permissions', 'permission_role'];

    public const STATUS_UNPUBLISHED = 'unpublished';

    public const STATUS_PUBLISHED = 'published';

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'tag' => self::TAG_CIIAN,
        'icon' => 'Sparkles',
        'status' => self::STATUS_UNPUBLISHED,
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
