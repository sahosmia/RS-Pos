import { Breadcrumbs } from '@/components/breadcrumbs';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import GlobalSearchDialog from '@/components/global-search-dialog';
import HeaderUserMenu from '@/components/header-user-menu';
import QuickCreateMenu from '@/components/quick-create-menu';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';

/**
 * Dark mode / language used to live here as permanent icon dropdowns —
 * moved into Settings → Appearance (corrections.md #7) to keep the header
 * minimal; each is now a per-user, DB-persisted preference there instead.
 * The Keyboard Shortcuts reference has since moved out the same way, into
 * Business Settings.
 *
 * The account/profile dropdown now lives here too (doc/corrections2.md #3)
 * — relocated from the sidebar footer, which is now a dedicated Logout
 * button (`SidebarLogoutButton`) instead.
 */
export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    return (
        <header className="border-sidebar-border/50 sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:px-4 md:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                <QuickCreateMenu />
                <GlobalSearchDialog />
                <FullscreenToggle />
                <Separator orientation="vertical" className="hidden h-6 sm:block" />
                <HeaderUserMenu />
            </div>
        </header>
    );
}
