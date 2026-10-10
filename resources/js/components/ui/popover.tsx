import * as React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

/**
 * Minimal anchored popover (no Radix Popover in this project, and no new dependency). It provides what
 * the date pickers and comboboxes need:
 *
 * - opens below the trigger, flips above when there isn't room, and is clamped inside the viewport;
 * - repositions on scroll/resize;
 * - Escape closes it *without* also closing a surrounding Dialog (handled in the capture phase);
 * - outside press closes it; focus moves in on open and returns to the trigger on close;
 * - inside a Dialog it portals into that dialog (a body portal would be blocked by the dialog's focus trap
 *   and `pointer-events: none`), otherwise into `document.body`.
 *
 * The trigger gets `aria-expanded`, `aria-haspopup` and `aria-controls`. Content is `role="dialog"` (or
 * pass `role` — Combobox uses "listbox" semantics inside its own content).
 */
interface PopoverContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
    triggerRef: React.RefObject<HTMLElement | null>;
    contentId: string;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopover() {
    const context = React.useContext(PopoverContext);

    if (!context) {
        throw new Error('Popover parts must be used inside <Popover>.');
    }

    return context;
}

interface PopoverProps {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}

function Popover({ open: controlledOpen, defaultOpen = false, onOpenChange, children }: PopoverProps) {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const open = controlledOpen ?? internalOpen;
    const triggerRef = React.useRef<HTMLElement | null>(null);
    const contentId = React.useId();

    const setOpen = React.useCallback(
        (next: boolean) => {
            setInternalOpen(next);
            onOpenChange?.(next);
        },
        [onOpenChange],
    );

    const value = React.useMemo(() => ({ open, setOpen, triggerRef, contentId }), [open, setOpen, contentId]);

    return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Use your own element (e.g. a `Button` or `Input`) — it must forward `ref` and accept button props. */
    asChild?: boolean;
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(({ asChild, children, onClick, onKeyDown, ...props }, forwardedRef) => {
    const { open, setOpen, triggerRef, contentId } = usePopover();

    const setRefs = (node: HTMLButtonElement | null) => {
        triggerRef.current = node;

        if (typeof forwardedRef === 'function') {
            forwardedRef(node);
        } else if (forwardedRef) {
            forwardedRef.current = node;
        }
    };

    const triggerProps = {
        'aria-haspopup': 'dialog' as const,
        'aria-expanded': open,
        'aria-controls': open ? contentId : undefined,
        'data-state': open ? 'open' : 'closed',
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(event);

            if (!event.defaultPrevented) {
                setOpen(!open);
            }
        },
        onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
            onKeyDown?.(event);

            if (!event.defaultPrevented && event.key === 'ArrowDown' && !open) {
                event.preventDefault();
                setOpen(true);
            }
        },
        ...props,
    };

    if (asChild && React.isValidElement<Record<string, unknown>>(children)) {
        return React.cloneElement(children, { ...triggerProps, ref: setRefs } as Record<string, unknown>);
    }

    return (
        <button type="button" ref={setRefs} {...triggerProps}>
            {children}
        </button>
    );
});
PopoverTrigger.displayName = 'PopoverTrigger';

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
    /** Match the trigger's width (Combobox) instead of sizing to content (calendars). */
    matchTriggerWidth?: boolean;
    /** Move focus into the panel on open. Default true; turn off when an input inside should take it itself. */
    autoFocus?: boolean;
}

