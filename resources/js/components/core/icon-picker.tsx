import { Icon } from '@/components/ui/icon';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { resolveLucideIcon, TABLE_ICON_OPTIONS } from '@/lib/lucide-icons';
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    selected: string;
    onSelect: (icon: string) => void;
};

/**
 * Full-width grid of icon options, shown under an icon + name row.
 *
 * Lifted out of the Systems index so the create page shares one grid with it
 * rather than hand-rolling a second copy.
 */
export default function IconPicker({ open, selected, onSelect }: Props) {
    if (!open) {
        return null;
    }

    return (
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
            {TABLE_ICON_OPTIONS.map((iconName) => {
                const IconComponent = resolveLucideIcon(iconName);

                return (
                    <Tooltip key={iconName}>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-label={iconName}
                                className={cn(
                                    'flex h-10 items-center justify-center rounded-md border',
                                    selected === iconName &&
                                        'border-primary bg-primary/10 text-primary',
                                )}
                                onClick={() => onSelect(iconName)}
                            >
                                {IconComponent && (
                                    <Icon
                                        iconNode={IconComponent}
                                        className="size-4"
                                    />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>{iconName}</TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
}
