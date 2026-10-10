import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from '@/hooks/use-translation';
import { Bell, Trash2, X } from 'lucide-react';

interface ContactBulkBarProps {
    count: number;
    onClear: () => void;
    onNotify: () => void;
    onDelete: () => void;
}

/**
 * What you can do with the ticked contacts: notify and delete (Export lives in the table toolbar's Export menu, which already has a "selected rows" option). On desktop it is a bar above the table; on
 * mobile a compact sticky bar at the bottom of the screen. Renders nothing when no row is ticked.
 */
export function ContactBulkBar({ count, onClear, onNotify, onDelete }: ContactBulkBarProps) {
    const isMobile = useIsMobile();
    const { t } = useTranslation();

    if (count === 0) return null;

    if (isMobile) {
        return (
            <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-2 border-t p-3 shadow-lg backdrop-blur">
                <Badge variant="secondary" className="tabular-nums">
                    {count} {t('contactsPage', 'selected')}
                </Badge>
                <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={onNotify} aria-label={t('contactsPage', 'send')}>
                        <Bell className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onDelete}
                        aria-label={t('common', 'delete')}
                        className="text-destructive hover:text-destructive"
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <span className="bg-brand-primary/10 text-brand-primary-text rounded-brand-control inline-flex h-9 items-center px-3 text-sm font-medium tabular-nums">
                {count} {t('contactsPage', 'selected')}
            </span>
            <Button
                variant="soft"
                size="icon"
                onClick={onNotify}
                title={t('contactsPage', 'send_notification')}
                aria-label={t('contactsPage', 'send_notification')}
            >
                <Bell className="size-4" />
            </Button>
            <Button variant="soft-danger" size="icon" onClick={onDelete} title={t('common', 'delete')} aria-label={t('common', 'delete')}>
                <Trash2 className="size-4" />
            </Button>
            <Button variant="secondary" onClick={onClear}>
                <X className="size-4" />
                {t('common', 'clear')}
            </Button>
        </>
    );
}
