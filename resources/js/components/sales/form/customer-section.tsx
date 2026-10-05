import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import { type SaleFormApi } from '@/components/sales/form/sale-form-utils';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type CustomerOption, type RecentSale } from '@/types/models';
import { History, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CustomerSectionProps {
    form: SaleFormApi;
    customer: CustomerOption | null;
    onCustomerChange: (customer: CustomerOption | null) => void;
    onQuickAdd: () => void;
    /** Tapping a recent purchase copies its items into the cart. */
    onAddRecentSale: (sale: RecentSale) => void;
}

/** One compact row: customer picker (with quick-add) and sale date — plus the customer's due / advance and recent purchases, only when there are any. */
export function CustomerSection({ form, customer, onCustomerChange, onQuickAdd, onAddRecentSale }: CustomerSectionProps) {
    const money = useMoneyFormat();
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
    const customerId = form.data.customer_id;

    useEffect(() => {
        if (!customerId) {
            setRecentSales([]);
            return;
        }

        fetch(route('contacts.recent-sales', customerId), { headers: { Accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : { sales: [] }))
            .then((b) => setRecentSales(b.sales ?? []))
            .catch(() => setRecentSales([]));
    }, [customerId]);

    return (
        <div className="space-y-2">
            <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="customer_id" required>
                        Customer
                    </Label>
                    <div className="flex gap-2">
                        <div className="min-w-0 flex-1">
                            <SearchableSelect
                                id="customer_id"
                                value={customer}
                                onChange={(next) => {
                                    onCustomerChange(next);
                                    form.setData('customer_id', next?.id ?? 0);
                                }}
                                getLabel={(o) => o.display_name}
                                getSublabel={(o) => o.phone ?? ''}
                                searchUrl={route('contacts.search')}
                                searchParams={{ type: 'customer' }}
                                placeholder="Search a customer by name or phone"
                            />
                        </div>
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label="New Customer"
                                        onClick={onQuickAdd}
                                        className="shrink-0"
                                    >
                                        <Plus className="size-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>New Customer</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <InputError message={form.errors.customer_id} />
                </div>

                <FormInput
                    id="sale_date"
                    label="Date"
                    type="date"
                    value={form.data.sale_date}
                    onChange={(e) => form.setData('sale_date', e.target.value)}
                    error={form.errors.sale_date}
                    required
                />
            </div>

            {customer && customer.balance !== 0 && (
                <p className={customer.balance > 0 ? 'text-xs text-amber-600 dark:text-amber-400' : 'text-xs text-sky-600 dark:text-sky-400'}>
                    {customer.balance > 0 ? 'পূর্বের বাকি' : 'অগ্রিম জমা'}:{' '}
                    <strong className="font-semibold tabular-nums">{money(Math.abs(customer.balance))}</strong>
                </p>
            )}

            {recentSales.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    <History className="text-muted-foreground size-3.5" />
                    {recentSales.map((recent) => (
                        <button
                            key={recent.id}
                            type="button"
                            onClick={() => onAddRecentSale(recent)}
                            title="আগের কেনা আবার cart-এ যোগ করুন"
                            className="hover:bg-muted flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors"
                        >
                            <span className="max-w-[180px] truncate">{recent.items.map((i) => i.product_name).join(', ')}</span>
                            <span className="text-muted-foreground tabular-nums">{money(recent.total_amount)}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
