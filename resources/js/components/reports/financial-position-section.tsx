import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type FinancialPositionSection } from '@/types/models';
import { useState } from 'react';

interface FinancialPositionSectionRowProps {
    label: string;
    section: FinancialPositionSection;
}

/** One line item (e.g. "Sundry Debtors — ৳12,000 [+]") that expands to its per-entity breakdown. */
export default function FinancialPositionSectionRow({ label, section }: FinancialPositionSectionRowProps) {
    const money = useMoneyFormat();
    const [open, setOpen] = useState(false);

    if (section.breakdown.length === 0) {
        return (
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="tabular-nums">{money(section.total)}</span>
            </div>
        );
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="tabular-nums">{money(section.total)}</span>
                    <CollapsibleTrigger className="text-primary shrink-0 text-xs hover:underline">[{open ? '-' : '+'}]</CollapsibleTrigger>
                </div>
            </div>
            <CollapsibleContent className="mt-1 space-y-0.5 border-l pl-4">
                {section.breakdown.map((row) => (
                    <div key={row.name} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate">{row.name}</span>
                        <span className="tabular-nums">{money(row.amount)}</span>
                    </div>
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}
