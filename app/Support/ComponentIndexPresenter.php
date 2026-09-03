<?php

namespace App\Support;

use App\Models\Ciian\Component\Component;

/**
 * Shapes ciian_cmp rows for the Components index.
 */
class ComponentIndexPresenter
{
    /**
     * @return list<array<string, mixed>>
     */
    public function components(): array
    {
        $rows = [];

        foreach (Component::query()->orderBy('name')->get() as $component) {
            $rows[] = $this->present($component);
        }

        return $rows;
    }

    /**
     * @return array<string, mixed>
     */
    public function present(Component $component): array
    {
        $definition = $component->definition();
        $info = is_array($definition['info'] ?? null) ? $definition['info'] : [];
        $properties = is_array($definition['properties'] ?? null) ? $definition['properties'] : [];

        $description = $info['description'] ?? null;

        return [
            'key' => "component-{$component->id}",
            'id' => $component->id,
            'name' => $component->name,
            'slug' => $component->slug,
            // The palette group lives in the definition, not on the row, so an
            // unpublished draft still reports whatever it is currently drafted as.
            'category' => (string) ($info['category'] ?? 'uncategorized'),
            'description' => is_string($description) && $description !== '' ? $description : null,
            'type' => $component->type,
            'status' => $component->status,
            'has_pending_changes' => $component->hasPendingChanges(),
            'can_delete' => $component->can_delete,
            'property_count' => count($properties),
        ];
    }
}
