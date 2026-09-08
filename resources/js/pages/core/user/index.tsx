import {
    Head,
    resetLayoutProps,
    setLayoutProps,
    useForm,
} from '@inertiajs/react';
import { Plus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import DataTable from '@/components/core/data-table';
import type { DataTableColumn } from '@/components/core/data-table';
import FormSidebar from '@/components/core/form-sidebar';
import InputError from '@/components/core/input-error';
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
import { index as usersIndex, store } from '@/routes/users';
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

export default function UserIndex({ users, roles }: Props) {
    const [createOpen, setCreateOpen] = useState(false);

    const createForm = useForm({
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_id: '',
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

    const selectedRole = roles.find(
        (role) => String(role.id) === createForm.data.role_id,
    );

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
                />
            </div>

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

                    <div className="space-y-2">
                        <Label htmlFor="user-role">Role</Label>
                        <Select
                            value={createForm.data.role_id}
                            onValueChange={(value) => {
                                createForm.setData('role_id', value);
                                clearFieldErrors(createForm, 'role_id');
                            }}
                        >
                            <SelectTrigger id="user-role" className="w-full">
                                <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map((role) => {
                                    const RoleIcon = resolveLucideIcon(
                                        role.icon,
                                    );

                                    return (
                                        <SelectItem
                                            key={role.id}
                                            value={String(role.id)}
                                        >
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
                        {selectedRole?.description && (
                            <p className="text-xs text-muted-foreground">
                                {selectedRole.description}
                            </p>
                        )}
                        <InputError message={createForm.errors.role_id} />
                    </div>

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
