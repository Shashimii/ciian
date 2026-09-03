export type ComponentPropertyType = 'string' | 'text' | 'select';

export type ComponentProperty = {
    type: ComponentPropertyType;
    label: string;
    default: string;
    options?: string[];
};

export type ComponentInfo = {
    name: string;
    slug: string;
    category: string;
    description?: string;
    /** Module path used when a real TSX file exists on disk. */
    component?: string;
};

export type ComponentDefinition = {
    info: ComponentInfo;
    properties: Record<string, ComponentProperty>;
    tsx: string;
};

export type ComponentRow = {
    key: string;
    id: number;
    name: string;
    slug: string;
    /** Palette group from the definition's `info.category`. */
    category: string;
    description: string | null;
    type: 'block';
    status: 'published' | 'unpublished';
    has_pending_changes: boolean;
    /** Mirrors the row's `can_delete` DB column. False for seeded default blocks. */
    can_delete: boolean;
    /** How many editable properties the definition exposes. */
    property_count: number;
};
