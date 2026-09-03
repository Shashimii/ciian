import { Head } from '@inertiajs/react';
import { useMemo } from 'react';
import DataTable from '@/components/core/data-table';
import type { DataTableColumn } from '@/components/core/data-table';
import { Badge } from '@/components/ui/badge';
import { index as componentsIndex } from '@/routes/components';
import type { ComponentRow } from '@/types/component';

type Props = {
    components: ComponentRow[];
};

export default function ComponentIndex({ components }: Props) {
    const columns = useMemo<DataTableColumn<ComponentRow>[]>(
        () => [
            {
                id: 'name',
                header: 'Name',
                sortable: true,
                sortValue: (row) => row.name,
                searchValue: (row) => `${row.name} ${row.description ?? ''}`,
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="font-medium">{row.name}</span>
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
                id: 'category',
                header: 'Category',
                sortable: true,
                sortValue: (row) => row.category,
                searchValue: (row) => row.category,
                cell: (row) => (
                    <Badge variant="secondary" className="capitalize">
                        {row.category}
                    </Badge>
                ),
            },
            {
                id: 'properties',
                header: 'Properties',
                sortable: true,
                sortValue: (row) => row.property_count,
                cell: (row) => (
                    <span className="text-muted-foreground">
                        {row.property_count}
                    </span>
                ),
            },
            {
                id: 'status',
                header: 'Status',
                sortable: true,
                sortValue: (row) => row.status,
                searchValue: (row) => row.status,
                cell: (row) => (
                    <Badge
                        variant={
                            row.status === 'published' ? 'default' : 'secondary'
                        }
                    >
                        {row.status === 'published'
                            ? 'Published'
                            : 'Unpublished'}
                    </Badge>
                ),
            },
        ],
        [],
    );

    return (
        <>
            <Head title="Components" />

            <div className="px-4 py-6">
                <DataTable
                    rows={components}
                    columns={columns}
                    getRowKey={(row) => row.key}
                    emptyMessage="No components yet."
                    searchPlaceholder="Search components…"
                />
            </div>
        </>
    );
}

ComponentIndex.layout = {
    breadcrumbs: [
        {
            title: 'Components',
            href: componentsIndex(),
        },
    ],
};
