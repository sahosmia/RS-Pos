import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link } from '@inertiajs/react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Fragment } from 'react';

interface RowActionBase {
    label: string;
    icon?: LucideIcon;
    variant?: 'default' | 'destructive';
    /** Greyed-out and not selectable (e.g. "Delete" on a record that can't be deleted). */
    disabled?: boolean;
    /** Muted second line under the label. */
    description?: string;
    /** Omit this action entirely — lets a page drop Edit/Delete when they don't apply. */
    hidden?: boolean;
    /** Draws a separator above this item, e.g. before a destructive action. */
    separatorBefore?: boolean;
}

/** Renders as a `Link` (`href`) or a button (`onClick`) — never both on the same action. */
export type RowAction = (RowActionBase & { href: string; onClick?: never }) | (RowActionBase & { onClick: () => void; href?: never });

interface DataTableRowActionsProps {
    actions: RowAction[];
}

/**
 * Per-row "..." menu shared by every list page's Datatable — pass whatever
 * actions apply (Edit/Delete are common but not required) and add page-specific
 * ones (e.g. "Adjust stock") alongside them.
 */
export default function DataTableRowActions({ actions }: DataTableRowActionsProps) {
    const visible = actions.filter((action) => !action.hidden);

    if (visible.length === 0) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={(event) => event.stopPropagation()}>
                    <MoreHorizontal />
                    <span className="sr-only">Open actions menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {visible.map((action, index) => {
                    const Icon = action.icon;
                    const content = (
                        <>
                            {Icon && <Icon />}
                            {action.label}
                        </>
                    );

                    return (
                        <Fragment key={action.label}>
                            {action.separatorBefore && index > 0 && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                                asChild={!!action.href}
                                onClick={action.onClick}
                                variant={action.variant}
                                disabled={action.disabled}
                                {...(!action.href && { icon: Icon && <Icon />, description: action.description })}
                            >
                                {action.href ? <Link href={action.href}>{content}</Link> : action.label}
                            </DropdownMenuItem>
                        </Fragment>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
