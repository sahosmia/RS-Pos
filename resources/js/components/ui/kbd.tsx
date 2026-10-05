import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

/** A small keyboard-key pill for shortcut hints, e.g. `F2`, `Esc`, `⌘ S`. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <kbd
            className={cn(
                'bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5 font-mono text-[10px] font-medium',
                className,
            )}
        >
            {children}
        </kbd>
    );
}
