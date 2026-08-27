import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export const TABLE_ICON_OPTIONS = [
    'Archive',
    'BadgeCheck',
    'BarChart3',
    'Bell',
    'Bookmark',
    'Box',
    'Boxes',
    'Briefcase',
    'Building2',
    'Calendar',
    'CircleDashed',
    'ClipboardList',
    'Clock',
    'Cloud',
    'Code',
    'Cog',
    'Compass',
    'CreditCard',
    'Database',
    'FileText',
    'Folder',
    'Globe',
    'HardDrive',
    'Hash',
    'Heart',
    'Home',
    'Key',
    'Layers',
    'LayoutGrid',
    'Link',
    'Lock',
    'Mail',
    'Map',
    'Package',
    'Puzzle',
    'Receipt',
    'Server',
    'Settings',
    'Shield',
    'ShoppingCart',
    'Sparkles',
    'Star',
    'Table',
    'Tag',
    'Users',
    'Workflow',
    'Zap',
] as const;

export type TableIconName = (typeof TABLE_ICON_OPTIONS)[number];

export function resolveLucideIcon(name: string): LucideIcon | null {
    if (!(name in LucideIcons)) {
        return null;
    }

    return LucideIcons[name as keyof typeof LucideIcons] as LucideIcon;
}
