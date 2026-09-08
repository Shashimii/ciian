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
import PasswordInput from '@/components/core/password-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { clearFieldErrors } from '@/lib/clear-field-errors';
import { resolveLucideIcon } from '@/lib/lucide-icons';
import { destroy, index as usersIndex, store, update } from '@/routes/users';
import type { RoleOption, UserRow } from '@/types/user';

type Props = {
    users: UserRow[];
    roles: RoleOption[];
};

function RoleBadge({ role }: { role: UserRow['role'] }) {
    const IconComponent = resolveLucideIcon(role.icon);

    return (
        <Badge variant="secondary" className="gap-1.5">
            {IconComponent && (
                <Icon iconNode={IconComponent} className="size-3.5" />
            )}
            {role.name}
        </Badge>
    );
}

type RoleSelectProps = {
    id: string;
    roles: RoleOption[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
};

/** Shared by the create and edit sheets so both offer the same thing. */
function RoleSelect({ id, roles, value, onChange, error }: RoleSelectProps) {
    const selected = roles.find((role) => String(role.id) === value);

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>Role</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                    {roles.map((role) => {
                        const RoleIcon = resolveLucideIcon(role.icon);

                        return (
                            <SelectItem key={role.id} value={String(role.id)}>
                                {RoleIcon && (
                                    <Icon
                                        iconNode={RoleIcon}
                                        className="size-4"
                                    />
                                )}
                                {role.name}
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
            {selected?.description && (
                <p className="text-xs text-muted-foreground">
                    {selected.description}
                </p>
            )}
            <InputError message={error} />
        </div>
    );
}

export default function UserIndex({ users, roles }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<UserRow | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);

    const createForm = useForm({
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_id: '',
    });

    const editForm = useForm({
        username: '',
        email: '',
        role_id: '',
        status: 'active',
    });

    useEffect(() => {
        setLayoutProps({
            headerActions: (
                <div className="flex items-center gap-2">
                    <Button type="button" onClick={() => setCreateOpen(true)}>
                        <Plus className="size-4" />
                        New user
                    </Button>
                </div>
            ),
        });

        return () => {
            resetLayoutProps();
        };
    }, []);

    // Keep the account on screen while the sheet fades out.
    useEffect(() => {
        if (editOpen) {
            return;
        }

        const timer = setTimeout(() => setEditing(null), 200);

        return () => clearTimeout(timer);
    }, [editOpen]);

    // Keep the payload while the dialog fades out so its content stays stable.
    useEffect(() => {
        if (deleteOpen) {
            return;
        }

        const timer = setTimeout(() => setPendingDelete(null), 200);

        return () => clearTimeout(timer);
    }, [deleteOpen]);

    const columns = useMemo<DataTableColumn<UserRow>[]>(
        () => [
            {
                id: 'username',
                header: 'Username',
                sortable: true,
                sortValue: (row) => row.username,
                searchValue: (row) => row.username,
                cell: (row) => (
                    <span className="font-medium">{row.username}</span>
                ),
            },
            {
                id: 'email',
                header: 'Email',
                sortable: true,
                sortValue: (row) => row.email,
                searchValue: (row) => row.email,
                cell: (row) => (
                    <span className="text-muted-foreground">{row.email}</span>
                ),
            },
            {
                id: 'role',
                header: 'Role',
                sortable: true,
                sortValue: (row) => row.role.name,
                searchValue: (row) => row.role.name,
                cell: (row) => <RoleBadge role={row.role} />,
            },
            {
                id: 'status',
                header: 'Status',
                sortable: true,
                sortValue: (row) => (row.is_active ? 0 : 1),
                searchValue: (row) => row.status,
                cell: (row) => (
                    <Badge variant={row.is_active ? 'default' : 'secondary'}>
                        {row.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                ),
            },
            {
                id: 'joined',
                header: 'Joined',
                sortable: true,
                sortValue: (row) => row.joined_at ?? 0,
                cell: (row) => (
                    <span className="text-muted-foreground">
                        {row.joined ?? '—'}
                    </span>
                ),
            },
        ],
        [],
    );

    const closeCreate = (open: boolean) => {
        setCreateOpen(open);

        // Keep the fields stable while the sheet fades out.
        if (!open) {
            window.setTimeout(() => {
                createForm.reset();
                createForm.clearErrors();
            }, 200);
        }
    };

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();

        createForm.post(store.url(), {
            preserveScroll: true,
            invalidateCacheTags: ['users'],
            onSuccess: () => closeCreate(false),
        });
    };

    const openEdit = (user: UserRow) => {
        setEditing(user);
        editForm.clearErrors();
        editForm.setData({
            username: user.username,
            email: user.email,
            role_id: String(user.role.id),
            status: user.status,
        });
        setEditOpen(true);
    };

    const closeEdit = (open: boolean) => {
        setEditOpen(open);

        if (!open) {
            window.setTimeout(() => editForm.clearErrors(), 200);
        }
    };

    const submitEdit = (event: FormEvent) => {
        event.preventDefault();

        if (!editing) {
            return;
        }

        editForm.patch(update.url(editing.id), {
            preserveScroll: true,
            invalidateCacheTags: ['users'],
            onSuccess: () => closeEdit(false),
        });
    };

    const requestDelete = (user: UserRow) => {
        setPendingDelete(user);
        setDeleteOpen(true);
    };

    const confirmDelete = () => {
        setDeleteOpen(false);

        if (!pendingDelete) {
            return;
        }

        const user = pendingDelete;
        let toastId: string | number | undefined;

        router.delete(destroy.url(user.id), {
            preserveScroll: true,
            invalidateCacheTags: ['users'],
            onStart: () => {
                setDeletingKey(user.key);
                toastId = toast.loading(`Deleting ${user.username}…`);
            },
            // The action refuses some accounts outright, so a failure here
            // carries a real reason from the server worth showing.
            onError: (errors) => {
                toast.error(
                    errors.user ??
                        'The account could not be deleted. No reason was returned.',
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
            <Head title="Users" />

            <div className="px-4 py-6">
                <DataTable
                    rows={users}
                    columns={columns}
                    getRowKey={(row) => row.key}
                    emptyMessage="No users yet."
                    searchPlaceholder="Search users…"
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
                title="Delete this account?"
                description={
                    // Protected rows show a disabled lock instead of a delete
                    // action, so this only ever opens for a deletable account.
                    pendingDelete
                        ? `${pendingDelete.username} will be permanently deleted and signed out everywhere. This cannot be undone.`
                        : undefined
                }
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />

            <FormSidebar
                open={createOpen}
                onOpenChange={closeCreate}
                title="New user"
                description="The account can sign in as soon as it is created."
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
                            form="user-create-form"
                            disabled={createForm.processing}
                        >
                            Create user
                        </Button>
                    </div>
                }
            >
                <form
                    id="user-create-form"
                    noValidate
                    className="space-y-4"
                    onSubmit={submitCreate}
                >
                    <div className="space-y-2">
                        <Label htmlFor="user-username">Username</Label>
                        <Input
                            id="user-username"
                            value={createForm.data.username}
                            onChange={(event) => {
                                createForm.setData(
                                    'username',
                                    event.target.value,
                                );
                                clearFieldErrors(createForm, 'username');
                            }}
                            placeholder="Enter Username"
                            autoComplete="off"
                        />
                        <InputError message={createForm.errors.username} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="user-email">Email</Label>
                        <Input
                            id="user-email"
                            type="email"
                            value={createForm.data.email}
                            onChange={(event) => {
                                createForm.setData('email', event.target.value);
                                clearFieldErrors(createForm, 'email');
                            }}
                            placeholder="Enter Email"
                            autoComplete="off"
                        />
                        <InputError message={createForm.errors.email} />
                    </div>

                    <RoleSelect
                        id="user-role"
                        roles={roles}
                        value={createForm.data.role_id}
                        onChange={(value) => {
                            createForm.setData('role_id', value);
                            clearFieldErrors(createForm, 'role_id');
                        }}
                        error={createForm.errors.role_id}
                    />

                    <div className="space-y-2">
                        <Label htmlFor="user-password">Password</Label>
                        <PasswordInput
                            id="user-password"
                            value={createForm.data.password}
                            onChange={(event) => {
                                createForm.setData(
                                    'password',
                                    event.target.value,
                                );
                                clearFieldErrors(createForm, 'password');
                            }}
                            placeholder="Enter Password"
                            autoComplete="new-password"
                        />
                        <InputError message={createForm.errors.password} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="user-password-confirmation">
                            Confirm password
                        </Label>
                        <PasswordInput
                            id="user-password-confirmation"
                            value={createForm.data.password_confirmation}
                            onChange={(event) => {
                                createForm.setData(
                                    'password_confirmation',
                                    event.target.value,
                                );
                                clearFieldErrors(
                                    createForm,
                                    'password_confirmation',
                                    'password',
                                );
                            }}
                            placeholder="Re-enter Password"
                            autoComplete="new-password"
                        />
                        <InputError
                            message={createForm.errors.password_confirmation}
                        />
                    </div>
                </form>
            </FormSidebar>

            <FormSidebar
                open={editOpen}
                onOpenChange={closeEdit}
                title="Edit user"
                description={
                    editing
                        ? `Changes apply to ${editing.username} the next time they load a page.`
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
                            form="user-edit-form"
                            disabled={editForm.processing}
                        >
                            Save changes
                        </Button>
                    </div>
                }
            >
                <form
                    id="user-edit-form"
                    noValidate
                    className="space-y-4"
                    onSubmit={submitEdit}
                >
                    <div className="space-y-2">
                        <Label htmlFor="user-edit-username">Username</Label>
                        <Input
                            id="user-edit-username"
                            value={editForm.data.username}
                            onChange={(event) => {
                                editForm.setData(
                                    'username',
                                    event.target.value,
                                );
                                clearFieldErrors(editForm, 'username');
                            }}
                            placeholder="Enter Username"
                            autoComplete="off"
                        />
                        <InputError message={editForm.errors.username} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="user-edit-email">Email</Label>
                        <Input
                            id="user-edit-email"
                            type="email"
                            value={editForm.data.email}
                            onChange={(event) => {
                                editForm.setData('email', event.target.value);
                                clearFieldErrors(editForm, 'email');
                            }}
                            placeholder="Enter Email"
                            autoComplete="off"
                        />
                        <InputError message={editForm.errors.email} />
                    </div>

                    <RoleSelect
                        id="user-edit-role"
                        roles={roles}
                        value={editForm.data.role_id}
                        onChange={(value) => {
                            editForm.setData('role_id', value);
                            clearFieldErrors(editForm, 'role_id');
                        }}
                        error={editForm.errors.role_id}
                    />

                    <div className="space-y-2">
                        <Label htmlFor="user-edit-status">Status</Label>
                        <Select
                            value={editForm.data.status}
                            onValueChange={(value) => {
                                editForm.setData('status', value);
                                clearFieldErrors(editForm, 'status');
                            }}
                        >
                            <SelectTrigger
                                id="user-edit-status"
                                className="w-full"
                            >
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">
                                    Inactive
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {editForm.data.status === 'inactive'
                                ? 'This account cannot sign in, and any open session ends immediately.'
                                : 'This account can sign in normally.'}
                        </p>
                        <InputError message={editForm.errors.status} />
                    </div>
                </form>
            </FormSidebar>
        </>
    );
}

UserIndex.layout = {
    breadcrumbs: [
        {
            title: 'Users',
            href: usersIndex(),
        },
    ],
};
