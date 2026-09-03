import {
    Link,
    resetLayoutProps,
    router,
    setLayoutProps,
} from '@inertiajs/react';
import { load as parseYaml } from 'js-yaml';
import { Check, Eye, FileCode, Loader2, Upload, X } from 'lucide-react';
import type { ComponentType } from 'react';
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import JsonShapeEditor from '@/components/core/json-shape-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { index as componentsIndex, store } from '@/routes/components';
import type { ComponentRow } from '@/types/component';

type Props = {
    /** Allowed property control types, keyed by id. Mirrors the server's list. */
    propertyTypes: Record<string, string>;
    /** Set after a successful upload, so its generated file can be previewed. */
    uploaded: ComponentRow | null;
};

/**
 * Every generated custom component, resolved lazily. Vite expands this at build
 * time, so a file uploaded after the last build only appears once the dev server
 * picks it up or the app is rebuilt.
 */
const customComponents = import.meta.glob<{ default: ComponentType<never> }>(
    '../custom/*.tsx',
);

type CheckResult = {
    label: string;
    passed: boolean;
    detail?: string;
};

type ParsedFile = {
    /** The File itself, since a dropped file never passes through the input. */
    source: File;
    fileName: string;
    raw: string;
    definition: Record<string, unknown> | null;
    parseError: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function nonEmptyString(value: unknown): boolean {
    return typeof value === 'string' && value.trim() !== '';
}

/** Prop names the TSX destructures, so they can be matched against `properties`. */
function destructuredProps(tsx: string): string[] {
    const start = tsx.indexOf('export default');

    if (start === -1) {
        return [];
    }

    const body = tsx.slice(start);
    const open = body.indexOf('{');
    const close = body.indexOf('}');

    if (open === -1 || close === -1 || close < open) {
        return [];
    }

    return body
        .slice(open + 1, close)
        .split(',')
        .map((part) => part.split('=')[0].trim())
        .filter((part) => /^[A-Za-z_$][\w$]*$/.test(part));
}

/**
 * Client-side mirror of the checks the server will run. It exists to give fast
 * feedback on an obviously malformed file, never to replace server validation —
 * an uploaded file is entirely user-controlled.
 */
function validate(
    definition: Record<string, unknown> | null,
    propertyTypes: Record<string, string>,
): CheckResult[] {
    if (definition === null) {
        return [];
    }

    const information = asRecord(definition.information);
    const properties = asRecord(definition.properties);
    const tsx = definition.tsx;
    const allowedTypes = Object.keys(propertyTypes);

    const propertyProblems: string[] = [];

    if (properties) {
        for (const [key, value] of Object.entries(properties)) {
            const property = asRecord(value);

            if (!property) {
                propertyProblems.push(`${key} is not a mapping`);
                continue;
            }

            if (!allowedTypes.includes(String(property.type))) {
                propertyProblems.push(`${key}.type is not a known control`);
            }

            if (!nonEmptyString(property.label)) {
                propertyProblems.push(`${key}.label is missing`);
            }

            if (property.default === undefined) {
                propertyProblems.push(`${key}.default is missing`);
            } else if (typeof property.default !== 'string') {
                // YAML reads bare true/false/null as scalars; defaults must stay strings.
                propertyProblems.push(
                    `${key}.default must be quoted, e.g. '${String(property.default)}'`,
                );
            }

            if (
                property.type === 'select' &&
                !Array.isArray(property.options)
            ) {
                propertyProblems.push(`${key}.options is required for select`);
            }
        }
    }

    const source = typeof tsx === 'string' ? tsx : '';
    const tsxProps = destructuredProps(source);
    const propertyKeys = properties ? Object.keys(properties) : [];
    const missingInTsx = propertyKeys.filter((key) => !tsxProps.includes(key));
    const missingInProperties = tsxProps.filter(
        (prop) => !propertyKeys.includes(prop),
    );

    return [
        {
            label: 'creator is present',
            passed: nonEmptyString(definition.creator),
        },
        {
            label: 'information.name is present',
            passed: nonEmptyString(information?.name),
        },
        {
            label: 'information.slug is present and snake_case',
            passed:
                nonEmptyString(information?.slug) &&
                /^[a-z][a-z0-9_]*$/.test(String(information?.slug)),
            detail: 'Lowercase letters, digits and underscores only.',
        },
        {
            label: 'information.category is present',
            passed: nonEmptyString(information?.category),
        },
        {
            label: 'information.can_delete is a boolean',
            passed: typeof information?.can_delete === 'boolean',
        },
        {
            label: 'properties is a mapping',
            passed: properties !== null,
        },
        {
            label: 'every property is well formed',
            passed: properties !== null && propertyProblems.length === 0,
            detail: propertyProblems.slice(0, 3).join(' · ') || undefined,
        },
        {
            label: 'tsx exports a default component',
            passed:
                nonEmptyString(tsx) && String(tsx).includes('export default'),
        },
        {
            label: 'property keys match the TSX props',
            passed:
                tsxProps.length > 0 &&
                missingInTsx.length === 0 &&
                missingInProperties.length === 0,
            detail:
                [
                    missingInTsx.length
                        ? `not in TSX: ${missingInTsx.join(', ')}`
                        : '',
                    missingInProperties.length
                        ? `not in properties: ${missingInProperties.join(', ')}`
                        : '',
                ]
                    .filter(Boolean)
                    .join(' · ') || undefined,
        },
    ];
}

export default function ComponentUpload({ propertyTypes, uploaded }: Props) {
    const [preview, setPreview] = useState<ComponentType<never> | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [file, setFile] = useState<ParsedFile | null>(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const checks = useMemo(
        () => validate(file?.definition ?? null, propertyTypes),
        [file, propertyTypes],
    );

    const isValid =
        file?.definition != null &&
        checks.length > 0 &&
        checks.every((check) => check.passed);

    const readFile = (selected: File) => {
        selected
            .text()
            .then((raw) => {
                try {
                    const definition = asRecord(parseYaml(raw));

                    setFile({
                        source: selected,
                        fileName: selected.name,
                        raw,
                        definition,
                        parseError: definition
                            ? null
                            : 'The file must contain a YAML mapping.',
                    });
                } catch (error) {
                    // js-yaml reports the offending line, which is the most useful
                    // thing to show for an indentation slip in the tsx block.
                    setFile({
                        source: selected,
                        fileName: selected.name,
                        raw,
                        definition: null,
                        parseError:
                            error instanceof Error
                                ? error.message
                                : 'The file is not valid YAML.',
                    });
                }
            })
            .catch(() => {
                toast.error(`Could not read ${selected.name}.`);
            });
    };

    const clearFile = () => {
        setFile(null);
        setServerError(null);

        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const submit = () => {
        if (!file) {
            toast.error('Choose a component definition first.');

            return;
        }

        setServerError(null);

        router.post(
            store.url(),
            { file: file.source },
            {
                forceFormData: true,
                onStart: () => setUploading(true),
                onFinish: () => setUploading(false),
                // The server re-runs every check, so it can reject a file the client
                // considered valid — a duplicate slug above all, which the browser
                // cannot know about.
                onError: (errors) =>
                    setServerError(
                        errors.file ?? 'The component could not be uploaded.',
                    ),
            },
        );
    };

    useEffect(() => {
        setLayoutProps({
            headerActions: (
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href={componentsIndex()}>Cancel</Link>
                    </Button>
                    <Button
                        type="submit"
                        form="component-upload"
                        disabled={!isValid || uploading}
                    >
                        {uploading && (
                            <Loader2 className="size-4 animate-spin" />
                        )}
                        {uploading ? 'Uploading…' : 'Upload component'}
                    </Button>
                </div>
            ),
        });

        return () => {
            resetLayoutProps();
        };
    }, [isValid, uploading]);

    const loadPreview = uploaded
        ? customComponents[`../custom/${uploaded.slug}.tsx`]
        : undefined;

    // Derived, not stored: the file is either in this build's glob or it is not.
    const missingFromBuild = uploaded !== null && loadPreview === undefined;

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

    // Defaults are stored as strings, so a checkbox needs coercing back to a boolean
    // before it reaches the component that declared the prop as one.
    const previewProps = useMemo<Record<string, string | boolean>>(() => {
        if (!uploaded) {
            return {};
        }

        return Object.fromEntries(
            Object.entries(uploaded.properties).map(([key, property]) => [
                key,
                property.type === 'checkbox'
                    ? property.default === 'true'
                    : property.default,
            ]),
        );
    }, [uploaded]);

    const information = asRecord(file?.definition?.information);
    const componentName = nonEmptyString(information?.name)
        ? String(information?.name)
        : 'Untitled component';

    return (
        <form
            id="component-upload"
            noValidate
            className="flex min-h-0 flex-1 flex-col gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            {/* At xl the preview canvas fills the whole content area and the two
                panels float over it, Canva-style. Below xl they stack as blocks. */}
            <div className="relative flex min-h-0 flex-1 flex-col gap-4 xl:block">
                <div className="flex min-h-0 flex-col rounded-xl border bg-card/95 shadow-sm backdrop-blur xl:absolute xl:top-4 xl:left-4 xl:z-10 xl:max-h-[calc(100%-2rem)] xl:w-80">
                    <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                        <h2 className="text-sm font-semibold">
                            Component File
                        </h2>
                        {file?.definition != null && (
                            <Badge variant={isValid ? 'default' : 'secondary'}>
                                {isValid ? 'Valid' : 'Incomplete'}
                            </Badge>
                        )}
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Choose a component YAML file"
                            onClick={() => inputRef.current?.click()}
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                ) {
                                    event.preventDefault();
                                    inputRef.current?.click();
                                }
                            }}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(event) => {
                                event.preventDefault();
                                setDragging(false);

                                const dropped = event.dataTransfer.files[0];

                                if (dropped) {
                                    readFile(dropped);
                                }
                            }}
                            className={cn(
                                'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-muted/40',
                                dragging && 'border-primary/60 bg-muted/60',
                            )}
                        >
                            <Upload className="size-6 text-muted-foreground" />
                            <p className="text-sm font-medium">
                                Drop a component YAML file here
                            </p>
                            <p className="text-xs text-muted-foreground">
                                or click to browse. The file holds the
                                component&apos;s metadata and its TSX source.
                            </p>
                        </div>

                        <input
                            ref={inputRef}
                            type="file"
                            accept=".yaml,.yml,application/x-yaml,text/yaml"
                            className="hidden"
                            onChange={(event) => {
                                const selected = event.target.files?.[0];

                                if (selected) {
                                    readFile(selected);
                                }
                            }}
                        />

                        {file && (
                            <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    <FileCode className="size-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate text-sm">
                                        {file.fileName}
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0"
                                    aria-label="Remove file"
                                    onClick={clearFile}
                                >
                                    <X className="size-4" />
                                </Button>
                            </div>
                        )}

                        {file?.parseError && (
                            <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                {file.parseError}
                            </p>
                        )}

                        {serverError && (
                            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
                                <p className="text-sm font-medium text-destructive">
                                    Rejected by the server
                                </p>
                                <p className="text-sm text-destructive">
                                    {serverError}
                                </p>
                            </div>
                        )}

                        {checks.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">
                                    Validation
                                </h3>
                                <ul className="space-y-1.5">
                                    {checks.map((check) => (
                                        <li
                                            key={check.label}
                                            className="flex items-start gap-2 text-sm"
                                        >
                                            {check.passed ? (
                                                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                                            ) : (
                                                <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                                            )}
                                            <span
                                                className={cn(
                                                    'min-w-0',
                                                    !check.passed &&
                                                        'text-destructive',
                                                )}
                                            >
                                                {check.label}
                                                {!check.passed &&
                                                    check.detail && (
                                                        <span className="block text-xs text-muted-foreground">
                                                            {check.detail}
                                                        </span>
                                                    )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {!file && (
                            <p className="text-xs text-muted-foreground">
                                The file must contain <code>creator</code>,{' '}
                                <code>information</code>,{' '}
                                <code>properties</code> and <code>tsx</code>.
                                See the component shape contract for the full
                                format.
                            </p>
                        )}
                    </div>
                </div>

                {/* Padded past the floating panels at xl so the component centres in
                    the visible middle, not behind a panel. */}
                <section
                    className="flex min-h-[24rem] flex-col rounded-xl border bg-muted/30 shadow-sm xl:absolute xl:inset-0 xl:rounded-none xl:border-0 xl:pr-[40rem] xl:pl-[22rem] xl:shadow-none"
                    style={{
                        backgroundImage:
                            'radial-gradient(var(--border) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                    }}
                >
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto p-6 text-center">
                        {preview ? (
                            // The real component, rendered from its generated file with
                            // the definition's defaults applied.
                            <div className="flex w-full items-center justify-center">
                                {createElement(preview, previewProps as never)}
                            </div>
                        ) : missingFromBuild ? (
                            <p className="max-w-sm text-sm text-muted-foreground">
                                {uploaded?.name} was saved, but its file is not
                                in the current build yet. Restart the dev server
                                or rebuild to preview it.
                            </p>
                        ) : previewError ? (
                            <p className="max-w-sm text-sm text-destructive">
                                {previewError}
                            </p>
                        ) : uploaded ? (
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        ) : file?.definition == null ? (
                            <p className="text-sm text-muted-foreground">
                                Choose a file to preview the component.
                            </p>
                        ) : (
                            <>
                                <Eye className="size-6 text-muted-foreground" />
                                <p className="text-sm font-medium">
                                    {componentName}
                                </p>
                                <p className="max-w-sm text-sm text-muted-foreground">
                                    Preview appears here once the component is
                                    uploaded — its source has to be written and
                                    built before it can render.
                                </p>
                            </>
                        )}
                    </div>
                </section>

                {/* Pinned top and bottom rather than sized to content: a code editor is
                    a viewport into the file, and any real definition outruns the screen. */}
                <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card/95 shadow-sm backdrop-blur xl:absolute xl:top-4 xl:right-4 xl:bottom-4 xl:z-10 xl:w-[38rem]">
                    <div className="border-b px-4 py-3">
                        <h2 className="text-sm font-semibold">YAML</h2>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col">
                        {file ? (
                            <JsonShapeEditor
                                value={file.raw}
                                language="yaml"
                                readOnly
                                height="100%"
                                className="min-h-[24rem] flex-1"
                            />
                        ) : (
                            <div className="flex min-h-[24rem] flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                                Choose a file to see its YAML.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
}
