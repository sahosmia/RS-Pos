import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Brand tooltip. Use for icon-only buttons, collapsed-sidebar labels and secondary hints — never for
 * information people must see (it doesn't appear on touch, and disappears on blur). Radix links it to its
 * trigger with `aria-describedby`; icon-only controls still need their own `aria-label`.
 */
/** Opens after 200ms (Radix's default is 700ms, which feels broken in a dense UI); skip delay between neighbouring tips. */
const TooltipProvider = ({ delayDuration = 200, skipDelayDuration = 300, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) => (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration} {...props} />
);

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, collisionPadding = 8, ...props }, ref) => (
    <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
            'z-50 max-w-xs overflow-hidden rounded-[calc(var(--brand-control-radius)-2px)] border border-brand-control-border bg-popover px-2.5 py-1.5 text-xs leading-4 text-popover-foreground shadow-[var(--brand-popover-shadow)] animate-in fade-in-0 duration-fast motion-reduce:animate-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            className,
        )}
        {...props}
    />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

interface TipProps {
    /** The tooltip text. */
    label: React.ReactNode;
    /** Optional keyboard hint shown after the label, e.g. `Ctrl+K`. Display only. */
    shortcut?: string;
    side?: React.ComponentProps<typeof TooltipContent>['side'];
    /** Hover delay in ms before it opens. Default 200 so passing the pointer over buttons doesn't flicker tips. */
    delayDuration?: number;
    /** The trigger element (a Button, link…). It must accept a ref and focus. */
    children: React.ReactElement;
}

/** One-line tooltip: `<Tip label="Edit"><Button size="icon" aria-label="Edit">…</Button></Tip>`. */
function Tip({ label, shortcut, side, delayDuration = 200, children }: TipProps) {
    return (
        // Self-contained: Radix needs a Provider above any Tooltip, so `Tip` brings its own.
        <TooltipProvider delayDuration={delayDuration}>
            <Tooltip>
                <TooltipTrigger asChild>{children}</TooltipTrigger>
                <TooltipContent side={side}>
                    {label}
                    {shortcut && <kbd className="text-muted-foreground bg-brand-secondary ml-2 rounded-sm px-1 font-sans text-[0.6875rem]">{shortcut}</kbd>}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export { Tip, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
