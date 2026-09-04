import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface UndoToastProps {
    onUndo: () => void;
    processing?: boolean;
    seconds?: number;
}

/**
 * 30-second "Undo" affordance after confirming a sale (Task 6.10) — purely
 * a UI countdown; CancelSaleAction itself isn't time-limited server-side.
 */
export default function UndoToast({ onUndo, processing = false, seconds = 30 }: UndoToastProps) {
    const [remaining, setRemaining] = useState(seconds);

    useEffect(() => {
        if (remaining <= 0) {
            return;
        }

        const timer = setTimeout(() => setRemaining((current) => current - 1), 1000);
        return () => clearTimeout(timer);
    }, [remaining]);

    if (remaining <= 0) {
        return null;
    }

    return (
        <div className="bg-foreground text-background fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg px-4 py-3 shadow-lg">
            <span className="text-sm">Sale confirmed — ভুল হলে {remaining}s এর মধ্যে undo করুন</span>
            <Button variant="secondary" size="sm" disabled={processing} onClick={onUndo}>
                {processing ? 'Undoing...' : 'Undo'}
            </Button>
        </div>
    );
}
