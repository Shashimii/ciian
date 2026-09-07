import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, GripVertical, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import BlockRenderer from '@/components/core/block-renderer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { show } from '@/routes/systems';
import { update as updateBlocks } from '@/routes/systems/pages/blocks';
import type { PageBuilderSystem, PlacedBlock, SystemPageDetail } from '@/types';
import type { ComponentProperty, ComponentRow } from '@/types/component';

type Props = {
    system: PageBuilderSystem;
    page: SystemPageDetail;
    palette: ComponentRow[];
};

/** Prefix marking a draggable that came from the palette rather than the canvas. */
const PALETTE_PREFIX = 'palette:';

const CANVAS_ID = 'page-canvas';

function newBlockId(): string {
    return `b_${Math.random().toString(16).slice(2, 14)}`;
}

/**
 * A definition states every default as a string, but a checkbox property is a
 * boolean to the component that receives it. Coercing here — rather than in the
 * renderer, which has no definition to consult — keeps the builder canvas and a
 * published page passing the component the same thing.
 */
function propValue(
    property: ComponentProperty,
    stored: string | boolean | undefined,
): string | boolean {
    if (property.type === 'checkbox') {
        return typeof stored === 'boolean' ? stored : stored === 'true';
    }

    return typeof stored === 'string' ? stored : property.default;
}

/**
 * A component's declared defaults, which every newly placed block starts from.
 */
function defaultsFor(
    properties: Record<string, ComponentProperty>,
): Record<string, string | boolean> {
    return Object.fromEntries(
        Object.entries(properties).map(([key, property]) => [
            key,
            propValue(property, property.default),
        ]),
    );
}

type SortableBlockProps = {
    block: PlacedBlock;
    label: string;
    selected: boolean;
    onSelect: () => void;
    onRemove: () => void;
    children: React.ReactNode;
};

/** One placed block on the canvas, with its selection and drag chrome. */
function SortableBlock({
    block,
    label,
    selected,
    onSelect,
    onRemove,
    children,
}: SortableBlockProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.block_id });

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
                'group relative rounded-lg border-2 border-transparent transition-colors',
                selected && 'border-primary',
                !selected && 'hover:border-primary/30',
                isDragging && 'relative z-10 opacity-60',
            )}
            onClick={(event) => {
                // Without stopping here the click reaches the canvas, whose own
                // handler clears the selection this one just made.
                event.stopPropagation();
                onSelect();
            }}
        >
            {/* Sits above the block so a click selects it here rather than
                activating whatever the component itself renders. */}
            <div className="absolute inset-0 z-10 cursor-pointer" />

            <div
                className={cn(
                    'absolute -top-3 left-2 z-20 flex items-center gap-1 rounded-md border bg-background px-1 py-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100',
                    selected && 'opacity-100',
                )}
            >
                <button
                    type="button"
                    aria-label="Reorder block"
                    className="cursor-grab p-0.5 text-muted-foreground hover:text-foreground"
                    {...attributes}
                    {...listeners}
                    onClick={(event) => event.stopPropagation()}
                >
                    <GripVertical className="size-3.5" />
                </button>

                <span className="px-1 text-[11px] font-medium">{label}</span>

                <button
                    type="button"
                    aria-label="Remove block"
                    className="p-0.5 text-destructive hover:bg-destructive/10"
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove();
                    }}
                >
                    <Trash2 className="size-3.5" />
                </button>
            </div>

            <div className="pointer-events-none">{children}</div>
        </div>
    );
}

/** A component in the palette, draggable onto the canvas. */
function PaletteItem({ component }: { component: ComponentRow }) {
    const { attributes, listeners, setNodeRef, isDragging } = useSortable({
        id: `${PALETTE_PREFIX}${component.slug}`,
    });

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className={cn(
                'cursor-grab rounded-lg border bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:border-primary/40',
                isDragging && 'opacity-50',
            )}
        >
            <div className="font-medium">{component.name}</div>
            <div className="font-mono text-[11px] text-muted-foreground">
                {component.slug}
            </div>
        </div>
    );
}

