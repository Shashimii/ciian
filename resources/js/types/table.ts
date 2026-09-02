export type SystemBadge = {
    type: 'ciian' | 'no_system' | 'system';
    label: string;
    slug: string;
    icon: string;
    color?: string | null;
};

export type TableColumnShape = {
    /**
     * Stable identity across renames. Falls back to `name` on the server when absent,
     * so legacy shapes keep matching by name until a rename freezes a real id onto them.
     */
    column_id?: string;
    name: string;
    type: string;
    nullable?: boolean;
    auto_increment?: boolean;
    unique?: boolean;
    indexed?: boolean;
    default?: string | number | boolean | null;
    length?: number;
    references?: string;
    on_delete?: string;
    values?: string[];
};

export type TableShape = {
    tbl_name?: string;
    tbl_db_name?: string;
    tbl_sys?: string;
    columns: TableColumnShape[];
    timestamps: boolean;
    primary?: string[];
};

export type RelationTableOption = {
    label: string;
    value: string;
};

export type TableRow = {
    key: string;
    store: 'internal' | 'system';
    id: number;
    name: string;
    slug: string;
    icon: string;
    status: 'published' | 'unpublished';
    has_pending_changes: boolean;
    can_publish: boolean;
    is_sync: boolean;
    /** Columns a sync would drop, discarding their data. Empty unless a sync is pending. */
    dropped_columns: string[];
    system: SystemBadge;
    unpub_shape: TableShape | null;
};

export type SystemOption = {
    value: string;
    label: string;
    icon: string;
    internal: boolean;
    color?: string | null;
};
