import { Link } from '@inertiajs/react';
import { Blocks, Boxes, Database, LayoutGrid, Users } from 'lucide-react';
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
import { index as systemsIndex } from '@/routes/systems';
import { index as tablesIndex } from '@/routes/tables';
import { index as usersIndex } from '@/routes/users';
import type { NavGroup } from '@/types';

const mainNavGroups: NavGroup[] = [
    {
        title: 'Main',
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
            {
                title: 'Users',
                href: usersIndex(),
                icon: Users,
                cacheTags: 'users',
            },
        ],
    },
    {
        title: 'Frontend',
        items: [
            {
                title: 'Components',
                href: componentsIndex(),
                icon: Blocks,
                cacheTags: 'components',
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
