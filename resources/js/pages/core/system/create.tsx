import { Head, Link, useForm } from '@inertiajs/react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import ColorPicker from '@/components/core/color-picker';
import Heading from '@/components/core/heading';
import IconPicker from '@/components/core/icon-picker';
import InputError from '@/components/core/input-error';
import { Button } from '@/components/ui/button';
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
import { resolveLucideIcon } from '@/lib/lucide-icons';
import { index as systemsIndex, store } from '@/routes/systems';
import { create as createTable } from '@/routes/tables';

type Props = {
    tagColors: string[];
    indexPage: NamedRow;
};

type NamedRow = { name: string; slug: string };

/** A row shown for context that the form neither edits nor submits. */
type PinnedRow = NamedRow & { reason: string };

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/** URL segments read better with dashes than the slug's underscores. */
function prefixify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

type RowListProps = {
    idPrefix: string;
    title: string;
    description: string;
    addLabel: string;
    namePlaceholder: string;
    rows: NamedRow[];
    /** Locked rows listed above the editable ones. */
    pinned?: PinnedRow[];
    onChange: (rows: NamedRow[]) => void;
    errorFor: (index: number, field: 'name' | 'slug') => string | undefined;
    onEdited: (index: number) => void;
};

/**
 * A repeatable name + derived slug list for the system's pages.
 *
 * The slug always follows the name and is never typed, the same rule the
 * system's own name and slug follow.
 */
function RowList({
    idPrefix,
    title,
    description,
    addLabel,
    namePlaceholder,
    rows,
    pinned = [],
    onChange,
    errorFor,
    onEdited,
}: RowListProps) {
    const setRow = (index: number, next: Partial<NamedRow>) => {
        onChange(
            rows.map((row, i) => (i === index ? { ...row, ...next } : row)),
        );
        onEdited(index);
    };

    return (
        <div className="space-y-6">
            <Heading variant="small" title={title} description={description} />

            <div className="space-y-3">
                {pinned.map((row) => (
                    <div key={row.slug} className="flex items-start gap-2">
                        <div className="grid min-w-0 flex-1 gap-2">
                            <Input
                                value={row.name}
                                aria-label="Name"
                                readOnly
                                disabled
                            />
                        </div>

                        <div className="grid min-w-0 flex-1 gap-2">
                            <Input
                                value={row.slug}
                                aria-label="Slug"
                                readOnly
                                disabled
                            />
                        </div>

                        <Tooltip>
                            {/* A disabled button never receives hover, so the
                                span keeps the tooltip reachable. */}
                            <TooltipTrigger asChild>
                                <span className="inline-flex">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled
                                        aria-label={row.reason}
                                    >
                                        <Lock className="size-4" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>{row.reason}</TooltipContent>
                        </Tooltip>
                    </div>
                ))}

                {rows.map((row, index) => (
                    <div key={index} className="flex items-start gap-2">
                        <div className="grid min-w-0 flex-1 gap-2">
                            <Label
                                htmlFor={`${idPrefix}-name-${index}`}
                                className="sr-only"
                            >
                                Name
                            </Label>
                            <Input
                                id={`${idPrefix}-name-${index}`}
                                value={row.name}
                                placeholder={namePlaceholder}
                                onChange={(event) => {
                                    const name = event.target.value;

                                    setRow(index, {
                                        name,
                                        slug: slugify(name),
                                    });
                                }}
                            />
                            <InputError message={errorFor(index, 'name')} />
                        </div>

                        <div className="grid min-w-0 flex-1 gap-2">
                            <Label
                                htmlFor={`${idPrefix}-slug-${index}`}
                                className="sr-only"
                            >
                                Slug
                            </Label>
                            <Input
                                id={`${idPrefix}-slug-${index}`}
                                value={row.slug}
                                placeholder="Derived from the name"
                                readOnly
                                disabled
                            />
                            <InputError message={errorFor(index, 'slug')} />
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Remove"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() =>
                                        onChange(
                                            rows.filter((_, i) => i !== index),
                                        )
                                    }
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove</TooltipContent>
                        </Tooltip>
                    </div>
                ))}

                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onChange([...rows, { name: '', slug: '' }])}
                >
                    <Plus className="size-4" />
                    {addLabel}
                </Button>
            </div>
        </div>
    );
}

