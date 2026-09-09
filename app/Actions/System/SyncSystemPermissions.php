<?php

namespace App\Actions\System;

use App\Models\Ciian\Permission;
use App\Models\Ciian\System\Page;
use App\Models\Ciian\System\System;
use App\Support\SystemPagePermission;

/**
 * Keeps a created system's permissions in step with its pages.
 *
 * A permission lives in two places on purpose: as a `ciian_permissions` row, so
 * it can be attached to a role like any other, and in the owning system's shape,
 * so the system carries its own access surface rather than needing a join to
 * describe itself. Both are written here so they cannot drift apart.
 */
class SyncSystemPermissions
{
    public function __construct(private SystemPagePermission $naming) {}

    /**
     * Mint the permission guarding a newly created page.
     */
    public function createFor(System $system, Page $page): Permission
    {
        $attributes = $this->naming->attributesFor($system, $page);

        $permission = Permission::query()->updateOrCreate(
            ['slug' => $attributes['slug']],
            $attributes,
        );

        $this->writeShape($system);

        return $permission;
    }

    /**
     * Remove the permission that guarded a deleted page.
     */
    public function removeFor(System $system, Page $page): void
    {
        Permission::query()
            ->where('slug', $this->naming->slugFor($system, $page))
            ->where('system_id', $system->getKey())
            ->delete();

        $this->writeShape($system);
    }

    /**
     * Rewrite the system shape's `permissions` key from the rows that exist.
     *
     * Derived rather than appended to, so a page deleted outside this action
     * still leaves a shape that matches reality on the next write.
     */
    public function writeShape(System $system): void
    {
        $slugs = Permission::query()
            ->where('system_id', $system->getKey())
            ->orderBy('slug')
            ->pluck('slug')
            ->all();

        $shape = $system->unpub_shape;

        if (! is_array($shape)) {
            return;
        }

        $shape['permissions'] = array_values($slugs);

        $system->forceFill(['unpub_shape' => $shape])->save();
    }
}
