import { ReactNode } from 'react';

interface EmptyStateProps {
    title: string;
    description?: string;
    children?: ReactNode;
}

export default function EmptyState({ title, description, children }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
            <p className="font-medium">{title}</p>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
            {children}
        </div>
    );
}
