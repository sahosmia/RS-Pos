import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * A centered loading overlay shown during Inertia page transitions, on top
 * of (not replacing) the thin top progress bar already configured in
 * `app.tsx`'s `createInertiaApp({ progress })`.
 *
 * Delayed by ~150ms before showing, so a fast navigation never flashes it —
 * the timeout only flips `isLoading` true if it fires before `finish`
 * cancels it first.
 */
export default function RouteLoadingOverlay() {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | undefined;

        const removeStartListener = router.on('start', () => {
            timeout = setTimeout(() => setIsLoading(true), 150);
        });

        const removeFinishListener = router.on('finish', () => {
            clearTimeout(timeout);
            setIsLoading(false);
        });

        return () => {
            clearTimeout(timeout);
            removeStartListener();
            removeFinishListener();
        };
    }, []);

    if (!isLoading) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-[1px]" aria-hidden="true">
            <Loader2 className="text-primary size-10 animate-spin" />
        </div>
    );
}
