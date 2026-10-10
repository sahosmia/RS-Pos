import { cn } from '@/lib/utils';
import { CircleAlert } from 'lucide-react';
import { HTMLAttributes } from 'react';

/** Validation message shown under a control. Pass the control's `aria-describedby` id via `id`. */
export default function InputError({ message, className = '', ...props }: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return message ? (
        <p
            {...props}
            aria-live="polite"
            className={cn('text-brand-danger-text flex items-start gap-1.5 text-[0.8125rem] leading-4 font-medium wrap-break-word', className)}
        >
            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span>{message}</span>
        </p>
    ) : null;
}
