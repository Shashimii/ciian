import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { store, updateInternal, updateSystem } from '@/actions/App/Http/Controllers/Database/TableController';
import FormSidebar from '@/components/form-sidebar';
import InputError from '@/components/input-error';
import TagBadge from '@/components/tag-badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { resolveLucideIcon, TABLE_ICON_OPTIONS } from '@/lib/lucide-icons';
import { cn } from '@/lib/utils';
import type {
    SystemOption,
    TableColumnShape,
    TableRow,
    TableShape,
} from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    table?: TableRow | null;
    systems: SystemOption[];
    columnTypes: Record<string, string>;
};

const defaultIdColumn = (): TableColumnShape => ({
    name: 'id',
    type: 'id',
    nullable: false,
    auto_increment: true,
});

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

export default function TableFormSidebar({
    open,
    onOpenChange,
    mode,
    table,
    systems,
    columnTypes,
}: Props) {
    const isEdit = mode === 'edit';
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [iconTooltipOpen, setIconTooltipOpen] = useState(false);
    const [columns, setColumns] = useState<TableColumnShape[]>([defaultIdColumn()]);
    const [timestamps, setTimestamps] = useState(true);
    const [slugTouched, setSlugTouched] = useState(false);

    const form = useForm({
        name: '',
        slug: '',
        system: systems[0]?.value ?? 'ciian',
        icon: 'Sparkles',
    });

    const selectedSystem = systems.find(
        (system) => system.value === form.data.system,
    );
    const showIconEditor = isEdit
        ? table?.store === 'internal'
        : (selectedSystem?.internal ?? true);

    useEffect(() => {
        if (!open) {
            return;
        }

        if (isEdit && table) {
            form.setData({
                name: table.name,
                slug: table.slug,
                system: table.system.slug,
                icon: table.icon,
            });
            setColumns(table.unpub_shape?.columns ?? [defaultIdColumn()]);
            setTimestamps(table.unpub_shape?.timestamps ?? true);
            setSlugTouched(true);
            return;
        }

        form.reset();
        form.setData('system', systems[0]?.value ?? 'ciian');
        form.setData('icon', 'Sparkles');
        setColumns([defaultIdColumn()]);
        setTimestamps(true);
        setSlugTouched(false);
    }, [open, isEdit, table, systems]);

    const selectedIcon = resolveLucideIcon(form.data.icon);

    const shape = useMemo<TableShape>(
        () => ({
            columns,
            timestamps,
        }),
        [columns, timestamps],
    );

    const submit = () => {
        const payload = {
            name: form.data.name,
            slug: form.data.slug,
            icon: form.data.icon,
            shape,
            ...(isEdit ? {} : { system: form.data.system }),
        };

        if (isEdit && table) {
            const route =
                table.store === 'internal'
                    ? updateInternal
                    : updateSystem;

            form.transform(() => payload).patch(route.url(table.id), {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
            });

            return;
        }

        form.transform(() => payload).post(store.url(), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    const updateName = (value: string) => {
        form.setData('name', value);
        form.clearErrors('name');

        if (!isEdit && !slugTouched) {
            form.setData('slug', slugify(value));
            form.clearErrors('slug');
        }
    };

    const addColumn = () => {
        setColumns((current) => [
            ...current,
            {
                name: '',
                type: 'string',
                nullable: true,
            },
        ]);
    };

    const updateColumn = (
        index: number,
        patch: Partial<TableColumnShape>,
    ) => {
        setColumns((current) =>
            current.map((column, columnIndex) =>
                columnIndex === index ? { ...column, ...patch } : column,
            ),
        );
    };

    const removeColumn = (index: number) => {
        setColumns((current) =>
            current.filter((_, columnIndex) => columnIndex !== index),
        );
    };

    return (
        <FormSidebar
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Edit table' : 'New table'}
            description={
                isEdit
                    ? 'Update the draft shape stored in unpub_shape.'
                    : 'Create a draft table shape before publishing.'
            }
            footer={
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={form.processing}
                        onClick={submit}
                    >
                        Save draft
                    </Button>
                </div>
            }
        >
            <form
                noValidate
                className="space-y-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                }}
            >
                {isEdit && table && (
                    <div className="space-y-2">
                        <Label>System</Label>
                        <TagBadge system={table.system} />
                    </div>
                )}

                <div className="flex items-end gap-3">
                    <div className={cn('order-1 flex-1 space-y-2', !showIconEditor && 'w-full')}>
                        <Label htmlFor="table-name">Name</Label>
                        <Input
                            id="table-name"
                            value={form.data.name}
                            onChange={(event) => updateName(event.target.value)}
                            placeholder="Users"
                        />
                        <InputError message={form.errors.name} />
                    </div>

                    {showIconEditor && (
                        <div className="order-2">
                        <Tooltip
                            open={iconTooltipOpen}
                            onOpenChange={setIconTooltipOpen}
                        >
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="flex size-12 items-center justify-center rounded-xl border bg-muted/40 transition-colors hover:border-primary/40 hover:bg-muted"
                                    aria-label="Change icon"
                                    onPointerEnter={() =>
                                        setIconTooltipOpen(true)
                                    }
                                    onPointerLeave={() =>
                                        setIconTooltipOpen(false)
                                    }
                                    onClick={() =>
                                        setShowIconPicker((current) => !current)
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
                    )}
                </div>

                {showIconEditor && showIconPicker && (
                    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
                        {TABLE_ICON_OPTIONS.map((iconName) => {
                            const IconComponent = resolveLucideIcon(iconName);

                            return (
                                <button
                                    key={iconName}
                                    type="button"
                                    className={cn(
                                        'flex h-10 items-center justify-center rounded-md border',
                                        form.data.icon === iconName &&
                                            'border-primary bg-primary/10 text-primary',
                                    )}
                                    onClick={() => {
                                        form.setData('icon', iconName);
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
                            );
                        })}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="table-slug">Database name</Label>
                    <Input
                        id="table-slug"
                        value={form.data.slug}
                        disabled={isEdit}
                        onChange={(event) => {
                            setSlugTouched(true);
                            form.setData('slug', event.target.value);
                            form.clearErrors('slug');
                        }}
                        placeholder="users"
                    />
                    <InputError message={form.errors.slug} />
                </div>

                {!isEdit && (
                    <div className="space-y-2">
                        <Label>System</Label>
                        <Select
                            value={form.data.system}
                            onValueChange={(value) => {
                                form.setData('system', value);
                                form.clearErrors('system');
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a system" />
                            </SelectTrigger>
                            <SelectContent>
                                {systems.map((system) => (
                                    <SelectItem
                                        key={system.value}
                                        value={system.value}
                                    >
                                        {system.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.system} />
                    </div>
                )}

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Columns</Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addColumn}
                        >
                            Add column
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {columns.map((column, index) => {
                            const isLockedId =
                                column.name === 'id' && column.type === 'id';

                            return (
                                <div
                                    key={`${column.name}-${index}`}
                                    className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]"
                                >
                                    <Input
                                        value={column.name}
                                        disabled={isLockedId}
                                        placeholder="column_name"
                                        onChange={(event) =>
                                            updateColumn(index, {
                                                name: event.target.value,
                                            })
                                        }
                                    />
                                    <Select
                                        value={column.type}
                                        disabled={isLockedId}
                                        onValueChange={(value) =>
                                            updateColumn(index, { type: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(columnTypes).map(
                                                ([value, label]) => (
                                                    <SelectItem
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {!isLockedId && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeColumn(index)}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <InputError message={form.errors.shape} />
                </div>

                <div className="flex items-center gap-2">
                    <Checkbox
                        id="table-timestamps"
                        checked={timestamps}
                        onCheckedChange={(checked) =>
                            setTimestamps(checked === true)
                        }
                    />
                    <Label htmlFor="table-timestamps">
                        Include created_at and updated_at
                    </Label>
                </div>
            </form>
        </FormSidebar>
    );
}
