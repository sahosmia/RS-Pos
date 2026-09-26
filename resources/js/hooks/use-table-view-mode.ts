import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useRef, useState } from 'react';

export type TableViewMode = 'table' | 'grid';

/**
 * Table vs Grid view — works on every device (the toggle is always shown).
 * Defaults to Grid on mobile / Table on desktop the first time device type
 * resolves; after that the user's own toggle click always wins, even across
 * a resize, so picking Table on a phone (accepting the horizontal scroll)
 * is a real, respected choice.
 */
export function useTableViewMode() {
    const isMobile = useIsMobile();
    const [viewMode, setViewMode] = useState<TableViewMode>('table');
    const hasSetDefault = useRef(false);

    useEffect(() => {
        if (!hasSetDefault.current && isMobile !== undefined) {
            setViewMode(isMobile ? 'grid' : 'table');
            hasSetDefault.current = true;
        }
    }, [isMobile]);

    return [viewMode, setViewMode] as const;
}
