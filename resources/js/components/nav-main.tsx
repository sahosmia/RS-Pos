import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useSidebarState } from '@/hooks/use-sidebar-state';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useEffect } from 'react';

/**
 * A leaf item is active on an exact path match, or on a nested route below
 * it (e.g. `/products/5/edit` under `/products`) — but a query-string item
 * (`/contacts?type=supplier`) only needs the current URL to carry that same
 * `type=supplier`, not match query-for-query. It used to require an exact
 * match, which broke the moment the page's own filter bar added anything
 * else to the URL (search, sort, customer_group_id, ...) — e.g. switching
 * the in-page Type filter to "Customer" while on `/contacts?type=supplier`
 * left the sidebar showing neither item active (doc/corrections2.md).
 */
function isItemActive(itemUrl: string, currentUrl: string): boolean {
    const [itemPath, itemQuery] = itemUrl.split('?');
    const [currentPath, currentQuery] = currentUrl.split('?');

    if (itemQuery) {
        if (itemPath !== currentPath) {
            return false;
        }

        const itemParams = new URLSearchParams(itemQuery);
        const currentParams = new URLSearchParams(currentQuery);

        return [...itemParams.entries()].every(([key, value]) => currentParams.get(key) === value);
    }

    return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

/**
 * Among a group of sibling sub-items, several can match the current URL at
 * once (e.g. "Products" and "Add Product" both match `/products/create`) —
 * pick only the most specific one (longest URL) so exactly one lights up.
 */
function findActiveSubItem(subItems: NavItem[], currentUrl: string): NavItem | undefined {
    return subItems
        .filter((subItem) => isItemActive(subItem.url, currentUrl))
        .reduce<NavItem | undefined>((best, candidate) => (!best || candidate.url.length > best.url.length ? candidate : best), undefined);
}

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const { state, update } = useSidebarState();
    // Collapsed to icons: the inline submenu is hidden, so a parent opens a popup of its sub-items instead.
    const { state: sidebarState, isMobile } = useSidebar();
    const iconOnly = sidebarState === 'collapsed' && !isMobile;

    // Single-accordion behavior (doc/corrections2.md #1) — at most one parent
    // menu is open at a time, so `groups` only ever holds one key.
    const expandedGroups = state.groups;
    const activeGroupKey = items.find((item) => item.items && findActiveSubItem(item.items, page.url))?.key;

    // Navigating into a menu opens it (and collapses whatever else was open)
    // once — after that the user can still collapse it by hand.
    useEffect(() => {
        if (activeGroupKey && !state.groups.includes(activeGroupKey)) {
            update({ groups: [activeGroupKey] });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the page (not the user's manual toggles) changes
    }, [activeGroupKey, page.url]);

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    if (!item.items || item.items.length === 0) {
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild isActive={isItemActive(item.url, page.url)} tooltip={item.title}>
                                    <Link href={item.url}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    }

                    const activeSubItem = findActiveSubItem(item.items, page.url);

                    if (iconOnly) {
                        return (
                            <SidebarMenuItem key={item.key}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton isActive={!!activeSubItem} tooltip={item.title}>
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="right" align="start" sideOffset={8} className="min-w-48">
                                        <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">{item.title}</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {item.items.map((subItem) => (
                                            <DropdownMenuItem key={subItem.title} asChild>
                                                <Link href={subItem.url} className={cn('cursor-pointer', subItem === activeSubItem && 'bg-accent font-medium')}>
                                                    {subItem.title}
                                                </Link>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </SidebarMenuItem>
                        );
                    }

                    return (
                        <Collapsible
                            key={item.key}
                            asChild
                            open={expandedGroups.includes(item.key)}
                            onOpenChange={(open) => update({ groups: open ? [item.key] : [] })}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton isActive={!!activeSubItem} tooltip={item.title}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-[collapsible-up_200ms_ease-out] data-[state=open]:animate-[collapsible-down_200ms_ease-out]">
                                    <SidebarMenuSub>
                                        {item.items.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.title}>
                                                <SidebarMenuSubButton asChild isActive={subItem === activeSubItem}>
                                                    <Link href={subItem.url}>
                                                        <span>{subItem.title}</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
