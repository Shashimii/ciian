import { cn } from '@/lib/utils';

type Props = {
    body?: string;
    align?: string;
    muted?: boolean;
};

const ALIGN_CLASSES: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};

export default function Text({
    body = 'Write something here.',
    align = 'left',
    muted = false,
}: Props) {
    return (
        <p
            className={cn(
                'leading-relaxed whitespace-pre-line',
                ALIGN_CLASSES[align] ?? ALIGN_CLASSES.left,
                muted && 'text-muted-foreground',
            )}
        >
            {body}
        </p>
    );
}
