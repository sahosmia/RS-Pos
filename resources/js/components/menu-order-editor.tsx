import { Button } from '@/components/ui/button';
import { type MenuOrder } from '@/lib/menu-order';
import { type NavItem } from '@/types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Fragment, useState } from 'react';

/** Keeps every key `navItems` actually has, in `saved`'s order where given, appending any new/renamed keys at the end. */
function mergeOrder(defaultKeys: string[], saved: string[] | undefined): string[] {
    if (!saved || saved.length === 0) {
        return defaultKeys;
    }

    const known = new Set(defaultKeys);
    const kept = saved.filter((key) => known.has(key));
    const missing = defaultKeys.filter((key) => !kept.includes(key));

    return [...kept, ...missing];
}

/** Reconciles a possibly-null/partial saved order against the app's current menu tree — always returns a complete order. */
export function buildEffectiveMenuOrder(navItems: NavItem[], saved: MenuOrder | null): MenuOrder {
    const top = mergeOrder(
        navItems.map((item) => item.key),
        saved?.top,
    );

    const sub: Record<string, string[]> = {};
    for (const item of navItems) {
        if (item.items && item.items.length > 0) {
            sub[item.key] = mergeOrder(
                item.items.map((subItem) => subItem.key),
                saved?.sub?.[item.key],
            );
        }
    }

    return { top, sub };
}

function move(order: string[], key: string, direction: -1 | 1): string[] {
    const index = order.indexOf(key);
    const target = index + direction;

    if (index === -1 || target < 0 || target >= order.length) {
        return order;
    }

    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];

    return next;
}

function ReorderRow({
    label,
    disabled,
    onMoveUp,
    onMoveDown,
    className = '',
}: {
    label: string;
    disabled: { up: boolean; down: boolean };
    onMoveUp: () => void;
    onMoveDown: () => void;
    className?: string;
}) {
    return (
        <div className={`flex items-center justify-between gap-4 rounded-lg border p-3 ${className}`}>
            <span className="text-sm">{label}</span>
            <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={disabled.up} onClick={onMoveUp}>
                    <ChevronUp className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={disabled.down} onClick={onMoveDown}>
                    <ChevronDown className="size-4" />
                </Button>
            </div>
        </div>
    );
}

interface MenuOrderEditorProps {
    /** Full nav tree (unfiltered by permission — admins reorder for everyone, not just for what they themselves can see). */
    navItems: NavItem[];
    order: MenuOrder;
    onChange: (order: MenuOrder) => void;
}

/**
 * corrections.md #8 — lets an admin reorder top-level sidebar menus, and
 * each menu's own submenu, independently, via simple up/down buttons (no
 * drag-and-drop library — the checklist explicitly says a simple ordering
 * system is enough when drag-drop would just add complexity).
 */
export default function MenuOrderEditor({ navItems, order, onChange }: MenuOrderEditorProps) {
    const [expanded, setExpanded] = useState<string | null>(null);

    const itemsByKey = new Map(navItems.map((item) => [item.key, item]));
    const orderedTop = order.top.map((key) => itemsByKey.get(key)).filter((item): item is NavItem => !!item);

    return (
        <div className="space-y-2">
            {orderedTop.map((item, index) => {
                const subOrder = item.items ? (order.sub[item.key] ?? item.items.map((subItem) => subItem.key)) : null;
                const subByKey = item.items ? new Map(item.items.map((subItem) => [subItem.key, subItem])) : null;

                return (
                    <Fragment key={item.key}>
                        <ReorderRow
                            label={item.title}
                            disabled={{ up: index === 0, down: index === orderedTop.length - 1 }}
                            onMoveUp={() => onChange({ ...order, top: move(order.top, item.key, -1) })}
                            onMoveDown={() => onChange({ ...order, top: move(order.top, item.key, 1) })}
                            className={item.items ? 'cursor-pointer' : undefined}
                        />

                        {item.items && (
                            <button
                                type="button"
                                onClick={() => setExpanded(expanded === item.key ? null : item.key)}
                                className="text-muted-foreground -mt-1 mb-1 pl-3 text-xs underline underline-offset-2"
                            >
                                {expanded === item.key ? 'Hide submenu order' : 'Edit submenu order'}
                            </button>
                        )}

                        {expanded === item.key && subOrder && subByKey && (
                            <div className="ml-6 space-y-2 border-l pl-4">
                                {subOrder
                                    .map((key) => subByKey.get(key))
                                    .filter((subItem): subItem is NavItem => !!subItem)
                                    .map((subItem, subIndex, subItems) => (
                                        <ReorderRow
                                            key={subItem.key}
                                            label={subItem.title}
                                            disabled={{ up: subIndex === 0, down: subIndex === subItems.length - 1 }}
                                            onMoveUp={() =>
                                                onChange({
                                                    ...order,
                                                    sub: { ...order.sub, [item.key]: move(subOrder, subItem.key, -1) },
                                                })
                                            }
                                            onMoveDown={() =>
                                                onChange({
                                                    ...order,
                                                    sub: { ...order.sub, [item.key]: move(subOrder, subItem.key, 1) },
                                                })
                                            }
                                        />
                                    ))}
                            </div>
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
}
