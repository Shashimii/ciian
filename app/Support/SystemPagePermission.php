<?php

namespace App\Support;

use App\Models\Ciian\System\Page;
use App\Models\Ciian\System\System;

/**
 * Derives the permission a created system mints for one of its pages.
 *
 * Everything here is computed from the system and page slugs rather than stored
 * separately, so a permission can always be matched back to the page it guards.
 */
class SystemPagePermission
{
    /**
     * Prefix every system permission carries.
     *
     * Without it a system slugged `roles` with a page slugged `manage` would
     * mint `roles.manage` — the platform's own permission. Generated route
     * names use the same `sys.` prefix, for the same collision.
     */
    public const PREFIX = 'sys';

    public function slugFor(System $system, Page $page): string
    {
        return self::PREFIX.".{$system->slug}.{$page->slug}";
    }

    public function nameFor(System $system, Page $page): string
    {
        return "{$system->name} — {$page->name}";
    }

    public function descriptionFor(System $system, Page $page): string
    {
        return __('Access the :page page of :system.', [
            'page' => $page->name,
            'system' => $system->name,
        ]);
    }

    /**
     * The attributes a permission row for this page should hold.
     *
     * @return array{name: string, slug: string, description: string, system_id: int}
     */
    public function attributesFor(System $system, Page $page): array
    {
        return [
            'name' => $this->nameFor($system, $page),
            'slug' => $this->slugFor($system, $page),
            'description' => $this->descriptionFor($system, $page),
            'system_id' => $system->id,
        ];
    }
}
