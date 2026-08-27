<?php

namespace App\Support;

/**
 * Allowed Tailwind color tokens for system / platform tag badges.
 */
class TagColors
{
    /**
     * @var list<string>
     */
    public const OPTIONS = [
        'violet',
        'purple',
        'fuchsia',
        'pink',
        'rose',
        'red',
        'orange',
        'amber',
        'yellow',
        'lime',
        'green',
        'emerald',
        'teal',
        'cyan',
        'sky',
        'blue',
        'indigo',
    ];

    public static function isValid(string $color): bool
    {
        return in_array($color, self::OPTIONS, true);
    }
}
