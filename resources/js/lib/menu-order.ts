import { type NavItem } from '@/types';

// A `type` (not an `interface`) so it's assignable to Inertia's FormDataConvertible for `useForm`.
export type MenuOrder = {
    top: string[];
    sub: Record<string, string[]>;
};

/**
 * Sorts `items` by their position in `order` (an array of `key`s) — any item
 * whose key isn't listed (a brand-new menu added after the order was last
 * saved, or one already hidden by a permission filter) keeps its original
 * relative position at the end, since `Array#sort` is stable. `order` being
 * empty/undefined is "no custom order yet" — items stay in their built-in order.
 */
function sortByOrder<T extends { key: string }>(items: T[], order: string[] | undefined): T[] {
    if (!order || order.length === 0) {
        return items;
    }

    const position = new Map(order.map((key, index) => [key, index]));

    return [...items].sort((a, b) => (position.get(a.key) ?? Infinity) - (position.get(b.key) ?? Infinity));
}

/**
 * Applies an admin-configured sidebar order (corrections.md #8) to an
 * already permission-filtered nav tree — top-level items by `menuOrder.top`,
 * and each parent's own sub-items by `menuOrder.sub[parent.key]`, so parent
 * and submenu order can be configured independently.
 */
export function applyMenuOrder(items: NavItem[], menuOrder: MenuOrder | null): NavItem[] {
    return sortByOrder(items, menuOrder?.top).map((item) =>
        item.items ? { ...item, items: sortByOrder(item.items, menuOrder?.sub[item.key]) } : item,
    );
}
