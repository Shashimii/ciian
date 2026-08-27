import {
    Link,
    resetLayoutProps,
    setLayoutProps,
    useForm,
} from '@inertiajs/react';
import Editor from '@monaco-editor/react';
import { GripVertical, Lock, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    store,
    updateInternal,
    updateSystem,
} from '@/actions/App/Http/Controllers/Database/TableController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useAppearance } from '@/hooks/use-appearance';
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

function isLockedIdColumn(column: TableColumnShape): boolean {
    return column.name === 'id' && column.type === 'id';
}

function columnTypeLabel(
    column: TableColumnShape,
    columnTypes: Record<string, string>,
): string {
    if (column.type === 'id' && column.auto_increment) {
        return 'Auto Increment';
    }

    return columnTypes[column.type] ?? column.type;
}

export default function TableForm({
    mode,
    table = null,
    systems,
    columnTypes,
}: Props) {
    const isEdit = mode === 'edit';
    const { resolvedAppearance } = useAppearance();
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [iconTooltipOpen, setIconTooltipOpen] = useState(false);
    const [columns, setColumns] = useState<TableColumnShape[]>(
        () => table?.unpub_shape?.columns ?? [defaultIdColumn()],
    );
    const [timestamps, setTimestamps] = useState(
        () => table?.unpub_shape?.timestamps ?? true,
    );
    const [slugTouched, setSlugTouched] = useState(isEdit);
    const [selectedColumnIndex, setSelectedColumnIndex] = useState(0);

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

    const systemLabel = isEdit
        ? table?.system.label
        : (selectedSystem?.label ?? 'Ciian');

    const selectedIcon = resolveLucideIcon(
        showIconEditor ? form.data.icon : (table?.system.icon ?? 'Sparkles'),
    );

    const selectedColumn = columns[selectedColumnIndex] ?? columns[0];
    const selectedColumnLocked = selectedColumn
        ? isLockedIdColumn(selectedColumn)
        : false;

    const shape = useMemo<TableShape>(
        () => ({
            columns,
            timestamps,
        }),
        [columns, timestamps],
    );

    const shapePreview = useMemo(
        () =>
            JSON.stringify(
                {
                    tbl_name: form.data.name,
                    tbl_db_name: form.data.slug,
                    tbl_sys: systemLabel,
                    columns,
                    ...(timestamps ? { timestamps: true } : {}),
                },
                null,
                2,
            ),
        [columns, form.data.name, form.data.slug, systemLabel, timestamps],
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

    useEffect(() => {
        setLayoutProps({
            headerActions: (
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href={tablesIndex()}>Cancel</Link>
                    </Button>
                    <Button
                        type="submit"
                        form="table-form"
                        disabled={form.processing}
                    >
                        {isEdit ? 'Save changes' : 'Save draft'}
                    </Button>
                </div>
            ),
        });

        return () => {
            resetLayoutProps();
        };
    }, [form.processing, isEdit]);

    const updateName = (value: string) => {
        form.setData('name', value);
        form.clearErrors('name');

        if (!isEdit && !slugTouched) {
            form.setData('slug', slugify(value));
            form.clearErrors('slug');
        }
    };

    const addColumn = () => {
        setColumns((current) => {
            const next = [
                ...current,
                {
                    name: '',
                    type: 'string',
                    nullable: true,
                },
            ];

            setSelectedColumnIndex(next.length - 1);

            return next;
        });
    };

    const updateColumn = (index: number, patch: Partial<TableColumnShape>) => {
        setColumns((current) =>
            current.map((column, columnIndex) =>
                columnIndex === index ? { ...column, ...patch } : column,
            ),
        );
    };

    const removeColumn = (index: number) => {
        setColumns((current) => {
            const next = current.filter((_, columnIndex) => columnIndex !== index);

            setSelectedColumnIndex((currentIndex) => {
                if (currentIndex === index) {
                    return Math.max(0, index - 1);
                }

                if (currentIndex > index) {
                    return currentIndex - 1;
                }

                return currentIndex;
            });

            return next;
        });
    };

    return (
        <form
            id="table-form"
            noValidate
            className="space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <Card className="py-4 shadow-none">
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                        <div className="flex items-end gap-3">
                            {showIconEditor ? (
                                <Tooltip
                                    open={iconTooltipOpen}
                                    onOpenChange={setIconTooltipOpen}
                                >
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted/40 transition-colors hover:border-primary/40 hover:bg-muted"
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
                            ) : (
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
                                    {selectedIcon && (
                                        <Icon
                                            iconNode={selectedIcon}
                                            className="size-7"
                                        />
                                    )}
                                </div>
                            )}

                            <div className="min-w-[12rem] flex-1 space-y-2">
                                <Label htmlFor="table-name">Table Name</Label>
                                <Input
                                    id="table-name"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        updateName(event.target.value)
                                    }
                                    placeholder="Permissions"
                                />
                                <InputError message={form.errors.name} />
                            </div>
                        </div>

                        <div className="grid flex-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="table-slug">
                                    Table Name Slug
                                </Label>
                                <Input
                                    id="table-slug"
                                    value={form.data.slug}
                                    disabled={isEdit}
                                    onChange={(event) => {
                                        setSlugTouched(true);
                                        form.setData('slug', event.target.value);
                                        form.clearErrors('slug');
                                    }}
                                    placeholder="permissions"
                                />
                                <InputError message={form.errors.slug} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="table-system">Table System</Label>
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
                                                form.clearErrors('system');
                                            }}
                                        >
                                            <SelectTrigger id="table-system">
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
                                        <InputError
                                            message={form.errors.system}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {showIconEditor && showIconPicker && (
                        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
                            {TABLE_ICON_OPTIONS.map((iconName) => {
                                const IconComponent =
                                    resolveLucideIcon(iconName);

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
                </CardContent>
            </Card>

            <div className="grid min-h-[32rem] gap-4 xl:grid-cols-12">
                <Card className="flex flex-col py-4 shadow-none xl:col-span-3">
                    <CardHeader className="flex-row items-center justify-between space-y-0 px-4 pb-3">
                        <CardTitle className="text-sm font-semibold">
                            Table Columns
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-2 px-4">
                        <button
                            type="button"
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
                            onClick={addColumn}
                        >
                            <Plus className="size-4" />
                            Add Column
                        </button>

                        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                            {columns.map((column, index) => {
                                const isLocked = isLockedIdColumn(column);
                                const isSelected = selectedColumnIndex === index;

                                return (
                                    <button
                                        key={`${column.name}-${index}`}
                                        type="button"
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                                            isSelected
                                                ? 'border-primary bg-primary/5'
                                                : 'hover:bg-muted/40',
                                        )}
                                        onClick={() =>
                                            setSelectedColumnIndex(index)
                                        }
                                    >
                                        <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium">
                                                {column.name || 'Untitled'}
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground">
                                                {columnTypeLabel(
                                                    column,
                                                    columnTypes,
                                                )}
                                            </div>
                                        </div>
                                        {isLocked && (
                                            <Lock className="size-4 shrink-0 text-muted-foreground" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col py-4 shadow-none xl:col-span-4">
                    <CardHeader className="px-4 pb-3">
                        <CardTitle className="text-sm font-semibold">
                            Table Column Properties
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4 px-4">
                        {selectedColumn && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="column-name">Name</Label>
                                    <Input
                                        id="column-name"
                                        value={selectedColumn.name}
                                        disabled={selectedColumnLocked}
                                        placeholder="column_name"
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
                                        <SelectTrigger id="column-type">
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
                                </div>

                                {!selectedColumnLocked && (
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="column-nullable"
                                                checked={
                                                    selectedColumn.nullable ??
                                                    false
                                                }
                                                onCheckedChange={(checked) =>
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
                                            <Label htmlFor="column-nullable">
                                                Nullable
                                            </Label>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() =>
                                                removeColumn(
                                                    selectedColumnIndex,
                                                )
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                            Remove
                                        </Button>
                                    </div>
                                )}

                                {selectedColumnLocked && (
                                    <p className="text-sm text-muted-foreground">
                                        The primary key column is locked and
                                        always included.
                                    </p>
                                )}
                            </>
                        )}

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

                        <InputError message={form.errors.shape} />
                    </CardContent>
                </Card>

                <Card className="flex flex-col py-4 shadow-none xl:col-span-5">
                    <CardHeader className="px-4 pb-3">
                        <CardTitle className="text-sm font-semibold">
                            Shape (JSON)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-[28rem] flex-1 px-4">
                        <div className="min-h-[28rem] flex-1 overflow-hidden rounded-lg border">
                            <Editor
                                height="28rem"
                                language="json"
                                theme={
                                    resolvedAppearance === 'dark'
                                        ? 'vs-dark'
                                        : 'light'
                                }
                                value={shapePreview}
                                options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    fontSize: 12,
                                    lineNumbers: 'on',
                                    wordWrap: 'on',
                                    folding: true,
                                    automaticLayout: true,
                                    tabSize: 2,
                                    padding: { top: 12, bottom: 12 },
                                    renderLineHighlight: 'none',
                                    overviewRulerLanes: 0,
                                    hideCursorInOverviewRuler: true,
                                    scrollbar: {
                                        verticalScrollbarSize: 8,
                                        horizontalScrollbarSize: 8,
                                    },
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </form>
    );
}
