import { Head } from '@inertiajs/react';
import TableForm from '@/components/core/table-form';
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

            {/* The three editor panels only scroll independently at xl, where they sit
                side by side; there the form fills the layout's scroll region exactly.
                Below xl they stack into one tall column, so the height cap comes off
                and the layout's scroll region scrolls the page as a whole. */}
            <div className="flex flex-col px-4 py-6 xl:h-full xl:overflow-hidden">
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
