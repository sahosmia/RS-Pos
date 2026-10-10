import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

/**
 * Stack of collapsible sections (filters, settings groups, help). Built on the Collapsible primitive
 * (no extra dependency): each header is a real `<button aria-expanded aria-controls>` inside a heading,
 * reachable with Tab and toggled with Enter/Space.
 *
 * `type="single"` keeps one section open (pass `collapsible` to allow closing it); `"multiple"` lets any open.
 */
interface AccordionContextValue {
    isOpen: (value: string) => boolean;
    toggle: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const ItemContext = React.createContext<{ value: string; disabled: boolean } | null>(null);

type AccordionProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> &
    (
        | { type: 'single'; value?: string; defaultValue?: string; onValueChange?: (value: string) => void; collapsible?: boolean }
        | { type: 'multiple'; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void; collapsible?: never }
    );

function Accordion({ className, type, value, defaultValue, onValueChange, collapsible, ...props }: AccordionProps) {
    const toArray = (input: string | string[] | undefined): string[] => (input === undefined || input === '' ? [] : Array.isArray(input) ? input : [input]);
    const [internal, setInternal] = React.useState<string[]>(() => toArray(defaultValue));
    const open = value !== undefined ? toArray(value) : internal;

    const context = React.useMemo<AccordionContextValue>(
        () => ({
            isOpen: (item) => open.includes(item),
            toggle: (item) => {
                const isOpen = open.includes(item);
                let next: string[];

                if (type === 'multiple') {
                    next = isOpen ? open.filter((entry) => entry !== item) : [...open, item];
                } else {
                    next = isOpen ? (collapsible === false ? open : []) : [item];
                }

                setInternal(next);

                if (type === 'multiple') {
                    (onValueChange as ((value: string[]) => void) | undefined)?.(next);
                } else {
                    (onValueChange as ((value: string) => void) | undefined)?.(next[0] ?? '');
                }
            },
        }),
        [open, type, collapsible, onValueChange],
    );

    return (
        <AccordionContext.Provider value={context}>
            <div
                data-slot="accordion"
                className={cn('rounded-brand-card border-brand-card-border bg-card divide-brand-card-border divide-y overflow-hidden border', className)}
                {...props}
            />
        </AccordionContext.Provider>
    );
}

interface AccordionItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    value: string;
    disabled?: boolean;
}

function AccordionItem({ value, disabled = false, className, children, ...props }: AccordionItemProps) {
    const accordion = React.useContext(AccordionContext);

    if (!accordion) {
        throw new Error('AccordionItem must be used inside <Accordion>.');
    }

    return (
        <ItemContext.Provider value={{ value, disabled }}>
            <Collapsible asChild open={accordion.isOpen(value)} onOpenChange={() => accordion.toggle(value)} disabled={disabled}>
                <div data-slot="accordion-item" className={className} {...props}>
                    {children}
                </div>
            </Collapsible>
        </ItemContext.Provider>
    );
}

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Icon before the title. */
    icon?: React.ReactNode;
    /** Muted text/badge on the right, before the chevron (e.g. a count or "3 active"). */
    meta?: React.ReactNode;
}

function AccordionTrigger({ className, icon, meta, children, ...props }: AccordionTriggerProps) {
    return (
        <h3 className="flex">
            <CollapsibleTrigger
                className={cn(
                    'group hover:bg-brand-table-row-hover focus-visible:ring-brand-focus-ring flex min-h-11 flex-1 items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium outline-hidden',
                    'motion-colors focus-visible:ring-2 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 ',
                    '[&>svg:first-child]:text-muted-foreground [&>svg:first-child]:size-4 [&>svg:first-child]:shrink-0',
                    className,
                )}
                {...props}
            >
                {icon}
                <span className="min-w-0 flex-1">{children}</span>
                {meta && <span className="text-muted-foreground text-xs font-normal">{meta}</span>}
                <ChevronDown
                    aria-hidden="true"
                    className="text-muted-foreground size-4 shrink-0 motion-transform group-data-[state=open]:rotate-180"
                />
            </CollapsibleTrigger>
        </h3>
    );
}

function AccordionContent({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof CollapsibleContent>) {
    return (
        <CollapsibleContent {...props}>
            <div className={cn('border-brand-card-border border-t px-4 py-3 text-sm', className)}>{children}</div>
        </CollapsibleContent>
    );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
