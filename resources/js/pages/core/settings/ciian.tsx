import { Head, router, useForm } from '@inertiajs/react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Heading from '@/components/core/heading';
import InputError from '@/components/core/input-error';
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
import { home } from '@/routes';
import { edit } from '@/routes/ciian';
import { update } from '@/routes/systems/ciian';
import type { CiianConfigData } from '@/types';

/**
 * Viewport the preview iframe renders at before being scaled down, so the index
 * page lays out as a desktop visitor sees it rather than at the panel's width.
 */
const PREVIEW_WIDTH = 1280;

const PREVIEW_HEIGHT = 800;

type Props = {
    ciianConfig: CiianConfigData;
    tagColors: string[];
};

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

export default function CiianSettings({ ciianConfig, tagColors }: Props) {
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [iconTooltipOpen, setIconTooltipOpen] = useState(false);

    const previewBox = useRef<HTMLDivElement>(null);
    const [previewScale, setPreviewScale] = useState(0);
    // Bumped to remount the iframe, since reaching into its document to reload it
    // is not something a same-origin assumption should be built on.
    const [previewKey, setPreviewKey] = useState(0);

    // The page is rendered at a desktop width and scaled to fit the panel, so the
    // scale has to follow the panel rather than being a fixed guess.
    useEffect(() => {
        const box = previewBox.current;

        if (!box) {
            return;
        }

        const observer = new ResizeObserver(([entry]) => {
            setPreviewScale(entry.contentRect.width / PREVIEW_WIDTH);
        });

        observer.observe(box);

        return () => observer.disconnect();
    }, []);

    const reloadPreview = useCallback(
        () => setPreviewKey((current) => current + 1),
        [],
    );

    const form = useForm({
        name: ciianConfig.name,
        sys_slug: ciianConfig.sys_slug,
        icon: ciianConfig.icon,
        color: ciianConfig.color,
    });

    const selectedIcon = resolveLucideIcon(form.data.icon);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        form.patch(update.url(), {
            preserveScroll: true,
            invalidateCacheTags: ['systems', 'tables'],
            onSuccess: () => {
                // The badge icon and colour appear on untagged pages too, so drop
                // every prefetched page rather than only the tagged ones.
                router.flushAll();
                setShowIconPicker(false);
            },
        });
    };

    return (
        <>
            <Head title="Ciian settings" />

            <h1 className="sr-only">Ciian settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Ciian"
                    description="Platform identity used for the Ciian tag across Systems and Tables"
                />

                <form noValidate className="space-y-6" onSubmit={submit}>
                    <div className="flex items-end gap-3">
                        <div className="order-1 min-w-0 flex-1 space-y-2">
                            <Label htmlFor="ciian-name">Name</Label>
                            <Input
                                id="ciian-name"
                                value={form.data.name}
                                disabled
                                placeholder="Enter Name"
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

                    {showIconPicker && (
                        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
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

                    <div className="grid gap-2">
                        <Label htmlFor="ciian-sys-slug">System slug</Label>
                        <Input
                            id="ciian-sys-slug"
                            value={form.data.sys_slug}
                            disabled
                            placeholder="Enter System Slug"
                        />
                        <p className="text-xs text-muted-foreground">
                            Identifies the platform's own tables. Fixed —
                            created systems cannot claim it.
                        </p>
                        <InputError message={form.errors.sys_slug} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Tag color</Label>
                        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                            {tagColors.map((color) => (
                                <Tooltip key={color}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            aria-label={color}
                                            className={cn(
                                                'flex h-10 items-center justify-center rounded-md border',
                                                form.data.color === color &&
                                                    'border-primary ring-2 ring-primary/30',
                                            )}
                                            onClick={() => {
                                                form.setData('color', color);
                                                clearFieldErrors(form, 'color');
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
                        <InputError message={form.errors.color} />
                    </div>

                    <InputError message={form.errors.icon} />

                    <Button type="submit" disabled={form.processing}>
                        Save
                    </Button>
                </form>
            </div>

            <div className="space-y-6">
                <div className="flex items-start justify-between gap-3">
                    <Heading
                        variant="small"
                        title="Index page"
                        description="The platform's entry point, served at /"
                    />

                    <div className="flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-sm">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Reload preview"
                                    onClick={reloadPreview}
                                >
                                    <RefreshCw className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reload preview</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Open index page"
                                    asChild
                                >
                                    <a
                                        href={home().url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="size-4" />
                                    </a>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open index page</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                <div
                    ref={previewBox}
                    className="w-full overflow-hidden rounded-xl border bg-muted/30"
                    style={{ height: PREVIEW_HEIGHT * previewScale }}
                >
                    {previewScale > 0 && (
                        <iframe
                            key={previewKey}
                            src={home().url}
                            title="Index page preview"
                            loading="lazy"
                            // Rendered at a desktop viewport, then scaled down, so
                            // the preview shows the layout a visitor gets rather
                            // than the panel-width mobile one.
                            className="origin-top-left border-0"
                            style={{
                                width: PREVIEW_WIDTH,
                                height: PREVIEW_HEIGHT,
                                transform: `scale(${previewScale})`,
                            }}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

CiianSettings.layout = {
    breadcrumbs: [
        {
            title: 'Ciian settings',
            href: edit(),
        },
    ],
};
