import { NavMain } from '@/components/nav-main';
import SidebarLogoutButton from '@/components/sidebar-logout-button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useTranslation } from '@/hooks/use-translation';
import { applyMenuOrder } from '@/lib/menu-order';
import { buildMainNavItems, filterNavByPermission } from '@/lib/nav-items';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { shop, auth } = usePage<SharedData>().props;
    const { t } = useTranslation();
    const permittedNavItems = filterNavByPermission(buildMainNavItems(shop.emi_module_enabled, t), auth.permissions);
    const mainNavItems = applyMenuOrder(permittedNavItems, shop.menu_order);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <SidebarLogoutButton />
            </SidebarFooter>
        </Sidebar>
    );
}
