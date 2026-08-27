import { Head } from '@inertiajs/react';
import TableForm from '@/components/table-form';
import { create, index as tablesIndex } from '@/routes/tables';
import type { SystemOption } from '@/types';

type Props = {
    systems: SystemOption[];
    columnTypes: Record<string, string>;
};

export default function TableCreate({ systems, columnTypes }: Props) {
    return (
        <>
            <Head title="New table" />

            <div className="px-4 py-6">
                <TableForm
                    mode="create"
                    systems={systems}
                    columnTypes={columnTypes}
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
