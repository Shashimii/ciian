import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import TableForm from '@/components/table-form';
import { index as tablesIndex } from '@/routes/tables';
import type { SystemOption, TableRow } from '@/types';

type Props = {
    table: TableRow;
    systems: SystemOption[];
    columnTypes: Record<string, string>;
};

export default function TableUpdate({ table, systems, columnTypes }: Props) {
    return (
        <>
            <Head title={`Edit ${table.name}`} />

            <div className="px-4 py-6">
                <div className="mb-4">
                    <Heading
                        className="mb-0"
                        title={table.name}
                        description="Update the draft shape stored in unpub_shape."
                    />
                </div>

                <TableForm
                    mode="edit"
                    table={table}
                    systems={systems}
                    columnTypes={columnTypes}
                />
            </div>
        </>
    );
}

TableUpdate.layout = {
    breadcrumbs: [
        {
            title: 'Tables',
            href: tablesIndex(),
        },
        {
            title: 'Edit table',
            href: tablesIndex(),
        },
    ],
};
