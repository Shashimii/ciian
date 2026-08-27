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
import TagBadge from '@/components/tag-badge';
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
import { update as updateCiian } from '@/routes/systems/ciian';
import type { CiianConfigData, SystemRow } from '@/types';

type Props = {
    systems: SystemRow[];
    ciianConfig: CiianConfigData;
    tagColors: string[];
};

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
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

export default function SystemIndex({
    systems,
    ciianConfig,
    tagColors,
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [ciianOpen, setCiianOpen] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [iconTooltipOpen, setIconTooltipOpen] = useState(false);

    const createForm = useForm({
        name: '',
        slug: '',
    });

    const ciianForm = useForm({
        name: ciianConfig.name,
        sys_slug: ciianConfig.sys_slug,
        icon: ciianConfig.icon,
        color: ciianConfig.color,
    });

    const selectedCiianIcon = resolveLucideIcon(ciianForm.data.icon);

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
                id: 'tag',
                header: 'Tag',
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
        createForm.reset();
        createForm.clearErrors();
    };

    const closeCreate = (open: boolean) => {
        setCreateOpen(open);

        if (!open) {
            window.setTimeout(resetCreateForm, 200);
        }
    };

    const openCiian = () => {
        ciianForm.setData({
            name: ciianConfig.name,
            sys_slug: ciianConfig.sys_slug,
            icon: ciianConfig.icon,
            color: ciianConfig.color,
        });
        ciianForm.clearErrors();
        setShowIconPicker(false);
        setIconTooltipOpen(false);
        setCiianOpen(true);
    };

    const closeCiian = (open: boolean) => {
        setCiianOpen(open);

        if (!open) {
            window.setTimeout(() => {
                setShowIconPicker(false);
                setIconTooltipOpen(false);
                ciianForm.clearErrors();
            }, 200);
        }
    };

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();

        createForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => closeCreate(false),
        });
    };

    const submitCiian = (event: FormEvent) => {
        event.preventDefault();

        ciianForm.patch(updateCiian.url(), {
            preserveScroll: true,
            onSuccess: () => closeCiian(false),
        });
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
                    onRowClick={(row) => {
                        if (row.kind === 'ciian') {
                            openCiian();
                        }
                    }}
                />
            </div>

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
                    <div className="space-y-2">
                        <Label htmlFor="system-name">Name</Label>
                        <Input
                            id="system-name"
                            value={createForm.data.name}
                            onChange={(event) => {
                                const name = event.target.value;
                                createForm.setData('name', name);
                                createForm.setData('slug', slugify(name));
                                clearFieldErrors(createForm, 'name', 'slug');
                            }}
                            placeholder="Enter System Name"
                        />
                        <InputError message={createForm.errors.name} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="system-slug">Slug</Label>
                        <Input
                            id="system-slug"
                            value={createForm.data.slug}
                            readOnly
                            placeholder="Enter System Slug"
                        />
                        <InputError message={createForm.errors.slug} />
                    </div>
                </form>
            </FormSidebar>

            <FormSidebar
                open={ciianOpen}
                onOpenChange={closeCiian}
                title="Ciian settings"
                description="Platform configuration from ciian_config."
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => closeCiian(false)}
                            disabled={ciianForm.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="ciian-config-form"
                            disabled={ciianForm.processing}
                        >
                            Save changes
                        </Button>
                    </div>
                }
            >
                <form
                    id="ciian-config-form"
                    noValidate
                    className="space-y-4"
                    onSubmit={submitCiian}
                >
                    <div className="flex items-end gap-3">
                        <div className="order-1 min-w-0 flex-1 space-y-2">
                            <Label htmlFor="ciian-name">Name</Label>
                            <Input
                                id="ciian-name"
                                value={ciianForm.data.name}
                                disabled
                                placeholder="Enter Name"
                            />
                            <InputError message={ciianForm.errors.name} />
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
                                    {selectedCiianIcon && (
                                        <Icon
                                            iconNode={selectedCiianIcon}
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
                                                    ciianForm.data.icon ===
                                                        iconName &&
                                                        'border-primary bg-primary/10 text-primary',
                                                )}
                                                onClick={() => {
                                                    ciianForm.setData(
                                                        'icon',
                                                        iconName,
                                                    );
                                                    clearFieldErrors(
                                                        ciianForm,
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
                        <Label htmlFor="ciian-sys-slug">System slug</Label>
                        <Input
                            id="ciian-sys-slug"
                            value={ciianForm.data.sys_slug}
                            disabled
                            placeholder="Enter System Slug"
                        />
                        <InputError message={ciianForm.errors.sys_slug} />
                    </div>

                    <div className="space-y-2">
                        <Label>Tag color</Label>
                        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-9">
                            {tagColors.map((color) => (
                                <Tooltip key={color}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            aria-label={color}
                                            className={cn(
                                                'flex h-10 items-center justify-center rounded-md border',
                                                ciianForm.data.color ===
                                                    color &&
                                                    'border-primary ring-2 ring-primary/30',
                                            )}
                                            onClick={() => {
                                                ciianForm.setData(
                                                    'color',
                                                    color,
                                                );
                                                clearFieldErrors(
                                                    ciianForm,
                                                    'color',
                                                );
                                            }}
                                        >
                                            <span
                                                className={cn(
                                                    'size-5 rounded-full',
                                                    COLOR_SWATCHES[color] ??
                                                        'bg-violet-500',
                                                )}
                                            />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>{color}</TooltipContent>
                                </Tooltip>
                            ))}
                        </div>
                        <InputError message={ciianForm.errors.color} />
                    </div>

                    <InputError message={ciianForm.errors.icon} />
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
