<?php

namespace App\Actions\System;

use App\Models\Ciian\System\Page;
use App\Models\Ciian\System\System;
use App\Support\SystemPagePath;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;

/**
 * Writes the React file a published page is served from.
 *
 * A created system owns a folder under `resources/js/pages/` named after its
 * slug, so its pages resolve as `{system}/{page}` — the same way publishing a
 * table generates its Eloquent model. The files are build output: they are
 * gitignored, and republishing overwrites them.
 */
class GeneratePageFile
{
    public function __construct(private SystemPagePath $paths) {}

    /**
     * Create the system's page folder, whether or not it has published pages yet.
     */
    public function ensureDirectory(System $system): void
    {
        $directory = $this->paths->directoryFor($system);

        if (! File::isDirectory($directory)) {
            File::ensureDirectoryExists($directory);
        }
    }

    /**
     * Write one published page's file.
     */
    public function handle(System $system, Page $page): void
    {
        $this->ensureDirectory($system);

        $path = $this->paths->fileFor($system, $page);

        if (File::put($path, $this->render($system, $page)) === false) {
            throw ValidationException::withMessages([
                'shape' => __('The page could not be written to :path.', [
                    'path' => $this->paths->relative($path),
                ]),
            ]);
        }
    }

    /**
     * Write every page of a system that is currently published, and create the
     * folder even when none are.
     */
    public function handleSystem(System $system): void
    {
        $this->ensureDirectory($system);

        foreach ($system->pages()->where('status', Page::STATUS_PUBLISHED)->get() as $page) {
            $this->handle($system, $page);
        }
    }

    /**
     * Remove a page's file. The row is the source of truth, so a missing file is
     * not an error — a fresh checkout starts with no generated pages at all.
     */
    public function remove(System $system, Page $page): void
    {
        $path = $this->paths->fileFor($system, $page);

        if (File::exists($path) && ! File::delete($path)) {
            throw ValidationException::withMessages([
                'page' => __('The page was removed, but :path could not be deleted. Remove it manually.', [
                    'path' => $this->paths->relative($path),
                ]),
            ]);
        }
    }

    /**
     * Remove a system's whole page folder, files and all.
     *
     * Used when the system itself is deleted: its pages go with it, so nothing
     * under `resources/js/pages/{slug}` has a row behind it any more.
     */
    public function removeDirectory(System $system): void
    {
        $directory = $this->paths->directoryFor($system);

        if (File::isDirectory($directory) && ! File::deleteDirectory($directory)) {
            throw ValidationException::withMessages([
                'system' => __('The system was removed, but :path could not be deleted. Remove it manually.', [
                    'path' => $this->paths->relative($directory),
                ]),
            ]);
        }
    }

    private function render(System $system, Page $page): string
    {
        $component = $this->paths->componentNameFor($system, $page);
        $name = $this->paths->pageNameFor($system, $page);
        $header = $this->docBlock($system, $page, $name);

        $blocks = $this->placedBlocks($page);

        // A page with nothing on it yet falls back to a placeholder rather than
        // rendering an empty document.
        if ($blocks !== []) {
            return $this->renderBlocks($component, $header, $page, $blocks);
        }

        $body = $page->is_index
            ? $this->renderIndexBody($system, $page)
            : $this->renderPageBody($page);

        return <<<TSX
        import { Head } from '@inertiajs/react';

        {$header}
        export default function {$component}() {
            return (
        {$body}
            );
        }

        TSX;
    }

    /**
     * A page the builder has placed blocks on renders them through the shared
     * runtime renderer, which resolves each component slug against the build's
     * block registry. The blocks are inlined as data, so the file stays a plain
     * static module with no server lookup at request time.
     *
     * @param  list<array<string, mixed>>  $blocks
     */
    private function renderBlocks(
        string $component,
        string $header,
        Page $page,
        array $blocks,
    ): string {
        $data = (string) json_encode(
            $blocks,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
        );

        $title = $this->jsString($page->name);

        return <<<TSX
        import { Head } from '@inertiajs/react';
        import BlockRenderer from '@/components/core/block-renderer';
        import type { PlacedBlock } from '@/types';

        {$header}
        const BLOCKS: PlacedBlock[] = {$data};

        export default function {$component}() {
            return (
                <>
                    <Head title={$title} />

                    <BlockRenderer blocks={BLOCKS} />
                </>
            );
        }

        TSX;
    }

