export type UserRoleBadge = {
    id: number;
    name: string;
    slug: string;
    /** Lucide icon name carried from the role row. */
    icon: string;
};

export type RoleOption = {
    id: number;
    name: string;
    slug: string;
    /** Lucide icon name carried from the role row. */
    icon: string;
    description: string | null;
};

export type UserRow = {
    key: string;
    id: number;
    username: string;
    email: string;
    status: 'active' | 'inactive';
    /** A deactivated account keeps its row and role but cannot sign in. */
    is_active: boolean;
    role: UserRoleBadge;
    /** Preformatted on the server so every client shows the same string. */
    joined: string | null;
    /** Unix seconds, used for sorting rather than display. */
    joined_at: number | null;
    can_delete: boolean;
    /** Why deletion is refused, shown on the disabled lock. Null when allowed. */
    delete_block: string | null;
};
