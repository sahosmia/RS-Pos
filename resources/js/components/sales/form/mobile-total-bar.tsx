import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { Check } from 'lucide-react';

interface MobileTotalBarProps {
    total: number;
    processing: boolean;
    onComplete: () => void;
}

/** Sticky bottom bar on mobile: the running total and a one-tap "Complete Sale". */
export function MobileTotalBar({ total, processing, onComplete }: MobileTotalBarProps) {
    const money = useMoneyFormat();

    return (
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t p-3 shadow-lg backdrop-blur">
            <div>
                <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Total</div>
                <div className="text-lg font-bold tabular-nums">{money(total)}</div>
            </div>
            <Button type="button" disabled={processing} onClick={onComplete} className="gap-1.5">
                <Check className="size-4" />
                {processing ? 'Saving...' : 'Complete Sale'}
            </Button>
        </div>
    );
}
