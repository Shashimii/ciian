import {
    Head,
    resetLayoutProps,
    router,
    setLayoutProps,
    useForm,
} from '@inertiajs/react';
import { Plus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DataTable from '@/components/core/data-table';
import type { DataTableColumn } from '@/components/core/data-table';
import FormSidebar from '@/components/core/form-sidebar';
import InputError from '@/components/core/input-error';
import { ConfirmDialog } from '@/components/core/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { destroy, index as rolesIndex, store, update } from '@/routes/roles';
import type { PermissionOption, RoleRow } from '@/types/role';

type Props = {
    roles: RoleRow[];
    permissions: PermissionOption[];
};

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

type IconPickerProps = {
    value: string;
    onChange: (icon: string) => void;
};

/** The grid the size-12 icon button reveals, shared by both sheets. */
function IconPicker({ value, onChange }: IconPickerProps) {
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
                                    value === iconName &&
                                        'border-primary bg-primary/10 text-primary',
                                )}
                                onClick={() => onChange(iconName)}
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

type PermissionChecklistProps = {
    permissions: PermissionOption[];
    selected: number[];
    onChange: (ids: number[]) => void;
    disabled?: boolean;
    lockedNote?: string;
    error?: string;
};

/** The permission checkboxes, shared by both sheets. */
function PermissionChecklist({
    permissions,
    selected,
    onChange,
    disabled = false,
    lockedNote,
    error,
}: PermissionChecklistProps) {
    const toggle = (id: number) => {
        onChange(
            selected.includes(id)
                ? selected.filter((current) => current !== id)
                : [...selected, id],
        );
    };

    const grantsEverything = permissions.some(
        (permission) => permission.is_root && selected.includes(permission.id),
    );

    return (
        <div className="space-y-2">
            <Label>Permissions</Label>

            <div className="divide-y rounded-lg border">
                {permissions.map((permission) => (
                    <label
                        key={permission.id}
                        className={cn(
                            'flex items-start gap-3 p-3',
                            disabled
                                ? 'cursor-not-allowed opacity-60'
                                : 'cursor-pointer hover:bg-muted/40',
                        )}
                    >
                        <Checkbox
                            className="mt-0.5"
                            checked={selected.includes(permission.id)}
                            disabled={disabled}
                            onCheckedChange={() => toggle(permission.id)}
                        />
                        <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">
                                    {permission.name}
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                    {permission.slug}
                                </span>
                            </span>
                            {permission.description && (
                                <span className="block text-xs text-muted-foreground">
                                    {permission.description}
                                </span>
                            )}
                        </span>
                    </label>
                ))}
            </div>

            {lockedNote && (
                <p className="text-xs text-muted-foreground">{lockedNote}</p>
            )}

            {!disabled && grantsEverything && (
                <p className="text-xs text-destructive">
                    Root grants every permission, including the ones left
                    unchecked above.
                </p>
            )}

            <InputError message={error} />
        </div>
    );
}

