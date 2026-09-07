<?php

namespace App\Actions\System;

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
            );

            $page->unpub_shape = $shape;
            $page->save();
        }
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
        $shape = $this->buildShape($name, $slug, $system->slug, $isIndex);

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
     * @return array<string, mixed>
     */
    private function buildShape(string $name, string $slug, string $sys, bool $isIndex): array
    {
        $normalized = $this->shapes->make($name, $slug, $sys, $isIndex);

        try {
            $this->shapes->validate($normalized);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'shape' => $exception->getMessage(),
            ]);
        }

        return $normalized;
    }
}
