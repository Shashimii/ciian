import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { resolveLucideIcon } from '@/lib/lucide-icons';
import { cn } from '@/lib/utils';

export type SystemBadge = {
    type: 'ciian' | 'no_system' | 'system';
    label: string;
    slug: string;
    icon: string;
    color?: string | null;
};

type Props = {
    system: SystemBadge;
    className?: string;
};

const COLOR_CLASSES: Record<string, string> = {
    violet: 'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:bg-background dark:text-violet-400',
    purple: 'border-purple-500/30 bg-purple-500/15 text-purple-700 dark:bg-background dark:text-purple-400',
    fuchsia:
        'border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-700 dark:bg-background dark:text-fuchsia-400',
    pink: 'border-pink-500/30 bg-pink-500/15 text-pink-700 dark:bg-background dark:text-pink-400',
    rose: 'border-rose-500/30 bg-rose-500/15 text-rose-700 dark:bg-background dark:text-rose-400',
    red: 'border-red-500/30 bg-red-500/15 text-red-700 dark:bg-background dark:text-red-400',
    orange: 'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:bg-background dark:text-orange-400',
    amber: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:bg-background dark:text-amber-400',
    yellow: 'border-yellow-500/30 bg-yellow-500/15 text-yellow-700 dark:bg-background dark:text-yellow-400',
    lime: 'border-lime-500/30 bg-lime-500/15 text-lime-700 dark:bg-background dark:text-lime-400',
    green: 'border-green-500/30 bg-green-500/15 text-green-700 dark:bg-background dark:text-green-400',
    emerald:
        'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:bg-background dark:text-emerald-400',
    teal: 'border-teal-500/30 bg-teal-500/15 text-teal-700 dark:bg-background dark:text-teal-400',
    cyan: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:bg-background dark:text-cyan-400',
    sky: 'border-sky-500/30 bg-sky-500/15 text-sky-700 dark:bg-background dark:text-sky-400',
    blue: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:bg-background dark:text-blue-400',
    indigo: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:bg-background dark:text-indigo-400',
};

function badgeColorClass(system: SystemBadge): string {
    if (system.type === 'no_system') {
        return 'border-border bg-muted/50 text-muted-foreground dark:bg-background';
    }

    if (system.type === 'system' && !system.color) {
        return 'border-primary/30 bg-primary/10 text-primary dark:bg-background';
    }

    const color = system.color ?? 'violet';

    return (
        COLOR_CLASSES[color] ??
        'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:bg-background dark:text-violet-400'
    );
}

export default function TagBadge({ system, className }: Props) {
    const IconComponent = resolveLucideIcon(system.icon);

    return (
        <Badge
            variant="outline"
            className={cn(
                'gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                badgeColorClass(system),
                className,
            )}
        >
            {IconComponent && (
                <Icon iconNode={IconComponent} className="size-3.5" />
            )}
            {system.label}
        </Badge>
    );
}
