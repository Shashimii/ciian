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
import { edit as editCiian } from '@/routes/ciian';
import {
    create,
    destroy,
    index as systemsIndex,
    publish,
    show,
} from '@/routes/systems';
import type { SystemRow } from '@/types';

type Props = {
    systems: SystemRow[];
};

type ErrorDetail = {
    title: string;
    message: string;
};

/** Longer than this and the message goes to a modal instead of a toast. */
const ERROR_TOAST_MAX_LENGTH = 120;

export default function SystemIndex({ systems }: Props) {
    const [publishingKey, setPublishingKey] = useState<string | null>(null);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<SystemRow | null>(null);
    const [rootPassword, setRootPassword] = useState('');
    const [errorOpen, setErrorOpen] = useState(false);
    const [errorDetail, setErrorDetail] = useState<ErrorDetail | null>(null);

    // Keep the payload while the dialog fades out so its content stays stable.
    useEffect(() => {
        if (errorOpen) {
            return;
        }

        const timer = setTimeout(() => setErrorDetail(null), 200);

        return () => clearTimeout(timer);
    }, [errorOpen]);

    // The delete confirm hands off to the password prompt, so the payload is only
    // cleared once neither is open.
    useEffect(() => {
        if (deleteOpen || passwordOpen) {
            return;
        }

        const timer = setTimeout(() => {
            setPendingDelete(null);
            setRootPassword('');
        }, 200);

        return () => clearTimeout(timer);
    }, [deleteOpen, passwordOpen]);

    useEffect(() => {
        setLayoutProps({
            headerActions: (
                <div className="flex items-center gap-2">
                    <Button asChild>
                        <Link href={create()}>
                            <Plus className="size-4" />
                            New system
                        </Link>
                    </Button>
                </div>
            ),
        });

        return () => {
            resetLayoutProps();
        };
    }, []);

    const columns = useMemo<DataTableColumn<SystemRow>[]>(
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
                id: 'tag',
                header: 'Tag',
                sortable: true,
                sortValue: (row) => row.name,
                searchValue: (row) => row.name,
                cell: (row) => (
                    <TagBadge
                        system={{
                            type: row.kind === 'ciian' ? 'ciian' : 'system',
                            label: row.name,
                            slug: row.slug,
                            icon: row.icon,
                            color: row.color,
                        }}
                    />
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
                id: 'tables_count',
                header: 'Tables',
                sortable: true,
                sortValue: (row) => row.tables_count,
                searchValue: (row) => row.tables_count,
                cell: (row) => row.tables_count,
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

    // Long server errors are unreadable in a toast, so offer them in a modal instead.
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

    const publishSystem = (system: SystemRow) => {
        const label = system.is_sync ? 'Syncing' : 'Publishing';
        let toastId: string | number | undefined;

        router.post(
            publish.url(system.id),
            {},
            {
                preserveScroll: true,
                invalidateCacheTags: ['systems'],
                onStart: () => {
                    setPublishingKey(system.key);
                    toastId = toast.loading(`${label} ${system.name}…`);
                },
                onError: (errors) => {
                    showError(
                        `${system.name} could not be ${system.is_sync ? 'synced' : 'published'}`,
                        errors.shape ??
                            'The system could not be published. No reason was returned.',
                    );
                },
                onFinish: () => {
                    setPublishingKey(null);
                    toast.dismiss(toastId);
                },
            },
        );
    };

    const submitDelete = (system: SystemRow, password?: string) => {
        let toastId: string | number | undefined;

        router.delete(destroy.url(system.id), {
            preserveScroll: true,
            invalidateCacheTags: ['systems', 'tables'],
            data: password ? { root_password: password } : {},
            onStart: () => {
                setDeletingKey(system.key);
                toastId = toast.loading(`Deleting ${system.name}…`);
            },
            onError: (errors) => {
                showError(
                    `${system.name} could not be deleted`,
                    errors.root_password ??
                        errors.system ??
                        'The system could not be deleted. No reason was returned.',
                );
            },
            onFinish: () => {
                setDeletingKey(null);
                toast.dismiss(toastId);
            },
        });
    };

    const confirmDelete = () => {
        setDeleteOpen(false);

        if (!pendingDelete) {
            return;
        }

        // The server refuses this too, in case the count is stale — but there is
        // no point spending a round-trip when the answer is already on screen.
        if (pendingDelete.blocking_tables > 0) {
            toast.error(
                `${pendingDelete.name} still owns tables. Delete them from the Tables module first.`,
                { duration: 12000 },
            );

            return;
        }

        // A live system is serving its pages at its prefix, so removing it asks
        // for the current user's password first. A draft serves nothing yet.
        if (pendingDelete.status === 'published') {
            setPasswordOpen(true);

            return;
        }

        submitDelete(pendingDelete);
    };

    const confirmPassword = () => {
        if (!pendingDelete || !rootPassword) {
            return;
        }

        setPasswordOpen(false);
        submitDelete(pendingDelete, rootPassword);
    };

    return (
        <>
            <Head title="Systems" />

            <div className="px-4 py-6">
                <DataTable
                    rows={systems}
                    columns={columns}
                    getRowKey={(row) => row.key}
                    emptyMessage="No systems yet."
                    searchPlaceholder="Search systems…"
                    onRowClick={(row) => {
                        // Ciian is the platform, not a created system: it has no
                        // shape and no manage page. Its config lives in Settings.
                        router.visit(
                            row.kind === 'ciian' ? editCiian() : show(row.id),
                        );
                    }}
                    onPublish={publishSystem}
                    canPublish={(row) => row.can_publish}
                    isSync={(row) => row.is_sync}
                    publishingKey={publishingKey}
                    onDelete={(row) => {
                        setPendingDelete(row);
                        setDeleteOpen(true);
                    }}
                    isProtected={(row) => !row.can_delete}
                    protectedLabel="Protected System"
                    deletingKey={deletingKey}
                />
            </div>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                variant="destructive"
                title="Delete this system?"
                description={
                    // The Ciian row's delete action is disabled outright, so this
                    // dialog only ever opens for a created system.
                    pendingDelete
                        ? pendingDelete.blocking_tables > 0
                            ? `${pendingDelete.name} still owns ${pendingDelete.blocking_tables} table${pendingDelete.blocking_tables === 1 ? '' : 's'}. Delete them from the Tables module first — deleting a system never drops physical tables.`
                            : `${pendingDelete.name}, its pages, and everything generated for it will be permanently deleted. This cannot be undone.${
                                  pendingDelete.status === 'published'
                                      ? ' This system is published — deleting it will ask for your password next.'
                                      : ''
                              }`
                        : undefined
                }
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />

            <ConfirmDialog
                open={passwordOpen}
                onOpenChange={setPasswordOpen}
                variant="destructive"
                title="Confirm your password"
                description={
                    pendingDelete
                        ? `${pendingDelete.name} is published and serving its pages. Enter your password to delete it.`
                        : undefined
                }
                confirmLabel="Delete"
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
                description="The system was left on its previous state. Nothing was applied."
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

SystemIndex.layout = {
    breadcrumbs: [
        {
            title: 'Systems',
            href: systemsIndex(),
        },
    ],
};
