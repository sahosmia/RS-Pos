import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Brand tabs. Radix provides roles, roving focus, arrow-key / Home / End navigation and activation;
 * the look comes from `--brand-*` tokens.
 *
 * - `boxed` (default): compact segmented control — for switching a view or a pair of related lists.
 * - `underline`: page-section navigation (details, settings, reports). The active tab gets a 2px brand
 *   indicator *and* stronger text, so state isn't carried by colour alone.
 *
 * Both scroll horizontally on narrow screens instead of wrapping, and keep 40px / 32px touch heights.
 */
type TabsVariant = 'boxed' | 'underline';

const TabsVariantContext = React.createContext<TabsVariant>('boxed');

const Tabs = TabsPrimitive.Root;

/** Underline look, shared with `PageTabs` (links) so route-based and in-page tabs are identical. */
export const underlineTabListClasses = 'border-brand-card-border flex w-full items-end gap-1 border-b';
export const underlineTabClasses = [
    'inline-flex shrink-0 items-center justify-center gap-2 text-sm leading-5 font-medium whitespace-nowrap outline-hidden motion-colors',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    '-mb-px h-10 rounded-t-[calc(var(--brand-control-radius)-3px)] border-b-2 border-transparent px-3 text-muted-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-focus-ring',
    'hover:border-brand-control-border-hover hover:text-foreground',
    'data-[state=active]:border-brand-primary data-[state=active]:text-foreground',
].join(' ');

interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
    variant?: TabsVariant;
}

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, TabsListProps>(({ className, variant = 'boxed', ...props }, ref) => (
    <TabsVariantContext.Provider value={variant}>
        <TabsPrimitive.List
            ref={ref}
            className={cn(
                'scrollbar-none max-w-full overflow-x-auto',
                variant === 'boxed' && 'rounded-brand-control bg-brand-secondary text-muted-foreground inline-flex h-9 items-center gap-0.5 p-0.5',
                variant === 'underline' && 'border-brand-card-border flex w-full items-end gap-1 border-b',
                className,
            )}
            {...props}
        />
    </TabsVariantContext.Provider>
));
TabsList.displayName = TabsPrimitive.List.displayName;

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
    /** Icon before the label (decorative). */
    icon?: React.ReactNode;
    /** Count badge after the label, e.g. open invoices. `0` is shown; `undefined` hides it. */
    count?: number | string;
}

const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(
    ({ className, icon, count, children, ...props }, ref) => {
        const variant = React.useContext(TabsVariantContext);

        return (
            <TabsPrimitive.Trigger
                ref={ref}
                className={cn(
                    'inline-flex shrink-0 items-center justify-center gap-2 text-sm leading-5 font-medium whitespace-nowrap outline-hidden',
                    'motion-colors',
                    'focus-visible:ring-brand-focus-ring disabled:pointer-events-none disabled:opacity-50',
                    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
                    variant === 'boxed' && [
                        'h-8 rounded-[calc(var(--brand-control-radius)-2px)] px-3 focus-visible:ring-2',
                        'hover:text-foreground',
                        'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_2px_rgb(0_0_0/0.1)]',
                    ],
                    variant === 'underline' && [
                        '-mb-px h-10 rounded-t-[calc(var(--brand-control-radius)-3px)] border-b-2 border-transparent px-3 text-muted-foreground focus-visible:ring-2 focus-visible:ring-inset',
                        'hover:border-brand-control-border-hover hover:text-foreground',
                        'data-[state=active]:border-brand-primary data-[state=active]:text-foreground',
                    ],
                    className,
                )}
                {...props}
            >
                {icon}
                {children}
                {count !== undefined && (
                    <Badge variant="neutral" size="xs" count>
                        {count}
                    </Badge>
                )}
            </TabsPrimitive.Trigger>
        );
    },
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
    ({ className, ...props }, ref) => (
        <TabsPrimitive.Content
            ref={ref}
            className={cn('mt-3 rounded-sm outline-hidden focus-visible:ring-2 focus-visible:ring-brand-focus-ring focus-visible:ring-offset-2 ring-offset-background', className)}
            {...props}
        />
    ),
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
export type { TabsVariant };
