import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    defaultAnimateLayoutChanges,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { AnimateLayoutChanges } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Link,
    resetLayoutProps,
    setLayoutProps,
    useForm,
} from '@inertiajs/react';
import { GripVertical, Lock, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    store,
    updateInternal,
    updateSystem,
} from '@/actions/App/Http/Controllers/Ciian/Database/TableController';
import InputError from '@/components/input-error';
import JsonShapeEditor from '@/components/json-shape-editor';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { clearFieldErrors } from '@/lib/clear-field-errors';
import {
    columnSupports,
    columnTypeLabel,
    groupedColumnTypes,
    isLockedIdColumn,
    ON_DELETE_ACTIONS,
} from '@/lib/column-types';
import { formatShapeJsonError } from '@/lib/format-shape-json-error';
import { resolveLucideIcon, TABLE_ICON_OPTIONS } from '@/lib/lucide-icons';
import { cn } from '@/lib/utils';
import { index as tablesIndex } from '@/routes/tables';
import type {
    RelationTableOption,
    SystemOption,
    TableColumnShape,
    TableRow,
    TableShape,
} from '@/types';

export type { RelationTableOption };

type Props = {
    mode: 'create' | 'edit';
    table?: TableRow | null;
    systems: SystemOption[];
    columnTypes: Record<string, string>;
    relationTables?: RelationTableOption[];
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

function shapeFromColumns(
    name: string,
    slug: string,
    systemLabel: string,
    columns: TableColumnShape[],
    timestamps: boolean,
): TableShape {
    return {
        tbl_name: name,
        tbl_db_name: slug,
        tbl_sys: systemLabel,
        columns,
        timestamps,
    };
}

function columnsFromShape(raw: unknown): {
    columns: TableColumnShape[];
    timestamps: boolean;
} | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
    }

    const shape = raw as Record<string, unknown>;
    const columns = shape.columns;

    if (!Array.isArray(columns) || columns.length === 0) {
        return null;
    }

    const normalized = columns
        .filter((column): column is Record<string, unknown> => {
            return Boolean(column) && typeof column === 'object' && !Array.isArray(column);
        })
        .map((column) => ({
            ...(column as TableColumnShape),
            name: String(column.name ?? ''),
            type: String(column.type ?? 'string'),
        }));

    if (normalized.length === 0) {
        return null;
    }

    return {
        columns: normalized,
        timestamps: Boolean(shape.timestamps ?? true),
    };
}

type SortableColumnRowProps = {
    id: string;
    column: TableColumnShape;
    selected: boolean;
    locked: boolean;
    typeLabel: string;
    onSelect: () => void;
    onRemove: () => void;
};

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
    defaultAnimateLayoutChanges({ ...args, wasDragging: true });

function SortableColumnRow({
    id,
    column,
    selected,
    locked,
    typeLabel,
    onSelect,
    onRemove,
}: SortableColumnRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        disabled: locked,
        animateLayoutChanges,
    });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(
                    transform ? { ...transform, x: 0 } : null,
                ),
                transition,
            }}
            className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm',
                selected && 'border-primary bg-primary/5',
                isDragging && 'relative z-10 bg-background opacity-90 shadow-md',
            )}
        >
            <button
                type="button"
                className={cn(
                    'touch-none text-muted-foreground',
                    locked
                        ? 'cursor-not-allowed opacity-40'
                        : 'cursor-grab active:cursor-grabbing',
                )}
                aria-label="Drag to reorder"
                disabled={locked}
                {...attributes}
                {...listeners}
            >
                <GripVertical className="size-4" />
            </button>

            <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={onSelect}
            >
                <div className="truncate font-medium">
                    {column.name || 'Untitled'}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                    {typeLabel}
                </div>
            </button>

            {locked ? (
                <Lock className="size-4 shrink-0 text-muted-foreground" />
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Delete"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRemove();
                            }}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}

