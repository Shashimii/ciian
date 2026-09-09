export type PermissionRow = {
    key: string;
    id: number;
    name: string;
    slug: string;
    description: string | null;
    /** How many roles currently grant it. */
    role_count: number;
    /** `User::hasPermission` treats this one as a wildcard over the rest. */
    is_root: boolean;
    /** Null for a platform permission; the owning created system otherwise. */
    system: {
        name: string;
        icon: string;
        color: string | null;
    } | null;
};
