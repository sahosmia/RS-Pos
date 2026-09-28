import { type Visit } from '@inertiajs/core';
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

        const removeStartListener = router.on('start', (event) => {
            // Sidebar/nav links use `prefetch` (Inertia's hover-prefetch) —
            // that fires this same 'start' event on mere hover, with no
            // visible navigation happening, so showing the overlay for it
            // reads as the page randomly re-rendering. Real navigations
            // (including the follow-up visit that *uses* a prefetched
            // response) are unaffected — `prefetch` is only true on the
            // background warm-up request itself.
            const visit = event.detail.visit as Visit;
            if (visit.prefetch) {
                return;
            }

            timeout = setTimeout(() => setIsLoading(true), 150);
        });

        const removeFinishListener = router.on('finish', (event) => {
            // A prefetch finishing shouldn't clear a *real*, still-in-flight
            // navigation's pending timeout/overlay — only the matching kind
            // of visit that actually started it should be able to stop it.
            const visit = event.detail.visit as Visit;
            if (visit.prefetch) {
                return;
            }

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
        <div className="bg-background/50 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[1px]" aria-hidden="true">
            <Loader2 className="text-primary size-10 animate-spin" />
        </div>
    );
}
