import { cn } from '@/lib/utils';
import { resolveQuickActions, type QuickActionDefinition } from '@/lib/quick-actions';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Ctrl+Space opens a quick-action list; keep Ctrl held and press Space again to step to the next
 * action (Shift+Space steps back), and release Ctrl to open the highlighted one — the same feel as
 * Alt+Tab. Esc cancels. Which actions appear, and in what order, is set in Business Settings.
 */
export default function QuickActionSwitcher() {
    const { shop, auth } = usePage<SharedData>().props;
    const actions = useMemo(() => resolveQuickActions(shop.quick_actions, auth.permissions), [shop.quick_actions, auth.permissions]);

    const [open, setOpen] = useState(false);
    const [index, setIndex] = useState(0);

    // The key listeners are attached once, so they read the latest state through refs, not closures.
    const openRef = useRef(false);
    const indexRef = useRef(0);
    const actionsRef = useRef<QuickActionDefinition[]>(actions);
    actionsRef.current = actions;

    const show = useCallback((next: boolean) => {
        openRef.current = next;
        setOpen(next);
    }, []);

    const select = useCallback((next: number) => {
        indexRef.current = next;
        setIndex(next);
    }, []);

    const run = useCallback(
        (action: QuickActionDefinition | undefined) => {
            show(false);

            if (action) {
                router.visit(action.href());
            }
        },
        [show],
    );

    useEffect(() => {
        const step = (direction: 1 | -1) => {
            const total = actionsRef.current.length;
            select((indexRef.current + direction + total) % total);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                e.stopPropagation();

                if (e.repeat || actionsRef.current.length === 0) {
                    return;
                }

                if (!openRef.current) {
                    select(0);
                    show(true);
                } else {
                    step(e.shiftKey ? -1 : 1);
                }

                return;
            }

            if (!openRef.current) {
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                show(false);
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                step(e.key === 'ArrowDown' ? 1 : -1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                run(actionsRef.current[indexRef.current]);
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (openRef.current && e.key === 'Control') {
                run(actionsRef.current[indexRef.current]);
            }
        };

        // Alt-Tabbing away (or any focus loss) while the list is open must not fire an action.
        const onBlur = () => {
            if (openRef.current) {
                show(false);
            }
        };

        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp, true);
        window.addEventListener('blur', onBlur);

        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('keyup', onKeyUp, true);
            window.removeEventListener('blur', onBlur);
        };
    }, [run, select, show]);

    if (!open || actions.length === 0) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-100 flex items-start justify-center bg-black/40 pt-[18vh] backdrop-blur-[1px]" onMouseDown={() => show(false)}>
            <div
                role="dialog"
                aria-label="Quick actions"
                className="bg-popover text-popover-foreground w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-2xl"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="text-muted-foreground border-b px-4 py-2.5 text-xs font-medium tracking-wide uppercase">Quick actions</div>

                <ul role="listbox" aria-activedescendant={`quick-action-${actions[index]?.key}`} className="p-1.5">
                    {actions.map((action, position) => (
                        <li
                            key={action.key}
                            id={`quick-action-${action.key}`}
                            role="option"
                            aria-selected={position === index}
                            onMouseEnter={() => select(position)}
                            onClick={() => run(action)}
                            className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                                position === index ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                            )}
                        >
                            <action.icon className="size-4 shrink-0" />
                            <span className="flex-1 truncate font-medium">{action.label}</span>
                        </li>
                    ))}
                </ul>

                <div className="text-muted-foreground border-t px-4 py-2 text-[11px] leading-4">
                    <kbd className="font-mono">Ctrl</kbd> ধরে রেখে <kbd className="font-mono">Space</kbd> চাপলে পরেরটায় যাবে · ছেড়ে দিলে খুলবে · <kbd className="font-mono">Esc</kbd> বাতিল
                </div>
            </div>
        </div>
    );
}
