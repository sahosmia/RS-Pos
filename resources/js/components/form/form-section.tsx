import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

const ACCENTS = {
    primary: 'bg-primary/10 text-primary ring-primary/20',
    sky: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
    violet: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
};

interface FormSectionProps {
    title: string;
    description?: string;
    /** Chip in front of the title; omit for a plain titled card. */
    icon?: LucideIcon;
    /** Colour of the icon chip — `primary` follows the shop's theme colour. */
    accent?: keyof typeof ACCENTS;
    /** Right-aligned slot in the header, e.g. an "Add" button. */
    action?: ReactNode;
    /** Extra classes for the body (default is plain `p-4`), e.g. `space-y-5` to stack the children. */
    contentClassName?: string;
    children: ReactNode;
}

/** A titled card that groups one block of a long form or settings page. */
export function FormSection({ title, description, icon: Icon, accent = 'sky', action, contentClassName, children }: FormSectionProps) {
    return (
        <Card className="overflow-hidden shadow-xs">
            <CardHeader className="bg-muted/30 flex flex-row items-center justify-between gap-3 space-y-0 border-b px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    {Icon && (
                        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg ring-1', ACCENTS[accent])}>
                            <Icon className="size-4" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
                        {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
                    </div>
                </div>
                {action}
            </CardHeader>
            <CardContent className={cn('p-4', contentClassName)}>{children}</CardContent>
        </Card>
    );
}