export default function PageBuilder({ system, page, palette }: Props) {
    const [blocks, setBlocks] = useState<PlacedBlock[]>(page.blocks);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const { setNodeRef: setCanvasRef, isOver } = useDroppable({
        id: CANVAS_ID,
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const bySlug = useMemo(
        () => new Map(palette.map((component) => [component.slug, component])),
        [palette],
    );

    const blockIds = useMemo(
        () => blocks.map((block) => block.block_id),
        [blocks],
    );

    const selected = blocks.find((block) => block.block_id === selectedId);
    const selectedDefinition = selected
        ? bySlug.get(selected.component)
        : undefined;

    const dirty =
        JSON.stringify(blocks) !== JSON.stringify(page.blocks) ||
        blocks.length !== page.blocks.length;

    const addBlock = (slug: string, atIndex?: number) => {
        const component = bySlug.get(slug);

        if (!component) {
            return;
        }

        const block: PlacedBlock = {
            block_id: newBlockId(),
            component: slug,
            props: defaultsFor(component.properties),
        };

        setBlocks((current) => {
            const next = [...current];
            next.splice(atIndex ?? next.length, 0, block);

            return next;
        });
        setSelectedId(block.block_id);
    };

    const onDragStart = (event: DragStartEvent) =>
        setDragging(String(event.active.id));

    const onDragEnd = (event: DragEndEvent) => {
        setDragging(null);

        const { active, over } = event;

        if (!over) {
            return;
        }

        const activeId = String(active.id);
        const overId = String(over.id);

        // Dropped in from the palette: insert where it landed, or append when it
        // was dropped on the empty canvas rather than onto an existing block.
        if (activeId.startsWith(PALETTE_PREFIX)) {
            const slug = activeId.slice(PALETTE_PREFIX.length);
            const target = blocks.findIndex(
                (block) => block.block_id === overId,
            );

            addBlock(slug, target === -1 ? undefined : target);

            return;
        }

        if (activeId === overId) {
            return;
        }

        const from = blocks.findIndex((block) => block.block_id === activeId);
        const to = blocks.findIndex((block) => block.block_id === overId);

        if (from !== -1 && to !== -1) {
            setBlocks((current) => arrayMove(current, from, to));
        }
    };

    const setProp = (key: string, value: string | boolean) => {
        if (!selected) {
            return;
        }

        setBlocks((current) =>
            current.map((block) =>
                block.block_id === selected.block_id
                    ? { ...block, props: { ...block.props, [key]: value } }
                    : block,
            ),
        );
    };

    const removeBlock = (blockId: string) => {
        setBlocks((current) =>
            current.filter((block) => block.block_id !== blockId),
        );

        if (selectedId === blockId) {
            setSelectedId(null);
        }
    };

    const save = () => {
        let toastId: string | number | undefined;

        router.put(
            updateBlocks.url([system.id, page.id]),
            { blocks },
            {
                preserveScroll: true,
                preserveState: true,
                invalidateCacheTags: ['systems'],
                onStart: () => {
                    setSaving(true);
                    toastId = toast.loading('Saving page…');
                },
                onError: (errors) => {
                    toast.error(
                        errors.blocks ??
                            errors.shape ??
                            'The page could not be saved.',
                        { duration: 12000 },
                    );
                },
                onFinish: () => {
                    setSaving(false);
                    toast.dismiss(toastId);
                },
            },
        );
    };

    const draggingComponent = dragging?.startsWith(PALETTE_PREFIX)
        ? bySlug.get(dragging.slice(PALETTE_PREFIX.length))
        : undefined;

    return (
        <>
            <Head title={`${page.name} — ${system.name}`} />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            >
                <div className="flex h-screen flex-col bg-muted/30">
                    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <Button variant="ghost" size="icon" asChild>
                                <Link
                                    href={show(system.id)}
                                    aria-label="Back to system"
                                >
                                    <ArrowLeft className="size-4" />
                                </Link>
                            </Button>

                            <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                    {page.name}
                                </div>
                                <div className="truncate font-mono text-[11px] text-muted-foreground">
                                    /{system.prefix}
                                    {page.path === '/' ? '' : page.path}
                                </div>
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={save}
                            disabled={saving || !dirty}
                        >
                            <Save className="size-4" />
                            {dirty ? 'Save' : 'Saved'}
                        </Button>
                    </header>

                    <div className="flex min-h-0 flex-1">
                        <aside className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto border-r bg-background p-3">
                            <p className="text-xs font-medium text-muted-foreground">
                                Components
                            </p>

                            {palette.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    No components yet. Upload one under
                                    Components to start building.
                                </p>
                            ) : (
                                <SortableContext
                                    items={palette.map(
                                        (component) =>
                                            `${PALETTE_PREFIX}${component.slug}`,
                                    )}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {palette.map((component) => (
                                        <PaletteItem
                                            key={component.slug}
                                            component={component}
                                        />
                                    ))}
                                </SortableContext>
                            )}
                        </aside>

                        <main className="min-w-0 flex-1 overflow-y-auto p-6">
                            <div
                                ref={setCanvasRef}
                                className={cn(
                                    'mx-auto min-h-full max-w-4xl rounded-xl border bg-background p-6',
                                    isOver && 'border-primary',
                                )}
                                onClick={() => setSelectedId(null)}
                            >
                                {blocks.length === 0 ? (
                                    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                                        Drag a component here to start the page.
                                    </div>
                                ) : (
                                    <SortableContext
                                        items={blockIds}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <BlockRenderer
                                            blocks={blocks}
                                            className="space-y-4"
                                            renderWrapper={(
                                                block,
                                                rendered,
                                            ) => (
                                                <SortableBlock
                                                    block={block}
                                                    label={
                                                        bySlug.get(
                                                            block.component,
                                                        )?.name ??
                                                        block.component
                                                    }
                                                    selected={
                                                        selectedId ===
                                                        block.block_id
                                                    }
                                                    onSelect={() =>
                                                        setSelectedId(
                                                            block.block_id,
                                                        )
                                                    }
                                                    onRemove={() =>
                                                        removeBlock(
                                                            block.block_id,
                                                        )
                                                    }
                                                >
                                                    {rendered}
                                                </SortableBlock>
                                            )}
                                        />
                                    </SortableContext>
                                )}
                            </div>
                        </main>

                        <aside className="w-72 shrink-0 overflow-y-auto border-l bg-background p-4">
                            {!selected || !selectedDefinition ? (
                                <p className="text-xs text-muted-foreground">
                                    Select a block to edit its properties.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium">
                                            {selectedDefinition.name}
                                        </p>
                                        <p className="font-mono text-[11px] text-muted-foreground">
                                            {selected.component}
                                        </p>
                                    </div>

                                    {Object.entries(
                                        selectedDefinition.properties,
                                    ).length === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            This component has no editable
                                            properties.
                                        </p>
                                    )}

                                    {Object.entries(
                                        selectedDefinition.properties,
                                    ).map(([key, property]) => {
                                        const current = propValue(
                                            property,
                                            selected.props[key],
                                        );
                                        const value =
                                            typeof current === 'string'
                                                ? current
                                                : String(current);
                                        const checked = current === true;

                                        return (
                                            <div
                                                key={key}
                                                className="space-y-2"
                                            >
                                                <Label htmlFor={`prop-${key}`}>
                                                    {property.label}
                                                </Label>

                                                {property.type === 'text' && (
                                                    <Textarea
                                                        id={`prop-${key}`}
                                                        value={value}
                                                        onChange={(event) =>
                                                            setProp(
                                                                key,
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                )}

                                                {property.type === 'string' && (
                                                    <Input
                                                        id={`prop-${key}`}
                                                        value={value}
                                                        onChange={(event) =>
                                                            setProp(
                                                                key,
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                )}

                                                {property.type === 'select' && (
                                                    <Select
                                                        value={value}
                                                        onValueChange={(next) =>
                                                            setProp(key, next)
                                                        }
                                                    >
                                                        <SelectTrigger
                                                            id={`prop-${key}`}
                                                        >
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(
                                                                property.options ??
                                                                []
                                                            ).map((option) => (
                                                                <SelectItem
                                                                    key={option}
                                                                    value={
                                                                        option
                                                                    }
                                                                >
                                                                    {option}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}

                                                {property.type ===
                                                    'checkbox' && (
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`prop-${key}`}
                                                            checked={checked}
                                                            onCheckedChange={(
                                                                next,
                                                            ) =>
                                                                setProp(
                                                                    key,
                                                                    next ===
                                                                        true,
                                                                )
                                                            }
                                                        />
                                                        <span className="text-xs text-muted-foreground">
                                                            {checked
                                                                ? 'On'
                                                                : 'Off'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full"
                                                onClick={() =>
                                                    removeBlock(
                                                        selected.block_id,
                                                    )
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                                Remove block
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Take this block off the page
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            )}
                        </aside>
                    </div>
                </div>

                <DragOverlay>
                    {draggingComponent && (
                        <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
                            {draggingComponent.name}
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </>
    );
}
