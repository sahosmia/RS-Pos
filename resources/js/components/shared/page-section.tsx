import { type ReactNode } from 'react';

interface PageSectionProps {
    title: string;
    children: ReactNode;
}

/** A titled block (accent bar + heading) that groups related cards on a page. */
export function PageSection({ title, children }: PageSectionProps) {
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2.5">
                <div className="bg-primary h-4 w-1 rounded-full" />
                <h2 className="text-foreground text-sm font-semibold tracking-tight">{title}</h2>
            </div>

            {children}
        </section>
    );
}