export default function SystemCreate({ tagColors, indexPage }: Props) {
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [iconTooltipOpen, setIconTooltipOpen] = useState(false);

    const form = useForm({
        name: '',
        slug: '',
        prefix: '',
        icon: 'Box',
        color: 'violet',
        description: '',
        pages: [] as NamedRow[],
    });

    const selectedIcon = resolveLucideIcon(form.data.icon);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        form.post(store.url(), {
            invalidateCacheTags: ['systems', 'tables'],
        });
    };

    const errors = form.errors as Record<string, string | undefined>;

    const rowError =
        (set: 'pages') => (index: number, field: 'name' | 'slug') =>
            errors[`${set}.${index}.${field}`];

    const clearRow = (set: 'pages') => (index: number) =>
        clearFieldErrors(
            form,
            `${set}.${index}.name` as never,
            `${set}.${index}.slug` as never,
        );

    return (
        <>
            <Head title="New system" />

            <div className="max-w-2xl px-4 py-6">
                <form noValidate className="space-y-10" onSubmit={submit}>
                    <div className="space-y-6">
                        <Heading
                            variant="small"
                            title="New system"
                            description="Identity and settings for the application you are building"
                        />

                        {/* The icon box stands beside both fields rather than
                            only the name, so it stretches to their height. */}
                        <div className="flex items-stretch gap-3">
                            <div className="order-2 grid min-w-0 flex-1 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="system-name">Name</Label>
                                    <Input
                                        id="system-name"
                                        value={form.data.name}
                                        placeholder="Enter System Name"
                                        onChange={(event) => {
                                            const name = event.target.value;

                                            form.setData('name', name);
                                            form.setData('slug', slugify(name));

                                            clearFieldErrors(
                                                form,
                                                'name',
                                                'slug',
                                                'prefix',
                                            );
                                        }}
                                    />
                                    <InputError message={form.errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="system-slug">Slug</Label>
                                    <Input
                                        id="system-slug"
                                        value={form.data.slug}
                                        placeholder="System Slug"
                                        readOnly
                                        disabled
                                    />
                                    <InputError message={form.errors.slug} />
                                </div>
                            </div>

                            <Tooltip
                                open={iconTooltipOpen}
                                onOpenChange={setIconTooltipOpen}
                            >
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        className="order-1 flex size-40 shrink-0 items-center justify-center self-center rounded-xl border bg-muted/40 text-foreground transition-colors hover:border-primary/40 hover:bg-muted/60"
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
                                                className="size-20"
                                            />
                                        )}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Change icon</TooltipContent>
                            </Tooltip>
                        </div>

                        <IconPicker
                            open={showIconPicker}
                            selected={form.data.icon}
                            onSelect={(icon) => {
                                form.setData('icon', icon);
                                clearFieldErrors(form, 'icon');
                                setShowIconPicker(false);
                            }}
                        />

                        <div className="grid gap-2">
                            <Label htmlFor="system-prefix">URL prefix</Label>
                            <Input
                                id="system-prefix"
                                value={form.data.prefix}
                                placeholder="Enter URL Prefix"
                                onChange={(event) => {
                                    form.setData(
                                        'prefix',
                                        prefixify(event.target.value),
                                    );
                                    clearFieldErrors(form, 'prefix');
                                }}
                            />
                            <InputError message={form.errors.prefix} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Tag color</Label>
                            <ColorPicker
                                colors={tagColors}
                                selected={form.data.color}
                                onSelect={(color) => {
                                    form.setData('color', color);
                                    clearFieldErrors(form, 'color');
                                }}
                            />
                            <InputError message={form.errors.color} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="system-description">
                                Description
                            </Label>
                            <Textarea
                                id="system-description"
                                value={form.data.description}
                                placeholder="What is this system for?"
                                onChange={(event) => {
                                    form.setData(
                                        'description',
                                        event.target.value,
                                    );
                                    clearFieldErrors(form, 'description');
                                }}
                            />
                            <InputError message={form.errors.description} />
                        </div>

                        <InputError message={form.errors.icon} />
                    </div>

                    <RowList
                        idPrefix="page"
                        title="Pages"
                        description="A starting page is always created — add any others the system should serve"
                        addLabel="Create page"
                        namePlaceholder="Enter Page Name"
                        pinned={[
                            {
                                ...indexPage,
                                reason: 'Starting page, created with the system',
                            },
                        ]}
                        rows={form.data.pages}
                        onChange={(rows) => form.setData('pages', rows)}
                        errorFor={rowError('pages')}
                        onEdited={clearRow('pages')}
                    />

                    <div className="space-y-6">
                        <Heading
                            variant="small"
                            title="Tables"
                            description="Built in the Tables module under the system that owns them"
                        />

                        {/* Tables are built in the Tables module, so this
                            leaves the form rather than opening a picker. The
                            flag lets that page's Cancel come back here. */}
                        <Button variant="outline" asChild>
                            <Link
                                href={createTable({
                                    query: { from: 'system' },
                                })}
                            >
                                <Plus className="size-4" />
                                Create table
                            </Link>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button type="submit" disabled={form.processing}>
                            Create system
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={systemsIndex()}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

SystemCreate.layout = {
    breadcrumbs: [
        { title: 'Systems', href: systemsIndex() },
        { title: 'New system', href: '/admin/systems/create' },
    ],
};
