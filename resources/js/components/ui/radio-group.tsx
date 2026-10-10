import * as React from 'react';

import { cn } from '@/lib/utils';

interface RadioGroupContextValue {
    name: string;
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    invalid?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
    value?: string;
    onValueChange?: (value: string) => void;
    name?: string;
    disabled?: boolean;
    /** Marks every item invalid (red border) — pass `Boolean(errors.field)`. */
    invalid?: boolean;
}

/**
 * Radio group built on native `<input type="radio">`, so arrow-key navigation, grouping and form
 * semantics come from the browser (no extra dependency). API mirrors shadcn's RadioGroup.
 */
const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
    ({ className, value, onValueChange, name, disabled, invalid, children, ...props }, ref) => {
        const generatedName = React.useId();

        return (
            <RadioGroupContext.Provider value={{ name: name ?? generatedName, value, onValueChange, disabled, invalid }}>
                <div ref={ref} role="radiogroup" aria-invalid={invalid || undefined} className={cn('grid gap-2.5', className)} {...props}>
                    {children}
                </div>
            </RadioGroupContext.Provider>
        );
    },
);
RadioGroup.displayName = 'RadioGroup';

interface RadioGroupItemProps extends Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'name'> {
    value: string;
    /** When given, renders a clickable label next to the radio. Omit to pair with your own `<Label htmlFor>`. */
    children?: React.ReactNode;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(({ className, value, children, disabled, id, ...props }, ref) => {
    const group = React.useContext(RadioGroupContext);
    const isDisabled = disabled ?? group?.disabled;

    const radio = (
        <input
            ref={ref}
            id={id}
            type="radio"
            name={group?.name}
            value={value}
            checked={group?.onValueChange ? group.value === value : undefined}
            onChange={() => group?.onValueChange?.(value)}
            disabled={isDisabled}
            aria-invalid={group?.invalid || undefined}
            className={cn(
                'peer size-4.5 shrink-0 cursor-pointer appearance-none rounded-full border border-brand-control-border bg-brand-control-bg outline-hidden',
                'motion-field',
                'hover:border-brand-control-border-hover focus-visible:border-brand-focus-ring focus-visible:ring-[3px] focus-visible:ring-brand-focus-ring/25',
                'checked:border-brand-primary checked:bg-brand-primary checked:bg-[radial-gradient(circle,#fff_0_30%,transparent_34%)]',
                'aria-invalid:border-brand-danger aria-invalid:focus-visible:ring-brand-danger/25',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );

    if (!children) {
        return radio;
    }

    return (
        <label className={cn('flex items-center gap-2.5 text-sm leading-5', isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
            {radio}
            {children}
        </label>
    );
});
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
