export type PermissionOption = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    /** `User::hasPermission` treats this one as a wildcard over every other. */
    is_root: boolean;
};

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
    permission_ids: number[];
    /** Root's set is owned by the seeder and cannot be edited here. */
    permissions_locked: boolean;
    /** Name, description and icon are seeder-owned on protected roles. */
    details_locked: boolean;
    /** Accounts holding this role; non-zero blocks deletion. */
    user_count: number;
    is_root: boolean;
    can_delete: boolean;
    /** Why deletion is refused, shown on the disabled lock. Null when allowed. */
    delete_block: string | null;
};
