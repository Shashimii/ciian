import {
    Head,
    Link,
    resetLayoutProps,
    router,
    setLayoutProps,
} from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import DataTable from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import TagBadge from '@/components/tag-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { resolveLucideIcon } from '@/lib/lucide-icons';
import { create, index as tablesIndex } from '@/routes/tables';
import { edit as editInternal, publish as publishInternal } from '@/routes/tables/internal';
import { edit as editSystem, publish as publishSystem } from '@/routes/tables/system';
import type { TableRow } from '@/types';

type Props = {
    tables: TableRow[];
};

export default function TableIndex({ tables }: Props) {
    useEffect(() => {
        setLayoutProps({
            headerActions: (
                <Button asChild>
                    <Link href={create()}>
                        <Plus className="size-4" />
                        New table
                    </Link>
                </Button>
            ),
        });

        return () => {
            resetLayoutProps();
        };
    }, []);

    const columns = useMemo<DataTableColumn<TableRow>[]>(
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
                header: 'Database name',
                cell: (row) => (
                    <span className="font-mono text-xs text-muted-foreground">
                        {row.slug}
                    </span>
                ),
            },
            {
                id: 'system',
                header: 'System',
                cell: (row) => <TagBadge system={row.system} />,
            },
            {
                id: 'status',
                header: 'Status',
                cell: (row) => (
                    <Badge
                        variant={
                            row.status === 'published' ? 'default' : 'secondary'
                        }
                    >
                        {row.status === 'published' ? 'Published' : 'Draft'}
                    </Badge>
                ),
            },
        ],
        [],
    );

    const openEdit = (table: TableRow) => {
        router.visit(
            table.store === 'internal'
                ? editInternal(table.id)
                : editSystem(table.id),
        );
    };

    const publishTable = (table: TableRow) => {
        router.post(
            table.store === 'internal'
                ? publishInternal.url(table.id)
                : publishSystem.url(table.id),
            {},
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Tables" />

            <div className="px-4 py-6">
                <DataTable
                    rows={tables}
                    columns={columns}
                    getRowKey={(row) => row.key}
                    emptyMessage="No tables yet. Create one to get started."
                    onRowClick={openEdit}
                    onPublish={publishTable}
                    canPublish={(row) => row.can_publish}
                    isSync={(row) => row.is_sync}
                />
            </div>
        </>
    );
}

TableIndex.layout = {
    breadcrumbs: [
        {
            title: 'Tables',
            href: tablesIndex(),
        },
    ],
};