export default function TableForm({
    mode,
    table = null,
    systems,
    columnTypes,
    relationTables = [],
}: Props) {
    const isEdit = mode === 'edit';
    const syncingFromEditor = useRef(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [iconTooltipOpen, setIconTooltipOpen] = useState(false);
    const [selectedColumnIndex, setSelectedColumnIndex] = useState(0);
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [jsonText, setJsonText] = useState('');

    const createColumnKey = () => crypto.randomUUID();

    const form = useForm({
        name: table?.name ?? '',
        slug: table?.slug ?? '',
        system: table?.system.slug ?? systems[0]?.value ?? '',
        icon: table?.icon ?? systems[0]?.icon ?? 'Sparkles',
        shape: {
            columns: table?.unpub_shape?.columns?.length
                ? table.unpub_shape.columns
                : [defaultIdColumn()],
            timestamps: table?.unpub_shape?.timestamps ?? true,
        } satisfies Pick<TableShape, 'columns' | 'timestamps'>,
    });

    const [columnKeys, setColumnKeys] = useState<string[]>(() =>
        (table?.unpub_shape?.columns?.length
            ? table.unpub_shape.columns
            : [defaultIdColumn()]
        ).map(() => crypto.randomUUID()),
    );

    const columns = form.data.shape.columns;
    const timestamps = form.data.shape.timestamps;

    const selectedSystem = systems.find(
        (system) => system.value === form.data.system,
    );
    const showIconEditor = isEdit
        ? table?.store === 'internal'
        : (selectedSystem?.internal ?? false);

    const systemLabel = isEdit
        ? (table?.system.label ?? '')
        : (selectedSystem?.label ?? '');

    const selectedIcon = resolveLucideIcon(
        showIconEditor
            ? form.data.icon
            : (table?.system.icon ?? selectedSystem?.icon ?? 'Sparkles'),
    );

    const typeGroups = useMemo(
        () => groupedColumnTypes(columnTypes),
        [columnTypes],
    );

    const selectedColumn = columns[selectedColumnIndex] ?? columns[0];
    const selectedColumnLocked = selectedColumn
        ? isLockedIdColumn(selectedColumn)
        : false;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const isDirty = form.isDirty;

    const publishShapePreview = () => {
        const shape = shapeFromColumns(
            form.data.name,
            form.data.slug,
            systemLabel,
            columns,
            timestamps,
        );
        setJsonText(JSON.stringify(shape, null, 2));
        setJsonError(null);
    };

    useEffect(() => {
        if (syncingFromEditor.current) {
            syncingFromEditor.current = false;

            return;
        }

        publishShapePreview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data.name, form.data.slug, systemLabel, columns, timestamps]);

    const setColumns = (next: TableColumnShape[]) => {
        form.setData('shape', {
            ...form.data.shape,
            columns: next,
        });
        clearFieldErrors(form, 'shape');
    };

    const setTimestamps = (next: boolean) => {
        form.setData('shape', {
            ...form.data.shape,
            timestamps: next,
        });
        clearFieldErrors(form, 'shape');
    };

    const updateColumn = (index: number, patch: Partial<TableColumnShape>) => {
        setColumns(
            columns.map((column, columnIndex) =>
                columnIndex === index ? { ...column, ...patch } : column,
            ),
        );
    };

    const addColumn = () => {
        const next = [
            ...columns,
            {
                name: '',
                type: 'string',
                nullable: true,
            } satisfies TableColumnShape,
        ];
        setColumns(next);
        setColumnKeys((keys) => [...keys, createColumnKey()]);
        setSelectedColumnIndex(next.length - 1);
    };

    const removeColumn = (index: number) => {
        if (isLockedIdColumn(columns[index])) {
            return;
        }

        const next = columns.filter((_, columnIndex) => columnIndex !== index);
        setColumns(next);
        setColumnKeys((keys) => keys.filter((_, keyIndex) => keyIndex !== index));
        setSelectedColumnIndex((current) => {
            if (current === index) {
                return Math.max(0, index - 1);
            }

            return current > index ? current - 1 : current;
        });
    };

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = columnKeys.indexOf(String(active.id));
        const newIndex = columnKeys.indexOf(String(over.id));

        if (oldIndex < 0 || newIndex < 0) {
            return;
        }

        if (oldIndex === 0 || newIndex === 0) {
            return;
        }

        setColumns(arrayMove(columns, oldIndex, newIndex));
        setColumnKeys((keys) => arrayMove(keys, oldIndex, newIndex));
        setSelectedColumnIndex(newIndex);
    };

    const updateName = (value: string) => {
        form.setData('name', value);
        clearFieldErrors(form, 'name');

        if (!isEdit) {
            form.setData('slug', slugify(value));
            clearFieldErrors(form, 'slug');
        }
    };

    const handleJsonChange = (value: string) => {
        setJsonText(value);

        try {
            const parsed = JSON.parse(value) as unknown;
            const next = columnsFromShape(parsed);

            if (!next) {
                setJsonError('Shape must include a non-empty columns array.');

                return;
            }

            syncingFromEditor.current = true;
            setJsonError(null);
            form.setData('shape', {
                columns: next.columns,
                timestamps: next.timestamps,
            });
            clearFieldErrors(form, 'shape');
            setColumnKeys((keys) =>
                next.columns.map((_, index) => keys[index] ?? createColumnKey()),
            );

            if (selectedColumnIndex >= next.columns.length) {
                setSelectedColumnIndex(Math.max(0, next.columns.length - 1));
            }
        } catch (error) {
            setJsonError(formatShapeJsonError(error));
        }
    };

    const submit = () => {
        if (jsonError) {
            return;
        }

        const payload = {
            name: form.data.name,
            slug: form.data.slug,
            icon: form.data.icon,
            shape: {
                columns,
                timestamps,
            },
            ...(isEdit ? {} : { system: form.data.system }),
        };

        if (isEdit && table) {
            const route =
                table.store === 'internal' ? updateInternal : updateSystem;

            form.transform(() => payload);
            form.patch(route.url(table.id));

            return;
        }

        form.transform(() => payload);
        form.post(store.url());
    };

    useEffect(() => {
        const canSubmit =
            !form.processing &&
            !jsonError &&
            (!isEdit || isDirty);

        setLayoutProps({
            headerActions: (
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href={tablesIndex()}>Cancel</Link>
                    </Button>
                    <Button
                        type="submit"
                        form="table-form"
                        disabled={!canSubmit}
                    >
                        {isEdit ? 'Save changes' : 'Create table'}
                    </Button>
                </div>
            ),
        });

        return () => {
            resetLayoutProps();
        };
    }, [form.processing, isDirty, isEdit, jsonError]);

    return (
        <form
            id="table-form"
            noValidate
            className="flex min-h-0 flex-1 flex-col gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <div>
                <div className="flex items-start gap-4">
                    {showIconEditor ? (
                        <Tooltip
                            open={iconTooltipOpen}
                            onOpenChange={setIconTooltipOpen}
                        >
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="flex size-34 shrink-0 items-center justify-center rounded-xl border text-foreground transition-colors hover:bg-muted/40"
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
                                            className="size-16 sm:size-20"
                                        />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Change icon</TooltipContent>
                        </Tooltip>
                    ) : (
                        <div className="flex size-34 shrink-0 items-center justify-center rounded-xl border text-foreground">
                            {selectedIcon && (
                                <Icon
                                    iconNode={selectedIcon}
                                    className="size-16 sm:size-20"
                                />
                            )}
                        </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="table-name">Table Name</Label>
                            <Input
                                id="table-name"
                                data-field="name"
                                value={form.data.name}
                                onChange={(event) =>
                                    updateName(event.target.value)
                                }
                                placeholder="Enter Table Name"
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="table-slug">
                                    Table Name Slug
                                </Label>
                                <Input
                                    id="table-slug"
                                    data-field="slug"
                                    value={form.data.slug}
                                    readOnly
                                    disabled
                                    placeholder="Enter Table Name Slug"
                                />
                                <InputError message={form.errors.slug} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="table-system">
                                    Table System
                                </Label>
                                {isEdit ? (
                                    <Input
                                        id="table-system"
                                        value={systemLabel}
                                        disabled
                                    />
                                ) : (
                                    <>
                                        <Select
                                            value={form.data.system}
                                            onValueChange={(value) => {
                                                form.setData('system', value);
                                                const next = systems.find(
                                                    (system) =>
                                                        system.value === value,
                                                );

                                                if (next) {
                                                    form.setData(
                                                        'icon',
                                                        next.icon,
                                                    );
                                                }

                                                clearFieldErrors(
                                                    form,
                                                    'system',
                                                );
                                            }}
                                        >
                                            <SelectTrigger
                                                id="table-system"
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="Select Table System" />
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
                                        <InputError
                                            message={form.errors.system}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {showIconEditor && showIconPicker && (
                    <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
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
                                    </TooltipTrigger>
                                    <TooltipContent>{iconName}</TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.5fr)]">
                <div className="flex min-h-0 flex-col rounded-xl border bg-card shadow-sm">
                    <div className="border-b px-4 py-3">
                        <h2 className="text-sm font-semibold">Table Columns</h2>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto p-4">
                        <button
                            type="button"
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
                            onClick={addColumn}
                        >
                            <Plus className="size-4" />
                            Add Column
                        </button>

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={onDragEnd}
                        >
                            <SortableContext
                                items={columnKeys}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2">
                                    {columns.map((column, index) => (
                                        <SortableColumnRow
                                            key={columnKeys[index]}
                                            id={columnKeys[index]}
                                            column={column}
                                            selected={
                                                selectedColumnIndex === index
                                            }
                                            locked={isLockedIdColumn(column)}
                                            typeLabel={columnTypeLabel(
                                                column.type,
                                                columnTypes[column.type],
                                            )}
                                            onSelect={() =>
                                                setSelectedColumnIndex(index)
                                            }
                                            onRemove={() =>
                                                removeColumn(index)
                                            }
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>

                        <div className="mt-auto flex items-center gap-2 border-t pt-4">
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
                    </div>
                </div>

                <div className="flex min-h-0 flex-col rounded-xl border bg-card shadow-sm">
                    <div className="border-b px-4 py-3">
                        <h2 className="text-sm font-semibold">
                            Table Column Properties
                        </h2>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                        {selectedColumn && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="column-name">Name</Label>
                                    <Input
                                        id="column-name"
                                        value={selectedColumn.name}
                                        disabled={selectedColumnLocked}
                                        placeholder="Enter Column Name"
                                        onChange={(event) =>
                                            updateColumn(selectedColumnIndex, {
                                                name: event.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="column-type">Type</Label>
                                    <Select
                                        value={selectedColumn.type}
                                        disabled={selectedColumnLocked}
                                        onValueChange={(value) =>
                                            updateColumn(selectedColumnIndex, {
                                                type: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger
                                            id="column-type"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Select Column Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {typeGroups.map((group) => (
                                                <SelectGroup key={group.label}>
                                                    <SelectLabel>
                                                        {group.label}
                                                    </SelectLabel>
                                                    {group.types.map((type) => (
                                                        <SelectItem
                                                            key={type.value}
                                                            value={type.value}
                                                        >
                                                            {type.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedColumnLocked ? (
                                    <p className="text-sm text-muted-foreground">
                                        The primary key column is locked and
                                        always included.
                                    </p>
                                ) : (
                                    <div className="grid gap-3">
                                        {columnSupports(
                                            selectedColumn.type,
                                            'nullable',
                                        ) && (
                                            <label className="flex items-center gap-2 text-sm">
                                                <Checkbox
                                                    checked={
                                                        selectedColumn.nullable ??
                                                        false
                                                    }
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        updateColumn(
                                                            selectedColumnIndex,
                                                            {
                                                                nullable:
                                                                    checked ===
                                                                    true,
                                                            },
                                                        )
                                                    }
                                                />
                                                Nullable
                                            </label>
                                        )}

                                        {columnSupports(
                                            selectedColumn.type,
                                            'unique',
                                        ) && (
                                            <label className="flex items-center gap-2 text-sm">
                                                <Checkbox
                                                    checked={
                                                        selectedColumn.unique ??
                                                        false
                                                    }
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        updateColumn(
                                                            selectedColumnIndex,
                                                            {
                                                                unique:
                                                                    checked ===
                                                                    true,
                                                            },
                                                        )
                                                    }
                                                />
                                                Unique
                                            </label>
                                        )}

                                        {columnSupports(
                                            selectedColumn.type,
                                            'indexed',
                                        ) && (
                                            <label className="flex items-center gap-2 text-sm">
                                                <Checkbox
                                                    checked={
                                                        selectedColumn.indexed ??
                                                        false
                                                    }
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        updateColumn(
                                                            selectedColumnIndex,
                                                            {
                                                                indexed:
                                                                    checked ===
                                                                    true,
                                                            },
                                                        )
                                                    }
                                                />
                                                Indexed
                                            </label>
                                        )}

                                        {columnSupports(
                                            selectedColumn.type,
                                            'length',
                                        ) && (
                                            <div className="space-y-2">
                                                <Label htmlFor="column-length">
                                                    Length
                                                </Label>
                                                <Input
                                                    id="column-length"
                                                    type="number"
                                                    min={1}
                                                    placeholder="Enter Length"
                                                    value={
                                                        selectedColumn.length ??
                                                        ''
                                                    }
                                                    onChange={(event) =>
                                                        updateColumn(
                                                            selectedColumnIndex,
                                                            {
                                                                length: event
                                                                    .target
                                                                    .value
                                                                    ? Number(
                                                                          event
                                                                              .target
                                                                              .value,
                                                                      )
                                                                    : undefined,
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}

                                        {columnSupports(
                                            selectedColumn.type,
                                            'default',
                                        ) && (
                                            <div className="space-y-2">
                                                <Label htmlFor="column-default">
                                                    Default
                                                </Label>
                                                <Input
                                                    id="column-default"
                                                    placeholder="Enter Default Value"
                                                    value={
                                                        selectedColumn.default?.toString() ??
                                                        ''
                                                    }
                                                    onChange={(event) =>
                                                        updateColumn(
                                                            selectedColumnIndex,
                                                            {
                                                                default:
                                                                    event.target
                                                                        .value ||
                                                                    undefined,
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}

                                        {columnSupports(
                                            selectedColumn.type,
                                            'references',
                                        ) && (
                                            <div className="space-y-2">
                                                <Label htmlFor="column-references">
                                                    References
                                                </Label>
                                                <Select
                                                    value={
                                                        selectedColumn.references ||
                                                        undefined
                                                    }
                                                    onValueChange={(value) =>
                                                        updateColumn(
                                                            selectedColumnIndex,
                                                            {
                                                                references:
                                                                    value,
                                                            },
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="column-references"
                                                        className="w-full"
                                                    >
                                                        <SelectValue placeholder="Select References" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {selectedColumn.references &&
                                                            !relationTables.some(
                                                                (relation) =>
                                                                    relation.value ===
                                                                    selectedColumn.references,
                                                            ) && (
                                                                <SelectItem
                                                                    value={
                                                                        selectedColumn.references
                                                                    }
                                                                >
                                                                    {
                                                                        selectedColumn.references
                                                                    }
                                                                </SelectItem>
                                                            )}
                                                        {relationTables.map(
                                                            (relation) => (
                                                                <SelectItem
                                                                    key={
                                                                        relation.value
                                                                    }
                                                                    value={
                                                                        relation.value
                                                                    }
                                                                >
                                                                    {
                                                                        relation.label
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {columnSupports(
                                            selectedColumn.type,
                                            'on_delete',
                                        ) && (
                                            <div className="space-y-2">
                                                <Label htmlFor="column-on-delete">
                                                    On delete
                                                </Label>
                                                <Select
                                                    value={
                                                        selectedColumn.on_delete ??
                                                        'restrict'
                                                    }
                                                    onValueChange={(value) =>
                                                        updateColumn(
                                                            selectedColumnIndex,
                                                            {
                                                                on_delete:
                                                                    value,
                                                            },
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="column-on-delete"
                                                        className="w-full"
                                                    >
                                                        <SelectValue placeholder="Select On Delete" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ON_DELETE_ACTIONS.map(
                                                            (action) => (
                                                                <SelectItem
                                                                    key={
                                                                        action.value
                                                                    }
                                                                    value={
                                                                        action.value
                                                                    }
                                                                >
                                                                    {
                                                                        action.label
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {columnSupports(
                                            selectedColumn.type,
                                            'values',
                                        ) && (
                                            <div className="space-y-2">
                                                <Label htmlFor="column-values">
                                                    Values (comma-separated)
                                                </Label>
                                                <Input
                                                    id="column-values"
                                                    placeholder="Enter Values (comma-separated)"
                                                    value={(
                                                        selectedColumn.values ??
                                                        []
                                                    ).join(', ')}
                                                    onChange={(event) =>
                                                        updateColumn(
                                                            selectedColumnIndex,
                                                            {
                                                                values: event.target.value
                                                                    .split(',')
                                                                    .map(
                                                                        (
                                                                            part,
                                                                        ) =>
                                                                            part.trim(),
                                                                    )
                                                                    .filter(
                                                                        Boolean,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <InputError message={form.errors.shape} />
                    </div>
                </div>

                <div className="flex min-h-0 flex-col rounded-xl border bg-card shadow-sm">
                    <div className="border-b px-4 py-3">
                        <h2 className="text-sm font-semibold">Shape (JSON)</h2>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col">
                        <JsonShapeEditor
                            value={jsonText}
                            onChange={handleJsonChange}
                            height="100%"
                            className="min-h-[24rem] flex-1"
                        />
                        {jsonError && (
                            <p className="px-4 py-2 text-sm text-destructive">
                                {jsonError}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
}
