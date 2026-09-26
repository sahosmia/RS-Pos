import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import MoneyInput from '@/components/shared/money-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { today } from '@/lib/format-date';
import { type ExpenseCategoryOption, type ExpenseListItem } from '@/types/models';
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
    expense?: ExpenseListItem;
}

/** Same form for both Add and Edit — Edit is only reachable while the expense's `can_edit` is true (nothing paid yet). */
export default function ExpenseModal({ open, onOpenChange, categories, expense }: ExpenseModalProps) {
    const isEdit = expense !== undefined;
    const [supplier, setSupplier] = useState<SupplierPickOption | null>(expense?.contact ?? null);

    const form = useForm({
        expense_category_id: expense?.category.id ?? categories[0]?.id ?? 0,
        contact_id: expense?.contact?.id ?? (null as number | null),
        total_amount: expense?.total_amount ?? 0,
        expense_date: expense?.expense_date ?? today(),
        note: expense?.note ?? '',
    });

    useEffect(() => {
        if (open) {
            form.setData({
                expense_category_id: expense?.category.id ?? categories[0]?.id ?? 0,
                contact_id: expense?.contact?.id ?? null,
                total_amount: expense?.total_amount ?? 0,
                expense_date: expense?.expense_date ?? today(),
                note: expense?.note ?? '',
            });
            setSupplier(expense?.contact ?? null);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, expense?.id]);

    const categoryOptions = categories.map((category) => ({ value: String(category.id), label: category.name }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
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
            form.put(route('expenses.update', expense.id), options);
        } else {
            form.post(route('expenses.store'), options);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'পেমেন্ট শুরু হওয়ার আগ পর্যন্তই এডিট করা যায়' : 'নতুন খরচ যোগ করুন — বকেয়া হিসেবে শুরু হবে'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <FormSelect
                        id="expense_category_id"
                        label="Category"
                        value={form.data.expense_category_id}
                        onChange={(val) => val && form.setData('expense_category_id', Number(val))}
                        options={categoryOptions}
                        placeholder="Select category"
                        error={form.errors.expense_category_id}
                    />

                    <div className="grid gap-2">
                        <Label htmlFor="contact_id">Landlord/Vendor (optional)</Label>
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
                        <Label htmlFor="total_amount">Amount</Label>
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

                    <div className="grid gap-2">
                        <Label htmlFor="note">Note</Label>
                        <Textarea id="note" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} rows={2} />
                        <InputError message={form.errors.note} />
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Expense'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
