<?php

namespace App\Support;

use App\Models\Ciian\Layout\Layout;

/**
 * Shapes ciian_lyt rows for the Layouts index.
 */
class LayoutIndexPresenter
{
    /**
     * @return list<array<string, mixed>>
     */
    public function layouts(): array
    {
        $rows = [];

        foreach (Layout::query()->orderBy('name')->get() as $layout) {
            $rows[] = $this->present($layout);
        }

        return $rows;
    }

    /**
     * @return array<string, mixed>
     */
    public function present(Layout $layout): array
    {
        $definition = $layout->definition();
        $information = is_array($definition['information'] ?? null) ? $definition['information'] : [];
        $regions = is_array($definition['regions'] ?? null) ? $definition['regions'] : [];

        $description = $information['description'] ?? null;
        $creator = $definition['creator'] ?? null;

        return [
            'key' => "layout-{$layout->id}",
            'id' => $layout->id,
            'name' => $layout->name,
            'slug' => $layout->slug,
            // The picker group lives in the definition, not on the row, so an
            // unpublished draft still reports whatever it is currently drafted as.
            'category' => (string) ($information['category'] ?? 'uncategorized'),
            'description' => is_string($description) && $description !== '' ? $description : null,
            'creator' => is_string($creator) && $creator !== '' ? $creator : null,
            'type' => $layout->type,
            'status' => $layout->status,
            'has_pending_changes' => $layout->hasPendingChanges(),
            'can_delete' => $layout->can_delete,
            // The slots a page can drop components into. Named rather than counted:
            // which regions a shell offers is what distinguishes one shell from another.
            'regions' => array_map(
                static fn (string $key, mixed $region): string => is_array($region) && is_string($region['label'] ?? null)
                    ? $region['label']
                    : $key,
                array_keys($regions),
                $regions,
            ),
        ];
    }
}
