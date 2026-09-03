<?php

namespace App\Support;

use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Parses and validates an uploaded component definition.
 *
 * The upload page runs the same checks in the browser for fast feedback, but an
 * uploaded file is entirely user-controlled, so every check is re-run here. This
 * class is the source of truth; the client mirror is a convenience.
 *
 * See `.ai/shapes/cmp_format.md` for the format.
 */
class ComponentShapeBuilder
{
    /**
     * Control types a property may use, keyed by id.
     *
     * @return array<string, string>
     */
    public static function propertyTypes(): array
    {
        return [
            'string' => 'Text input',
            'text' => 'Textarea',
            'select' => 'Dropdown',
            'checkbox' => 'Checkbox',
        ];
    }

    /**
     * Validate a parsed definition and return it in canonical form.
     *
     * @param  mixed  $definition  the result of parsing the uploaded YAML
     * @return array{creator: string, information: array<string, mixed>, properties: array<string, mixed>, tsx: string}
     *
     * @throws InvalidArgumentException with a human-readable reason
     */
    public function normalize(mixed $definition): array
    {
        if (! is_array($definition)) {
            throw new InvalidArgumentException('The file must contain a YAML mapping.');
        }

        $creator = $definition['creator'] ?? null;

        if (! is_string($creator) || trim($creator) === '') {
            throw new InvalidArgumentException('creator must be a non-empty string.');
        }

        $information = $this->normalizeInformation($definition['information'] ?? null);
        $tsx = $definition['tsx'] ?? null;

        if (! is_string($tsx) || trim($tsx) === '') {
            throw new InvalidArgumentException('tsx must contain the component source.');
        }

        if (! str_contains($tsx, 'export default')) {
            throw new InvalidArgumentException('tsx must export a default component.');
        }

        $properties = $this->normalizeProperties($definition['properties'] ?? null);
        $this->assertPropertiesMatchSource(array_keys($properties), $tsx);

        return [
            'creator' => trim($creator),
            'information' => $information,
            'properties' => $properties,
            'tsx' => $tsx,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeInformation(mixed $information): array
    {
        if (! is_array($information)) {
            throw new InvalidArgumentException('information must be a mapping.');
        }

        foreach (['name', 'category'] as $field) {
            $value = $information[$field] ?? null;

            if (! is_string($value) || trim($value) === '') {
                throw new InvalidArgumentException("information.{$field} must be a non-empty string.");
            }
        }

        $slug = $information['slug'] ?? null;

        if (! is_string($slug) || preg_match('/^[a-z][a-z0-9_]*$/', $slug) !== 1) {
            throw new InvalidArgumentException(
                'information.slug must be snake_case: lowercase letters, digits and underscores only.',
            );
        }

        if (! is_bool($information['can_delete'] ?? null)) {
            throw new InvalidArgumentException('information.can_delete must be true or false.');
        }

        $normalized = [
            'name' => trim((string) $information['name']),
            'slug' => $slug,
            'category' => trim((string) $information['category']),
            // Never honour an uploaded `false`: it would make the component permanently
            // undeletable through the UI. Only seeders may protect a component.
            'can_delete' => true,
        ];

        $description = $information['description'] ?? null;

        if (is_string($description) && trim($description) !== '') {
            $normalized['description'] = trim($description);
        }

        return $normalized;
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeProperties(mixed $properties): array
    {
        if ($properties === null) {
            return [];
        }

        if (! is_array($properties)) {
            throw new InvalidArgumentException('properties must be a mapping.');
        }

        $types = self::propertyTypes();
        $normalized = [];

        foreach ($properties as $key => $property) {
            $name = (string) $key;

            if (! is_array($property)) {
                throw new InvalidArgumentException("properties.{$name} must be a mapping.");
            }

            $type = $property['type'] ?? null;

            if (! is_string($type) || ! array_key_exists($type, $types)) {
                throw new InvalidArgumentException(
                    "properties.{$name}.type must be one of: ".implode(', ', array_keys($types)).'.',
                );
            }

            $label = $property['label'] ?? null;

            if (! is_string($label) || trim($label) === '') {
                throw new InvalidArgumentException("properties.{$name}.label must be a non-empty string.");
            }

            if (! array_key_exists('default', $property)) {
                throw new InvalidArgumentException("properties.{$name}.default is required.");
            }

            $default = $property['default'];

            // YAML reads bare true/false/null as scalars. Defaults are always stored as
            // strings, so coerce rather than reject — the intent is unambiguous.
            if (is_bool($default)) {
                $default = $default ? 'true' : 'false';
            } elseif ($default === null) {
                $default = '';
            } elseif (! is_string($default)) {
                $default = (string) $default;
            }

            $entry = [
                'type' => $type,
                'label' => trim($label),
                'default' => $default,
            ];

            if ($type === 'select') {
                $options = $property['options'] ?? null;

                if (! is_array($options) || $options === []) {
                    throw new InvalidArgumentException(
                        "properties.{$name}.options must be a non-empty list for a select.",
                    );
                }

                $entry['options'] = array_values(array_map('strval', $options));
            }

            $normalized[$name] = $entry;
        }

        return $normalized;
    }

    /**
     * The property map and the component's own props must describe the same thing —
     * a property with no matching prop can never be applied, and a prop with no
     * property can never be set.
     *
     * @param  list<string>  $keys
     */
    private function assertPropertiesMatchSource(array $keys, string $tsx): void
    {
        $props = $this->destructuredProps($tsx);

        $missingInSource = array_values(array_diff($keys, $props));
        $missingInProperties = array_values(array_diff($props, $keys));

        if ($missingInSource !== []) {
            throw new InvalidArgumentException(
                'These properties are not props of the component: '.implode(', ', $missingInSource).'.',
            );
        }

        if ($missingInProperties !== []) {
            throw new InvalidArgumentException(
                'These component props have no matching property: '.implode(', ', $missingInProperties).'.',
            );
        }
    }

    /**
     * Prop names the default export destructures.
     *
     * @return list<string>
     */
    private function destructuredProps(string $tsx): array
    {
        $start = strpos($tsx, 'export default');

        if ($start === false) {
            return [];
        }

        $body = substr($tsx, $start);
        $open = strpos($body, '{');
        $close = strpos($body, '}');

        if ($open === false || $close === false || $close < $open) {
            return [];
        }

        $inner = substr($body, $open + 1, $close - $open - 1);
        $props = [];

        foreach (explode(',', $inner) as $part) {
            $name = trim(Str::before($part, '='));

            if (preg_match('/^[A-Za-z_$][\w$]*$/', $name) === 1) {
                $props[] = $name;
            }
        }

        return array_values(array_unique($props));
    }
}
