import { Head } from '@inertiajs/react';
import TableForm from '@/components/table-form';
import { index as tablesIndex } from '@/routes/tables';
import { edit as editInternal } from '@/routes/tables/internal';
import { edit as editSystem } from '@/routes/tables/system';
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
