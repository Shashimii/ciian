<?php

namespace App\Support;

use App\Models\Ciian\Component\Component;
use App\Models\Ciian\System\Page;
use App\Models\Ciian\System\System;

/**
 * Shapes what the page builder canvas needs: the page being edited, the blocks
 * already placed on it, and the palette of components available to place.
 */
class PageBuilderPresenter
{
    public function __construct(private ComponentIndexPresenter $components) {}

    /**
     * @return array<string, mixed>
     */
    public function page(Page $page): array
    {
        $shape = is_array($page->unpub_shape) ? $page->unpub_shape : [];
        $blocks = $shape['blocks'] ?? [];

        return [
            'id' => $page->id,
            'name' => $page->name,
            'slug' => $page->slug,
            'is_index' => $page->is_index,
            'status' => $page->status,
            'path' => is_string($shape['path'] ?? null) ? $shape['path'] : '/',
            'blocks' => is_array($blocks) ? array_values($blocks) : [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function system(System $system): array
    {
        return [
            'id' => $system->id,
            'name' => $system->name,
            'slug' => $system->slug,
            'prefix' => $system->prefix,
            'status' => $system->status,
        ];
    }

    /**
     * Components the builder can place, grouped in the UI by their category.
     *
     * Whether a component's file is in the current build cannot be known here —
     * `block-registry.ts` answers that in the browser — so every block is listed
     * and the canvas renders a placeholder for one it cannot load.
     *
     * @return list<array<string, mixed>>
     */
    public function palette(): array
    {
        $palette = [];

        foreach (Component::query()->blocks()->orderBy('name')->get() as $component) {
            $palette[] = $this->components->present($component);
        }

        return $palette;
    }
}
