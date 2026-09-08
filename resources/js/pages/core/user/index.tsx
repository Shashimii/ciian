import { Head } from '@inertiajs/react';
import { useMemo } from 'react';
import DataTable from '@/components/core/data-table';
import type { DataTableColumn } from '@/components/core/data-table';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { resolveLucideIcon } from '@/lib/lucide-icons';
import { index as usersIndex } from '@/routes/users';
import type { UserRow } from '@/types/user';

type Props = {
    users: UserRow[];
};

function RoleBadge({ role }: { role: UserRow['role'] }) {
    const IconComponent = resolveLucideIcon(role.icon);

    return (
        <Badge variant="secondary" className="gap-1.5">
            {IconComponent && (
                <Icon iconNode={IconComponent} className="size-3.5" />
            )}
            {role.name}
        </Badge>
    );
}

export default function UserIndex({ users }: Props) {
    const columns = useMemo<DataTableColumn<UserRow>[]>(
        () => [
            {
                id: 'username',
                header: 'Username',
                sortable: true,
                sortValue: (row) => row.username,
                searchValue: (row) => row.username,
                cell: (row) => (
                    <span className="font-medium">{row.username}</span>
                ),
            },
            {
                id: 'email',
                header: 'Email',
                sortable: true,
                sortValue: (row) => row.email,
                searchValue: (row) => row.email,
                cell: (row) => (
                    <span className="text-muted-foreground">{row.email}</span>
                ),
            },
            {
                id: 'role',
                header: 'Role',
                sortable: true,
                sortValue: (row) => row.role.name,
                searchValue: (row) => row.role.name,
                cell: (row) => <RoleBadge role={row.role} />,
            },
            {
                id: 'joined',
                header: 'Joined',
                sortable: true,
                sortValue: (row) => row.joined_at ?? 0,
                cell: (row) => (
                    <span className="text-muted-foreground">
                        {row.joined ?? '—'}
                    </span>
                ),
            },
        ],
        [],
    );

    return (
        <>
            <Head title="Users" />

            <div className="px-4 py-6">
                <DataTable
                    rows={users}
                    columns={columns}
                    getRowKey={(row) => row.key}
                    emptyMessage="No users yet."
                    searchPlaceholder="Search users…"
                />
            </div>
        </>
    );
}

UserIndex.layout = {
    breadcrumbs: [
        {
            title: 'Users',
            href: usersIndex(),
        },
    ],
};
