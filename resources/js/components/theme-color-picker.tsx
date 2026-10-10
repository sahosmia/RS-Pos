import { Button } from '@/components/ui/button';
import { THEME_COLORS, type ThemeColorValue } from '@/lib/theme-colors';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ThemeColorPickerProps {
    value: ThemeColorValue;
    onChange: (value: ThemeColorValue) => void;
    /** Personal-preference picker only — shows a button to clear the override and fall back to the shop default. */
    onReset?: () => void;
}

export default function ThemeColorPicker({ value, onChange, onReset }: ThemeColorPickerProps) {
    return (
        <div role="group" aria-label="Panel color" className="flex flex-wrap items-center gap-3">
            {THEME_COLORS.map((color) => (
                <button
                    key={color.value}
                    type="button"
                    onClick={() => onChange(color.value)}
                    className={cn(
                        'motion-colors flex size-9 items-center justify-center rounded-full border-2 outline-hidden',
                        'focus-visible:ring-brand-focus-ring ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
                        value === color.value ? 'border-foreground' : 'hover:border-brand-control-border-hover border-transparent',
                    )}
                    style={{ backgroundColor: color.swatch }}
                    aria-label={color.label}
                    aria-pressed={value === color.value}
                    title={color.label}
                >
                    {value === color.value && <Check className="size-4 text-white drop-shadow" />}
                </button>
            ))}

            {onReset && (
                <Button type="button" variant="ghost" size="sm" onClick={onReset}>
                    Use shop default
                </Button>
            )}
        </div>
    );
}
