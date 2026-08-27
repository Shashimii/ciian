import { Head } from '@inertiajs/react';
import TableForm from '@/components/table-form';
import { create, index as tablesIndex } from '@/routes/tables';
import type { RelationTableOption, SystemOption } from '@/types';

type Props = {
    systems: SystemOption[];
    columnTypes: Record<string, string>;
    relationTables: RelationTableOption[];
};

export default function TableCreate({
    systems,
    columnTypes,
    relationTables,
}: Props) {
    return (
        <>
            <Head title="New table" />

            <div className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden px-4 py-6">
                <TableForm
                    mode="create"
                    systems={systems}
                    columnTypes={columnTypes}
                    relationTables={relationTables}
                />
            </div>
        </>
    );
}

TableCreate.layout = {
    breadcrumbs: [
        {
            title: 'Tables',
            href: tablesIndex(),
        },
        {
            title: 'New table',
            href: create(),
        },
    ],
};
