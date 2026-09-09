import {
    Head,
    Link,
    resetLayoutProps,
    router,
    setLayoutProps,
    useForm,
} from '@inertiajs/react';
import {
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    SquareArrowOutUpRight,
    Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import ColorPicker from '@/components/core/color-picker';
import DataTable from '@/components/core/data-table';
import type { DataTableColumn } from '@/components/core/data-table';
import FormSidebar from '@/components/core/form-sidebar';
import Heading from '@/components/core/heading';
import IconPicker from '@/components/core/icon-picker';
import InputError from '@/components/core/input-error';
import { ConfirmDialog, Modal } from '@/components/core/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { clearFieldErrors } from '@/lib/clear-field-errors';
import { resolveLucideIcon } from '@/lib/lucide-icons';
import { index as systemsIndex, publish, show, update } from '@/routes/systems';
import {
    destroy as destroyPage,
    edit as editPage,
    publish as publishPage,
    store as storePage,
    update as updatePage,
} from '@/routes/systems/pages';
import { create as createTable } from '@/routes/tables';
import type { SystemPageRow, SystemRow } from '@/types';

type Props = {
    system: SystemRow;
    pages: SystemPageRow[];
    tagColors: string[];
};

/** Longer than this and the message goes to a modal instead of a toast. */
const ERROR_TOAST_MAX_LENGTH = 120;

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/** URL segments read better with dashes than the slug's underscores. */
function prefixify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export default function SystemView({ system, pages, tagColors }: Props) {
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [iconTooltipOpen, setIconTooltipOpen] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [errorOpen, setErrorOpen] = useState(false);
    const [errorDetail, setErrorDetail] = useState<{
        title: string;
        message: string;
    } | null>(null);

    const [pageCreateOpen, setPageCreateOpen] = useState(false);
    const [pageEditOpen, setPageEditOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<SystemPageRow | null>(null);
    const [pagePublishingKey, setPagePublishingKey] = useState<string | null>(
        null,
    );
    const [pageDeletingKey, setPageDeletingKey] = useState<string | null>(null);
    const [pageDeleteOpen, setPageDeleteOpen] = useState(false);
    const [pendingPageDelete, setPendingPageDelete] =
        useState<SystemPageRow | null>(null);

    const form = useForm({
        name: system.name,
        slug: system.slug,
        prefix: system.prefix,
        icon: system.icon,
        color: system.color ?? 'violet',
        description: system.description ?? '',
    });

    const pageCreateForm = useForm({ name: '', slug: '' });
    const pageEditForm = useForm({ name: '', slug: '' });

    const selectedIcon = resolveLucideIcon(form.data.icon);

    // Keep the payload while the dialog fades out so its content stays stable.
    useEffect(() => {
        if (errorOpen) {
            return;
        }

        const timer = setTimeout(() => setErrorDetail(null), 200);

        return () => clearTimeout(timer);
    }, [errorOpen]);

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

    const submitPublish = () => {
        const label = system.is_sync ? 'Syncing' : 'Publishing';
        let toastId: string | number | undefined;

        router.post(
            publish.url(system.id),
            {},
            {
                preserveScroll: true,
                invalidateCacheTags: ['systems'],
                onStart: () => {
                    setPublishing(true);
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
                    setPublishing(false);
                    toast.dismiss(toastId);
                },
            },
        );
    };

    useEffect(() => {
        const label = system.is_sync ? 'Sync' : 'Publish';

        setLayoutProps({
            headerActions: (
                <div className="flex items-center gap-2">
                    <span className="mr-2 text-sm text-muted-foreground">
                        {system.has_pending_changes
                            ? 'Pending changes'
                            : 'No pending changes'}
                    </span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex">
                                <Button
                                    type="button"
                                    aria-label={label}
                                    disabled={!system.can_publish || publishing}
                                    onClick={submitPublish}
                                >
                                    {publishing ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : system.is_sync ? (
                                        <RefreshCw className="size-4" />
                                    ) : (
                                        <Upload className="size-4" />
                                    )}
                                    {label}
                                </Button>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            {system.can_publish
                                ? system.is_sync
                                    ? 'Apply the draft to the published system'
                                    : 'Take this system live at its entry path'
                                : 'No pending changes to publish'}
                        </TooltipContent>
                    </Tooltip>

                    {/* Only a published system answers at its entry path. */}
                    {system.status === 'published' && system.entry && (
                        <Button variant="outline" asChild>
                            <a
                                href={system.entry}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <SquareArrowOutUpRight className="size-4" />
                                Visit
                            </a>
                        </Button>
                    )}
                </div>
            ),
        });

        return () => {
            resetLayoutProps();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        system.can_publish,
        system.entry,
        system.has_pending_changes,
        system.is_sync,
        system.name,
        system.status,
        publishing,
    ]);

    const submitSettings = (event: FormEvent) => {
        event.preventDefault();

        form.patch(update.url(system.id), {
            preserveScroll: true,
            invalidateCacheTags: ['systems', 'tables'],
            onSuccess: () => {
                // Badge icon/color appear on untagged pages (e.g. Tables) too.
                router.flushAll();
            },
        });
    };

    // Keep the payload while the sheet fades out so its content stays stable.
    useEffect(() => {
        if (pageEditOpen) {
            return;
        }

        const timer = setTimeout(() => setEditingPage(null), 200);

        return () => clearTimeout(timer);
    }, [pageEditOpen]);

    // Keep the payload while the dialog fades out so its content stays stable.
    useEffect(() => {
        if (pageDeleteOpen) {
            return;
        }

        const timer = setTimeout(() => setPendingPageDelete(null), 200);

        return () => clearTimeout(timer);
    }, [pageDeleteOpen]);

    const openPageEdit = useCallback(
        (page: SystemPageRow) => {
            setEditingPage(page);
            pageEditForm.setData({ name: page.name, slug: page.slug });
            pageEditForm.clearErrors();
            setPageEditOpen(true);
        },
        [pageEditForm],
    );

    const pageColumns = useMemo<DataTableColumn<SystemPageRow>[]>(
        () => [
            {
                id: 'name',
                header: 'Name',
                sortable: true,
                sortValue: (row) => row.name,
                searchValue: (row) => row.name,
                cell: (row) => (
                    <div className="flex items-center gap-2 font-medium">
                        {row.name}
                        {row.is_index && (
                            <Badge variant="outline">Starting page</Badge>
                        )}

                        {/* The row itself opens the builder, so renaming needs a
                            control of its own. */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="Rename page"
                                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openPageEdit(row);
                                    }}
                                >
                                    <Pencil className="size-3.5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Rename page</TooltipContent>
                        </Tooltip>
                    </div>
                ),
            },
            {
                id: 'url',
                header: 'Path',
                sortable: true,
                sortValue: (row) => row.url,
                searchValue: (row) => `${row.url} ${row.slug}`,
                cell: (row) => (
                    <span className="font-mono text-xs text-muted-foreground">
                        {row.url}
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
        [openPageEdit],
    );

    const closePageCreate = (open: boolean) => {
        setPageCreateOpen(open);

        if (!open) {
            window.setTimeout(() => {
                pageCreateForm.reset();
                pageCreateForm.clearErrors();
            }, 200);
        }
    };

    // Referenced from the Pages column definitions, so it has to be stable enough
    // for their memo to hold across renders.
    const closePageEdit = (open: boolean) => {
        setPageEditOpen(open);

        if (!open) {
            window.setTimeout(() => pageEditForm.clearErrors(), 200);
        }
    };

    const submitPageCreate = (event: FormEvent) => {
        event.preventDefault();

        pageCreateForm.post(storePage.url(system.id), {
            preserveScroll: true,
            invalidateCacheTags: ['systems'],
            onSuccess: () => closePageCreate(false),
        });
    };

    const submitPageEdit = (event: FormEvent) => {
        event.preventDefault();

        if (!editingPage) {
            return;
        }

        pageEditForm.patch(updatePage.url([system.id, editingPage.id]), {
            preserveScroll: true,
            invalidateCacheTags: ['systems'],
            onSuccess: () => closePageEdit(false),
        });
    };

    const submitPagePublish = (page: SystemPageRow) => {
        const label = page.is_sync ? 'Syncing' : 'Publishing';
        let toastId: string | number | undefined;

        router.post(
            publishPage.url([system.id, page.id]),
            {},
            {
                preserveScroll: true,
                invalidateCacheTags: ['systems'],
                onStart: () => {
                    setPagePublishingKey(page.key);
                    toastId = toast.loading(`${label} ${page.name}…`);
                },
                onError: (errors) => {
                    showError(
                        `${page.name} could not be ${page.is_sync ? 'synced' : 'published'}`,
                        errors.shape ??
                            'The page could not be published. No reason was returned.',
                    );
                },
                onFinish: () => {
                    setPagePublishingKey(null);
                    toast.dismiss(toastId);
                },
            },
        );
    };

    const submitPageDelete = () => {
        setPageDeleteOpen(false);

        if (!pendingPageDelete) {
            return;
        }

        const page = pendingPageDelete;
        let toastId: string | number | undefined;

        router.delete(destroyPage.url([system.id, page.id]), {
            preserveScroll: true,
            invalidateCacheTags: ['systems'],
            onStart: () => {
                setPageDeletingKey(page.key);
                toastId = toast.loading(`Deleting ${page.name}…`);
            },
            onError: (errors) => {
                showError(
                    `${page.name} could not be deleted`,
                    errors.page ??
                        'The page could not be deleted. No reason was returned.',
                );
            },
            onFinish: () => {
                setPageDeletingKey(null);
                toast.dismiss(toastId);
            },
        });
    };

    return (
        <>
            <Head title={system.name} />

            {/* Wide screens put the pages and tables beside the settings
                instead of below them; the form keeps its create-page width. */}
            <div className="px-4 py-6">
                <div className="grid gap-10 xl:grid-cols-[minmax(0,42rem)_minmax(0,1fr)] xl:gap-12">
                    <div className="space-y-10">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-xl font-semibold tracking-tight">
                                    {system.name}
                                </h2>
                                <Badge
                                    variant={
                                        system.status === 'published'
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {system.status === 'published'
                                        ? 'Published'
                                        : 'Unpublished'}
                                </Badge>
                            </div>
                            {system.description && (
                                <p className="text-sm text-muted-foreground">
                                    {system.description}
                                </p>
                            )}
                        </div>

                        <form
                            noValidate
                            className="space-y-6"
                            onSubmit={submitSettings}
                        >
                            {/* The icon box stands beside both fields rather than
                            only the name, so it stretches to their height. */}
                            <div className="flex items-stretch gap-3">
                                <div className="order-2 grid min-w-0 flex-1 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="system-name">
                                            Name
                                        </Label>
                                        <Input
                                            id="system-name"
                                            value={form.data.name}
                                            placeholder="Enter System Name"
                                            onChange={(event) => {
                                                const name = event.target.value;

                                                form.setData('name', name);

                                                // The slug follows the name until
                                                // publishing freezes it.
                                                if (system.can_edit_slug) {
                                                    form.setData(
                                                        'slug',
                                                        slugify(name),
                                                    );
                                                }

                                                clearFieldErrors(
                                                    form,
                                                    'name',
                                                    'slug',
                                                );
                                            }}
                                        />
                                        <InputError
                                            message={form.errors.name}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="system-slug">
                                            Slug
                                        </Label>
                                        <Input
                                            id="system-slug"
                                            value={form.data.slug}
                                            placeholder="System Slug"
                                            readOnly
                                            disabled
                                        />
                                        <InputError
                                            message={form.errors.slug}
                                        />
                                    </div>
                                </div>

                                <Tooltip
                                    open={iconTooltipOpen}
                                    onOpenChange={setIconTooltipOpen}
                                >
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            className="order-1 flex size-40 shrink-0 items-center justify-center self-center rounded-xl border bg-muted/40 text-foreground transition-colors hover:border-primary/40 hover:bg-muted/60"
                                            aria-label="Change icon"
                                            onPointerEnter={() =>
                                                setIconTooltipOpen(true)
                                            }
                                            onPointerLeave={() =>
                                                setIconTooltipOpen(false)
                                            }
                                            onClick={() =>
                                                setShowIconPicker(
                                                    (current) => !current,
                                                )
                                            }
                                        >
                                            {selectedIcon && (
                                                <Icon
                                                    iconNode={selectedIcon}
                                                    className="size-20"
                                                />
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Change icon</TooltipContent>
                                </Tooltip>
                            </div>

                            <IconPicker
                                open={showIconPicker}
                                selected={form.data.icon}
                                onSelect={(icon) => {
                                    form.setData('icon', icon);
                                    clearFieldErrors(form, 'icon');
                                    setShowIconPicker(false);
                                }}
                            />

                            <div className="grid gap-2">
                                <Label htmlFor="system-prefix">
                                    URL prefix
                                </Label>
                                <Input
                                    id="system-prefix"
                                    value={form.data.prefix}
                                    placeholder="Enter URL Prefix"
                                    readOnly={!system.can_edit_slug}
                                    disabled={!system.can_edit_slug}
                                    onChange={(event) => {
                                        form.setData(
                                            'prefix',
                                            prefixify(event.target.value),
                                        );
                                        clearFieldErrors(form, 'prefix');
                                    }}
                                />
                                <InputError message={form.errors.prefix} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Tag color</Label>
                                <ColorPicker
                                    colors={tagColors}
                                    selected={form.data.color}
                                    onSelect={(color) => {
                                        form.setData('color', color);
                                        clearFieldErrors(form, 'color');
                                    }}
                                />
                                <InputError message={form.errors.color} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="system-description">
                                    Description
                                </Label>
                                <Textarea
                                    id="system-description"
                                    value={form.data.description}
                                    placeholder="What is this system for?"
                                    onChange={(event) => {
                                        form.setData(
                                            'description',
                                            event.target.value,
                                        );
                                        clearFieldErrors(form, 'description');
                                    }}
                                />
                                <InputError message={form.errors.description} />
                            </div>

                            <InputError message={form.errors.icon} />

                            <div className="flex items-center gap-2">
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                >
                                    Save changes
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div className="space-y-10">
                        <div className="space-y-6">
                            <div className="flex items-start justify-between gap-3">
                                <Heading
                                    variant="small"
                                    title="Pages"
                                    description={
                                        // With the system still a draft its prefix and
                                        // slug can change, so no page may go live ahead
                                        // of it and the publish action is absent until then.
                                        system.status === 'published'
                                            ? 'Every system keeps a starting page at its entry path. Add more pages to build the rest of it.'
                                            : `Every system keeps a starting page at its entry path. Publish ${system.name} before you can publish any of its pages.`
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="shrink-0"
                                    onClick={() => setPageCreateOpen(true)}
                                >
                                    <Plus className="size-4" />
                                    Create page
                                </Button>
                            </div>

                            <DataTable
                                rows={pages}
                                columns={pageColumns}
                                getRowKey={(row) => row.key}
                                emptyMessage="No pages yet."
                                searchPlaceholder="Search pages…"
                                onRowClick={(row) =>
                                    router.visit(editPage([system.id, row.id]))
                                }
                                onPublish={submitPagePublish}
                                canPublish={(row) => row.can_publish}
                                isSync={(row) => row.is_sync}
                                publishingKey={pagePublishingKey}
                                onDelete={(row) => {
                                    setPendingPageDelete(row);
                                    setPageDeleteOpen(true);
                                }}
                                isProtected={(row) => !row.can_delete}
                                protectedLabel="Starting Page"
                                deletingKey={pageDeletingKey}
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-start justify-between gap-3">
                                <Heading
                                    variant="small"
                                    title="Tables"
                                    description="Built in the Tables module under the system that owns them"
                                />
                                <span className="shrink-0 text-sm text-muted-foreground">
                                    {system.tables_count}{' '}
                                    {system.tables_count === 1
                                        ? 'table'
                                        : 'tables'}
                                </span>
                            </div>

                            {/* The flag brings that page's Cancel back here. */}
                            <Button variant="outline" asChild>
                                <Link
                                    href={createTable({
                                        query: {
                                            from: 'system',
                                            system: String(system.id),
                                        },
                                    })}
                                >
                                    <Plus className="size-4" />
                                    Create table
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <FormSidebar
                open={pageCreateOpen}
                onOpenChange={closePageCreate}
                title="New page"
                description="Pages are drafts until you publish them."
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => closePageCreate(false)}
                            disabled={pageCreateForm.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="page-create-form"
                            disabled={pageCreateForm.processing}
                        >
                            Create page
                        </Button>
                    </div>
                }
            >
                <form
                    id="page-create-form"
                    noValidate
                    className="space-y-4"
                    onSubmit={submitPageCreate}
                >
                    <div className="space-y-2">
                        <Label htmlFor="page-name">Name</Label>
                        <Input
                            id="page-name"
                            value={pageCreateForm.data.name}
                            onChange={(event) => {
                                const name = event.target.value;
                                pageCreateForm.setData('name', name);
                                pageCreateForm.setData('slug', slugify(name));
                                clearFieldErrors(
                                    pageCreateForm,
                                    'name',
                                    'slug',
                                );
                            }}
                            placeholder="Enter Page Name"
                        />
                        <InputError message={pageCreateForm.errors.name} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="page-slug">Slug</Label>
                        <Input
                            id="page-slug"
                            value={pageCreateForm.data.slug}
                            readOnly
                            placeholder="Enter Page Slug"
                        />
                        <p className="text-xs text-muted-foreground">
                            Served at{' '}
                            <span className="font-mono">
                                {system.entry ?? ''}/
                                {pageCreateForm.data.slug || '…'}
                            </span>{' '}
                            once published.
                        </p>
                        <InputError message={pageCreateForm.errors.slug} />
                    </div>
                </form>
            </FormSidebar>

            <FormSidebar
                open={pageEditOpen}
                onOpenChange={closePageEdit}
                title="Edit page"
                description={
                    editingPage?.is_index
                        ? 'The starting page is served at the system root and keeps its slug.'
                        : 'Changes are saved to the draft until the page is published.'
                }
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => closePageEdit(false)}
                            disabled={pageEditForm.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="page-edit-form"
                            disabled={pageEditForm.processing}
                        >
                            Save changes
                        </Button>
                    </div>
                }
            >
                <form
                    id="page-edit-form"
                    noValidate
                    className="space-y-4"
                    onSubmit={submitPageEdit}
                >
                    <div className="space-y-2">
                        <Label htmlFor="page-edit-name">Name</Label>
                        <Input
                            id="page-edit-name"
                            value={pageEditForm.data.name}
                            onChange={(event) => {
                                const name = event.target.value;
                                pageEditForm.setData('name', name);

                                if (editingPage?.can_edit_slug) {
                                    pageEditForm.setData('slug', slugify(name));
                                }

                                clearFieldErrors(pageEditForm, 'name', 'slug');
                            }}
                            placeholder="Enter Page Name"
                        />
                        <InputError message={pageEditForm.errors.name} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="page-edit-slug">Slug</Label>
                        <Input
                            id="page-edit-slug"
                            value={pageEditForm.data.slug}
                            readOnly
                            disabled={!editingPage?.can_edit_slug}
                            placeholder="Enter Page Slug"
                        />
                        <p className="text-xs text-muted-foreground">
                            {editingPage?.is_index
                                ? 'Locked — the starting page is the system entry point.'
                                : editingPage?.can_edit_slug
                                  ? 'Follows the name until the page is published.'
                                  : 'Locked — the published page is served from this path.'}
                        </p>
                        <InputError message={pageEditForm.errors.slug} />
                    </div>
                </form>
            </FormSidebar>

            <ConfirmDialog
                open={pageDeleteOpen}
                onOpenChange={setPageDeleteOpen}
                variant="destructive"
                title="Delete this page?"
                description={
                    // The starting page's delete action is disabled outright, so
                    // this dialog only ever opens for a deletable page.
                    pendingPageDelete
                        ? `${pendingPageDelete.name} will be permanently deleted. This cannot be undone.`
                        : undefined
                }
                confirmLabel="Delete"
                onConfirm={submitPageDelete}
            />

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

SystemView.layout = ({ system }: Props) => ({
    breadcrumbs: [
        { title: 'Systems', href: systemsIndex() },
        { title: system.name, href: show(system.id) },
    ],
});
