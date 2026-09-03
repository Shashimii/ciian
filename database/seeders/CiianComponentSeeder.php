<?php

namespace Database\Seeders;

use App\Models\Ciian\Component\Component;
use Illuminate\Database\Seeder;

/**
 * Seeds Ciian's default UI building blocks into ciian_cmp.
 *
 * Each definition follows the contract in `.ai/shapes/cmp_format.md`: `creator`, an
 * `information` block for the palette, a `properties` map describing the property
 * panel, and the component's `tsx` source. Property keys must match the props the
 * TSX destructures, and each `default` must match that prop's default in the source.
 *
 * Uploads are authored as YAML; these seeds are the same shape written directly as
 * PHP arrays, since they never pass through the upload endpoint.
 *
 * Default blocks are seeded with `can_delete: false` — they ship with the platform
 * and pages may already reference them — and their source lives at
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
        return [
            $this->buttonBlock(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buttonBlock(): array
    {
        $definition = [
            'creator' => 'Ciian',
            'information' => [
                'name' => 'Button',
                'slug' => 'button',
                'category' => 'application',
                'can_delete' => false,
                'description' => 'Clickable action control',
            ],
            'properties' => [
                'label' => [
                    'type' => 'string',
                    'label' => 'Label',
                    'default' => 'Button',
                ],
                'purpose' => [
                    'type' => 'select',
                    'label' => 'Purpose',
                    'default' => 'button',
                    'options' => ['button', 'submit', 'reset'],
                ],
                'variant' => [
                    'type' => 'select',
                    'label' => 'Variant',
                    'default' => 'default',
                    'options' => ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
                ],
                'size' => [
                    'type' => 'select',
                    'label' => 'Size',
                    'default' => 'default',
                    'options' => ['default', 'sm', 'lg'],
                ],
            ],
            'tsx' => <<<'TSX'
import { Button } from '@/components/ui/button';

export type BlockButtonProps = {
    label: string;
    purpose?: 'button' | 'submit' | 'reset';
    variant?:
        'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg';
};

export default function BlockButton({
    label,
    purpose = 'button',
    variant = 'default',
    size = 'default',
}: BlockButtonProps) {
    return (
        <Button type={purpose} variant={variant} size={size}>
            {label}
        </Button>
    );
}

TSX,
        ];

        return [
            'name' => 'Button',
            'slug' => 'button',
            'type' => Component::TYPE_BLOCK,
            'status' => Component::STATUS_PUBLISHED,
            'can_delete' => false,
            'unpub_shape' => $definition,
            'pub_shape' => $definition,
        ];
    }
}
