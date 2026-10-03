import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { QUICK_ACTIONS_BY_KEY, type QuickActionSetting } from '@/lib/quick-actions';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface QuickActionsEditorProps {
    value: QuickActionSetting[];
    onChange: (value: QuickActionSetting[]) => void;
}

function move(list: QuickActionSetting[], index: number, direction: -1 | 1): QuickActionSetting[] {
    const target = index + direction;

    if (target < 0 || target >= list.length) {
        return list;
    }

    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];

    return next;
}

/**
 * Business Settings → Quick Actions: switch each Ctrl+Space action on or off, and reorder them with
 * up/down buttons (the order here is the order Space steps through them).
 */
export default function QuickActionsEditor({ value, onChange }: QuickActionsEditorProps) {
    return (
        <div className="space-y-2">
            {value.map((item, index) => {
                const action = QUICK_ACTIONS_BY_KEY.get(item.key);

                if (!action) {
                    return null;
                }

                return (
                    <div key={item.key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="text-muted-foreground w-5 text-center text-xs tabular-nums">{index + 1}</span>
                            <action.icon className="text-muted-foreground size-4 shrink-0" />
                            <span className={item.enabled ? 'truncate text-sm' : 'text-muted-foreground truncate text-sm'}>{action.label}</span>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={index === 0}
                                onClick={() => onChange(move(value, index, -1))}
                                aria-label={`Move ${action.label} up`}
                            >
                                <ChevronUp className="size-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={index === value.length - 1}
                                onClick={() => onChange(move(value, index, 1))}
                                aria-label={`Move ${action.label} down`}
                            >
                                <ChevronDown className="size-4" />
                            </Button>
                            <Switch
                                checked={item.enabled}
                                onCheckedChange={(enabled) => onChange(value.map((entry) => (entry.key === item.key ? { ...entry, enabled } : entry)))}
                                aria-label={`Show ${action.label}`}
                                className="ml-2"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
