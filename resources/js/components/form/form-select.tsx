import { FormField, fieldAriaProps } from '@/components/form/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type LucideIcon } from 'lucide-react';
import React from 'react';

export interface SelectOption {
    label: string;
    value: string;
}

interface FormSelectProps {
    id: string;
    label?: React.ReactNode;
    tooltip?: React.ReactNode;
    value: string | number | null | undefined;
    onChange: (value: string | null) => void;
    options: SelectOption[];
    placeholder?: string;
    error?: string;
    helperText?: React.ReactNode;
    noneLabel?: string;
    allowNone?: boolean;
    required?: boolean;
    /** Optional leading icon — purely visual, doesn't affect layout when omitted. */
    icon?: LucideIcon;
}

export function FormSelect({
    id,
    label,
    tooltip,
    value,
    onChange,
    options,
    placeholder,
    error,
    helperText,
    noneLabel = '—',
    allowNone = false,
    required = false,
    icon: Icon,
}: FormSelectProps) {
    const currentValue = value ? String(value) : allowNone ? 'none' : '';

    return (
        <FormField id={id} label={label} tooltip={tooltip} required={required} error={error} helperText={helperText}>
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
                <SelectTrigger id={id} className={Icon ? 'relative pl-9' : undefined} {...fieldAriaProps(id, error, helperText)}>
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
        </FormField>
    );
}
