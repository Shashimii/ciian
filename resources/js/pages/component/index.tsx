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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    create,
    destroy,
    index as componentsIndex,
    show,
} from '@/routes/components';
import type { ComponentRow } from '@/types/component';

type Props = {
    components: ComponentRow[];
};

type ErrorDetail = {
    title: string;
    message: string;
};

/** Longer than this and the message goes to a modal instead of a toast. */
const ERROR_TOAST_MAX_LENGTH = 120;

export default function ComponentIndex({ components }: Props) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<ComponentRow | null>(
        null,
    );
    const [deletingKey, setDeletingKey] = useState<string | null>(null);
    const [errorOpen, setErrorOpen] = useState(false);
    const [errorDetail, setErrorDetail] = useState<ErrorDetail | null>(null);

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
                        New component
                    </Link>
                </Button>
            ),
        });

        return () => {
            resetLayoutProps();
        };
    }, []);

    const columns = useMemo<DataTableColumn<ComponentRow>[]>(
        () => [
            {
                id: 'name',
                header: 'Name',
                sortable: true,
                sortValue: (row) => row.name,
                searchValue: (row) => `${row.name} ${row.description ?? ''}`,
                cell: (row) => (
                    <div className="flex flex-col">
                        <span className="font-medium">{row.name}</span>
                        {row.description && (
                            <span className="text-xs text-muted-foreground">
                                {row.description}
                            </span>
                        )}
                    </div>
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
                id: 'category',
                header: 'Category',
                sortable: true,
                sortValue: (row) => row.category,
                searchValue: (row) => row.category,
                cell: (row) => (
                    <Badge variant="secondary" className="capitalize">
                        {row.category}
                    </Badge>
                ),
            },
            {
                id: 'properties',
                header: 'Properties',
                sortable: true,
                sortValue: (row) => row.property_count,
                cell: (row) => (
                    <span className="text-muted-foreground">
                        {row.property_count}
                    </span>
                ),
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

    // A long failure reason is unreadable in a toast, so offer it in a modal instead.
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

    const deleteComponent = (component: ComponentRow) => {
        setPendingDelete(component);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        setDeleteDialogOpen(false);

        if (!pendingDelete) {
            return;
        }

        const component = pendingDelete;
        let toastId: string | number | undefined;

        router.delete(destroy.url(component.id), {
            preserveScroll: true,
            onStart: () => {
                setDeletingKey(component.key);
                toastId = toast.loading(`Deleting ${component.name}…`);
            },
            onError: (errors) => {
                showError(
                    `${component.name} could not be deleted`,
                    errors.component ??
                        'The component could not be deleted. No reason was returned.',
                );
            },
            onFinish: () => {
                setDeletingKey(null);
                toast.dismiss(toastId);
            },
        });
    };

    return (
        <>
            <Head title="Components" />

            <div className="px-4 py-6">
                <DataTable
                    rows={components}
                    columns={columns}
                    getRowKey={(row) => row.key}
                    emptyMessage="No components yet."
                    searchPlaceholder="Search components…"
                    onRowClick={(row) => router.visit(show(row.id))}
                    onDelete={deleteComponent}
                    isProtected={(row) => !row.can_delete}
                    protectedLabel="Protected Component"
                    deletingKey={deletingKey}
                />
            </div>

            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                variant="destructive"
                title="Delete this component?"
                description={
                    // Protected rows show a disabled lock instead of a delete action,
                    // so this dialog only ever opens for a deletable component.
                    pendingDelete
                        ? `${pendingDelete.name} and its generated source file will be permanently deleted. Any page that already places this block will no longer render it. This cannot be undone.`
                        : undefined
                }
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />

            <Modal
                open={errorOpen}
                onOpenChange={setErrorOpen}
                tone="destructive"
                size="xl"
                title={errorDetail?.title ?? 'Error encountered'}
                description="Nothing was removed beyond any steps already reported."
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

ComponentIndex.layout = {
    breadcrumbs: [
        {
            title: 'Components',
            href: componentsIndex(),
        },
    ],
};
