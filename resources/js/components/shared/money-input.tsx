import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ComponentProps } from 'react';

type MoneyInputProps = Omit<ComponentProps<typeof Input>, 'type'>;

export default function MoneyInput({ className, ...props }: MoneyInputProps) {
    const { shop } = usePage<SharedData>().props;

    return (
        <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
                {shop.currency_symbol}
            </span>
            <Input type="number" step="0.01" className={cn('pl-8', className)} {...props} />
        </div>
    );
}
