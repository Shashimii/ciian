import {
    Head,
    resetLayoutProps,
    setLayoutProps,
} from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import DataTable, { type DataTableColumn } from '@/components/data-table';
import TableFormSidebar from '@/components/table-form-sidebar';
import TagBadge from '@/components/tag-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { resolveLucideIcon } from '@/lib/lucide-icons';
import { index as tablesIndex } from '@/routes/tables';
import type { SystemOption, TableRow } from '@/types';
import { Plus } from 'lucide-react';

type Props = {
    tables: TableRow[];
    systems: SystemOption[];
    columnTypes: Record<string, string>;
};

export default function TableIndex({ tables, systems, columnTypes }: Props) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarMode, setSidebarMode] = useState<'create' | 'edit'>('create');
    const [activeTable, setActiveTable] = useState<TableRow | null>(null);

    useEffect(() => {
        setLayoutProps({
            headerActions: (
                <Button
                    onClick={() => {
                        setSidebarMode('create');
                        setActiveTable(null);
                        setSidebarOpen(true);
                    }}
                >
                    <Plus className="size-4" />
                    New table
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
                                <Icon iconNode={RowIcon} className="size-4 text-muted-foreground" />
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
        setSidebarMode('edit');
        setActiveTable(table);
        setSidebarOpen(true);
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
                />
            </div>

            <TableFormSidebar
                open={sidebarOpen}
                onOpenChange={setSidebarOpen}
                mode={sidebarMode}
                table={activeTable}
                systems={systems}
                columnTypes={columnTypes}
            />
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
