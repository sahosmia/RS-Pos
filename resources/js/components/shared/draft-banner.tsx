import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format-date';
import { History } from 'lucide-react';

interface DraftBannerProps {
    savedAt: string;
    what: string;
    onRestore: () => void;
    onDiscard: () => void;
}

/** "You have an unsaved draft from earlier" with Restore / Discard — shown at the top of a form that auto-saves. */
export function DraftBanner({ savedAt, what, onRestore, onDiscard }: DraftBannerProps) {
    return (
        <Alert variant="info" className="lg:col-span-2">
            <History />
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>
                    You have an unsaved {what} from {formatDateTime(savedAt)}.
                </span>
                <span className="flex gap-2">
                    <Button type="button" size="sm" onClick={onRestore}>
                        Restore
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={onDiscard}>
                        Discard
                    </Button>
                </span>
            </AlertDescription>
        </Alert>
    );
}
