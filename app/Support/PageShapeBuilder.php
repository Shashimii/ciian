<?php

namespace App\Support;

use App\Models\Ciian\System\Page;
use InvalidArgumentException;

/**
 * Builds and normalizes page shapes for ciian_sys_pg.
 *
 * A page shape describes the page's identity and the blocks placed on it. The
 * `blocks` key is reserved for the page builder and is carried through
 * untouched so a shape saved today keeps its structure once the builder lands.
 */
class PageShapeBuilder
{
    /**
     * Build a new page shape from explicit parts.
     *
     * @return array<string, mixed>
     */
    public function make(string $pgName, string $pgSlug, string $pgSys, bool $isIndex = false): array
    {
        return $this->normalize([
            'pg_name' => $pgName,
            'pg_slug' => $pgSlug,
            'pg_sys' => $pgSys,
            'is_index' => $isIndex,
            'path' => $this->pathFor($pgSlug, $isIndex),
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
        $slug = strtolower(trim((string) ($shape['pg_slug'] ?? '')));
        $isIndex = (bool) ($shape['is_index'] ?? false);
        $blocks = $shape['blocks'] ?? [];

        return [
            'pg_name' => trim((string) ($shape['pg_name'] ?? '')),
            'pg_slug' => $slug,
            'pg_sys' => trim((string) ($shape['pg_sys'] ?? '')),
            'is_index' => $isIndex,
            // The path always follows the slug, so a stored value never drifts
            // out of agreement with the page it belongs to.
            'path' => $this->pathFor($slug, $isIndex),
            'blocks' => is_array($blocks) ? array_values($blocks) : [],
        ];
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

        if ($shape['pg_name'] === '') {
            throw new InvalidArgumentException('Page shape requires pg_name.');
        }

        if ($shape['pg_slug'] === '' || ! preg_match('/^[a-z][a-z0-9_]*$/', $shape['pg_slug'])) {
            throw new InvalidArgumentException('Page shape requires a snake_case pg_slug.');
        }

        if ($shape['pg_sys'] === '') {
            throw new InvalidArgumentException('Page shape requires pg_sys.');
        }

        if ($shape['is_index'] && $shape['pg_slug'] !== Page::INDEX_SLUG) {
            throw new InvalidArgumentException(
                'The starting page must keep the slug ['.Page::INDEX_SLUG.'].',
            );
        }
    }

    /**
     * Where the page sits under its system's entry path. The starting page is
     * the system root; everything else hangs off its slug.
     */
    public function pathFor(string $pgSlug, bool $isIndex): string
    {
        return $isIndex ? '/' : '/'.$pgSlug;
    }
}
