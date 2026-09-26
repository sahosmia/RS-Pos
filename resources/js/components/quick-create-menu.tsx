import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { router } from '@inertiajs/react';
import { Boxes, ClipboardList, type LucideIcon, Package, Plus, Receipt, ShoppingBag, UserPlus, Wallet } from 'lucide-react';

interface QuickCreateItem {
    label: string;
    icon: LucideIcon;
    href: string;
}

interface QuickCreateGroup {
    heading: string;
    items: QuickCreateItem[];
}

// Resources with a dedicated /create page link straight there. Contacts,
// Expenses and Assets create through a modal on their own index page instead
// (no standalone create route), so these link to that index with
// `?quick_create=1` — each page auto-opens its Add modal on arrival when it
// sees that flag (see the `useEffect` in each page's index.tsx). Built inside
// the component (not at module scope) since it calls Ziggy's `route()`.
function buildGroups(): QuickCreateGroup[] {
    return [
        {
            heading: 'Contacts',
            items: [
                { label: 'New Customer', icon: UserPlus, href: route('contacts.index', { type: 'customer', quick_create: '1' }) },
                { label: 'New Supplier', icon: UserPlus, href: route('contacts.index', { type: 'supplier', quick_create: '1' }) },
            ],
        },
        {
            heading: 'Sales & Purchases',
            items: [
                { label: 'New Sale', icon: Receipt, href: route('sales.create') },
                { label: 'New Purchase', icon: ShoppingBag, href: route('purchases.create') },
                { label: 'New Sales Order', icon: ClipboardList, href: route('sales-orders.create') },
            ],
        },
        {
            heading: 'Catalog',
            items: [{ label: 'New Product', icon: Package, href: route('products.create') }],
        },
        {
            heading: 'Finance',
            items: [
                { label: 'New Expense', icon: Wallet, href: route('expenses.index', { quick_create: '1' }) },
                { label: 'New Asset', icon: Boxes, href: route('assets.index', { quick_create: '1' }) },
            ],
        },
    ];
}

/**
 * A global "+ Quick Create" menu in the header, reachable from anywhere in
 * the app instead of only from each resource's own list page.
 */
export default function QuickCreateMenu() {
    const groups = buildGroups();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5">
                    <Plus className="size-4" />
                    <span className="hidden sm:inline">Quick Create</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {groups.map((group, index) => (
                    <DropdownMenuGroup key={group.heading}>
                        {index > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">{group.heading}</DropdownMenuLabel>
                        {group.items.map((item) => (
                            <DropdownMenuItem key={item.label} onSelect={() => router.visit(item.href)}>
                                <item.icon />
                                {item.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
