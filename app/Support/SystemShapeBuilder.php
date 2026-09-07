<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Builds and normalizes system shapes for ciian_sys.
 *
 * A system shape describes the application's identity and settings. The
 * `permissions`, `pages` and `components` keys are reserved for the System
 * Builder and are carried through untouched so a shape saved today keeps its
 * structure once those modules land.
 */
class SystemShapeBuilder
{
    /**
     * Keys reserved for later System Builder modules. Always present, default empty.
     *
     * @var list<string>
     */
    public const RESERVED_KEYS = ['permissions', 'pages', 'components'];

    /**
     * Build a new system shape from explicit parts.
     *
     * @return array<string, mixed>
     */
    public function make(
        string $sysName,
        string $sysSlug,
        string $prefix,
        string $icon = 'Box',
        string $color = 'violet',
        ?string $description = null,
    ): array {
        return $this->normalize([
            'sys_name' => $sysName,
            'sys_slug' => $sysSlug,
            'prefix' => $prefix,
            'icon' => $icon,
            'color' => $color,
            'description' => $description,
        ]);
    }

    /**
     * Normalize a raw shape (UI payload or stored JSON) into canonical form.
     *
     * @param  array<string, mixed>  $shape
     * @return array<string, mixed>
     */
    public function normalize(array $shape): array
    {
        $slug = strtolower(trim((string) ($shape['sys_slug'] ?? '')));
        $prefix = strtolower(trim((string) ($shape['prefix'] ?? '')));
        $description = $shape['description'] ?? null;

        $normalized = [
            'sys_name' => trim((string) ($shape['sys_name'] ?? '')),
            'sys_slug' => $slug,
            'prefix' => $prefix,
            'icon' => trim((string) ($shape['icon'] ?? 'Box')) ?: 'Box',
            'color' => strtolower(trim((string) ($shape['color'] ?? 'violet'))) ?: 'violet',
            'description' => is_string($description) && trim($description) !== ''
                ? trim($description)
                : null,
            // Always derived from the prefix, never read back from storage, so a
            // stored entry cannot drift from the URL the system actually answers on.
            'entry' => SystemUrlPrefix::entryFor($prefix),
        ];

        foreach (self::RESERVED_KEYS as $key) {
            $value = $shape[$key] ?? [];
            $normalized[$key] = is_array($value) ? array_values($value) : [];
        }

        return $normalized;
    }

    /**
     * Validate a (preferably normalized) shape; throws on structural problems.
     *
     * @param  array<string, mixed>  $shape
     *
     * @throws InvalidArgumentException
     */
    public function validate(array $shape): void
    {
        $shape = $this->normalize($shape);

        if ($shape['sys_name'] === '') {
            throw new InvalidArgumentException('System shape requires sys_name.');
        }

        if ($shape['sys_slug'] === '' || ! preg_match('/^[a-z][a-z0-9_]*$/', $shape['sys_slug'])) {
            throw new InvalidArgumentException('System shape requires a snake_case sys_slug.');
        }

        if ($shape['prefix'] === '' || ! preg_match(SystemUrlPrefix::PATTERN, $shape['prefix'])) {
            throw new InvalidArgumentException('System shape requires a URL-safe prefix.');
        }

        if (SystemUrlPrefix::isReserved($shape['prefix'])) {
            throw new InvalidArgumentException(
                "The prefix [{$shape['prefix']}] is reserved by Ciian.",
            );
        }

        if ($shape['icon'] === '') {
            throw new InvalidArgumentException('System shape requires an icon.');
        }

        if (! TagColors::isValid($shape['color'])) {
            throw new InvalidArgumentException("System shape has unknown color [{$shape['color']}].");
        }
    }
}
