import { FormField, fieldAriaProps } from '@/components/form/form-field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label?: React.ReactNode;
    tooltip?: React.ReactNode;
    error?: string;
    helperText?: React.ReactNode;
    required?: boolean;
    /** Optional leading icon — purely visual, doesn't affect layout when omitted. */
    icon?: LucideIcon;
}

export function FormInput({ id, label, tooltip, error, helperText, required, className, icon: Icon, ...props }: FormInputProps) {
    const aria = fieldAriaProps(id, error, helperText);

    return (
        <FormField id={id} label={label} tooltip={tooltip} required={required} error={error} helperText={helperText}>
            {Icon ? (
                // The icon is centred against this wrapper, which holds only the input — never the label or message.
                <div className="relative">
                    <Icon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input id={id} className={cn('pl-9', className)} {...aria} {...props} />
                </div>
            ) : (
                <Input id={id} className={className} {...aria} {...props} />
            )}
        </FormField>
    );
}
