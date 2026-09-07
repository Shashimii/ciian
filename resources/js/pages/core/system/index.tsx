import {
    Head,
    resetLayoutProps,
    router,
    setLayoutProps,
    useForm,
} from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import DataTable from '@/components/core/data-table';
import type { DataTableColumn } from '@/components/core/data-table';
import FormSidebar from '@/components/core/form-sidebar';
import InputError from '@/components/core/input-error';
import { ConfirmDialog, Modal } from '@/components/core/modal';
import PasswordInput from '@/components/core/password-input';
import TagBadge from '@/components/core/tag-badge';
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
import { resolveLucideIcon, TABLE_ICON_OPTIONS } from '@/lib/lucide-icons';
import { cn } from '@/lib/utils';
import { edit as editCiian } from '@/routes/ciian';
import {
    destroy,
    index as systemsIndex,
    publish,
    show,
    store,
} from '@/routes/systems';
import type { SystemRow } from '@/types';

type Props = {
    systems: SystemRow[];
    tagColors: string[];
};

type ErrorDetail = {
    title: string;
    message: string;
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

const COLOR_SWATCHES: Record<string, string> = {
    violet: 'bg-violet-500',
    purple: 'bg-purple-500',
    fuchsia: 'bg-fuchsia-500',
    pink: 'bg-pink-500',
    rose: 'bg-rose-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    amber: 'bg-amber-500',
    yellow: 'bg-yellow-500',
    lime: 'bg-lime-500',
    green: 'bg-green-500',
    emerald: 'bg-emerald-500',
    teal: 'bg-teal-500',
    cyan: 'bg-cyan-500',
    sky: 'bg-sky-500',
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
};

type IconPickerProps = {
    open: boolean;
    selected: string;
    onSelect: (icon: string) => void;
};

/** Full-width grid of icon options, shown under the icon + name row. */
function IconPicker({ open, selected, onSelect }: IconPickerProps) {
    if (!open) {
        return null;
    }

    return (
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
            {TABLE_ICON_OPTIONS.map((iconName) => {
                const IconComponent = resolveLucideIcon(iconName);

                return (
                    <Tooltip key={iconName}>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-label={iconName}
                                className={cn(
                                    'flex h-10 items-center justify-center rounded-md border',
                                    selected === iconName &&
                                        'border-primary bg-primary/10 text-primary',
                                )}
                                onClick={() => onSelect(iconName)}
                            >
                                {IconComponent && (
                                    <Icon
                                        iconNode={IconComponent}
                                        className="size-4"
                                    />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>{iconName}</TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
}

type ColorPickerProps = {
    colors: string[];
    selected: string;
    onSelect: (color: string) => void;
};

function ColorPicker({ colors, selected, onSelect }: ColorPickerProps) {
    return (
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-9">
            {colors.map((color) => (
                <Tooltip key={color}>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label={color}
                            className={cn(
                                'flex h-10 items-center justify-center rounded-md border',
                                selected === color &&
                                    'border-primary ring-2 ring-primary/30',
                            )}
                            onClick={() => onSelect(color)}
                        >
                            <span
                                className={cn(
                                    'size-5 rounded-full',
                                    COLOR_SWATCHES[color] ?? 'bg-violet-500',
                                )}
                            />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>{color}</TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
}

export default function SystemIndex({ systems, tagColors }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [publishingKey, setPublishingKey] = useState<string | null>(null);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<SystemRow | null>(null);
    const [rootPassword, setRootPassword] = useState('');
    const [errorOpen, setErrorOpen] = useState(false);
    const [errorDetail, setErrorDetail] = useState<ErrorDetail | null>(null);

    const [showCreateIconPicker, setShowCreateIconPicker] = useState(false);
    const [iconTooltipOpen, setIconTooltipOpen] = useState(false);

    const createForm = useForm({
        name: '',
        slug: '',
        prefix: '',
        icon: 'Box',
        color: 'violet',
        description: '',
    });

    const selectedCreateIcon = resolveLucideIcon(createForm.data.icon);

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
                    <Button type="button" onClick={() => setCreateOpen(true)}>
                        <Plus className="size-4" />
                        New system
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

    const resetCreateForm = () => {
        createForm.reset();
        createForm.clearErrors();
        setShowCreateIconPicker(false);
    };

    const closeCreate = (open: boolean) => {
        setCreateOpen(open);

        if (!open) {
            window.setTimeout(resetCreateForm, 200);
        }
    };

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();

        createForm.post(store.url(), {
            preserveScroll: true,
            invalidateCacheTags: ['systems', 'tables'],
            onSuccess: () => closeCreate(false),
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

            <FormSidebar
                open={createOpen}
                onOpenChange={closeCreate}
                title="New system"
                description="Created systems own tables in ciian_sys_tbl."
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => closeCreate(false)}
                            disabled={createForm.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="system-create-form"
                            disabled={createForm.processing}
                        >
                            Create system
                        </Button>
                    </div>
                }
            >
                <form
                    id="system-create-form"
                    noValidate
                    className="space-y-4"
                    onSubmit={submitCreate}
                >
                    <div className="flex items-end gap-3">
                        <div className="order-1 min-w-0 flex-1 space-y-2">
                            <Label htmlFor="system-name">Name</Label>
                            <Input
                                id="system-name"
                                value={createForm.data.name}
                                onChange={(event) => {
                                    const name = event.target.value;
                                    createForm.setData('name', name);
                                    createForm.setData('slug', slugify(name));
                                    createForm.setData(
                                        'prefix',
                                        prefixify(name),
                                    );
                                    clearFieldErrors(
                                        createForm,
                                        'name',
                                        'slug',
                                        'prefix',
                                    );
                                }}
                                placeholder="Enter System Name"
                            />
                            <InputError message={createForm.errors.name} />
                        </div>

                        <Tooltip
                            open={iconTooltipOpen && createOpen}
                            onOpenChange={setIconTooltipOpen}
                        >
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="order-2 flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-foreground transition-colors hover:border-primary/40 hover:bg-muted/60"
                                    aria-label="Change icon"
                                    onPointerEnter={() =>
                                        setIconTooltipOpen(true)
                                    }
                                    onPointerLeave={() =>
                                        setIconTooltipOpen(false)
                                    }
                                    onClick={() =>
                                        setShowCreateIconPicker(
                                            (current) => !current,
                                        )
                                    }
                                >
                                    {selectedCreateIcon && (
                                        <Icon
                                            iconNode={selectedCreateIcon}
                                            className="size-7"
                                        />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Change icon</TooltipContent>
                        </Tooltip>
                    </div>

                    <IconPicker
                        open={showCreateIconPicker}
                        selected={createForm.data.icon}
                        onSelect={(icon) => {
                            createForm.setData('icon', icon);
                            clearFieldErrors(createForm, 'icon');
                            setShowCreateIconPicker(false);
                        }}
                    />

                    <div className="space-y-2">
                        <Label htmlFor="system-slug">Slug</Label>
                        <Input
                            id="system-slug"
                            value={createForm.data.slug}
                            readOnly
                            placeholder="Enter System Slug"
                        />
                        <p className="text-xs text-muted-foreground">
                            Identifies the system internally and names its page
                            folder. Locks once published.
                        </p>
                        <InputError message={createForm.errors.slug} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="system-prefix">URL prefix</Label>
                        <Input
                            id="system-prefix"
                            value={createForm.data.prefix}
                            onChange={(event) => {
                                createForm.setData(
                                    'prefix',
                                    event.target.value,
                                );
                                clearFieldErrors(createForm, 'prefix');
                            }}
                            placeholder="Enter URL Prefix"
                        />
                        <p className="text-xs text-muted-foreground">
                            The system is served from{' '}
                            <span className="font-mono">
                                /{createForm.data.prefix || '…'}
                            </span>{' '}
                            once published. It locks at that point.
                        </p>
                        <InputError message={createForm.errors.prefix} />
                    </div>

                    <div className="space-y-2">
                        <Label>Tag color</Label>
                        <ColorPicker
                            colors={tagColors}
                            selected={createForm.data.color}
                            onSelect={(color) => {
                                createForm.setData('color', color);
                                clearFieldErrors(createForm, 'color');
                            }}
                        />
                        <InputError message={createForm.errors.color} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="system-description">Description</Label>
                        <Textarea
                            id="system-description"
                            value={createForm.data.description}
                            onChange={(event) => {
                                createForm.setData(
                                    'description',
                                    event.target.value,
                                );
                                clearFieldErrors(createForm, 'description');
                            }}
                            placeholder="What is this system for?"
                        />
                        <InputError message={createForm.errors.description} />
                    </div>

                    <InputError message={createForm.errors.icon} />
                </form>
            </FormSidebar>

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
