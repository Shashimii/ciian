export type SystemKind = 'ciian' | 'system';

export type SystemShape = {
    sys_name: string;
    sys_slug: string;
    /** Top-level URL segment the system is served from. */
    prefix: string;
    icon: string;
    color: string;
    description: string | null;
    /** Root-relative path the published system is served from. */
    entry: string;
    /** Reserved for the System Builder; empty until those modules land. */
    permissions: unknown[];
    pages: unknown[];
    components: unknown[];
};

export type SystemRow = {
    key: string;
    kind: SystemKind;
    id: number;
    name: string;
    slug: string;
    /** Top-level URL segment the system is served from. */
    prefix: string;
    icon: string;
    color: string | null;
    description: string | null;
    entry: string | null;
    status: 'published' | 'unpublished';
    has_pending_changes: boolean;
    can_publish: boolean;
    is_sync: boolean;
    /**
     * False once published. The slug names the generated page folder and the
     * prefix is the live URL, so the two lock together.
     */
    can_edit_slug: boolean;
    /** False for the Ciian platform row, which is not a created system. */
    can_delete: boolean;
    /** Tables the system still owns; deleting is refused while above zero. */
    blocking_tables: number;
    tables_count: number;
    unpub_shape: SystemShape | null;
};

export type SystemPageRow = {
    key: string;
    id: number;
    name: string;
    slug: string;
    /** True for the starting page every system is created with. */
    is_index: boolean;
    /** Path under the system's entry, `/` for the starting page. */
    path: string;
    /** Full path the page answers on once the system is live. */
    url: string;
    status: 'published' | 'unpublished';
    has_pending_changes: boolean;
    can_publish: boolean;
    is_sync: boolean;
    /** False for the starting page — a system always keeps its entry point. */
    can_delete: boolean;
    can_edit_slug: boolean;
};

export type CiianConfigData = {
    id: number;
    name: string;
    sys_slug: string;
    icon: string;
    color: string;
};

/**
 * One component placed on a page by the builder: which block to render and the
 * prop values this instance was given. The component's own definition lives in
 * `ciian_cmp` and is never copied here.
 */
export type PlacedBlock = {
    /** Stable across reordering and prop edits. */
    block_id: string;
    /** Component slug, resolved through `block-registry.ts`. */
    component: string;
    props: Record<string, string>;
};

export type SystemPageDetail = {
    id: number;
    name: string;
    slug: string;
    is_index: boolean;
    status: 'published' | 'unpublished';
    path: string;
    blocks: PlacedBlock[];
};

export type PageBuilderSystem = {
    id: number;
    name: string;
    slug: string;
    prefix: string;
    status: 'published' | 'unpublished';
};
