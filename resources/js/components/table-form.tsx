import { Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    store,
    updateInternal,
    updateSystem,
} from '@/actions/App/Http/Controllers/Database/TableController';
import InputError from '@/components/input-error';
import TagBadge from '@/components/tag-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { resolveLucideIcon, TABLE_ICON_OPTIONS } from '@/lib/lucide-icons';
import { cn } from '@/lib/utils';
import { index as tablesIndex } from '@/routes/tables';
import type {
    SystemOption,
    TableColumnShape,
    TableRow,
    TableShape,
} from '@/types';

type Props = {
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

export default function TableForm({
    mode,
    table = null,
    systems,
    columnTypes,
}: Props) {
    const isEdit = mode === 'edit';
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [iconTooltipOpen, setIconTooltipOpen] = useState(false);
    const [columns, setColumns] = useState<TableColumnShape[]>(
        () => table?.unpub_shape?.columns ?? [defaultIdColumn()],
    );
    const [timestamps, setTimestamps] = useState(
        () => table?.unpub_shape?.timestamps ?? true,
    );
    const [slugTouched, setSlugTouched] = useState(isEdit);

    const form = useForm({
        name: table?.name ?? '',
        slug: table?.slug ?? '',
        system: table?.system.slug ?? systems[0]?.value ?? 'ciian',
        icon: table?.icon ?? 'Sparkles',
    });

    const selectedSystem = systems.find(
        (system) => system.value === form.data.system,
    );
    const showIconEditor = isEdit
        ? table?.store === 'internal'
        : (selectedSystem?.internal ?? true);

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
                table.store === 'internal' ? updateInternal : updateSystem;

            form.transform(() => payload).patch(route.url(table.id), {
                preserveScroll: true,
            });

            return;
        }

        form.transform(() => payload).post(store.url(), {
            preserveScroll: true,
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

    const updateColumn = (index: number, patch: Partial<TableColumnShape>) => {
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
        <form
            noValidate
            className="mx-auto max-w-3xl space-y-6"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            {isEdit && table && (
                <div className="space-y-2">
                    <Label>System</Label>
                    <div>
                        <TagBadge system={table.system} />
                    </div>
                </div>
            )}

            <div className="flex items-end gap-3">
                <div
                    className={cn(
                        'order-1 flex-1 space-y-2',
                        !showIconEditor && 'w-full',
                    )}
                >
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

            <div className="flex items-center justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" asChild>
                    <Link href={tablesIndex()}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={form.processing}>
                    Save draft
                </Button>
            </div>
        </form>
    );
}
