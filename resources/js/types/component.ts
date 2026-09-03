export type ComponentPropertyType = 'string' | 'text' | 'select' | 'checkbox';

export type ComponentProperty = {
    type: ComponentPropertyType;
    label: string;
    /** Always a string, booleans included — see `.ai/shapes/cmp_format.md`. */
    default: string;
    options?: string[];
};

export type ComponentInformation = {
    name: string;
    slug: string;
    category: string;
    can_delete: boolean;
    description?: string;
};

/**
 * A component definition: authored as YAML, stored as JSON.
 */
export type ComponentDefinition = {
    creator: string;
    information: ComponentInformation;
    properties: Record<string, ComponentProperty>;
    tsx: string;
};

export type ComponentRow = {
    key: string;
    id: number;
    name: string;
    slug: string;
    /** Palette group from the definition's `information.category`. */
    category: string;
    description: string | null;
    /** Free text credit from the definition's `creator`. */
    creator: string | null;
    type: 'block';
    status: 'published' | 'unpublished';
    has_pending_changes: boolean;
    /** Mirrors the row's `can_delete` DB column. False for seeded default blocks. */
    can_delete: boolean;
    /** How many editable properties the definition exposes. */
    property_count: number;
    /** The definition's property map, so a preview can apply its defaults. */
    properties: Record<string, ComponentProperty>;
};

/**
 * A single component with its full definition. The index omits `tsx`, which would
 * mean shipping every component's source just to list them.
 */
export type ComponentDetail = ComponentRow & {
    information: ComponentInformation;
    tsx: string;
};
