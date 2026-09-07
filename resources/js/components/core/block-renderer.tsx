import { TriangleAlert } from 'lucide-react';
import { lazy, Suspense, useMemo } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { resolveBlock } from '@/lib/block-registry';
import type { BlockProps } from '@/lib/block-registry';
import type { PlacedBlock } from '@/types';

type Props = {
    blocks: PlacedBlock[];
    /**
     * Wrapper applied around each block. The builder passes one to draw its
     * selection chrome; a published page passes nothing.
     */
    renderWrapper?: (block: PlacedBlock, rendered: ReactNode) => ReactNode;
    className?: string;
};

/**
 * Shown when a block names a component that is not in the current build — the
 * file has not been generated yet, or the app has not been rebuilt since it was.
 * The database row is still fine, so this is a build problem, not a data one.
 */
function MissingBlock({ slug }: { slug: string }) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
            <div className="min-w-0">
                <p className="font-medium">Component not in this build</p>
                <p className="text-muted-foreground">
                    <span className="font-mono text-xs">{slug}</span> has no
                    file yet. Rebuild the app, or check the component still
                    exists.
                </p>
            </div>
        </div>
    );
}

function BlockSkeleton() {
    return <div className="h-16 animate-pulse rounded-lg bg-muted/60" />;
}

/**
 * Renders the blocks a page has placed, resolving each component slug through
 * the build's block registry.
 *
 * Props are stored as strings, the way a component definition declares its
 * defaults, and handed to the component untouched — coercing them here would
 * guess at types the definition already states.
 */
export default function BlockRenderer({
    blocks,
    renderWrapper,
    className,
}: Props) {
    // Every block of the same slug shares one lazy component, so placing a block
    // twice does not load its module twice.
    const loaders = useMemo(() => {
        const cache = new Map<string, ComponentType<BlockProps> | null>();

        for (const block of blocks) {
            if (cache.has(block.component)) {
                continue;
            }

            const loader = resolveBlock(block.component);

            cache.set(block.component, loader ? lazy(loader) : null);
        }

        return cache;
    }, [blocks]);

    return (
        <div className={className}>
            {blocks.map((block) => {
                const Block = loaders.get(block.component) ?? null;

                const rendered = Block ? (
                    <Suspense fallback={<BlockSkeleton />}>
                        <Block {...block.props} />
                    </Suspense>
                ) : (
                    <MissingBlock slug={block.component} />
                );

                return (
                    <div key={block.block_id}>
                        {renderWrapper
                            ? renderWrapper(block, rendered)
                            : rendered}
                    </div>
                );
            })}
        </div>
    );
}
