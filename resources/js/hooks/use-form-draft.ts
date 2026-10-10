import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIX = 'form-draft:';
const SAVE_DELAY_MS = 800;
/** A draft older than this is not offered back: the prices and stock it was built on have moved on. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredDraft<T> {
    savedAt: string;
    state: T;
}

function read<T>(storageKey: string): StoredDraft<T> | null {
    try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? (JSON.parse(raw) as StoredDraft<T>) : null;

        if (!parsed || Date.now() - new Date(parsed.savedAt).getTime() > MAX_AGE_MS) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

interface Options<T> {
    /** Which form this is, e.g. `sale-create`; the signed-in user is added so people sharing a browser never see each other's drafts. */
    name: string;
    /** Everything worth bringing back. Must be JSON-serialisable. */
    state: T;
    /** Turn it on only for a brand-new form (not an edit), and only once there is something worth keeping. */
    hasContent: boolean;
    enabled: boolean;
    onRestore: (state: T) => void;
}

/**
 * Keeps a half-filled form in the browser so a refresh, a crash or a stray click doesn't lose it, and offers it back
 * the next time the form opens. Nothing is restored without the person choosing to; it never leaves their browser.
 * The draft is cleared when the form is saved (call `clear`) or discarded.
 */
export function useFormDraft<T>({ name, state, hasContent, enabled, onRestore }: Options<T>) {
    const userId = usePage<{ auth: { user?: { id: number } | null } }>().props.auth.user?.id ?? 'guest';
    const storageKey = `${PREFIX}${name}:${userId}`;

    const [offered, setOffered] = useState<StoredDraft<T> | null>(() => (enabled ? read<T>(storageKey) : null));
    const serialized = JSON.stringify(state);
    const onRestoreRef = useRef(onRestore);
    onRestoreRef.current = onRestore;

    // Save as the person works. While an old draft is still being offered it is left untouched, so it can't be
    // overwritten before they have decided.
    useEffect(() => {
        if (!enabled || offered) {
            return;
        }

        const timer = window.setTimeout(() => {
            try {
                if (hasContent) {
                    localStorage.setItem(storageKey, JSON.stringify({ savedAt: new Date().toISOString(), state: JSON.parse(serialized) }));
                } else {
                    localStorage.removeItem(storageKey);
                }
            } catch {
                // Storage full or blocked: the form still works, it just isn't backed up.
            }
        }, SAVE_DELAY_MS);

        return () => window.clearTimeout(timer);
    }, [serialized, hasContent, enabled, offered, storageKey]);

    const clear = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
        } catch {
            // nothing to clean up
        }
        setOffered(null);
    }, [storageKey]);

    const restore = useCallback(() => {
        if (offered) {
            onRestoreRef.current(offered.state);
            setOffered(null);
        }
    }, [offered]);

    return { offered: offered ? { savedAt: offered.savedAt } : null, restore, discard: clear, clear };
}
