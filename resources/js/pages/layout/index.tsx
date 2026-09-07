import { Head } from '@inertiajs/react';
import { useMemo } from 'react';
import DataTable from '@/components/core/data-table';
import type { DataTableColumn } from '@/components/core/data-table';
import { Badge } from '@/components/ui/badge';
import { index as layoutsIndex } from '@/routes/layouts';
import type { LayoutRow } from '@/types/layout';

type Props = {
    layouts: LayoutRow[];
};

export default function LayoutIndex({ layouts }: Props) {
    const columns = useMemo<DataTableColumn<LayoutRow>[]>(
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
                id: 'regions',
                header: 'Regions',
                // Which slots a shell offers is what tells two shells apart, so the
                // labels are listed rather than counted. Sorting still uses the count.
                sortable: true,
                sortValue: (row) => row.regions.length,
                searchValue: (row) => row.regions.join(' '),
                cell: (row) =>
                    row.regions.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                    ) : (
                        <div className="flex flex-wrap gap-1">
                            {row.regions.map((region) => (
                                <span
                                    key={region}
                                    className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                                >
                                    {region}
                                </span>
                            ))}
                        </div>
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
            <Head title="Layouts" />

            <div className="px-4 py-6">
                <DataTable
                    rows={layouts}
                    columns={columns}
                    getRowKey={(row) => row.key}
                    emptyMessage="No layouts yet."
                    searchPlaceholder="Search layouts…"
                />
            </div>
        </>
    );
}

LayoutIndex.layout = {
    breadcrumbs: [
        {
            title: 'Layouts',
            href: layoutsIndex(),
        },
    ],
};
