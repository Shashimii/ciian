import { Head } from '@inertiajs/react';
import { useMemo } from 'react';
import DataTable from '@/components/core/data-table';
import type { DataTableColumn } from '@/components/core/data-table';
import { Badge } from '@/components/ui/badge';
import { index as permissionsIndex } from '@/routes/permissions';
import type { PermissionRow } from '@/types/permission';

type Props = {
    permissions: PermissionRow[];
};

export default function PermissionIndex({ permissions }: Props) {
    const columns = useMemo<DataTableColumn<PermissionRow>[]>(
        () => [
            {
                id: 'name',
                header: 'Name',
                sortable: true,
                sortValue: (row) => row.name,
                searchValue: (row) => `${row.name} ${row.description ?? ''}`,
                cell: (row) => (
                    <div className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-2 font-medium">
                            {row.name}
                            {row.is_root && (
                                <Badge variant="secondary">Wildcard</Badge>
                            )}
                        </span>
                        {row.description && (
                            <span className="text-xs text-muted-foreground">
                                {row.description}
                            </span>
                        )}
                    </div>
                ),
            },
            {
                id: 'slug',
                header: 'Slug',
                sortable: true,
                sortValue: (row) => row.slug,
                searchValue: (row) => row.slug,
                cell: (row) => (
                    <span className="font-mono text-xs text-muted-foreground">
                        {row.slug}
                    </span>
                ),
            },
            {
                id: 'roles',
                header: 'Roles',
                sortable: true,
                sortValue: (row) => row.role_count,
                cell: (row) => (
                    <Badge
                        variant={row.role_count > 0 ? 'secondary' : 'outline'}
                    >
                        {row.role_count}
                    </Badge>
                ),
            },
        ],
        [],
    );

    return (
        <>
            <Head title="Permissions" />

            <div className="px-4 py-6">
                <DataTable
                    rows={permissions}
                    columns={columns}
                    getRowKey={(row) => row.key}
                    emptyMessage="No permissions yet."
                    searchPlaceholder="Search permissions…"
                />
            </div>
        </>
    );
}

PermissionIndex.layout = {
    breadcrumbs: [
        {
            title: 'Permissions',
            href: permissionsIndex(),
        },
    ],
};
