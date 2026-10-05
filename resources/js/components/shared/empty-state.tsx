import { type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
    title: string;
    description?: string;
    /** Optional large icon above the title. */
    icon?: LucideIcon;
    /** Typically the call-to-action button. */
    children?: ReactNode;
}

export default function EmptyState({ title, description, icon: Icon, children }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
            {Icon && (
                <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl">
                    <Icon className="size-7" />
                </div>
            )}
            <p className="font-medium">{title}</p>
            {description && <p className={`text-muted-foreground text-sm${Icon ? ' max-w-sm' : ''}`}>{description}</p>}
            {children}
        </div>
    );
}
