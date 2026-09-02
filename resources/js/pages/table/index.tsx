import {
    Head,
    Link,
    resetLayoutProps,
    router,
    setLayoutProps,
} from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DataTable from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { ConfirmDialog, Modal } from '@/components/modal';
import TagBadge from '@/components/tag-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { resolveLucideIcon } from '@/lib/lucide-icons';
import { create, index as tablesIndex } from '@/routes/tables';
import {
    edit as editInternal,
    publish as publishInternal,
} from '@/routes/tables/internal';
import {
    edit as editSystem,
    publish as publishSystem,
} from '@/routes/tables/system';
import type { TableRow } from '@/types';

type Props = {
    tables: TableRow[];
};

type ErrorDetail = {
    title: string;
    message: string;
};

/** Longer than this and the message goes to a modal instead of a toast. */
const ERROR_TOAST_MAX_LENGTH = 120;

export default function TableIndex({ tables }: Props) {
    const [dropDialogOpen, setDropDialogOpen] = useState(false);
    const [pendingDrop, setPendingDrop] = useState<TableRow | null>(null);
    const [publishingKey, setPublishingKey] = useState<string | null>(null);
    const [errorOpen, setErrorOpen] = useState(false);
    const [errorDetail, setErrorDetail] = useState<ErrorDetail | null>(null);

    // Keep the payload while the dialog fades out so its content stays stable.
    useEffect(() => {
        if (dropDialogOpen) {
            return;
        }

        const timer = setTimeout(() => setPendingDrop(null), 200);

        return () => clearTimeout(timer);
    }, [dropDialogOpen]);

    // Keep the payload while the dialog fades out so its content stays stable.
    useEffect(() => {
        if (errorOpen) {
            return;
        }

        const timer = setTimeout(() => setErrorDetail(null), 200);

        return () => clearTimeout(timer);
    }, [errorOpen]);

    useEffect(() => {
        setLayoutProps({
            headerActions: (
                <Button asChild>
                    <Link href={create()}>
                        <Plus className="size-4" />
                        New table
                    </Link>
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
                sortable: true,
                sortValue: (row) => row.name,
                searchValue: (row) => row.name,
                cell: (row) => {
                    const RowIcon = resolveLucideIcon(row.icon);

                    return (
                        <div className="flex items-center gap-2 font-medium">
                            {RowIcon && (
                                <Icon
                                    iconNode={RowIcon}
                                    className="size-4 text-muted-foreground"
                                />
                            )}
                            {row.name}
                        </div>
                    );
                },
            },
            {
                id: 'slug',
                header: 'Database name',
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
                id: 'system',
                header: 'System',
                sortable: true,
                sortValue: (row) => row.system.label,
                searchValue: (row) => `${row.system.label} ${row.system.slug}`,
                cell: (row) => <TagBadge system={row.system} />,
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

    const openEdit = (table: TableRow) => {
        router.visit(
            table.store === 'internal'
                ? editInternal(table.id)
                : editSystem(table.id),
        );
    };

    // Long driver errors are unreadable in a toast, so offer them in a modal instead.
    const showError = (title: string, message: string) => {
        if (message.length <= ERROR_TOAST_MAX_LENGTH) {
            toast.error(message, { duration: 12000 });

            return;
        }

        toast.error('Error encountered', {
            description: title,
            duration: 15000,
            action: {
                label: 'View',
                onClick: () => {
                    setErrorDetail({ title, message });
                    setErrorOpen(true);
                },
            },
        });
    };

    const submitPublish = (table: TableRow, confirmDrops = false) => {
        const label = table.is_sync ? 'Syncing' : 'Publishing';
        let toastId: string | number | undefined;

        router.post(
            table.store === 'internal'
                ? publishInternal.url(table.id)
                : publishSystem.url(table.id),
            confirmDrops ? { confirm_drops: true } : {},
            {
                preserveScroll: true,
                onStart: () => {
                    setPublishingKey(table.key);
                    toastId = toast.loading(`${label} ${table.name}…`);
                },
                onError: (errors) => {
                    showError(
                        `${table.name} could not be ${table.is_sync ? 'synced' : 'published'}`,
                        errors.shape ??
                            'The database rejected the change. No reason was returned.',
                    );
                },
                onFinish: () => {
                    setPublishingKey(null);
                    toast.dismiss(toastId);
                },
            },
        );
    };

    const publishTable = (table: TableRow) => {
        if (table.dropped_columns.length > 0) {
            setPendingDrop(table);
            setDropDialogOpen(true);

            return;
        }

        submitPublish(table);
    };

    const confirmDrop = () => {
        if (pendingDrop) {
            submitPublish(pendingDrop, true);
        }

        setDropDialogOpen(false);
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
                    searchPlaceholder="Search tables…"
                    onRowClick={openEdit}
                    onPublish={publishTable}
                    canPublish={(row) => row.can_publish}
                    isSync={(row) => row.is_sync}
                    publishingKey={publishingKey}
                />
            </div>

            <ConfirmDialog
                open={dropDialogOpen}
                onOpenChange={setDropDialogOpen}
                variant="destructive"
                title="Delete columns and their data?"
                description={
                    pendingDrop
                        ? `Syncing ${pendingDrop.name} removes ${pendingDrop.dropped_columns.length === 1 ? 'this column' : 'these columns'} from the database. Any data stored in ${pendingDrop.dropped_columns.length === 1 ? 'it' : 'them'} is permanently lost and cannot be recovered.`
                        : undefined
                }
                confirmLabel="Delete"
                onConfirm={confirmDrop}
            >
                {pendingDrop && (
                    <ul className="flex flex-wrap gap-2">
                        {pendingDrop.dropped_columns.map((column) => (
                            <li
                                key={column}
                                className="rounded-md bg-destructive/10 px-2.5 py-0.5 font-mono text-xs text-destructive"
                            >
                                {column}
                            </li>
                        ))}
                    </ul>
                )}
            </ConfirmDialog>

            <Modal
                open={errorOpen}
                onOpenChange={setErrorOpen}
                tone="destructive"
                size="xl"
                title={errorDetail?.title ?? 'Error encountered'}
                description="The database rejected the change. Nothing was applied beyond any steps already reported."
                footer={
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setErrorOpen(false)}
                    >
                        Close
                    </Button>
                }
            >
                {errorDetail && (
                    <pre className="max-h-56 overflow-auto rounded-md bg-destructive/10 p-3 text-left font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-destructive">
                        {errorDetail.message}
                    </pre>
                )}
            </Modal>
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
