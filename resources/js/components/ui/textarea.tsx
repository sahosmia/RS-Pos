import * as React from 'react';

import { controlSurface } from '@/lib/form-control';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn('flex min-h-20 w-full resize-y px-3 py-2 text-base leading-5 md:text-sm', controlSurface, className)}
            ref={ref}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

export { Textarea };
