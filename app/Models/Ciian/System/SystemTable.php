<?php

namespace App\Models\Ciian\System;

use Database\Factories\Ciian\System\SystemTableFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $system_id
 * @property string $name
 * @property string $slug
 * @property string $status
 * @property bool $can_delete
 * @property array<string, mixed>|null $unpub_shape
 * @property array<string, mixed>|null $pub_shape
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read System $system
 */
#[Fillable(['system_id', 'name', 'slug', 'status', 'can_delete', 'unpub_shape', 'pub_shape'])]
class SystemTable extends Model
{
    /** @use HasFactory<SystemTableFactory> */
    use HasFactory;

    public const STATUS_UNPUBLISHED = 'unpublished';

    public const STATUS_PUBLISHED = 'published';

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => self::STATUS_UNPUBLISHED,
        'can_delete' => true,
    ];

    /**
     * @var string
     */
    protected $table = 'ciian_sys_tbl';

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
     * @return BelongsTo<System, $this>
     */
    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
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
