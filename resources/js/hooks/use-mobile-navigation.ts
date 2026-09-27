import { useCallback } from 'react';

export function useMobileNavigation() {
    const cleanup = useCallback(() => {
        // Radix leaves `pointer-events: none` on body after a menu-item click closes the
        // dropdown/sheet — clear it or the page stays unclickable after navigating away.
        document.body.style.removeProperty('pointer-events');
    }, []);

    return cleanup;
}
