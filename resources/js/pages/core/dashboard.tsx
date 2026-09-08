import { Head, Link } from '@inertiajs/react';
import { Blocks, Boxes, Database, Ghost, Settings2, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Heading from '@/components/core/heading';
import { Badge } from '@/components/ui/badge';
import { dashboard } from '@/routes';
import { edit as editCiian } from '@/routes/ciian';
import { index as componentsIndex } from '@/routes/components';
import { index as systemsIndex } from '@/routes/systems';
import { index as tablesIndex } from '@/routes/tables';

type Props = {
    release: {
        version: string;
        /** Null once the platform is out of beta. */
        stage: string | null;
    };
    counts: {
        systems: number;
        components: number;
        tables: number;
    };
};

type Shortcut = {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    /** Omitted for destinations where a count means nothing. */
    count?: number;
};

export default function Dashboard({ release, counts }: Props) {
    const shortcuts: Shortcut[] = [
        {
            title: 'Systems',
            description: 'Build and publish the applications you create.',
            href: systemsIndex().url,
            icon: Boxes,
            count: counts.systems,
        },
        {
            title: 'Components',
            description: 'The building blocks pages are assembled from.',
            href: componentsIndex().url,
            icon: Blocks,
            count: counts.components,
        },
        {
            title: 'Tables',
            description: 'Shapes behind the data your systems store.',
            href: tablesIndex().url,
            icon: Database,
            count: counts.tables,
        },
        {
            title: 'Ciian settings',
            description: 'Platform identity and the main index page.',
            href: editCiian().url,
            icon: Settings2,
        },
    ];

    return (
        <>
            <Head title="Dashboard" />

            <div className="space-y-10 px-4 py-6">
                <section className="flex flex-wrap items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-white dark:text-black">
                        <Sparkles className="size-6" />
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold">Ciian</span>
                            <span className="font-mono text-sm text-muted-foreground">
                                v{release.version}
                            </span>
                            {release.stage && (
                                <Badge variant="secondary">
                                    {release.stage}
                                </Badge>
                            )}
                        </div>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Ghost className="size-4" />
                            Skeleton.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <Heading
                        variant="small"
                        title="Shortcuts"
                        description="Jump straight into a module."
                    />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {shortcuts.map((shortcut) => (
                            <Link
                                key={shortcut.title}
                                href={shortcut.href}
                                className="group flex flex-col gap-3 rounded-xl border bg-card/50 p-4 transition-colors hover:border-primary/40 hover:bg-card"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="flex size-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
                                        <shortcut.icon className="size-4" />
                                    </span>

                                    {shortcut.count !== undefined && (
                                        <span className="text-2xl font-semibold tabular-nums">
                                            {shortcut.count}
                                        </span>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="text-sm font-medium">
                                        {shortcut.title}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {shortcut.description}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
