import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Written out rather than interpolated: Tailwind only ships a class it can find
 * as a literal, so `bg-${color}-500` would be purged from the build.
 */
const COLOR_SWATCHES: Record<string, string> = {
    violet: 'bg-violet-500',
    purple: 'bg-purple-500',
    fuchsia: 'bg-fuchsia-500',
    pink: 'bg-pink-500',
    rose: 'bg-rose-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    amber: 'bg-amber-500',
    yellow: 'bg-yellow-500',
    lime: 'bg-lime-500',
    green: 'bg-green-500',
    emerald: 'bg-emerald-500',
    teal: 'bg-teal-500',
    cyan: 'bg-cyan-500',
    sky: 'bg-sky-500',
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
};

type Props = {
    colors: string[];
    selected: string;
    onSelect: (color: string) => void;
};

/** Swatch grid picking the tint a system's badge carries. */
export default function ColorPicker({ colors, selected, onSelect }: Props) {
    return (
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-9">
            {colors.map((color) => (
                <Tooltip key={color}>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label={color}
                            className={cn(
                                'flex h-10 items-center justify-center rounded-md border',
                                selected === color &&
                                    'border-primary ring-2 ring-primary/30',
                            )}
                            onClick={() => onSelect(color)}
                        >
                            <span
                                className={cn(
                                    'size-5 rounded-full',
                                    COLOR_SWATCHES[color] ?? 'bg-violet-500',
                                )}
                            />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className="capitalize">
                        {color}
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
}
