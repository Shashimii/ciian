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
