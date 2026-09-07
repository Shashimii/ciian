<?php

namespace App\Support;

use App\Models\Ciian\System\Page;
use InvalidArgumentException;

/**
 * Builds and normalizes page shapes for ciian_sys_pg.
 *
 * A page shape describes the page's identity and the blocks placed on it by the
 * builder. A block records which component to render and the prop values that
 * instance was given — never the component's own definition, which lives in
 * `ciian_cmp` and is the source of truth for how the block behaves.
 */
class PageShapeBuilder
{
    /**
     * Build a new page shape from explicit parts.
     *
     * @param  list<array<string, mixed>>  $blocks
     * @return array<string, mixed>
     */
    public function make(
        string $pgName,
        string $pgSlug,
        string $pgSys,
        bool $isIndex = false,
        array $blocks = [],
    ): array {
        return $this->normalize([
            'pg_name' => $pgName,
            'pg_slug' => $pgSlug,
            'pg_sys' => $pgSys,
            'is_index' => $isIndex,
            'path' => $this->pathFor($pgSlug, $isIndex),
            'blocks' => $blocks,
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
            'blocks' => $this->normalizeBlocks(is_array($blocks) ? $blocks : []),
        ];
    }

    /**
     * Normalize the placed blocks, in the order the builder left them.
     *
     * @param  array<mixed>  $blocks
     * @return list<array<string, mixed>>
     */
    public function normalizeBlocks(array $blocks): array
    {
        $normalized = [];

        foreach (array_values($blocks) as $index => $block) {
            if (! is_array($block)) {
                throw new InvalidArgumentException("Block at index {$index} must be an object.");
            }

            $props = $block['props'] ?? [];
            $blockId = $block['block_id'] ?? null;

            $normalized[] = [
                // Identity that survives reordering and prop edits, so the builder
                // can track a placed block without leaning on its position.
                'block_id' => is_string($blockId) && $blockId !== ''
                    ? $blockId
                    : $this->newBlockId(),
                'component' => strtolower(trim((string) ($block['component'] ?? ''))),
                'props' => $this->normalizeProps(is_array($props) ? $props : []),
            ];
        }

        return $normalized;
    }

    /**
     * A prop value is a string, or a boolean for a checkbox property.
     *
     * Laravel's `ConvertEmptyStringsToNull` middleware turns an empty prop — a
     * blank `href`, say — into null on the way in, which would then be written
     * into the generated page as `null` and fail its own type. Everything that
     * is not a boolean is normalized back to a string here, so the canvas and
     * the published page agree on what the component receives.
     *
     * @param  array<string, mixed>  $props
     * @return array<string, string|bool>
     */
    private function normalizeProps(array $props): array
    {
        $normalized = [];

        foreach ($props as $key => $value) {
            $normalized[(string) $key] = match (true) {
                is_bool($value) => $value,
                is_scalar($value) => (string) $value,
                default => '',
            };
        }

        return $normalized;
    }

    /**
     * A fresh block identity, for a block placed without one.
     */
    public function newBlockId(): string
    {
        return 'b_'.bin2hex(random_bytes(6));
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

        $seen = [];

        foreach ($shape['blocks'] as $index => $block) {
            $component = $block['component'];

            if ($component === '' || ! preg_match('/^[a-z][a-z0-9_]*$/', $component)) {
                throw new InvalidArgumentException(
                    "Block at index {$index} requires a component slug.",
                );
            }

            if (isset($seen[$block['block_id']])) {
                throw new InvalidArgumentException(
                    "Duplicate block_id [{$block['block_id']}].",
                );
            }

            $seen[$block['block_id']] = true;
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
