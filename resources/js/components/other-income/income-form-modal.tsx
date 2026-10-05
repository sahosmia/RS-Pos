import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { today } from '@/lib/format-date';
import { type Account, type OtherIncomeCategoryRow } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { type FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface IncomeFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: OtherIncomeCategoryRow[];
    accounts: Account[];
}

/** "Add Other Income": which category, which account the money lands in, how much, when, and an optional note. */
export function IncomeFormModal({ open, onOpenChange, categories, accounts }: IncomeFormModalProps) {
    const form = useForm({
        other_income_category_id: null as number | null,
        account_id: null as number | null,
        amount: 0,
        income_date: today(),
        note: '',
    });

    // every time the modal opens it starts blank, with the default account pre-selected
    useEffect(() => {
        if (!open) return;

        form.clearErrors();
        form.setData({
            other_income_category_id: null,
            account_id: accounts.find((account) => account.is_default)?.id ?? accounts[0]?.id ?? null,
            amount: 0,
            income_date: today(),
            note: '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('other-income.store'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Income added.');
                onOpenChange(false);
            },
        });
    };

    return (
        <FormModal open={open} onOpenChange={onOpenChange} title="Add Other Income" processing={form.processing} onSubmit={submit}>
            <FormSelect
                id="other_income_category_id"
                label="Category"
                value={form.data.other_income_category_id}
                onChange={(val) => form.setData('other_income_category_id', val ? Number(val) : null)}
                options={categories.map((category) => ({ value: String(category.id), label: category.name }))}
                placeholder="Select a category"
                error={form.errors.other_income_category_id}
                helperText={categories.length === 0 ? 'আগে Categories ট্যাব থেকে একটা category যোগ করুন।' : undefined}
                required
            />

            <FormSelect
                id="account_id"
                label="Received Into Account"
                value={form.data.account_id}
                onChange={(val) => form.setData('account_id', val ? Number(val) : null)}
                options={accounts.map((account) => ({ value: String(account.id), label: account.name }))}
                placeholder="Select account"
                error={form.errors.account_id}
                helperText="টাকাটা এই account-এ জমা হবে।"
                required
            />

            <MoneyInput
                id="amount"
                label="Amount"
                value={form.data.amount}
                onChange={(e) => form.setData('amount', Number(e.target.value))}
                error={form.errors.amount}
                required
            />

            <FormInput
                id="income_date"
                label="Date"
                type="date"
                value={form.data.income_date}
                onChange={(e) => form.setData('income_date', e.target.value)}
                error={form.errors.income_date}
                required
            />

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="income_note">Note</Label>
                <Textarea
                    id="income_note"
                    placeholder="Add a note (optional)"
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                />
                {form.errors.note && <p className="text-sm text-red-600">{form.errors.note}</p>}
            </div>
        </FormModal>
    );
}
