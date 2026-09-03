import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
    headerActions,
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            {/* min-h-0 drops the inset's own min-h-svh so it stretches to the pinned
                shell instead of overflowing it, and overflow-hidden keeps the scroll
                inside the region below rather than on the document. */}
            <AppContent
                variant="sidebar"
                className="min-h-0 min-w-0 overflow-hidden"
            >
                <AppSidebarHeader
                    breadcrumbs={breadcrumbs}
                    headerActions={headerActions}
                />
                {/* The only scrolling element: the header above it stays fixed. The
                    `scroll-region` attribute is what tells Inertia to reset/preserve
                    this container's offset across visits, since the document itself
                    no longer scrolls. */}
                <div
                    className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
                    scroll-region=""
                >
                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}
