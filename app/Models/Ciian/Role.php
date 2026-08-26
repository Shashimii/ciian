<?php

namespace App\Models\Ciian;

use Database\Factories\Ciian\RoleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property string $icon
 * @property bool $locked
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Permission> $permissions
 */
#[Fillable(['name', 'slug', 'description', 'icon', 'locked'])]
class Role extends Model
{
    /** @use HasFactory<RoleFactory> */
    use HasFactory;

    public const ROOT = 'root';

    public const USER = 'user';

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'icon' => 'Shield',
        'locked' => false,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'locked' => 'boolean',
        ];
    }

    /**
     * @return BelongsToMany<Permission, $this>
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    public function isRoot(): bool
    {
        return $this->slug === self::ROOT;
    }

    public function isLocked(): bool
    {
        return $this->locked;
    }
}
