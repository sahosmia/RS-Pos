import { FormField, fieldAriaProps } from '@/components/form/form-field';
import { DatePicker, type DatePickerProps } from '@/components/ui/date-picker';
import { type ReactNode } from 'react';

interface FormDatePickerProps extends Omit<DatePickerProps, 'aria-invalid' | 'aria-describedby' | 'id'> {
    id: string;
    label?: ReactNode;
    tooltip?: ReactNode;
    error?: string;
    helperText?: ReactNode;
    required?: boolean;
}

/**
 * Label → DatePicker → helper/error, wired like `FormInput` (same `error` string from Inertia).
 * Replaces `<FormInput type="date" onChange={(e) => set(e.target.value)} />` with
 * `<FormDatePicker onChange={set} />` — the value is the same `YYYY-MM-DD` string.
 */
export function FormDatePicker({ id, label, tooltip, error, helperText, required, clearable, ...props }: FormDatePickerProps) {
    return (
        <FormField id={id} label={label} tooltip={tooltip} required={required} error={error} helperText={helperText}>
            <DatePicker id={id} clearable={clearable ?? !required} {...fieldAriaProps(id, error, helperText)} {...props} />
        </FormField>
    );
}
