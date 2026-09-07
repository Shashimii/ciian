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
import DataTable from '@/components/core/data-table';
import type { DataTableColumn } from '@/components/core/data-table';
import { ConfirmDialog, Modal } from '@/components/core/modal';
import PasswordInput from '@/components/core/password-input';
import TagBadge from '@/components/core/tag-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { resolveLucideIcon } from '@/lib/lucide-icons';
import { create, index as tablesIndex } from '@/routes/tables';
import {
    destroy as destroyInternal,
    edit as editInternal,
    publish as publishInternal,
} from '@/routes/tables/internal';
import {
    destroy as destroySystem,
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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<TableRow | null>(null);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [pendingPassword, setPendingPassword] = useState<
        | { action: 'publish'; table: TableRow; confirmDrops: boolean }
        | { action: 'delete'; table: TableRow }
        | null
    >(null);
    const [rootPassword, setRootPassword] = useState('');

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

    // Keep the payload while the dialog fades out so its content stays stable.
    useEffect(() => {
        if (deleteDialogOpen) {
            return;
        }

        const timer = setTimeout(() => setPendingDelete(null), 200);

        return () => clearTimeout(timer);
    }, [deleteDialogOpen]);

    // Keep the payload while the dialog fades out so its content stays stable.
    useEffect(() => {
        if (passwordDialogOpen) {
            return;
        }

        const timer = setTimeout(() => {
            setPendingPassword(null);
            setRootPassword('');
        }, 200);

        return () => clearTimeout(timer);
    }, [passwordDialogOpen]);

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

    const submitPublish = (
        table: TableRow,
        confirmDrops = false,
        password?: string,
    ) => {
        const label = table.is_sync ? 'Syncing' : 'Publishing';
        let toastId: string | number | undefined;

        router.post(
            table.store === 'internal'
                ? publishInternal.url(table.id)
                : publishSystem.url(table.id),
            {
                ...(confirmDrops ? { confirm_drops: true } : {}),
                ...(password ? { root_password: password } : {}),
            },
            {
                preserveScroll: true,
                onStart: () => {
                    setPublishingKey(table.key);
                    toastId = toast.loading(`${label} ${table.name}…`);
                },
                onError: (errors) => {
                    showError(
                        `${table.name} could not be ${table.is_sync ? 'synced' : 'published'}`,
                        errors.root_password ??
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

    // Any already-published table requires the current user's password before a
    // sync applies real DDL to it — a first-time publish is unaffected.
    const proceedToPublish = (table: TableRow, confirmDrops: boolean) => {
        if (table.is_sync) {
            setPendingPassword({ action: 'publish', table, confirmDrops });
            setPasswordDialogOpen(true);

            return;
        }

        submitPublish(table, confirmDrops);
    };

    const publishTable = (table: TableRow) => {
        if (table.dropped_columns.length > 0) {
            setPendingDrop(table);
            setDropDialogOpen(true);

            return;
        }

        proceedToPublish(table, false);
    };

    const confirmDrop = () => {
        setDropDialogOpen(false);

        if (pendingDrop) {
            proceedToPublish(pendingDrop, true);
        }
    };

    const confirmPassword = () => {
        if (!pendingPassword || !rootPassword) {
            return;
        }

        setPasswordDialogOpen(false);

        if (pendingPassword.action === 'publish') {
            submitPublish(
                pendingPassword.table,
                pendingPassword.confirmDrops,
                rootPassword,
            );
        } else {
            submitDelete(pendingPassword.table, rootPassword);
        }
    };

    const submitDelete = (table: TableRow, password?: string) => {
        let toastId: string | number | undefined;

        router.delete(
            table.store === 'internal'
                ? destroyInternal.url(table.id)
                : destroySystem.url(table.id),
            {
                preserveScroll: true,
                data: password ? { root_password: password } : {},
                onStart: () => {
                    setDeletingKey(table.key);
                    toastId = toast.loading(`Deleting ${table.name}…`);
                },
                onError: (errors) => {
                    showError(
                        `${table.name} could not be deleted`,
                        errors.root_password ??
                            errors.table ??
                            'The database rejected the change. No reason was returned.',
                    );
                },
                onFinish: () => {
                    setDeletingKey(null);
                    toast.dismiss(toastId);
                },
            },
        );
    };

    const deleteTable = (table: TableRow) => {
        setPendingDelete(table);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        setDeleteDialogOpen(false);

        if (!pendingDelete) {
            return;
        }

        if (pendingDelete.status === 'published') {
            setPendingPassword({ action: 'delete', table: pendingDelete });
            setPasswordDialogOpen(true);

            return;
        }

        submitDelete(pendingDelete);
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
                    onDelete={deleteTable}
                    isProtected={(row) => !row.can_delete}
                    deletingKey={deletingKey}
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

            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                variant="destructive"
                title="Delete this table?"
                description={
                    // The delete action is disabled outright for protected (can_delete:
                    // false) rows, so this dialog only ever opens for a deletable one.
                    pendingDelete
                        ? `${pendingDelete.name} and all its data will be permanently deleted. This cannot be undone.${
                              pendingDelete.status === 'published'
                                  ? ' This table is published — deleting it will ask for your password next.'
                                  : ''
                          }`
                        : undefined
                }
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />

            <ConfirmDialog
                open={passwordDialogOpen}
                onOpenChange={setPasswordDialogOpen}
                variant="destructive"
                title="Confirm your password"
                description={
                    pendingPassword
                        ? `${pendingPassword.table.name} is ${pendingPassword.table.can_delete ? 'a published table' : 'a protected platform table'}. Enter your password to ${pendingPassword.action === 'delete' ? 'delete it' : 'sync it'}.`
                        : undefined
                }
                confirmLabel={
                    pendingPassword?.action === 'delete' ? 'Delete' : 'Sync'
                }
                onConfirm={confirmPassword}
            >
                <div className="space-y-2">
                    <Label htmlFor="root-password">Password</Label>
                    <PasswordInput
                        id="root-password"
                        autoFocus
                        value={rootPassword}
                        onChange={(event) =>
                            setRootPassword(event.target.value)
                        }
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && rootPassword) {
                                event.preventDefault();
                                confirmPassword();
                            }
                        }}
                    />
                </div>
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
