import { FormField, fieldAriaProps } from '@/components/form/form-field';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/use-translation';
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

/** Types where a sentence-style hint ("Enter name") makes sense — dates/files/etc. have their own native UI. */
const TEXT_TYPES = new Set(['text', 'email', 'tel', 'url', 'search', 'password']);

export function FormInput({ id, label, tooltip, error, helperText, required, className, icon: Icon, placeholder, type, ...props }: FormInputProps) {
    const { t } = useTranslation();
    const aria = fieldAriaProps(id, error, helperText);

    // Explicit placeholders always win; otherwise derive one so no field is left blank.
    const resolvedPlaceholder =
        placeholder ??
        (type === 'number'
            ? '0'
            : typeof label === 'string' && TEXT_TYPES.has(type ?? 'text')
              ? t('common', 'enter_placeholder').replace('{label}', label)
              : undefined);

    return (
        <FormField id={id} label={label} tooltip={tooltip} required={required} error={error} helperText={helperText}>
            {Icon ? (
                // The icon is centred against this wrapper, which holds only the input — never the label or message.
                <div className="relative">
                    <Icon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input id={id} type={type} placeholder={resolvedPlaceholder} className={cn('pl-9', className)} {...aria} {...props} />
                </div>
            ) : (
                <Input id={id} type={type} placeholder={resolvedPlaceholder} className={className} {...aria} {...props} />
            )}
        </FormField>
    );
}
