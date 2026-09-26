import { SidebarProvider } from '@/components/ui/sidebar';
import { useSidebarState } from '@/hooks/use-sidebar-state';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    const { state, update } = useSidebarState();

    if (variant === 'header') {
        return <div className="flex min-h-screen w-full flex-col">{children}</div>;
    }

    return (
        <SidebarProvider defaultOpen={state.open} open={state.open} onOpenChange={(open) => update({ open })}>
            {children}
        </SidebarProvider>
    );
}
