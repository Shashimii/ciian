export type UserRoleBadge = {
    name: string;
    slug: string;
    /** Lucide icon name carried from the role row. */
    icon: string;
};

export type UserRow = {
    key: string;
    id: number;
    username: string;
    email: string;
    role: UserRoleBadge;
    /** Preformatted on the server so every client shows the same string. */
    joined: string | null;
    /** Unix seconds, used for sorting rather than display. */
    joined_at: number | null;
};
