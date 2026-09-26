import { useGlobalAppearance } from '@/hooks/use-appearance';
import { Toaster as SonnerToaster } from 'sonner';

/**
 * Mounted once at the app root (see app.tsx) so toasts survive Inertia page
 * navigations instead of unmounting with the page they were fired from.
 */
export default function Toaster() {
    const appearance = useGlobalAppearance();

    return <SonnerToaster theme={appearance} richColors position="top-right" closeButton />;
}
