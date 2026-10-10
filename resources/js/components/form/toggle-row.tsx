import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface ToggleRowProps {
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    icon?: LucideIcon;
}

/** A boolean setting as a clickable row: label (and optional description) on the left, switch on the right. */
export function ToggleRow({ id, label, description, checked, onCheckedChange, icon: Icon }: ToggleRowProps) {
    return (
        <label
            htmlFor={id}
            className={cn(
                'bg-card motion-colors flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3',
                checked ? 'border-primary/30 bg-primary/5' : 'hover:bg-muted/40',
            )}
        >
            <div className="flex min-w-0 items-start gap-3">
                {Icon && (
                    <div
                        className={cn(
                            'motion-colors mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md',
                            checked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                        )}
                    >
                        <Icon className="size-3.5" />
                    </div>
                )}
                <div className="min-w-0 space-y-0.5">
                    <div className="text-sm font-medium">{label}</div>
                    {description && <p className="text-muted-foreground text-xs">{description}</p>}
                </div>
            </div>
            <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
        </label>
    );
}
