import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from '@/hooks/use-translation';
import { Bell, Download, Trash2, X } from 'lucide-react';

interface ContactBulkBarProps {
    count: number;
    onClear: () => void;
    onNotify: () => void;
    onExport: () => void;
    onDelete: () => void;
}

/**
 * What you can do with the ticked contacts: notify, export, delete. On desktop it is a bar above the table; on
 * mobile a compact sticky bar at the bottom of the screen. Renders nothing when no row is ticked.
 */
export function ContactBulkBar({ count, onClear, onNotify, onExport, onDelete }: ContactBulkBarProps) {
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
                    <Button variant="outline" size="sm" onClick={onExport} aria-label={t('common', 'export')}>
                        <Download className="size-4" />
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
        <div className="border-primary/30 bg-primary/5 flex items-center justify-between rounded-lg border p-3 shadow-xs">
            <div className="flex items-center gap-3">
                <Badge variant="secondary" className="tabular-nums">
                    {count} {t('contactsPage', 'selected')}
                </Badge>
                <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-foreground h-6 gap-1 px-2 text-xs">
                    <X className="size-3" />
                    {t('common', 'clear')}
                </Button>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onNotify} className="gap-1.5">
                    <Bell className="size-4" />
                    {t('contactsPage', 'send_notification')}
                </Button>
                <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
                    <Download className="size-4" />
                    {t('common', 'export')}
                </Button>
                <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive gap-1.5">
                    <Trash2 className="size-4" />
                    {t('common', 'delete')}
                </Button>
            </div>
        </div>
    );
}
