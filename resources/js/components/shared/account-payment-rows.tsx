import MoneyInput from '@/components/shared/money-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account } from '@/types/models';
import { Plus, Trash2 } from 'lucide-react';

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
}

/** One or more {account, amount} rows — the multi-account split payment shape used across Account/Purchase/Sale/Contact payments. */
export default function AccountPaymentRows({
    accounts,
    rows,
    onChange,
    label = 'Payment (optional)',
    emptyHint = 'এখনো কোনো account যোগ করা হয়নি — না দিলে পুরোটা বকেয়া থাকবে',
}: AccountPaymentRowsProps) {
    const money = useMoneyFormat();

    const update = (index: number, changes: Partial<PaymentRow>) => {
        const next = [...rows];
        next[index] = { ...next[index], ...changes };
        onChange(next);
    };

    const add = () => onChange([...rows, { account_id: accounts[0]?.id ?? 0, amount: 0 }]);

    const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between">
                <Label>{label}</Label>
                <Button type="button" variant="outline" size="sm" onClick={add}>
                    <Plus className="mr-1 size-3.5" />
                    Add Account
                </Button>
            </div>

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
        </div>
    );
}
