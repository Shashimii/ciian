<?php

namespace App\Models\Ciian;

use Database\Factories\Ciian\RoleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property string $icon
 * @property bool $can_delete
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Permission> $permissions
 * @property-read Collection<int, User> $users
 * @property-read int|null $permissions_count
 * @property-read int|null $users_count
 */
#[Fillable(['name', 'slug', 'description', 'icon', 'can_delete'])]
class Role extends Model
{
    /** @use HasFactory<RoleFactory> */
    use HasFactory;

    public const ROOT = 'root';

    public const USER = 'user';

    /**
     * @var string
     */
    protected $table = 'ciian_roles';

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'icon' => 'Shield',
        'can_delete' => true,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'can_delete' => 'boolean',
        ];
    }

    /**
     * The pivot table is named explicitly. Eloquent infers it from the two
     * model class names, which still yields the pre-prefix `permission_role`.
     *
     * @return BelongsToMany<Permission, $this>
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'ciian_permission_role');
    }

    /**
     * Accounts holding this role. `ciian_users.role_id` restricts on delete, so
     * this is also what stands between a role and being deleted.
     *
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function isRoot(): bool
    {
        return $this->slug === self::ROOT;
    }

    public function canDelete(): bool
    {
        return $this->can_delete;
    }
}
