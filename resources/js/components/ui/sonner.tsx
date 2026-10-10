import { useGlobalAppearance } from '@/hooks/use-appearance';
import { CircleAlert, CircleCheck, CircleX, Info, Loader2 } from 'lucide-react';
import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

/**
 * Brand toast surface. Sonner stays the engine (stacking, swipe-to-dismiss, timers, `toast.promise`,
 * its aria-live region); this only restyles it. Status is carried by a small icon plus a 3px left accent
 * on a neutral popover surface — no solid colour fills — and is always spelled out in the text.
 *
 * Mounted once at the app root (see app.tsx) so toasts survive Inertia page
 * navigations instead of unmounting with the page they were fired from.
 */
const icons: ToasterProps['icons'] = {
    success: <CircleCheck className="text-brand-success-text size-4" aria-hidden="true" />,
    error: <CircleX className="text-brand-danger-text size-4" aria-hidden="true" />,
    warning: <CircleAlert className="text-brand-warning-text size-4" aria-hidden="true" />,
    info: <Info className="text-brand-info-text size-4" aria-hidden="true" />,
    loading: <Loader2 className="text-muted-foreground size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />,
};

const toastOptions: ToasterProps['toastOptions'] = {
    classNames: {
        toast: 'items-start! gap-2.5! rounded-brand-control! border! border-l-[3px]! border-brand-control-border! bg-popover! py-3! pr-9! pl-3! text-sm! text-popover-foreground! shadow-[var(--brand-popover-shadow)]!',
        title: 'text-sm! leading-5! font-semibold! text-foreground!',
        description: 'mt-0.5! text-[0.8125rem]! leading-4! text-muted-foreground!',
        icon: 'mt-0.5! shrink-0!',
        actionButton:
            'h-7! rounded-[calc(var(--brand-control-radius)-2px)]! bg-brand-primary! px-2.5! text-xs! font-medium! text-brand-primary-foreground! hover:bg-brand-primary-hover!',
        cancelButton:
            'h-7! rounded-[calc(var(--brand-control-radius)-2px)]! bg-brand-secondary! px-2.5! text-xs! font-medium! text-foreground! hover:bg-brand-secondary-hover!',
        closeButton: 'brand-toast-close',
        success: 'border-l-brand-success!',
        error: 'border-l-brand-danger!',
        warning: 'border-l-brand-warning!',
        info: 'border-l-brand-info!',
        loading: 'border-l-brand-control-border-hover!',
        default: 'border-l-brand-control-border-hover!',
    },
};

export default function Toaster() {
    const appearance = useGlobalAppearance();

    return <SonnerToaster theme={appearance} position="top-right" closeButton icons={icons} toastOptions={toastOptions} gap={8} visibleToasts={4} />;
}
