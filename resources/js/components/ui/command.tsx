import { Command as CommandPrimitive } from 'cmdk';
import { Loader2, Search } from 'lucide-react';
import * as React from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Brand command palette / searchable list on top of `cmdk` (which supplies the combobox/listbox ARIA,
 * arrow-key + typeahead navigation, and optional client-side filtering). Rows share the menu item look.
 * Use `shouldFilter={false}` when results come from the server.
 */
const Command = React.forwardRef<React.ElementRef<typeof CommandPrimitive>, React.ComponentPropsWithoutRef<typeof CommandPrimitive>>(
    ({ className, ...props }, ref) => (
        <CommandPrimitive
            ref={ref}
            className={cn('flex h-full w-full flex-col overflow-hidden rounded-[inherit] bg-popover text-popover-foreground', className)}
            {...props}
        />
    ),
);
Command.displayName = CommandPrimitive.displayName;

/** A command palette in a dialog (Ctrl/⌘+K). Title and description are screen-reader only. */
function CommandDialog({
    open,
    onOpenChange,
    title = 'Command palette',
    description = 'Search and press Enter to select',
    shouldFilter,
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    shouldFilter?: boolean;
    children: React.ReactNode;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent hideClose className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <DialogDescription className="sr-only">{description}</DialogDescription>
                <Command shouldFilter={shouldFilter}>{children}</Command>
            </DialogContent>
        </Dialog>
    );
}

const CommandInput = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Input>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>>(
    ({ className, ...props }, ref) => (
        <div className="border-brand-card-border flex items-center gap-2 border-b px-3" cmdk-input-wrapper="">
            <Search className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <CommandPrimitive.Input
                ref={ref}
                className={cn(
                    'placeholder:text-brand-control-placeholder flex h-11 w-full bg-transparent py-3 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                    className,
                )}
                {...props}
            />
        </div>
    ),
);
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<React.ElementRef<typeof CommandPrimitive.List>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>>(
    ({ className, ...props }, ref) => (
        <CommandPrimitive.List ref={ref} className={cn('scrollbar-thin max-h-80 overflow-x-hidden overflow-y-auto overscroll-contain p-1', className)} {...props} />
    ),
);
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Empty>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>>(
    ({ className, ...props }, ref) => <CommandPrimitive.Empty ref={ref} className={cn('text-muted-foreground px-3 py-6 text-center text-sm', className)} {...props} />,
);
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

/** Row shown while results load (server search). Keeps the list height stable instead of flashing "No results". */
const CommandLoading = ({ label = 'Searching...', className }: { label?: string; className?: string }) => (
    <CommandPrimitive.Loading>
        <div className={cn('text-muted-foreground flex items-center justify-center gap-2 px-3 py-6 text-sm', className)}>
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {label}
        </div>
    </CommandPrimitive.Loading>
);

const CommandGroup = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Group>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>>(
    ({ className, ...props }, ref) => (
        <CommandPrimitive.Group
            ref={ref}
            className={cn(
                'text-foreground overflow-hidden [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground',
                className,
            )}
            {...props}
        />
    ),
);
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => <CommandPrimitive.Separator ref={ref} className={cn('bg-brand-card-border -mx-1 my-1 h-px', className)} {...props} />);
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Item>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>>(
    ({ className, ...props }, ref) => (
        <CommandPrimitive.Item
            ref={ref}
            className={cn(
                'relative flex min-h-9 cursor-default items-center gap-2.5 rounded-[calc(var(--brand-control-radius)-3px)] px-2.5 py-1.5 text-sm outline-none select-none',
                'aria-selected:bg-brand-secondary aria-selected:text-foreground',
                'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-45',
                '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
                className,
            )}
            {...props}
        />
    ),
);
CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
    <span className={cn('text-muted-foreground ml-auto pl-4 text-xs tracking-wide tabular-nums', className)} {...props} />
);
CommandShortcut.displayName = 'CommandShortcut';

export {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandLoading,
    CommandSeparator,
    CommandShortcut,
};
