import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import React from 'react';

interface LabelTooltipProps {
    label: React.ReactNode;
    tooltip?: React.ReactNode;
    className?: string;
}

export function LabelTooltip({ label, tooltip, className }: LabelTooltipProps) {
    if (!tooltip) {
        return <span className={className}>{label}</span>;
    }

    return (
        <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
            <span>{label}</span>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center">
                            <Info className="size-3.5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {typeof tooltip === 'string' ? <p>{tooltip}</p> : tooltip}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </span>
    );
}
