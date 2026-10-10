'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Brand menu. Radix supplies roles, roving focus, typeahead, submenus and collision handling;
 * everything visual comes from the `--brand-*` tokens (same surface as Select and Tooltip).
 * Menus hold no business logic — consumers pass items and handlers.
 */
const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

/** Floating panel. Capped to the space Radix reports as available, so it scrolls instead of leaving the viewport. */
const surface = [
    'z-50 min-w-44 max-w-[calc(100vw-1rem)] overflow-x-hidden overflow-y-auto rounded-brand-control border border-brand-popover-border bg-popover p-1 text-popover-foreground',
    'shadow-[var(--brand-popover-shadow)] duration-fast motion-reduce:animate-none',
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.97] data-[state=open]:zoom-in-[0.97]',
    'data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
].join(' ');

const itemRadius = 'rounded-[calc(var(--brand-control-radius)-3px)]';

/** Row look shared by items, check/radio items and sub-triggers. */
const row = [
    'relative flex min-h-8 cursor-default items-center gap-2.5 px-2.5 py-1.5 text-sm leading-5 outline-hidden select-none',
    'motion-colors',
    'focus:bg-brand-secondary focus:text-foreground data-[highlighted]:bg-brand-secondary',
    'data-disabled:pointer-events-none data-disabled:opacity-45',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg:not([class*="text-"])]:text-muted-foreground focus:[&_svg:not([class*="text-"])]:text-foreground',
].join(' ');

const DropdownMenuSubTrigger = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
        inset?: boolean;
    }
>(({ className, inset, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
        ref={ref}
        className={cn(row, itemRadius, 'data-[state=open]:bg-brand-secondary', inset && 'pl-8', className)}
        {...props}
    >
        {children}
        <ChevronRight className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.SubContent
        ref={ref}
        collisionPadding={8}
        className={cn(surface, 'max-h-(--radix-dropdown-menu-content-available-height)', className)}
        {...props}
    />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, collisionPadding = 8, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            collisionPadding={collisionPadding}
            className={cn(surface, 'max-h-(--radix-dropdown-menu-content-available-height)', className)}
            {...props}
        />
    </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
    inset?: boolean;
    /** `destructive` reads as danger (text colour + soft red hover) without shouting. */
    variant?: 'default' | 'destructive';
    /** Leading icon. Alternatively put an icon element in `children` (still supported). */
    icon?: React.ReactNode;
    /** Second, muted line under the label. */
    description?: React.ReactNode;
    /** Right-aligned keyboard hint, e.g. `⌘K` (display only — wire the real shortcut yourself). */
    shortcut?: React.ReactNode;
}

const DropdownMenuItem = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Item>, DropdownMenuItemProps>(
    ({ className, inset, variant = 'default', icon, description, shortcut, children, asChild, ...props }, ref) => {
        // Structured content only when asked for; plain `children` (and `asChild` links) render untouched.
        const structured = !asChild && (icon || description || shortcut);

        return (
            <DropdownMenuPrimitive.Item
                ref={ref}
                asChild={asChild}
                data-variant={variant}
                className={cn(
                    row,
                    itemRadius,
                    'data-[variant=destructive]:text-brand-danger-text data-[variant=destructive]:focus:bg-brand-danger/10 data-[variant=destructive]:focus:text-brand-danger-text data-[variant=destructive]:[&_svg]:text-brand-danger-text!',
                    inset && 'pl-8',
                    description && 'items-start',
                    className,
                )}
                {...props}
            >
                {structured ? (
                    <>
                        {icon}
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate">{children}</span>
                            {description && <span className="text-muted-foreground truncate text-xs leading-4">{description}</span>}
                        </span>
                        {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
                    </>
                ) : (
                    children
                )}
            </DropdownMenuPrimitive.Item>
        );
    },
);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem ref={ref} className={cn(row, itemRadius, 'pl-8', className)} checked={checked} {...props}>
        <span className="absolute left-2.5 flex size-4 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <Check className="text-brand-primary size-4" />
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
    </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem ref={ref} className={cn(row, itemRadius, 'pl-8', className)} {...props}>
        <span className="absolute left-2.5 flex size-4 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <span className="bg-brand-primary block size-2 rounded-full" />
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
    </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

/** Small section heading inside a menu ("Contacts", "Finance"). Not focusable. */
const DropdownMenuLabel = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Label>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
        inset?: boolean;
    }
>(({ className, inset, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
        ref={ref}
        className={cn('text-muted-foreground px-2.5 py-1.5 text-xs leading-4 font-semibold tracking-wide', inset && 'pl-8', className)}
        {...props}
    />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator ref={ref} className={cn('bg-brand-card-border -mx-1 my-1 h-px', className)} {...props} />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
    return <span className={cn('text-muted-foreground ml-auto pl-4 text-xs tracking-wide tabular-nums', className)} {...props} />;
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
};
