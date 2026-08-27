import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { resolveLucideIcon } from '@/lib/lucide-icons';

export type SystemBadge = {
    type: 'ciian' | 'no_system' | 'system';
    label: string;
    slug: string;
    icon: string;
};

type Props = {
    system: SystemBadge;
    className?: string;
};

export default function TagBadge({ system, className }: Props) {
    const IconComponent = resolveLucideIcon(system.icon);

    return (
        <Badge
            variant="outline"
            className={cn(
                'gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                system.type === 'ciian' &&
                    'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:bg-background dark:text-violet-400',
                system.type === 'no_system' &&
                    'border-border bg-muted/50 text-muted-foreground dark:bg-background',
                system.type === 'system' &&
                    'border-primary/30 bg-primary/10 text-primary dark:bg-background',
                className,
            )}
        >
            {IconComponent && <Icon iconNode={IconComponent} className="size-3.5" />}
            {system.label}
        </Badge>
    );
}
