import AccountPaymentRows, { type PaymentRow } from '@/components/shared/account-payment-rows';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { today } from '@/lib/format-date';
import { type Account, type ExpenseCategoryOption, type ExpenseListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SupplierPickOption {
    id: number;
    name: string;
    phone?: string | null;
}

interface ExpenseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: ExpenseCategoryOption[];
    accounts: Account[];
    expense?: ExpenseListItem;
}

const emptyPayments: PaymentRow[] = [];

/**
 * Same form for both Add and Edit — Edit is only reachable while the expense's
 * `can_edit` is true (nothing paid yet). Initial payment (`payments`) and the
 * file attachment only ever get *posted* once, at creation — editing an
 * expense's account/amount split afterward goes through the separate "Add
 * Expense Payment" flow instead, same as Purchase.
 */
export default function ExpenseModal({ open, onOpenChange, categories, accounts, expense }: ExpenseModalProps) {
    const isEdit = expense !== undefined;
    const [supplier, setSupplier] = useState<SupplierPickOption | null>(expense?.contact ?? null);
    const [payments, setPayments] = useState<PaymentRow[]>(emptyPayments);

    const form = useForm<{
        expense_category_id: number;
        contact_id: number | null;
        total_amount: number;
        expense_date: string;
        due_date: string;
        note: string;
        attachment: File | null;
        payments: PaymentRow[];
    }>({
        expense_category_id: expense?.category.id ?? categories[0]?.id ?? 0,
        contact_id: expense?.contact?.id ?? null,
        total_amount: expense?.total_amount ?? 0,
        expense_date: expense?.expense_date ?? today(),
        due_date: expense?.due_date ?? '',
        note: expense?.note ?? '',
        attachment: null,
        payments: emptyPayments,
    });

    useEffect(() => {
        if (open) {
            form.setData({
                expense_category_id: expense?.category.id ?? categories[0]?.id ?? 0,
                contact_id: expense?.contact?.id ?? null,
                total_amount: expense?.total_amount ?? 0,
                expense_date: expense?.expense_date ?? today(),
                due_date: expense?.due_date ?? '',
                note: expense?.note ?? '',
                attachment: null,
                payments: emptyPayments,
            });
            setSupplier(expense?.contact ?? null);
            setPayments(emptyPayments);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, expense?.id]);

    const categoryOptions = categories.map((category) => ({ value: String(category.id), label: category.name }));

    const updatePayments = (rows: PaymentRow[]) => {
        setPayments(rows);
        form.setData('payments', rows);
    };

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
            // Multipart (attachment upload) can't be sent as a real PATCH, so POST with a spoofed method Laravel understands.
            // `payments` rides along but UpdateExpenseRequest has no rule for it, so it's simply ignored server-side.
            form.transform((data) => ({ ...data, due_date: data.due_date || null, _method: 'patch' }));
            form.post(route('expenses.update', expense.id), options);
        } else {
            form.transform((data) => ({ ...data, due_date: data.due_date || null }));
            form.post(route('expenses.store'), options);
        }
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Edit Expense' : 'Add Expense'}
            description={isEdit ? 'পেমেন্ট শুরু হওয়ার আগ পর্যন্তই এডিট করা যায়' : 'নতুন খরচ যোগ করুন — বকেয়া হিসেবে শুরু হবে'}
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

                <div className="grid gap-2">
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                    id="expense_date"
                    label="Date"
                    type="date"
                    value={form.data.expense_date}
                    onChange={(e) => form.setData('expense_date', e.target.value)}
                    error={form.errors.expense_date}
                    required
                />

                <FormInput
                    id="due_date"
                    label="Due Date (optional)"
                    type="date"
                    value={form.data.due_date}
                    onChange={(e) => form.setData('due_date', e.target.value)}
                    error={form.errors.due_date}
                />
            </div>

            {!isEdit && (
                <AccountPaymentRows
                    accounts={accounts}
                    rows={payments}
                    onChange={updatePayments}
                    label="Paid From (optional)"
                    emptyHint="এখনো কোনো account যোগ করা হয়নি — না দিলে পুরোটা বকেয়া থাকবে"
                    total={form.data.total_amount}
                />
            )}

            <div className="grid gap-2">
                <Label htmlFor="contact_id" className="text-muted-foreground font-normal">
                    Landlord/Vendor (optional)
                </Label>
                <SearchableSelect
                    id="contact_id"
                    value={supplier}
                    onChange={(next) => {
                        setSupplier(next);
                        form.setData('contact_id', next?.id ?? null);
                    }}
                    getLabel={(option) => option.name}
                    getSublabel={(option) => option.phone ?? ''}
                    searchUrl={route('contacts.search')}
                    searchParams={{ type: 'supplier' }}
                    placeholder="Search a supplier by name or phone"
                    clearable
                />
                <InputError message={form.errors.contact_id} />
            </div>

            <div className="grid gap-2">
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

            <div className="grid gap-2">
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
