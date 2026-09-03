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
     * Control types a property can use, matching the table in `.ai/shapes/cmp_format.md`.
     * The upload page validates an uploaded definition against this list.
     *
     * @return array<string, string>
     */
    public function propertyTypeLabels(): array
    {
        return [
            'string' => 'Text input',
            'text' => 'Textarea',
            'select' => 'Dropdown',
            'checkbox' => 'Checkbox',
        ];
    }

    /**
     * A single component with its full definition, for the detail page.
     *
     * The index deliberately does not carry `tsx` — it would mean shipping every
     * component's source to list them.
     *
     * @return array<string, mixed>
     */
    public function presentDetail(Component $component): array
    {
        $definition = $component->definition();
        $information = is_array($definition['information'] ?? null) ? $definition['information'] : [];
        $tsx = $definition['tsx'] ?? null;

        return [
            ...$this->present($component),
            'information' => $information,
            'tsx' => is_string($tsx) ? $tsx : '',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function present(Component $component): array
    {
        $definition = $component->definition();
        $information = is_array($definition['information'] ?? null) ? $definition['information'] : [];
        $properties = is_array($definition['properties'] ?? null) ? $definition['properties'] : [];

        $description = $information['description'] ?? null;
        $creator = $definition['creator'] ?? null;

        return [
            'key' => "component-{$component->id}",
            'id' => $component->id,
            'name' => $component->name,
            'slug' => $component->slug,
            // The palette group lives in the definition, not on the row, so an
            // unpublished draft still reports whatever it is currently drafted as.
            'category' => (string) ($information['category'] ?? 'uncategorized'),
            'description' => is_string($description) && $description !== '' ? $description : null,
            'creator' => is_string($creator) && $creator !== '' ? $creator : null,
            'type' => $component->type,
            'status' => $component->status,
            'has_pending_changes' => $component->hasPendingChanges(),
            'can_delete' => $component->can_delete,
            'property_count' => count($properties),
            // Carried so a preview can render the component with its own defaults.
            'properties' => $properties,
        ];
    }
}
