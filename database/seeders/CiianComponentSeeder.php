<?php

namespace Database\Seeders;

use App\Models\Ciian\Component\Component;
use Illuminate\Database\Seeder;

/**
 * Seeds Ciian's default UI building blocks into ciian_cmp.
 *
 * There are none yet: the blocks that ship with the platform have not been written.
 * This seeder is the mechanism for them, so add entries to `blocks()` rather than
 * inserting rows anywhere else.
 *
 * Each definition follows the contract in `.ai/shapes/cmp_format.md`: `creator`, an
 * `information` block for the palette, a `properties` map describing the property
 * panel, and the component's `tsx` source. Property keys must match the props the
 * TSX destructures, and each `default` must match that prop's default in the source.
 *
 * Uploads are authored as YAML; these seeds are the same shape written directly as
 * PHP arrays, since they never pass through the upload endpoint.
 *
 * Seed default blocks with `can_delete: false` — they ship with the platform and
 * pages may already reference them — and put their source at
 * `resources/js/components/default/{slug}.tsx`. Keep the two in step when either moves.
 */
class CiianComponentSeeder extends Seeder
{
    /**
     * Seed the default building blocks.
     */
    public function run(): void
    {
        foreach ($this->blocks() as $block) {
            Component::query()->updateOrCreate(
                ['slug' => $block['slug']],
                $block,
            );
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function blocks(): array
    {
        return [];
    }
}
