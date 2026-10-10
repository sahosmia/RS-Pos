import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

type ActionCardTone = 'default' | 'warning' | 'danger';

const toneClasses: Record<ActionCardTone, { icon: string; card: string }> = {
    default: { icon: 'bg-brand-secondary text-muted-foreground', card: '' },
    warning: { icon: 'bg-brand-warning/15 text-brand-warning-text', card: 'border-brand-warning/40' },
    danger: { icon: 'bg-brand-danger/10 text-brand-danger-text', card: 'border-brand-danger/40' },
};

interface ActionCardProps {
    title: ReactNode;
    description?: ReactNode;
    icon?: LucideIcon;
    /** Colour only when the situation warrants attention (low stock, overdue). */
    tone?: ActionCardTone;
    /** The call to action — a regular `<Button>`; the card adds no button styling of its own. */
    action?: ReactNode;
    className?: string;
}

/** A call-out that points at one next step ("8 products need restocking" → [View Products]). Stacks on phones. */
export function ActionCard({ title, description, icon: Icon, tone = 'default', action, className }: ActionCardProps) {
    const styles = toneClasses[tone];

    return (
        <Card className={cn('flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between', styles.card, className)}>
            <div className="flex min-w-0 items-start gap-3">
                {Icon && (
                    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-[calc(var(--brand-control-radius)-2px)]', styles.icon)} aria-hidden="true">
                        <Icon className="size-4" />
                    </span>
                )}
                <div className="min-w-0">
                    <p className="text-sm leading-5 font-semibold">{title}</p>
                    {description && <p className="text-muted-foreground mt-0.5 text-sm leading-5">{description}</p>}
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </Card>
    );
}
