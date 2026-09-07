import { cn } from '@/lib/utils';

type Props = {
    text?: string;
    level?: string;
    align?: string;
};

const LEVEL_CLASSES: Record<string, string> = {
    h1: 'text-4xl font-bold tracking-tight',
    h2: 'text-3xl font-semibold tracking-tight',
    h3: 'text-2xl font-semibold',
    h4: 'text-xl font-semibold',
};

const ALIGN_CLASSES: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};

/** Narrowed rather than cast, so an unknown level falls back instead of breaking. */
function toTag(value: string) {
    switch (value) {
        case 'h1':
        case 'h3':
        case 'h4':
            return value;
        default:
            return 'h2' as const;
    }
}

export default function Heading({
    text = 'Heading',
    level = 'h2',
    align = 'left',
}: Props) {
    const Tag = toTag(level);

    return (
        <Tag
            className={cn(
                LEVEL_CLASSES[level] ?? LEVEL_CLASSES.h2,
                ALIGN_CLASSES[align] ?? ALIGN_CLASSES.left,
            )}
        >
            {text}
        </Tag>
    );
}
