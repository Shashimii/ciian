import type { ComponentType } from 'react';

/**
 * A block's props are whatever its definition declares, so they are only known
 * at runtime. The registry types them as a record rather than `never`: a block
 * placed on a page is rendered with the prop values that instance was given.
 */
export type BlockProps = Record<string, unknown>;

type BlockModule = { default: ComponentType<BlockProps> };

/**
 * Every building block that exists as a real file, keyed by its import path.
 *
 * Vite expands these globs at build time, so a component uploaded after the last
 * build only appears once the dev server picks the file up or the app is rebuilt.
 * `resolveBlock` returning undefined means exactly that, not that the component is
 * missing from the database.
 */
const blockModules: Record<string, () => Promise<BlockModule>> = {
    ...import.meta.glob<BlockModule>('../components/default/*.tsx'),
    ...import.meta.glob<BlockModule>('../components/custom/*.tsx'),
};

/**
 * Loader for a block's module, or undefined when no file for that slug is in the
 * current build. Seeded blocks live in `default/`, uploaded ones in `custom/`.
 */
export function resolveBlock(
    slug: string,
): (() => Promise<BlockModule>) | undefined {
    return (
        blockModules[`../components/default/${slug}.tsx`] ??
        blockModules[`../components/custom/${slug}.tsx`]
    );
}
