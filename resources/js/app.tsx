import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    // Ciian's own control-panel pages live under `pages/core/`. Every other page
    // root is a folder generated for a created system, whose pages bring their
    // own chrome — they must never be wrapped in Ciian's admin shell.
    layout: (name) => {
        if (!name.startsWith('core/')) {
            return null;
        }

        switch (true) {
            case name === 'core/welcome':
            case name === 'core/error':
            // The page builder is a full-screen editor and brings its own
            // chrome, so it opts out of the admin shell.
            case name === 'core/system/page/update':
                return null;
            case name.startsWith('core/auth/'):
                return AuthLayout;
            case name.startsWith('core/settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
