import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { today } from '@/lib/format-date';
import { type Account, type ExpenseCategoryOption, type ExpenseListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface ExpenseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: ExpenseCategoryOption[];
    accounts: Account[];
    expense?: ExpenseListItem;
}

export default function ExpenseModal({ open, onOpenChange, categories, accounts, expense }: ExpenseModalProps) {
    const isEdit = expense !== undefined;
    const defaultAccountId = accounts.find((a) => a.is_default)?.id ?? accounts[0]?.id ?? 0;

    const form = useForm<{
        expense_category_id: number;
        account_id: number;
        total_amount: number;
        expense_date: string;
        note: string;
        attachment: File | null;
    }>({
        expense_category_id: expense?.category.id ?? categories[0]?.id ?? 0,
        account_id: expense?.account?.id ?? defaultAccountId,
        total_amount: expense?.total_amount ?? 0,
        expense_date: expense?.expense_date ?? today(),
        note: expense?.note ?? '',
        attachment: null,
    });

    useEffect(() => {
        if (open) {
            form.setData({
                expense_category_id: expense?.category.id ?? categories[0]?.id ?? 0,
                account_id: expense?.account?.id ?? defaultAccountId,
                total_amount: expense?.total_amount ?? 0,
                expense_date: expense?.expense_date ?? today(),
                note: expense?.note ?? '',
                attachment: null,
            });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, expense?.id]);

    const categoryOptions = categories.map((category) => ({ value: String(category.id), label: category.name }));
    const accountOptions = accounts.map((account) => ({
        value: String(account.id),
        label: `${account.name} (৳${account.current_balance.toLocaleString()})`,
    }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success(isEdit ? 'Expense updated.' : 'Expense added.');
                onOpenChange(false);
            },
            onError: (errors: Record<string, string>) => {
                if (errors.expense) toast.error(errors.expense);
            },
        };

        if (isEdit) {
            form.transform((data) => ({ ...data, _method: 'patch' }));
            form.post(route('expenses.update', expense.id), options);
        } else {
            form.post(route('expenses.store'), options);
        }
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Edit Expense' : 'Add Expense'}
            description="নতুন খরচ যোগ করুন — অ্যাকাউন্ট থেকে সরাসরি পেমেন্ট হবে"
            submitLabel={isEdit ? 'Save Changes' : 'Add Expense'}
            processing={form.processing}
            onSubmit={submit}
            contentClassName="sm:max-w-2xl"
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <FormSelect
                    id="expense_category_id"
                    label="Category"
                    value={form.data.expense_category_id}
                    onChange={(val) => val && form.setData('expense_category_id', Number(val))}
                    options={categoryOptions}
                    placeholder="Select category"
                    error={form.errors.expense_category_id}
                    required
                />

                <FormSelect
                    id="account_id"
                    label="Account"
                    value={form.data.account_id}
                    onChange={(val) => val && form.setData('account_id', Number(val))}
                    options={accountOptions}
                    placeholder="Select account"
                    error={form.errors.account_id}
                    required
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="total_amount" required>
                        Amount
                    </Label>
                    <MoneyInput
                        id="total_amount"
                        value={form.data.total_amount}
                        onChange={(e) => form.setData('total_amount', Number(e.target.value))}
                        required
                    />
                    <InputError message={form.errors.total_amount} />
                </div>

                <FormInput
                    id="expense_date"
                    label="Date"
                    type="date"
                    value={form.data.expense_date}
                    onChange={(e) => form.setData('expense_date', e.target.value)}
                    error={form.errors.expense_date}
                    required
                />
            </div>

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="attachment">Attachment (optional)</Label>
                <Input
                    id="attachment"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => form.setData('attachment', e.target.files?.[0] ?? null)}
                />
                {expense?.attachment && (
                    <p className="text-muted-foreground text-xs">
                        Current:{' '}
                        <a href={expense.attachment.url} target="_blank" rel="noreferrer" className="underline">
                            {expense.attachment.name}
                        </a>{' '}
                        — আপলোড করলে replace হবে
                    </p>
                )}
                <InputError message={form.errors.attachment} />
            </div>

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                    id="note"
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                    rows={2}
                    placeholder="Enter expense details or notes..."
                />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
