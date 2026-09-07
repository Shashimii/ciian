<?php

namespace App\Actions\System;

use App\Models\Ciian\Component\Component;
use App\Models\Ciian\System\Page;
use App\Models\Ciian\System\System;
use App\Support\PageShapeBuilder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class SavePageDraft
{
    public function __construct(private PageShapeBuilder $shapes) {}

    /**
     * Create the starting page every system is guaranteed to have.
     *
     * Called from `SaveSystemDraft::create()` inside the same transaction, so a
     * system never exists without an entry point.
     */
    public function createIndex(System $system): Page
    {
        return $this->store($system, Page::INDEX_NAME, Page::INDEX_SLUG, isIndex: true);
    }

    /**
     * Create an ordinary page draft owned by a system.
     *
     * @param  array{name: string, slug: string}  $input
     */
    public function create(System $system, array $input): Page
    {
        return DB::transaction(
            fn (): Page => $this->store($system, $input['name'], $input['slug'], isIndex: false),
        );
    }

    /**
     * Update draft metadata and unpub_shape.
     *
     * The starting page keeps its slug — it is the system's entry point — and so
     * does any page that is already published, whose path is live.
     *
     * @param  array{name?: string, slug?: string}  $input
     */
    public function update(Page $page, array $input): Page
    {
        $page->loadMissing('system');

        $slug = $this->slugIsLocked($page)
            ? $page->slug
            : ($input['slug'] ?? $page->slug);

        $shape = $this->buildShape(
            name: $input['name'] ?? $page->name,
            slug: $slug,
            sys: $page->system->slug,
            isIndex: $page->is_index,
            // Renaming a page must not empty its canvas, so what the builder
            // placed is carried across every rebuild of the shape.
            blocks: $this->currentBlocks($page),
        );

        return DB::transaction(function () use ($page, $shape): Page {
            $page->name = $shape['pg_name'];
            $page->slug = $shape['pg_slug'];
            $page->unpub_shape = $shape;
            $page->save();

            return $page->refresh();
        });
    }

    /**
     * Replace what the builder has placed on a page.
     *
     * @param  list<array<string, mixed>>  $blocks
     */
    public function saveBlocks(Page $page, array $blocks): Page
    {
        $page->loadMissing('system');
        $this->assertComponentsExist($blocks);

        $shape = $this->buildShape(
            name: $page->name,
            slug: $page->slug,
            sys: $page->system->slug,
            isIndex: $page->is_index,
            blocks: $blocks,
        );

        return DB::transaction(function () use ($page, $shape): Page {
            $page->unpub_shape = $shape;
            $page->save();

            return $page->refresh();
        });
    }

    /**
     * Rewrite `pg_sys` on every draft of a system whose slug just changed, so no
     * page shape keeps pointing at the system's old slug.
     */
    public function reslugSystem(System $system): void
    {
        foreach ($system->pages()->get() as $page) {
            $shape = $this->buildShape(
                name: $page->name,
                slug: $page->slug,
                sys: $system->slug,
                isIndex: $page->is_index,
                blocks: $this->currentBlocks($page),
            );

            $page->unpub_shape = $shape;
            $page->save();
        }
    }

    /**
     * Refuse a canvas referring to a component that is not in `ciian_cmp`.
     *
     * A block pointing at nothing renders as a placeholder forever and is
     * invisible in the page's own UI, so it is better caught on save.
     *
     * @param  list<array<string, mixed>>  $blocks
     */
    private function assertComponentsExist(array $blocks): void
    {
        $slugs = [];

        foreach ($blocks as $block) {
            $slug = (string) ($block['component'] ?? '');

            if ($slug !== '') {
                $slugs[$slug] = true;
            }
        }

        if ($slugs === []) {
            return;
        }

        $known = Component::query()
            ->whereIn('slug', array_keys($slugs))
            ->pluck('slug')
            ->all();

        $missing = array_diff(array_keys($slugs), $known);

        if ($missing !== []) {
            throw ValidationException::withMessages([
                'blocks' => __('Unknown component(s): :slugs.', [
                    'slugs' => implode(', ', $missing),
                ]),
            ]);
        }
    }

    /**
     * The blocks currently on a page's draft.
     *
     * @return list<array<string, mixed>>
     */
    private function currentBlocks(Page $page): array
    {
        $shape = is_array($page->unpub_shape) ? $page->unpub_shape : [];
        $blocks = $shape['blocks'] ?? [];

        return is_array($blocks) ? array_values($blocks) : [];
    }

    /**
     * The starting page is the system's entry point and a published page's path
     * is already live, so neither may be renamed out from under its URL.
     */
    public function slugIsLocked(Page $page): bool
    {
        return $page->is_index || $page->isPublished();
    }

    private function store(System $system, string $name, string $slug, bool $isIndex): Page
    {
        $shape = $this->buildShape($name, $slug, $system->slug, $isIndex, []);

        return Page::query()->create([
            'system_id' => $system->id,
            'name' => $shape['pg_name'],
            'slug' => $shape['pg_slug'],
            'is_index' => $isIndex,
            'status' => Page::STATUS_UNPUBLISHED,
            'unpub_shape' => $shape,
            'pub_shape' => null,
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $blocks
     * @return array<string, mixed>
     */
    private function buildShape(
        string $name,
        string $slug,
        string $sys,
        bool $isIndex,
        array $blocks,
    ): array {
        try {
            $normalized = $this->shapes->make($name, $slug, $sys, $isIndex, $blocks);
            $this->shapes->validate($normalized);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'shape' => $exception->getMessage(),
            ]);
        }

        return $normalized;
    }
}
