import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useCallback, useState } from 'react';

const PREFIX = 'sidebar-state:';

/**
 * corrections.md #10 — the sidebar's desktop open/collapsed flag and which
 * parent menus are expanded survive page navigation (every page re-mounts
 * `AppLayout`, so plain component state would reset each time). State is
 * keyed by user id, and any other user's leftover entry is dropped on first
 * read, so logging out and in as someone else never inherits the previous
 * state. The mobile drawer isn't persisted on purpose — it must close on
 * navigation.
 */
interface StoredState {
    open: boolean;
    groups: string[];
}

const DEFAULTS: StoredState = { open: true, groups: [] };

function readStored(userId: number): StoredState {
    try {
        return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(`${PREFIX}${userId}`) ?? '{}') };
    } catch {
        return DEFAULTS;
    }
}

function initialState(userId: number | undefined, freshLogin: boolean): StoredState {
    if (typeof window === 'undefined' || userId === undefined) {
        return DEFAULTS;
    }

    try {
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(PREFIX) && key !== `${PREFIX}${userId}`) {
                localStorage.removeItem(key);
            }
        }
    } catch {
        // Storage unavailable — fall through to whatever readStored can get.
    }

    const stored = readStored(userId);

    // Fresh login lands on Dashboard (no active submenu), so stale group expansion
    // is dropped — but the open/collapsed flag is a stable preference and stays.
    return freshLogin ? { ...stored, groups: [] } : stored;
}

export function useSidebarState() {
    const { auth, freshLogin } = usePage<SharedData>().props;
    const userId = auth.user?.id;
    const [state, setState] = useState<StoredState>(() => initialState(userId, freshLogin));

    const update = useCallback(
        (patch: Partial<StoredState> | ((current: StoredState) => Partial<StoredState>)) => {
            // Merge against what's actually stored, not this hook instance's copy —
            // AppShell and NavMain each hold one and write different fields.
            setState((current) => {
                const base = userId === undefined ? current : readStored(userId);
                const next = { ...base, ...(typeof patch === 'function' ? patch(base) : patch) };

                try {
                    if (userId !== undefined) {
                        localStorage.setItem(`${PREFIX}${userId}`, JSON.stringify(next));
                    }
                } catch {
                    // Storage unavailable (private mode/quota) — state just isn't persisted.
                }

                return next;
            });
        },
        [userId],
    );

    return { state, update };
}