const VIEWPORT_PADDING = 8;

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
    ({ className, align = 'start', sideOffset = 6, matchTriggerWidth = false, autoFocus = true, style, children, ...props }, forwardedRef) => {
        const { open, setOpen, triggerRef, contentId } = usePopover();
        const panelRef = React.useRef<HTMLDivElement | null>(null);
        const [placement, setPlacement] = React.useState<{ top: number; left: number; minWidth?: number; maxHeight: number; ready: boolean }>({
            top: 0,
            left: 0,
            maxHeight: 400,
            ready: false,
        });
        const [container, setContainer] = React.useState<HTMLElement | null>(null);

        const setRefs = (node: HTMLDivElement | null) => {
            panelRef.current = node;

            if (typeof forwardedRef === 'function') {
                forwardedRef(node);
            } else if (forwardedRef) {
                forwardedRef.current = node;
            }
        };

        // Which element to portal into: the enclosing dialog (so its focus trap/pointer lock don't swallow us) or the body.
        React.useLayoutEffect(() => {
            if (open) {
                setContainer((triggerRef.current?.closest('[role="dialog"], [role="alertdialog"]') as HTMLElement | null) ?? document.body);
            }
        }, [open, triggerRef]);

        const reposition = React.useCallback(() => {
            const trigger = triggerRef.current;
            const panel = panelRef.current;

            if (!trigger || !panel || !container) {
                return;
            }

            const t = trigger.getBoundingClientRect();
            const inBody = container === document.body;
            const origin = inBody ? { top: 0, left: 0 } : container.getBoundingClientRect();
            const scroll = inBody ? { top: 0, left: 0 } : { top: container.scrollTop, left: container.scrollLeft };
            const width = panel.offsetWidth;
            const height = panel.scrollHeight;
            const spaceBelow = window.innerHeight - t.bottom - VIEWPORT_PADDING;
            const spaceAbove = t.top - VIEWPORT_PADDING;
            const placeAbove = height + sideOffset > spaceBelow && spaceAbove > spaceBelow;
            const maxHeight = Math.max(160, (placeAbove ? spaceAbove : spaceBelow) - sideOffset);
            const usedHeight = Math.min(height, maxHeight);

            // Viewport coordinates first, then converted to the container's coordinate space.
            let left = align === 'end' ? t.right - width : align === 'center' ? t.left + (t.width - width) / 2 : t.left;
            left = Math.min(Math.max(left, VIEWPORT_PADDING), Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING));
            const top = placeAbove ? t.top - usedHeight - sideOffset : t.bottom + sideOffset;

            setPlacement({
                top: top - origin.top + scroll.top,
                left: left - origin.left + scroll.left,
                minWidth: matchTriggerWidth ? t.width : undefined,
                maxHeight,
                ready: true,
            });
        }, [align, container, matchTriggerWidth, sideOffset, triggerRef]);

        React.useLayoutEffect(() => {
            if (!open || !container) {
                return;
            }

            reposition();
            window.addEventListener('resize', reposition);
            window.addEventListener('scroll', reposition, true);

            // Content size changes (month with 6 weeks, async results) re-run the placement.
            const observer = typeof ResizeObserver !== 'undefined' && panelRef.current ? new ResizeObserver(reposition) : null;

            if (observer && panelRef.current) {
                observer.observe(panelRef.current);
            }

            return () => {
                window.removeEventListener('resize', reposition);
                window.removeEventListener('scroll', reposition, true);
                observer?.disconnect();
            };
        }, [open, container, reposition]);

        // Escape + outside press. Window capture runs before a Dialog's document-level Escape handler.
        React.useEffect(() => {
            if (!open) {
                return;
            }

            const trigger = triggerRef.current;

            const onKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    event.stopPropagation();
                    setOpen(false);
                    trigger?.focus();
                }
            };

            const onPointerDown = (event: PointerEvent) => {
                const target = event.target as Node;

                if (!panelRef.current?.contains(target) && !trigger?.contains(target)) {
                    setOpen(false);
                }
            };

            window.addEventListener('keydown', onKeyDown, true);
            document.addEventListener('pointerdown', onPointerDown, true);

            return () => {
                window.removeEventListener('keydown', onKeyDown, true);
                document.removeEventListener('pointerdown', onPointerDown, true);
            };
        }, [open, setOpen, triggerRef]);

        // Focus into the panel once placed, so keyboard users land in it.
        React.useEffect(() => {
            if (open && autoFocus && placement.ready) {
                const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus], [tabindex="0"], input, button:not([disabled])');
                (target ?? panelRef.current)?.focus({ preventScroll: true });
            }
            // Only when it first becomes ready.
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [open, placement.ready]);

        React.useEffect(() => {
            if (!open) {
                setPlacement((current) => ({ ...current, ready: false }));
            }
        }, [open]);

        if (!open || !container) {
            return null;
        }

        return createPortal(
            <div
                ref={setRefs}
                id={contentId}
                role="dialog"
                tabIndex={-1}
                data-state="open"
                style={{
                    // Body portal: viewport coordinates → fixed. Dialog portal: container-relative → absolute.
                    position: container === document.body ? 'fixed' : 'absolute',
                    top: placement.top,
                    left: placement.left,
                    minWidth: placement.minWidth,
                    maxHeight: placement.maxHeight,
                    visibility: placement.ready ? 'visible' : 'hidden',
                    pointerEvents: 'auto',
                    ...style,
                }}
                className={cn(
                    'z-[80] max-w-[calc(100vw-1rem)] overflow-auto rounded-brand-control border border-brand-popover-border bg-popover text-popover-foreground outline-hidden',
                    'shadow-[var(--brand-popover-shadow)] animate-in fade-in-0 duration-fast motion-reduce:animate-none',
                    className,
                )}
                {...props}
            >
                {children}
            </div>,
            container,
        );
    },
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverContent, PopoverTrigger };
