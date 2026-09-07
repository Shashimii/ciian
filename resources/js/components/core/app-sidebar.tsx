import { Link } from '@inertiajs/react';
import {
    Blocks,
    Boxes,
    Database,
    LayoutGrid,
    LayoutTemplate,
} from 'lucide-react';
import AppLogo from '@/components/core/app-logo';
import { NavMain } from '@/components/core/nav-main';
import { NavUser } from '@/components/core/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as componentsIndex } from '@/routes/components';
import { index as layoutsIndex } from '@/routes/layouts';
import { index as systemsIndex } from '@/routes/systems';
import { index as tablesIndex } from '@/routes/tables';
import type { NavGroup } from '@/types';

const mainNavGroups: NavGroup[] = [
    {
        title: 'Panel',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutGrid,
            },
            {
                title: 'Systems',
                href: systemsIndex(),
                icon: Boxes,
                cacheTags: 'systems',
            },
        ],
    },
    {
        title: 'Backend',
        items: [
            {
                title: 'Tables',
                href: tablesIndex(),
                icon: Database,
                cacheTags: 'tables',
            },
            {
                title: 'Components',
                href: componentsIndex(),
                icon: Blocks,
                cacheTags: 'components',
            },
            {
                title: 'Layouts',
                href: layoutsIndex(),
                icon: LayoutTemplate,
                cacheTags: 'layouts',
            },
        ],
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={mainNavGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
