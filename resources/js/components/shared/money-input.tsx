import { FormField, fieldAriaProps } from '@/components/form/form-field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ComponentProps, ReactNode } from 'react';

type MoneyInputProps = Omit<ComponentProps<typeof Input>, 'type'> & {
    /**
     * Pass any of these to get the full Label → Control → Message field (same as `FormInput`).
     * Omit them all to get the bare control, for callers that wrap it themselves (table cells, inline rows).
     */
    label?: ReactNode;
    tooltip?: ReactNode;
    error?: string;
    helperText?: ReactNode;
    required?: boolean;
};

export default function MoneyInput({ className, placeholder = '0.00', label, tooltip, error, helperText, id, ...props }: MoneyInputProps) {
    const { shop } = usePage<SharedData>().props;
    const isField = Boolean(label || error || helperText) && Boolean(id);
    const aria = id ? fieldAriaProps(id, error, helperText) : {};

    const control = (
        <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
                {shop.currency_symbol}
            </span>
            <Input id={id} type="number" step="0.01" className={cn('pl-8', className)} placeholder={placeholder} {...aria} {...props} />
        </div>
    );

    if (!isField || !id) {
        return control;
    }

    return (
        <FormField id={id} label={label} tooltip={tooltip} required={props.required} error={error} helperText={helperText}>
            {control}
        </FormField>
    );
}
