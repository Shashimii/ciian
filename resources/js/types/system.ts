export type SystemKind = 'ciian' | 'system';

export type SystemShape = {
    sys_name: string;
    sys_slug: string;
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
    icon: string;
    color: string | null;
    description: string | null;
    entry: string | null;
    status: 'published' | 'unpublished';
    has_pending_changes: boolean;
    can_publish: boolean;
    is_sync: boolean;
    /** False once published — the slug is the system's live entry path. */
    can_edit_slug: boolean;
    tables_count: number;
    unpub_shape: SystemShape | null;
};

export type CiianConfigData = {
    id: number;
    name: string;
    sys_slug: string;
    icon: string;
    color: string;
};
