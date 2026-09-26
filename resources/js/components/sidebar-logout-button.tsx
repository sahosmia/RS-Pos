import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { Link } from '@inertiajs/react';
import { LogOut } from 'lucide-react';

/**
 * A dedicated, always-visible logout action pinned to the sidebar footer
 * (doc/corrections2.md #3) — separate from the profile dropdown that now
 * lives in the header, so signing out never needs a second click through a
 * menu. Collapses to just the icon (with a tooltip) in icon-collapsed mode,
 * same as every other `SidebarMenuButton`.
 */
export default function SidebarLogoutButton() {
    const cleanup = useMobileNavigation();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Log out" className="text-destructive hover:text-destructive">
                    <Link method="post" href={route('logout')} as="button" onClick={cleanup}>
                        <LogOut />
                        <span>Log out</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
