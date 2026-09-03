import { Head, Link, resetLayoutProps, setLayoutProps } from '@inertiajs/react';
import { Loader2, RotateCcw } from 'lucide-react';
import type { ComponentType } from 'react';
import { createElement, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { resolveBlock } from '@/lib/block-registry';
import { index as componentsIndex, show } from '@/routes/components';
import type { ComponentDetail, ComponentProperty } from '@/types/component';

type Props = {
    component: ComponentDetail;
};

/** A prop's live value on the canvas. Checkboxes are real booleans here. */
type PropValue = string | boolean;

/**
 * Defaults are stored as strings, so a checkbox has to be coerced back before it
 * reaches a component that declared the prop as a boolean.
 */
function defaultsFor(
    properties: Record<string, ComponentProperty>,
): Record<string, PropValue> {
    return Object.fromEntries(
        Object.entries(properties).map(([key, property]) => [
            key,
            property.type === 'checkbox'
                ? property.default === 'true'
                : property.default,
        ]),
    );
}

export default function ComponentView({ component }: Props) {
    const [preview, setPreview] = useState<ComponentType<never> | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);

    // Canvas-only state: changing a value here previews the component with it and
    // never touches the stored definition.
    const [values, setValues] = useState<Record<string, PropValue>>(() =>
        defaultsFor(component.properties),
    );

    const loadPreview = resolveBlock(component.slug);
    const missingFromBuild = loadPreview === undefined;

    useEffect(() => {
        if (!loadPreview) {
            return;
        }

        let active = true;

        loadPreview()
            .then((module) => {
                if (active) {
                    setPreview(() => module.default);
                }
            })
            .catch((error: unknown) => {
                if (active) {
                    setPreviewError(
                        error instanceof Error
                            ? error.message
                            : 'The component could not be loaded.',
                    );
                }
            });

        return () => {
            active = false;
        };
    }, [loadPreview]);

    useEffect(() => {
        setLayoutProps({
            headerActions: (
                <Button variant="outline" asChild>
                    <Link href={componentsIndex()}>Back to components</Link>
                </Button>
            ),
        });

        return () => {
            resetLayoutProps();
        };
    }, []);

    const setValue = (key: string, value: PropValue) => {
        setValues((current) => ({ ...current, [key]: value }));
    };

    const information: { label: string; value: string }[] = [
        { label: 'Name', value: component.name },
        { label: 'Slug', value: component.slug },
        { label: 'Category', value: component.category },
        { label: 'Creator', value: component.creator ?? '—' },
        { label: 'Description', value: component.description ?? '—' },
        { label: 'Type', value: component.type },
        {
            label: 'Deletable',
            value: component.can_delete ? 'Yes' : 'No — protected',
        },
    ];

    const properties = Object.entries(component.properties);

    return (
        <>
            <Head title={component.name} />

            {/* At xl the canvas fills the whole content area and the two panels float
                over it, Canva-style. Below xl they stack as ordinary blocks. */}
            <div className="flex flex-col px-4 py-6 xl:h-full xl:overflow-hidden xl:p-0">
                <div className="relative flex min-h-0 flex-1 flex-col gap-4 xl:block">
                    <aside className="flex min-h-0 flex-col rounded-xl border bg-card/95 shadow-sm backdrop-blur xl:absolute xl:top-4 xl:left-4 xl:z-10 xl:max-h-[calc(100%-2rem)] xl:w-72">
                        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                            <h2 className="text-sm font-semibold">
                                Information
                            </h2>
                            <Badge
                                variant={
                                    component.status === 'published'
                                        ? 'default'
                                        : 'secondary'
                                }
                            >
                                {component.status === 'published'
                                    ? 'Published'
                                    : 'Unpublished'}
                            </Badge>
                        </div>

                        <dl className="min-h-0 flex-1 divide-y overflow-y-auto">
                            {information.map((row) => (
                                <div key={row.label} className="px-4 py-3">
                                    <dt className="text-xs text-muted-foreground">
                                        {row.label}
                                    </dt>
                                    <dd className="mt-0.5 text-sm break-words">
                                        {row.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </aside>

                    {/* Padded past the floating panels at xl so the component centres in
                        the visible middle, not behind a panel. */}
                    <section
                        className="relative flex min-h-[24rem] flex-col items-center justify-center overflow-auto rounded-xl border bg-muted/30 p-8 shadow-sm xl:absolute xl:inset-0 xl:rounded-none xl:border-0 xl:pr-[22rem] xl:pl-[20rem] xl:shadow-none"
                        style={{
                            backgroundImage:
                                'radial-gradient(var(--border) 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                        }}
                    >
                        {preview ? (
                            // The real component, driven by whatever the inspector
                            // currently holds.
                            createElement(preview, values as never)
                        ) : missingFromBuild ? (
                            <p className="max-w-md text-center text-sm text-muted-foreground">
                                This component&apos;s file is not in the current
                                build. Restart the dev server or rebuild to
                                preview it.
                            </p>
                        ) : previewError ? (
                            <p className="max-w-md text-center text-sm text-destructive">
                                {previewError}
                            </p>
                        ) : (
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        )}
                    </section>

                    <aside className="flex min-h-0 flex-col rounded-xl border bg-card/95 shadow-sm backdrop-blur xl:absolute xl:top-4 xl:right-4 xl:z-10 xl:max-h-[calc(100%-2rem)] xl:w-80">
                        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                            <h2 className="text-sm font-semibold">
                                Properties
                            </h2>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    setValues(defaultsFor(component.properties))
                                }
                            >
                                <RotateCcw className="size-4" />
                                Reset
                            </Button>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                            {properties.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    This component exposes no editable
                                    properties.
                                </p>
                            )}

                            {properties.map(([key, property]) => {
                                const id = `prop-${key}`;
                                const value = values[key];

                                return (
                                    <div key={key} className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label htmlFor={id}>
                                                {property.label}
                                            </Label>
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {key}
                                            </span>
                                        </div>

                                        {property.type === 'select' ? (
                                            <Select
                                                value={String(value)}
                                                onValueChange={(next) =>
                                                    setValue(key, next)
                                                }
                                            >
                                                <SelectTrigger id={id}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(
                                                        property.options ?? []
                                                    ).map((option) => (
                                                        <SelectItem
                                                            key={option}
                                                            value={option}
                                                        >
                                                            {option}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : property.type === 'checkbox' ? (
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id={id}
                                                    checked={value === true}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        setValue(
                                                            key,
                                                            checked === true,
                                                        )
                                                    }
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    {value === true
                                                        ? 'On'
                                                        : 'Off'}
                                                </span>
                                            </div>
                                        ) : property.type === 'text' ? (
                                            <Textarea
                                                id={id}
                                                rows={3}
                                                value={String(value)}
                                                onChange={(event) =>
                                                    setValue(
                                                        key,
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        ) : (
                                            <Input
                                                id={id}
                                                value={String(value)}
                                                onChange={(event) =>
                                                    setValue(
                                                        key,
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        )}
                                    </div>
                                );
                            })}

                            {properties.length > 0 && (
                                <p className="mt-auto border-t pt-4 text-xs text-muted-foreground">
                                    Preview of the component — you may
                                    experiment with the properties.
                                </p>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

ComponentView.layout = ({ component }: Props) => ({
    breadcrumbs: [
        { title: 'Components', href: componentsIndex() },
        { title: component.name, href: show(component.id) },
    ],
});
