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
        // Keyed by the visit object itself (Inertia reuses the *same* object
        // reference between a request's 'start' and its 'finish') rather than
        // a single shared timeout var, and rather than trusting `finish`'s own
        // `visit.prefetch` flag — Inertia's internal request handling mutates
        // `prefetch` back to `false` on that same object right before firing
        // 'finish' for a prefetch response, so checking it there is unreliable
        // (a hovered sidebar link's background prefetch would misreport as a
        // real navigation finishing, clearing or clobbering an unrelated
        // in-flight real navigation's own pending timeout — the sidebar's
        // `prefetch` links are exactly what made this visible). Tracking by
        // object identity, decided only once at 'start' (reliable there),
        // sidesteps the mutation entirely and also correctly handles more
        // than one real navigation overlapping.
        const pending = new Map<Visit, ReturnType<typeof setTimeout>>();

        const removeStartListener = router.on('start', (event) => {
            const visit = event.detail.visit as Visit;
            if (visit.prefetch) {
                return;
            }

            pending.set(
                visit,
                setTimeout(() => setIsLoading(true), 150),
            );
        });

        const removeFinishListener = router.on('finish', (event) => {
            const visit = event.detail.visit as Visit;
            const timeout = pending.get(visit);
            if (timeout === undefined) {
                return;
            }

            clearTimeout(timeout);
            pending.delete(visit);
            if (pending.size === 0) {
                setIsLoading(false);
            }
        });

        return () => {
            pending.forEach(clearTimeout);
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
