import type { ReactNode } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
};

export default function FormSidebar({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    className,
}: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className={cn(
                    'flex w-full flex-col gap-0 p-0 sm:max-w-2xl',
                    className,
                )}
            >
                <SheetHeader className="border-b px-6 py-4 text-left">
                    <SheetTitle>{title}</SheetTitle>
                    {description && (
                        <SheetDescription>{description}</SheetDescription>
                    )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

                {footer && (
                    <div className="mt-auto border-t px-6 py-4">{footer}</div>
                )}
            </SheetContent>
        </Sheet>
    );
}
