import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type FinancialPositionSection } from '@/types/models';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface FinancialPositionSectionRowProps {
    label: string;
    section: FinancialPositionSection;
    /** Set false for rows like Closing Stock where a per-entity breakdown isn't wanted — always shows just the total. */
    showBreakdown?: boolean;
}

/** One line item (e.g. "Sundry Debtors — ৳12,000") that expands to its per-entity breakdown — click anywhere on the row. */
export default function FinancialPositionSectionRow({ label, section, showBreakdown = true }: FinancialPositionSectionRowProps) {
    const money = useMoneyFormat();
    const [open, setOpen] = useState(false);

    if (!showBreakdown || section.breakdown.length === 0) {
        return (
            <div className="flex items-center justify-between gap-2 text-sm">
                {/* The spacer keeps the label on the same left edge as rows that have a chevron. */}
                <span className="text-muted-foreground flex min-w-0 items-center gap-1">
                    <span className="size-3.5 shrink-0" aria-hidden="true" />
                    {label}
                </span>
                <span className="shrink-0 tabular-nums">{money(section.total)}</span>
            </div>
        );
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                    {open ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    )}
                    {label}
                </span>
                <span className="shrink-0 tabular-nums">{money(section.total)}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5 border-l pl-4">
                {section.breakdown.map((row) => (
                    <div key={row.name} className="flex justify-between gap-2 text-xs">
                        <span className="text-muted-foreground min-w-0 truncate">{row.name}</span>
                        <span className="shrink-0 tabular-nums">{money(row.amount)}</span>
                    </div>
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}
