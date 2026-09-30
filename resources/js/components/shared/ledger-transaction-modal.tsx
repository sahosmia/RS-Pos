import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type Account } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

export interface LedgerTransactionTypeOption {
    value: string;
    label: string;
    /** Whether picking this type shows/requires the account field — false for a pure accrual (e.g. interest_charge) or a no-cash correction. */
    needsAccount: boolean;
    /** Signed amount hint shown under the field, e.g. "+ increases the balance". */
    hint?: string;
    /** Lets the amount go negative (only "adjustment" normally needs this). */
    allowNegative?: boolean;
}

interface LedgerTransactionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    routeName: string;
    routeParam: number;
    typeOptions: LedgerTransactionTypeOption[];
    accounts: Account[];
}

/**
 * Shared "Add Transaction" form for Company Loan/Investor/Other Liability —
 * identical shape (type, amount, optional account, note) per TASKS.md's
 * "same pattern" note. Asset has its own modal instead (sale_price vs
 * amount, disposal has no account) since its shape genuinely differs.
 */
export default function LedgerTransactionModal({
    open,
    onOpenChange,
    title,
    routeName,
    routeParam,
    typeOptions,
    accounts,
}: LedgerTransactionModalProps) {
    const form = useForm({
        type: typeOptions[0]?.value ?? '',
        amount: 0,
        account_id: null as number | null,
        note: '',
    });

    useEffect(() => {
        if (open) {
            form.setData({ type: typeOptions[0]?.value ?? '', amount: 0, account_id: null, note: '' });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const selected = typeOptions.find((option) => option.value === form.data.type) ?? typeOptions[0];

    const accountOptions = accounts.map((account) => ({ value: String(account.id), label: account.name }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route(routeName, routeParam), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Transaction added.');
                onOpenChange(false);
            },
        });
    };

    return (
        <FormModal open={open} onOpenChange={onOpenChange} title={title} submitLabel="Add Transaction" processing={form.processing} onSubmit={submit}>
            <FormSelect
                id="type"
                label="Type"
                value={form.data.type}
                onChange={(val) => val && form.setData('type', val)}
                options={typeOptions}
                placeholder="Select type"
                error={form.errors.type}
            />

            <div className="grid gap-2">
                <Label htmlFor="amount" required>Amount</Label>
                <MoneyInput
                    id="amount"
                    value={form.data.amount}
                    onChange={(e) => form.setData('amount', Number(e.target.value))}
                    placeholder="0.00"
                    min={selected?.allowNegative ? undefined : 0}
                    required
                />
                {selected?.hint && <p className="text-muted-foreground text-xs">{selected.hint}</p>}
                <InputError message={form.errors.amount} />
            </div>

            {selected?.needsAccount && (
                <FormSelect
                    id="account_id"
                    label="Account"
                    value={form.data.account_id}
                    onChange={(val) => val && form.setData('account_id', Number(val))}
                    options={accountOptions}
                    placeholder="Select an account"
                    error={form.errors.account_id}
                    required
                />
            )}

            <div className="grid gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                    id="note"
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                    placeholder="e.g. Transaction note or reference details"
                    rows={2}
                />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