export default function RoleIndex({ roles, permissions }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<RoleRow | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<RoleRow | null>(null);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);
    const [showCreateIcons, setShowCreateIcons] = useState(false);
    const [showEditIcons, setShowEditIcons] = useState(false);
    const [createIconTip, setCreateIconTip] = useState(false);
    const [editIconTip, setEditIconTip] = useState(false);

    const createForm = useForm({
        name: '',
        slug: '',
        description: '',
        icon: 'Shield',
        permissions: [] as number[],
    });

    const editForm = useForm({
        name: '',
        description: '',
        icon: 'Shield',
        permissions: [] as number[],
    });

    useEffect(() => {
        setLayoutProps({
            headerActions: (
                <div className="flex items-center gap-2">
                    <Button type="button" onClick={() => setCreateOpen(true)}>
                        <Plus className="size-4" />
                        New role
                    </Button>
                </div>
            ),
        });

        return () => {
            resetLayoutProps();
        };
    }, []);

    // Keep the payload while each overlay fades out so content stays stable.
    useEffect(() => {
        if (editOpen) {
            return;
        }

        const timer = setTimeout(() => setEditing(null), 200);

        return () => clearTimeout(timer);
    }, [editOpen]);

    useEffect(() => {
        if (deleteOpen) {
            return;
        }

        const timer = setTimeout(() => setPendingDelete(null), 200);

        return () => clearTimeout(timer);
    }, [deleteOpen]);

    const columns = useMemo<DataTableColumn<RoleRow>[]>(
        () => [
            {
                id: 'name',
                header: 'Name',
                sortable: true,
                sortValue: (row) => row.name,
                searchValue: (row) => `${row.name} ${row.description ?? ''}`,
                cell: (row) => {
                    const RoleIcon = resolveLucideIcon(row.icon);

                    return (
                        <div className="flex items-center gap-2.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
                                {RoleIcon && (
                                    <Icon
                                        iconNode={RoleIcon}
                                        className="size-4"
                                    />
                                )}
                            </span>
                            <div className="flex min-w-0 flex-col">
                                <span className="font-medium">{row.name}</span>
                                {row.description && (
                                    <span className="text-xs text-muted-foreground">
                                        {row.description}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                },
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
                id: 'permissions',
                header: 'Permissions',
                sortable: true,
                sortValue: (row) => row.permission_count,
                cell: (row) => (
                    <Badge
                        variant={
                            row.permission_count > 0 ? 'secondary' : 'outline'
                        }
                    >
                        {row.permission_count}
                    </Badge>
                ),
            },
            {
                id: 'accounts',
                header: 'Accounts',
                sortable: true,
                sortValue: (row) => row.user_count,
                cell: (row) => (
                    <span className="text-muted-foreground tabular-nums">
                        {row.user_count}
                    </span>
                ),
            },
        ],
        [],
    );

    const closeCreate = (open: boolean) => {
        setCreateOpen(open);

        if (!open) {
            window.setTimeout(() => {
                createForm.reset();
                createForm.clearErrors();
                setShowCreateIcons(false);
            }, 200);
        }
    };

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();

        createForm.post(store.url(), {
            preserveScroll: true,
            invalidateCacheTags: ['roles', 'users'],
            onSuccess: () => closeCreate(false),
        });
    };

    const openEdit = (role: RoleRow) => {
        setEditing(role);
        editForm.clearErrors();
        editForm.setData({
            name: role.name,
            description: role.description ?? '',
            icon: role.icon,
            permissions: role.permission_ids,
        });
        setShowEditIcons(false);
        setEditOpen(true);
    };

    const closeEdit = (open: boolean) => {
        setEditOpen(open);

        if (!open) {
            window.setTimeout(() => {
                editForm.clearErrors();
                setShowEditIcons(false);
            }, 200);
        }
    };

    const submitEdit = (event: FormEvent) => {
        event.preventDefault();

        if (!editing) {
            return;
        }

        // Root's permissions belong to the seeder, and the request refuses the
        // key outright — so it must not be sent at all, or editing Root's name
        // would fail validation.
        const locked = editing.permissions_locked;

        editForm.transform(({ permissions: submitted, ...rest }) =>
            locked ? rest : { ...rest, permissions: submitted },
        );

        editForm.patch(update.url(editing.id), {
            preserveScroll: true,
            invalidateCacheTags: ['roles', 'users'],
            onSuccess: () => closeEdit(false),
        });
    };

    const requestDelete = (role: RoleRow) => {
        setPendingDelete(role);
        setDeleteOpen(true);
    };

    const confirmDelete = () => {
        setDeleteOpen(false);

        if (!pendingDelete) {
            return;
        }

        const role = pendingDelete;
        let toastId: string | number | undefined;

        router.delete(destroy.url(role.id), {
            preserveScroll: true,
            invalidateCacheTags: ['roles', 'users'],
            onStart: () => {
                setDeletingKey(role.key);
                toastId = toast.loading(`Deleting ${role.name}…`);
            },
            onError: (errors) => {
                toast.error(
                    errors.role ??
                        'The role could not be deleted. No reason was returned.',
                );
            },
            onFinish: () => {
                setDeletingKey(null);
                toast.dismiss(toastId);
            },
        });
    };

    const createIcon = resolveLucideIcon(createForm.data.icon);
    const editIcon = resolveLucideIcon(editForm.data.icon);
    const detailsLocked = editing?.details_locked ?? false;

    return (
        <>
            <Head title="Roles" />

            <div className="px-4 py-6">
                <DataTable
                    rows={roles}
                    columns={columns}
                    getRowKey={(row) => row.key}
                    emptyMessage="No roles yet."
                    searchPlaceholder="Search roles…"
                    onRowClick={openEdit}
                    onDelete={requestDelete}
                    isProtected={(row) => !row.can_delete}
                    protectedLabel={(row) => row.delete_block ?? 'Protected'}
                    deletingKey={deletingKey}
                />
            </div>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                variant="destructive"
                title="Delete this role?"
                description={
                    // Protected and in-use roles show a disabled lock instead,
                    // so this only ever opens for a deletable role.
                    pendingDelete
                        ? `${pendingDelete.name} will be permanently deleted. This cannot be undone.`
                        : undefined
                }
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />

            <FormSidebar
                open={createOpen}
                onOpenChange={closeCreate}
                title="New role"
                description="Permissions are assigned separately once the role exists."
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
                            form="role-create-form"
                            disabled={createForm.processing}
                        >
                            Create role
                        </Button>
                    </div>
                }
            >
                <form
                    id="role-create-form"
                    noValidate
                    className="space-y-4"
                    onSubmit={submitCreate}
                >
                    <div className="flex items-end gap-3">
                        <div className="order-1 min-w-0 flex-1 space-y-2">
                            <Label htmlFor="role-name">Name</Label>
                            <Input
                                id="role-name"
                                value={createForm.data.name}
                                onChange={(event) => {
                                    const name = event.target.value;
                                    createForm.setData('name', name);
                                    createForm.setData('slug', slugify(name));
                                    clearFieldErrors(
                                        createForm,
                                        'name',
                                        'slug',
                                    );
                                }}
                                placeholder="Enter Role Name"
                            />
                            <InputError message={createForm.errors.name} />
                        </div>

                        <Tooltip
                            open={createIconTip && createOpen}
                            onOpenChange={setCreateIconTip}
                        >
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="order-2 flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-foreground transition-colors hover:border-primary/40 hover:bg-muted/60"
                                    aria-label="Change icon"
                                    onPointerEnter={() =>
                                        setCreateIconTip(true)
                                    }
                                    onPointerLeave={() =>
                                        setCreateIconTip(false)
                                    }
                                    onClick={() =>
                                        setShowCreateIcons((open) => !open)
                                    }
                                >
                                    {createIcon && (
                                        <Icon
                                            iconNode={createIcon}
                                            className="size-7"
                                        />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Change icon</TooltipContent>
                        </Tooltip>
                    </div>

                    {showCreateIcons && (
                        <IconPicker
                            value={createForm.data.icon}
                            onChange={(icon) => {
                                createForm.setData('icon', icon);
                                clearFieldErrors(createForm, 'icon');
                                setShowCreateIcons(false);
                            }}
                        />
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="role-slug">Slug</Label>
                        <Input
                            id="role-slug"
                            value={createForm.data.slug}
                            readOnly
                            disabled
                            placeholder="Derived from the name"
                        />
                        <p className="text-xs text-muted-foreground">
                            Derived from the name and permanent — the slug is
                            how code identifies this role.
                        </p>
                        <InputError message={createForm.errors.slug} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role-description">Description</Label>
                        <Textarea
                            id="role-description"
                            value={createForm.data.description}
                            onChange={(event) => {
                                createForm.setData(
                                    'description',
                                    event.target.value,
                                );
                                clearFieldErrors(createForm, 'description');
                            }}
                            placeholder="What can this role do?"
                        />
                        <InputError message={createForm.errors.description} />
                    </div>

                    <PermissionChecklist
                        permissions={permissions}
                        selected={createForm.data.permissions}
                        onChange={(ids) => {
                            createForm.setData('permissions', ids);
                            clearFieldErrors(createForm, 'permissions');
                        }}
                        error={createForm.errors.permissions}
                    />

                    <InputError message={createForm.errors.icon} />
                </form>
            </FormSidebar>

            <FormSidebar
                open={editOpen}
                onOpenChange={closeEdit}
                title="Edit role"
                description={
                    editing
                        ? `${editing.user_count} account(s) currently hold this role.`
                        : undefined
                }
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => closeEdit(false)}
                            disabled={editForm.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="role-edit-form"
                            disabled={editForm.processing}
                        >
                            Save changes
                        </Button>
                    </div>
                }
            >
                <form
                    id="role-edit-form"
                    noValidate
                    className="space-y-4"
                    onSubmit={submitEdit}
                >
                    <div className="flex items-end gap-3">
                        <div className="order-1 min-w-0 flex-1 space-y-2">
                            <Label htmlFor="role-edit-name">Name</Label>
                            <Input
                                id="role-edit-name"
                                value={editForm.data.name}
                                disabled={detailsLocked}
                                onChange={(event) => {
                                    editForm.setData(
                                        'name',
                                        event.target.value,
                                    );
                                    clearFieldErrors(editForm, 'name');
                                }}
                                placeholder="Enter Role Name"
                            />
                            <InputError message={editForm.errors.name} />
                        </div>

                        <Tooltip
                            open={editIconTip && editOpen}
                            onOpenChange={setEditIconTip}
                        >
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    disabled={detailsLocked}
                                    className="order-2 flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-muted/40"
                                    aria-label={
                                        detailsLocked
                                            ? 'Icon is managed by the seeder'
                                            : 'Change icon'
                                    }
                                    onPointerEnter={() => setEditIconTip(true)}
                                    onPointerLeave={() => setEditIconTip(false)}
                                    onClick={() =>
                                        setShowEditIcons((open) => !open)
                                    }
                                >
                                    {editIcon && (
                                        <Icon
                                            iconNode={editIcon}
                                            className="size-7"
                                        />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {detailsLocked
                                    ? 'Managed by the seeder'
                                    : 'Change icon'}
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {detailsLocked && (
                        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                            This is a protected platform role. Its name,
                            description and icon are written by
                            SystemDefaultsSeeder on every run, so changes made
                            here would be reverted by the next seed.
                        </p>
                    )}

                    {!detailsLocked && showEditIcons && (
                        <IconPicker
                            value={editForm.data.icon}
                            onChange={(icon) => {
                                editForm.setData('icon', icon);
                                clearFieldErrors(editForm, 'icon');
                                setShowEditIcons(false);
                            }}
                        />
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="role-edit-slug">Slug</Label>
                        <Input
                            id="role-edit-slug"
                            value={editing?.slug ?? ''}
                            readOnly
                            disabled
                        />
                        <p className="text-xs text-muted-foreground">
                            Permanent — code matches this role on its slug.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role-edit-description">
                            Description
                        </Label>
                        <Textarea
                            id="role-edit-description"
                            value={editForm.data.description}
                            disabled={detailsLocked}
                            onChange={(event) => {
                                editForm.setData(
                                    'description',
                                    event.target.value,
                                );
                                clearFieldErrors(editForm, 'description');
                            }}
                            placeholder="What can this role do?"
                        />
                        <InputError message={editForm.errors.description} />
                    </div>

                    <PermissionChecklist
                        permissions={permissions}
                        selected={editForm.data.permissions}
                        onChange={(ids) => {
                            editForm.setData('permissions', ids);
                            clearFieldErrors(editForm, 'permissions');
                        }}
                        disabled={editing?.permissions_locked ?? false}
                        lockedNote={
                            editing?.permissions_locked
                                ? 'Root always holds every permission. Its set is written by the seeder, so it cannot be changed here.'
                                : undefined
                        }
                        error={editForm.errors.permissions}
                    />

                    <InputError message={editForm.errors.icon} />
                </form>
            </FormSidebar>
        </>
    );
}

RoleIndex.layout = {
    breadcrumbs: [
        {
            title: 'Roles',
            href: rolesIndex(),
        },
    ],
};
