import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label?: React.ReactNode;
    error?: string;
    required?: boolean;
    /** Optional leading icon — purely visual, doesn't affect layout when omitted. */
    icon?: LucideIcon;
}

export function FormInput({ id, label, error, required, className, icon: Icon, ...props }: FormInputProps) {
    return (
        <div className="grid gap-2">
            {label && (
                <Label htmlFor={id} required={required}>
                    {label}
                </Label>
            )}
            {Icon ? (
                <div className="relative">
                    <Icon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input id={id} className={cn('pl-9', className)} {...props} />
                </div>
            ) : (
                <Input id={id} className={className} {...props} />
            )}
            <InputError message={error} />
        </div>
    );
}
