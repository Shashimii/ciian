import { Link, usePage } from '@inertiajs/react';
import {
    Blocks,
    Boxes,
    Database,
    KeyRound,
    LayoutGrid,
    Shield,
    Users,
} from 'lucide-react';
import { useMemo } from 'react';
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
import { index as permissionsIndex } from '@/routes/permissions';
import { index as rolesIndex } from '@/routes/roles';
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
                permission: 'systems.manage',
            },
            {
                title: 'Users',
                href: usersIndex(),
                icon: Users,
                cacheTags: 'users',
                permission: 'users.manage',
            },
            {
                title: 'Roles',
                href: rolesIndex(),
                icon: Shield,
                cacheTags: 'roles',
                permission: 'roles.manage',
            },
            {
                title: 'Permissions',
                href: permissionsIndex(),
                icon: KeyRound,
                cacheTags: 'permissions',
                permission: 'roles.manage',
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
                permission: 'components.manage',
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
                permission: 'tables.manage',
            },
        ],
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;

    // Groups whose every item is gated away disappear with their heading,
    // rather than leaving an empty "Backend" label behind.
    const visibleGroups = useMemo(() => {
        const held = new Set(auth?.permissions ?? []);

        return mainNavGroups
            .map((group) => ({
                ...group,
                items: group.items.filter(
                    (item) => !item.permission || held.has(item.permission),
                ),
            }))
            .filter((group) => group.items.length > 0);
    }, [auth?.permissions]);

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
                <NavMain groups={visibleGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
