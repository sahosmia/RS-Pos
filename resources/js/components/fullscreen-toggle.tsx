import { Button } from '@/components/ui/button';
import { Maximize, Minimize } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * A header icon button that toggles the browser's native Fullscreen API.
 * Tracks the real `document.fullscreenElement` state via the
 * `fullscreenchange` event (not just local click state), so the icon still
 * flips back correctly if the user exits fullscreen with Esc/F11 instead of
 * clicking this button.
 */
export function FullscreenToggle() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement !== null);

        document.addEventListener('fullscreenchange', onFullscreenChange);
        onFullscreenChange();

        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    };

    return (
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            <span className="sr-only">{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
        </Button>
    );
}
