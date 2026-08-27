import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export const TABLE_ICON_OPTIONS = [
    'Box',
    'CircleDashed',
    'Database',
    'Key',
    'LayoutGrid',
    'Link',
    'Shield',
    'Sparkles',
    'Table',
    'Users',
] as const;

export type TableIconName = (typeof TABLE_ICON_OPTIONS)[number];

export function resolveLucideIcon(name: string): LucideIcon | null {
    if (!(name in LucideIcons)) {
        return null;
    }

    return LucideIcons[name as keyof typeof LucideIcons] as LucideIcon;
}
