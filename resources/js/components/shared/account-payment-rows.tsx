import MoneyInput from '@/components/shared/money-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account } from '@/types/models';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

/** Index signature needed so this array satisfies Inertia's FormDataConvertible constraint in useForm(). */
export interface PaymentRow {
    [key: string]: number | undefined;
    account_id: number;
    amount: number;
}

interface AccountPaymentRowsProps {
    accounts: Account[];
    rows: PaymentRow[];
    onChange: (rows: PaymentRow[]) => void;
    label?: string;
    emptyHint?: string;
    /**
     * The amount this payment should cover, when the caller has one (a
     * sale/purchase due, a return total, an EMI down payment, ...). Given
     * this, the first row auto-fills with "Cash in Hand" (matched by name —
     * there's no dedicated "default account" flag in the schema, so a shop
     * without one just falls back to its first account) and the full total;
     * a second "Add Account" row defaults to whatever's left over instead of
     * 0; and the Add Account button hides once the rows already add up to
     * the total, since there's nothing left to split out.
     */
    total?: number;
}

const findDefaultAccount = (accounts: Account[]): Account | undefined =>
    accounts.find((account) => account.name.trim().toLowerCase() === 'cash in hand') ?? accounts[0];

/** One or more {account, amount} rows — the multi-account split payment shape used across Account/Purchase/Sale/Contact payments. */
export default function AccountPaymentRows({
    accounts,
    rows,
    onChange,
    label = 'Payment (optional)',
    emptyHint = 'এখনো কোনো account যোগ করা হয়নি — না দিলে পুরোটা বকেয়া থাকবে',
    total,
}: AccountPaymentRowsProps) {
    const money = useMoneyFormat();

    // Stops auto-filling the first row once the person has deliberately removed
    // every row (choosing to leave it all due) — a `total` that keeps changing
    // afterward (e.g. more items added to a sale) shouldn't fight that choice.
    // A reset from the *caller* (e.g. clearing the form after a successful
    // submit) goes through `onChange` directly, not `remove`, so this doesn't
    // block auto-fill the next time the same modal is reused.
    const userClearedRef = useRef(false);

    useEffect(() => {
        if (userClearedRef.current || rows.length > 0 || !total || total <= 0) {
            return;
        }

        const account = findDefaultAccount(accounts);
        if (account) {
            onChange([{ account_id: account.id, amount: total }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [total, rows.length]);

    const sumOfRows = rows.reduce((sum, row) => sum + (row.amount || 0), 0);
    const remaining = total !== undefined ? Math.max(total - sumOfRows, 0) : 0;
    const canAddMore = total === undefined || remaining > 0;

    const update = (index: number, changes: Partial<PaymentRow>) => {
        const next = [...rows];
        next[index] = { ...next[index], ...changes };
        onChange(next);
    };

    const add = () => onChange([...rows, { account_id: findDefaultAccount(accounts)?.id ?? 0, amount: total !== undefined ? remaining : 0 }]);

    const remove = (index: number) => {
        const next = rows.filter((_, i) => i !== index);
        if (next.length === 0) {
            userClearedRef.current = true;
        }
        onChange(next);
    };

    return (
        <div className="grid gap-2">
            <Label>{label}</Label>

            {rows.length === 0 && <p className="text-muted-foreground text-xs">{emptyHint}</p>}

            {rows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                    <Select
                        value={row.account_id ? String(row.account_id) : ''}
                        onValueChange={(value) => update(index, { account_id: Number(value) })}
                    >
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map((account) => (
                                <SelectItem key={account.id} value={String(account.id)}>
                                    {account.name} — {money(account.current_balance)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <MoneyInput value={row.amount} onChange={(e) => update(index, { amount: Number(e.target.value) })} className="w-36" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            ))}

            {canAddMore && (
                <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={add}>
                    <Plus className="mr-1 size-3.5" />
                    Add Account
                </Button>
            )}
        </div>
    );
}
