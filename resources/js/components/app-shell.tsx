import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const isOpen = usePage().props.sidebarOpen;

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">{children}</div>
        );
    }

    // Pin the shell to the viewport so the sidebar and header stay put and only
    // the main content scrolls. Without h-svh the wrapper's min-h-svh lets the
    // whole document grow and scroll instead.
    return (
        <SidebarProvider defaultOpen={isOpen} className="h-svh">
            {children}
        </SidebarProvider>
    );
}
