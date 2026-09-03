import { Head } from '@inertiajs/react';
import TableForm from '@/components/table-form';
import { index as tablesIndex } from '@/routes/tables';
import { edit as editInternal } from '@/routes/tables/internal';
import { edit as editSystem } from '@/routes/tables/system';
import type { RelationTableOption, SystemOption, TableRow } from '@/types';

type Props = {
    table: TableRow;
    systems: SystemOption[];
    columnTypes: Record<string, string>;
    relationTables: RelationTableOption[];
};

export default function TableUpdate({
    table,
    systems,
    columnTypes,
    relationTables,
}: Props) {
    return (
        <>
            <Head title={`Edit ${table.name}`} />

            {/* The three editor panels only scroll independently at xl, where they sit
                side by side; there the form fills the layout's scroll region exactly.
                Below xl they stack into one tall column, so the height cap comes off
                and the layout's scroll region scrolls the page as a whole. */}
            <div className="flex flex-col px-4 py-6 xl:h-full xl:overflow-hidden">
                <TableForm
                    mode="edit"
                    table={table}
                    systems={systems}
                    columnTypes={columnTypes}
                    relationTables={relationTables}
                />
            </div>
        </>
    );
}

TableUpdate.layout = (props: Props) => ({
    breadcrumbs: [
        {
            title: 'Tables',
            href: tablesIndex(),
        },
        {
            title: props.table.name,
            href:
                props.table.store === 'internal'
                    ? editInternal(props.table.id)
                    : editSystem(props.table.id),
        },
    ],
});
