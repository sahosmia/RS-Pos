import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { THEME_COLORS, type ThemeColorValue } from '@/lib/theme-colors';
import { Check } from 'lucide-react';

interface ThemeColorPickerProps {
    value: ThemeColorValue;
    onChange: (value: ThemeColorValue) => void;
    /** Personal-preference picker only — shows a button to clear the override and fall back to the shop default. */
    onReset?: () => void;
}

export default function ThemeColorPicker({ value, onChange, onReset }: ThemeColorPickerProps) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            {THEME_COLORS.map((color) => (
                <button
                    key={color.value}
                    type="button"
                    onClick={() => onChange(color.value)}
                    className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                        value === color.value ? 'border-foreground' : 'border-transparent hover:border-border',
                    )}
                    style={{ backgroundColor: color.swatch }}
                    aria-label={color.label}
                    aria-pressed={value === color.value}
                    title={color.label}
                >
                    {value === color.value && <Check className="h-4 w-4 text-white drop-shadow" />}
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
