import { Check, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type ModalTone = 'default' | 'success' | 'destructive';

/** Standard widths every Modal / ConfirmDialog picks from. Default matches the previous fixed size. */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const TONE_BADGE: Record<ModalTone, string> = {
    default: 'bg-primary/15 text-primary',
    success: 'bg-emerald-500/15 text-emerald-500',
    destructive: 'bg-destructive/15 text-destructive',
};

const TONE_ICON: Record<ModalTone, LucideIcon | null> = {
    default: null,
    success: Check,
    destructive: TriangleAlert,
};

const SIZE_CLASS: Record<ModalSize, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
};

type ModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: ReactNode;
    tone?: ModalTone;
    /** Overrides the tone's default glyph. Pass `null` to render no badge at all. */
    icon?: LucideIcon | null;
    /** Dialog max-width. Defaults to `md`, the standard confirmation size. */
    size?: ModalSize;
    children?: ReactNode;
    footer?: ReactNode;
    /** Blocks overlay/Escape dismissal while an action is in flight. */
    processing?: boolean;
};

export function Modal({
    open,
    onOpenChange,
    title,
    description,
    tone = 'default',
    icon,
    size = 'md',
    children,
    footer,
    processing = false,
}: ModalProps) {
    const Icon = icon === undefined ? TONE_ICON[tone] : icon;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!processing) {
                    onOpenChange(next);
                }
            }}
        >
            <DialogContent
                showCloseButton={false}
                className={cn('gap-6 rounded-xl p-8', SIZE_CLASS[size])}
            >
                <DialogHeader className="items-center gap-3 text-center sm:text-center">
                    {Icon && (
                        <span
                            className={cn(
                                'flex size-12 items-center justify-center rounded-full',
                                TONE_BADGE[tone],
                            )}
                        >
                            <Icon className="size-6" />
                        </span>
                    )}

                    <DialogTitle className="text-xl font-semibold tracking-tight">
                        {title}
                    </DialogTitle>

                    {description && (
                        <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>

                {children}

                {footer && (
                    <DialogFooter className="flex-row gap-3">
                        {footer}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

type ConfirmDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: ReactNode;
    variant?: ModalTone;
    size?: ModalSize;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    processing?: boolean;
    children?: ReactNode;
};

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    variant = 'destructive',
    size = 'md',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    processing = false,
    children,
}: ConfirmDialogProps) {
    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            tone={variant}
            size={size}
            processing={processing}
            footer={
                <>
                    <Button
                        variant="outline"
                        size="lg"
                        className="flex-1"
                        disabled={processing}
                        onClick={() => onOpenChange(false)}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={
                            variant === 'destructive'
                                ? 'destructive'
                                : 'default'
                        }
                        size="lg"
                        className="flex-1"
                        disabled={processing}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            {children}
        </Modal>
    );
}

export default Modal;
