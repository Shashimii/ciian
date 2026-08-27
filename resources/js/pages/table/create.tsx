import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
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
                <div className="mb-4">
                    <Heading
                        className="mb-0"
                        title="New table"
                        description="Create a draft table shape before publishing."
                    />
                </div>

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
