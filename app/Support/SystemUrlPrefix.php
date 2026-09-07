<?php

namespace App\Support;

/**
 * The top-level URL segment a created system is served from.
 *
 * A system answers on `/{prefix}` directly rather than under a shared namespace,
 * so its prefix competes with every route Ciian itself registers. Platform
 * routes are required before the generated ones in `routes/web.php` and would
 * silently win, so a colliding prefix is refused at validation instead.
 */
class SystemUrlPrefix
{
    /**
     * Top-level segments Ciian owns. A system may not claim any of these.
     *
     * Keep in step with the first segment of every route in `routes/guest.php`,
     * `routes/settings.php` and `routes/admin.php`, plus the framework and
     * package routes that sit alongside them.
     *
     * @var list<string>
     */
    public const RESERVED = [
        '_boost',
        '_debugbar',
        '_ignition',
        '_inertia',
        'admin',
        'api',
        'broadcasting',
        'build',
        'email',
        'forgot-password',
        'livewire',
        'login',
        'logout',
        'register',
        'reset-password',
        's',
        'sanctum',
        'settings',
        'storage',
        'up',
        'user',
        'vendor',
    ];

    /**
     * URL segments are not database identifiers: hyphens read better in a URL
     * than underscores, so both are allowed here even though a slug is snake_case.
     */
    public const PATTERN = '/^[a-z][a-z0-9_-]*$/';

    public static function isReserved(string $prefix): bool
    {
        return in_array(strtolower($prefix), self::RESERVED, true);
    }

    /**
     * Where a system published under this prefix answers.
     */
    public static function entryFor(string $prefix): string
    {
        return '/'.$prefix;
    }
}
