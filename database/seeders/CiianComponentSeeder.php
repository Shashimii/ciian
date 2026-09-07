<?php

namespace Database\Seeders;

use App\Models\Ciian\Component\Component;
use App\Support\ComponentShapeBuilder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\Yaml\Yaml;

/**
 * Seeds Ciian's default UI building blocks into ciian_cmp.
 *
 * The definitions are authored as YAML in `.ai/shapes/default/`, one file per
 * block, in exactly the format `.ai/shapes/cmp_format.md` describes for an
 * upload. They go through the same `ComponentShapeBuilder` an upload does, so a
 * default block cannot drift from the contract custom blocks are held to.
 *
 * Seeding writes each block's source to `resources/js/components/default/{slug}.tsx`
 * — tracked, unlike the gitignored `custom/` folder, because these ship with the
 * platform. Rows are seeded with `can_delete: false`: pages may already place
 * them, and nothing in the app flips that column afterwards.
 */
class CiianComponentSeeder extends Seeder
{
    /**
     * Seed the default building blocks.
     */
    public function run(): void
    {
        foreach ($this->definitions() as $slug => $definition) {
            $this->writeSource($slug, $definition['tsx']);

            Component::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $definition['information']['name'],
                    'type' => Component::TYPE_BLOCK,
                    // Default blocks are usable the moment they are seeded; there
                    // is no draft of a block that ships with the platform.
                    'status' => Component::STATUS_PUBLISHED,
                    'can_delete' => false,
                    'unpub_shape' => $definition,
                    'pub_shape' => $definition,
                ],
            );
        }
    }

    /**
     * Every default definition, keyed by slug.
     *
     * @return array<string, array<string, mixed>>
     */
    private function definitions(): array
    {
        $directory = base_path('.ai/shapes/default');

        if (! File::isDirectory($directory)) {
            return [];
        }

        $shapes = new ComponentShapeBuilder;
        $definitions = [];

        foreach (File::files($directory) as $file) {
            if ($file->getExtension() !== 'yaml') {
                continue;
            }

            try {
                $definition = $shapes->normalize(Yaml::parseFile($file->getPathname()));
            } catch (InvalidArgumentException $exception) {
                throw new RuntimeException(
                    "Default block [{$file->getFilename()}] is invalid: {$exception->getMessage()}",
                    previous: $exception,
                );
            }

            $definitions[(string) $definition['information']['slug']] = $definition;
        }

        return $definitions;
    }

    /**
     * The file the block renders from. Rewritten on every seed so the source on
     * disk always matches the definition that was just stored.
     */
    private function writeSource(string $slug, string $tsx): void
    {
        $path = resource_path("js/components/default/{$slug}.tsx");

        File::ensureDirectoryExists(dirname($path));

        if (File::put($path, $tsx) === false) {
            throw new RuntimeException("Could not write resources/js/components/default/{$slug}.tsx.");
        }
    }
}
