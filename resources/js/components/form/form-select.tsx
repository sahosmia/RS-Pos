import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type LucideIcon } from 'lucide-react';

export interface SelectOption {
    label: string;
    value: string;
}

interface FormSelectProps {
    id: string;
    label?: string;
    value: string | number | null | undefined;
    onChange: (value: string | null) => void;
    options: SelectOption[];
    placeholder?: string;
    error?: string;
    noneLabel?: string;
    allowNone?: boolean;
    required?: boolean;
    /** Optional leading icon — purely visual, doesn't affect layout when omitted. */
    icon?: LucideIcon;
}

export function FormSelect({
    id,
    label,
    value,
    onChange,
    options,
    placeholder,
    error,
    noneLabel = '—',
    allowNone = false,
    required = false,
    icon: Icon,
}: FormSelectProps) {
    const currentValue = value ? String(value) : allowNone ? 'none' : '';

    return (
        <div className="grid gap-2">
            {label && (
                <Label htmlFor={id} required={required}>
                    {label}
                </Label>
            )}
            <Select
                value={currentValue}
                onValueChange={(val) => {
                    if (allowNone && val === 'none') {
                        onChange(null);
                    } else {
                        onChange(val);
                    }
                }}
            >
                <SelectTrigger id={id} className={Icon ? 'relative pl-9' : undefined}>
                    {Icon && <Icon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />}
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {allowNone && <SelectItem value="none">{noneLabel}</SelectItem>}
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <InputError message={error} />
        </div>
    );
}
