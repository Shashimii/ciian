import { Head } from '@inertiajs/react';
import { useMemo } from 'react';
import DataTable from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { Icon } from '@/components/ui/icon';
import { resolveLucideIcon } from '@/lib/lucide-icons';
import { index as systemsIndex } from '@/routes/systems';
import type { SystemRow } from '@/types';

type Props = {
    systems: SystemRow[];
};

export default function SystemIndex({ systems }: Props) {
    const columns = useMemo<DataTableColumn<SystemRow>[]>(
        () => [
            {
                id: 'name',
                header: 'Name',
                cell: (row) => {
                    const RowIcon = resolveLucideIcon(row.icon);

                    return (
                        <div className="flex items-center gap-2 font-medium">
                            {RowIcon && (
                                <Icon
                                    iconNode={RowIcon}
                                    className="size-4 text-muted-foreground"
                                />
                            )}
                            {row.name}
                        </div>
                    );
                },
            },
            {
                id: 'slug',
                header: 'Slug',
                cell: (row) => (
                    <span className="font-mono text-xs text-muted-foreground">
                        {row.slug}
                    </span>
                ),
            },
            {
                id: 'tables_count',
                header: 'Tables',
                cell: (row) => row.tables_count,
            },
        ],
        [],
    );

    return (
        <>
            <Head title="Systems" />

            <div className="px-4 py-6">
                <DataTable
                    rows={systems}
                    columns={columns}
                    getRowKey={(row) => String(row.id)}
                    emptyMessage="No systems yet. Create one to own tables."
                />
            </div>
        </>
    );
}

SystemIndex.layout = {
    breadcrumbs: [
        {
            title: 'Systems',
            href: systemsIndex(),
        },
    ],
};
