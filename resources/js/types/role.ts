export type RoleRow = {
    key: string;
    id: number;
    name: string;
    /** Immutable once created — it is the role's identity in code. */
    slug: string;
    description: string | null;
    /** Lucide icon name. */
    icon: string;
    permission_count: number;
    /** Accounts holding this role; non-zero blocks deletion. */
    user_count: number;
    is_root: boolean;
    can_delete: boolean;
    /** Why deletion is refused, shown on the disabled lock. Null when allowed. */
    delete_block: string | null;
};
