import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, BookText, DatabaseBackup, Folder, LayoutGrid, Package, Receipt, Settings, ShoppingCart, Users, Wallet } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Sales',
        url: '/sales',
        icon: Receipt,
    },
    {
        title: 'Product',
        url: '/products',
        icon: Package,
        items: [
            { title: 'Products', url: '/products' },
            { title: 'Category', url: '/categories' },
            { title: 'Unit', url: '/units' },
            { title: 'Brand', url: '/brands' },
        ],
    },
    {
        title: 'Contact',
        url: '/contacts',
        icon: Users,
        items: [
            { title: 'Supplier', url: '/contacts?type=supplier' },
            { title: 'Customer', url: '/contacts?type=customer' },
            { title: 'Customer Group', url: '/customer-groups' },
        ],
    },
    {
        title: 'Purchases',
        url: '/purchases',
        icon: ShoppingCart,
    },
    {
        title: 'Payment Accounts',
        url: '/accounts',
        icon: Wallet,
        items: [
            { title: 'Accounts', url: '/accounts' },
            { title: 'Petty Cash', url: '/cash-book' },
        ],
    },
    {
        title: 'Accounting',
        url: '/chart-of-accounts',
        icon: BookText,
        items: [
            { title: 'Chart of Accounts', url: '/chart-of-accounts' },
            { title: 'Journal Entries', url: '/journal-entries' },
            { title: 'Accounting Periods', url: '/accounting-periods' },
        ],
    },
    {
        title: 'Backups',
        url: '/backups',
        icon: DatabaseBackup,
    },
    {
        title: 'Business Settings',
        url: '/business-settings',
        icon: Settings,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        url: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        url: 'https://laravel.com/docs/starter-kits',
        icon: BookOpen,
    },
];

export function AppSidebar() {
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
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