    /**
     * What is live on the page: its published shape once it has one, otherwise
     * the draft the builder is still working on.
     *
     * @return list<array<string, mixed>>
     */
    private function placedBlocks(Page $page): array
    {
        $shape = $page->pub_shape ?? $page->unpub_shape;
        $blocks = is_array($shape) ? ($shape['blocks'] ?? []) : [];

        return is_array($blocks) ? array_values($blocks) : [];
    }

    private function docBlock(System $system, Page $page, string $name): string
    {
        $pageName = $this->comment($page->name);
        $systemName = $this->comment($system->name);

        return <<<TSX
        /**
         * Generated by Ciian for the "{$pageName}" page of {$systemName}.
         *
         * Do not edit by hand — publishing the page from the System Builder
         * overwrites this file. Page name: `{$name}`.
         */
        TSX;
    }

    /**
     * The starting page is what someone sees the moment a system goes live, so it
     * ships as a real landing page rather than an empty div — the same shape as
     * Ciian's own welcome screen, named for the system it belongs to.
     */
    private function renderIndexBody(System $system, Page $page): string
    {
        $title = $this->jsString($page->name);
        $systemName = $this->jsString($system->name);
        $initial = $this->jsString($this->initials($system->name));

        return <<<TSX
                <>
                    <Head title={$title} />

                    <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                        <header className="mb-6 w-full max-w-[335px] text-sm lg:max-w-4xl">
                            <nav className="flex items-center justify-between gap-4">
                                <span className="font-medium">{$systemName}</span>
                            </nav>
                        </header>

                        <div className="flex w-full items-center justify-center opacity-100 transition-opacity duration-750 lg:grow starting:opacity-0">
                            <main className="flex w-full max-w-[335px] flex-col-reverse overflow-hidden rounded-lg lg:max-w-4xl lg:flex-row">
                                <div className="flex-1 rounded-br-lg rounded-bl-lg bg-white p-6 pb-12 text-[13px] leading-[20px] shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.16)] lg:rounded-tl-lg lg:rounded-br-none lg:p-20 dark:bg-[#161615] dark:text-[#EDEDEC] dark:shadow-[inset_0px_0px_0px_1px_#fffaed2d]">
                                    <h1 className="mb-1 font-medium">
                                        Welcome to {$systemName}
                                    </h1>
                                    <p className="mb-2 text-[#706f6c] dark:text-[#A1A09A]">
                                        This is the starting page. Nothing has
                                        been placed on it yet.
                                    </p>
                                    <p className="text-[#706f6c] dark:text-[#A1A09A]">
                                        Open this system in the Ciian builder and
                                        drop components onto the page to replace
                                        this screen.
                                    </p>
                                </div>

                                <div className="relative flex aspect-[335/376] w-full shrink-0 items-center justify-center overflow-hidden rounded-t-lg bg-[#fff2f2] lg:aspect-auto lg:w-[438px] lg:rounded-t-none lg:rounded-r-lg dark:bg-[#1D0002]">
                                    <span className="text-[6rem] leading-none font-semibold text-[#F53003] select-none lg:text-[8rem] dark:text-[#FF4433]">
                                        {$initial}
                                    </span>
                                </div>
                            </main>
                        </div>
                    </div>
                </>
        TSX;
    }

    /**
     * Every other page is a blank canvas the builder fills in.
     */
    private function renderPageBody(Page $page): string
    {
        $title = $this->jsString($page->name);

        return <<<TSX
                <>
                    <Head title={$title} />

                    <div className="px-4 py-6">
                        {/* Blocks placed on this page render here. */}
                    </div>
                </>
        TSX;
    }

    /**
     * Up to two initials from the system's name, for the starting page's panel.
     */
    private function initials(string $name): string
    {
        $words = preg_split('/\s+/', trim($name)) ?: [];
        $letters = '';

        foreach ($words as $word) {
            if ($word !== '' && strlen($letters) < 2) {
                $letters .= strtoupper(substr($word, 0, 1));
            }
        }

        return $letters !== '' ? $letters : '?';
    }

    /**
     * A single-quoted JS string literal. Names are user input and end up inside
     * JSX, where a stray quote, backslash or brace would break the file, so they
     * are never interpolated as raw markup.
     */
    private function jsString(string $value): string
    {
        $escaped = str_replace(
            ['\\', "'", "\r", "\n"],
            ['\\\\', "\\'", '', ' '],
            $value,
        );

        return "{'".$escaped."'}";
    }

    /**
     * Names also end up in the generated docblock, so anything that could close
     * the comment early is flattened out.
     */
    private function comment(string $value): string
    {
        return str_replace('*/', '', (string) preg_replace('/\s+/', ' ', trim($value)));
    }
}
