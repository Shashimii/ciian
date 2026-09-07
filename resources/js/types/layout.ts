/**
 * A named slot in a page shell. Components are dropped into these when a page is
 * assigned the layout.
 */
export type LayoutRegion = {
    label: string;
};

/**
 * A layout definition: authored as YAML, stored as JSON — the same contract as a
 * component, with `regions` in place of `properties`.
 */
export type LayoutDefinition = {
    creator: string;
    information: {
        name: string;
        slug: string;
        category: string;
        can_delete: boolean;
        description?: string;
    };
    regions: Record<string, LayoutRegion>;
    tsx: string;
};

export type LayoutRow = {
    key: string;
    id: number;
    name: string;
    slug: string;
    /** Picker group from the definition's `information.category`. */
    category: string;
    description: string | null;
    /** Free text credit from the definition's `creator`. */
    creator: string | null;
    type: 'shell';
    status: 'published' | 'unpublished';
    has_pending_changes: boolean;
    /** Mirrors the row's `can_delete` DB column. False for seeded default shells. */
    can_delete: boolean;
    /** Region labels in definition order — which slots this shell offers. */
    regions: string[];
};
