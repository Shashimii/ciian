import {
    Head,
    resetLayoutProps,
    setLayoutProps,
    useForm,
} from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import DataTable from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import FormSidebar from '@/components/form-sidebar';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { clearFieldErrors } from '@/lib/clear-field-errors';
import { resolveLucideIcon, TABLE_ICON_OPTIONS } from '@/lib/lucide-icons';
import { cn } from '@/lib/utils';
import { index as systemsIndex, store } from '@/routes/systems';
import type { SystemRow } from '@/types';

type Props = {
    systems: SystemRow[];
};

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

export default function SystemIndex({ systems }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [iconTooltipOpen, setIconTooltipOpen] = useState(false);

    const form = useForm({
        name: '',
        slug: '',
        icon: 'Box',
    });

    const selectedIcon = resolveLucideIcon(form.data.icon);

    useEffect(() => {
        setLayoutProps({
            headerActions: (
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                    >
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
                header: 'Slug',
                cell: (row) => (
                    <span className="font-mono text-xs text-muted-foreground">
                        {row.slug}
                    </span>
                ),
            },
            {
                id: 'tables_count',
                header: 'Tables',
                cell: (row) => row.tables_count,
            },
        ],
        [],
    );

    const resetCreateForm = () => {
        form.reset();
        form.clearErrors();
        setShowIconPicker(false);
        setIconTooltipOpen(false);
    };

    const closeCreate = (open: boolean) => {
        setCreateOpen(open);

        if (!open) {
            window.setTimeout(resetCreateForm, 200);
        }
    };

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();

        form.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => closeCreate(false),
        });
    };

    return (
        <>
            <Head title="Systems" />

            <div className="px-4 py-6">
                <DataTable
                    rows={systems}
                    columns={columns}
                    getRowKey={(row) => String(row.id)}
                    emptyMessage="No systems yet. Create one to own tables."
                />
            </div>

            <FormSidebar
                open={createOpen}
                onOpenChange={closeCreate}
                title="New system"
                description="Systems own tables published into ciian_sys_tbl."
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => closeCreate(false)}
                            disabled={form.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="system-create-form"
                            disabled={form.processing}
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
                                value={form.data.name}
                                onChange={(event) => {
                                    const name = event.target.value;
                                    form.setData('name', name);
                                    form.setData('slug', slugify(name));
                                    clearFieldErrors(form, 'name', 'slug');
                                }}
                                placeholder="Enter System Name"
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        <Tooltip
                            open={iconTooltipOpen}
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
                                        setShowIconPicker(
                                            (current) => !current,
                                        )
                                    }
                                >
                                    {selectedIcon && (
                                        <Icon
                                            iconNode={selectedIcon}
                                            className="size-7"
                                        />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Change icon</TooltipContent>
                        </Tooltip>
                    </div>

                    {showIconPicker && (
                        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
                            {TABLE_ICON_OPTIONS.map((iconName) => {
                                const IconComponent =
                                    resolveLucideIcon(iconName);

                                return (
                                    <Tooltip key={iconName}>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                aria-label={iconName}
                                                className={cn(
                                                    'flex h-10 items-center justify-center rounded-md border',
                                                    form.data.icon ===
                                                        iconName &&
                                                        'border-primary bg-primary/10 text-primary',
                                                )}
                                                onClick={() => {
                                                    form.setData(
                                                        'icon',
                                                        iconName,
                                                    );
                                                    clearFieldErrors(
                                                        form,
                                                        'icon',
                                                    );
                                                    setShowIconPicker(false);
                                                }}
                                            >
                                                {IconComponent && (
                                                    <Icon
                                                        iconNode={IconComponent}
                                                        className="size-4"
                                                    />
                                                )}
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {iconName}
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="system-slug">Slug</Label>
                        <Input
                            id="system-slug"
                            value={form.data.slug}
                            readOnly
                            placeholder="Enter System Slug"
                        />
                        <InputError message={form.errors.slug} />
                    </div>

                    <InputError message={form.errors.icon} />
                </form>
            </FormSidebar>
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
