import { Button as UiButton } from '@/components/ui/button';

type Props = {
    label?: string;
    variant?: string;
    size?: string;
    href?: string;
};

type Variant =
    | 'default'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'destructive'
    | 'link';

type Size = 'default' | 'sm' | 'lg';

/** Narrowed rather than cast, so an unknown value falls back to the default. */
function toVariant(value: string): Variant {
    switch (value) {
        case 'secondary':
        case 'outline':
        case 'ghost':
        case 'destructive':
        case 'link':
            return value;
        default:
            return 'default';
    }
}

function toSize(value: string): Size {
    switch (value) {
        case 'sm':
        case 'lg':
            return value;
        default:
            return 'default';
    }
}

export default function Button({
    label = 'Button',
    variant = 'default',
    size = 'default',
    href = '',
}: Props) {
    if (href !== '') {
        return (
            <UiButton asChild variant={toVariant(variant)} size={toSize(size)}>
                <a href={href}>{label}</a>
            </UiButton>
        );
    }

    return (
        <UiButton type="button" variant={toVariant(variant)} size={toSize(size)}>
            {label}
        </UiButton>
    );
}
