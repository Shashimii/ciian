<?php

namespace App\Models\Ciian;

use App\Models\Ciian\System\System;
use Database\Factories\Ciian\PermissionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property int|null $system_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Role> $roles
 * @property-read int|null $roles_count
 */
#[Fillable(['name', 'slug', 'description', 'system_id'])]
class Permission extends Model
{
    /** @use HasFactory<PermissionFactory> */
    use HasFactory;

    public const ROOT = 'root';

    /**
     * @var string
     */
    protected $table = 'ciian_permissions';

    /**
     * The pivot table is named explicitly. Eloquent infers it from the two
     * model class names, which still yields the pre-prefix `permission_role`.
     *
     * @return BelongsToMany<Role, $this>
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'ciian_permission_role');
    }

    /**
     * The created system this permission belongs to, or null when it is one of
     * the platform's own.
     *
     * @return BelongsTo<System, $this>
     */
    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    public function isRoot(): bool
    {
        return $this->slug === self::ROOT;
    }

    /**
     * Whether a created system minted this, rather than the platform seeder.
     */
    public function belongsToSystem(): bool
    {
        return $this->system_id !== null;
    }
}
