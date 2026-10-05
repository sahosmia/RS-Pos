import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { today } from '@/lib/format-date';
import { type Account, type CompanyLoanListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { type FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface LoanFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The loan being edited; null adds a new one. */
    editing: CompanyLoanListItem | null;
    accounts: Account[];
}

/**
 * Add or edit a company loan. A new entry is either a loan that was already running (its original amount and
 * what is still owed — no account is touched) or one taken now (the money lands in an account).
 */
export function LoanFormModal({ open, onOpenChange, editing, accounts }: LoanFormModalProps) {
    const form = useForm({
        loan_type: 'new' as 'existing' | 'new',
        lender_name: '',
        loan_amount: 0,
        current_balance: 0,
        account_id: null as number | null,
        interest_rate: null as number | null,
        start_date: today(),
    });

    // every time the modal opens it shows the loan being edited, or a blank "new loan" form
    useEffect(() => {
        if (!open) return;

        form.clearErrors();
        form.setData(
            editing
                ? {
                      loan_type: 'existing',
                      current_balance: 0,
                      account_id: null,
                      lender_name: editing.lender_name,
                      loan_amount: editing.loan_amount,
                      interest_rate: editing.interest_rate,
                      start_date: editing.start_date,
                  }
                : {
                      loan_type: 'new',
                      lender_name: '',
                      loan_amount: 0,
                      current_balance: 0,
                      account_id: accounts.find((account) => account.is_default)?.id ?? accounts[0]?.id ?? null,
                      interest_rate: null,
                      start_date: today(),
                  },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(editing ? 'Loan updated.' : 'Loan added.');
                onOpenChange(false);
            },
        };

        if (editing) {
            form.patch(route('company-loans.update', editing.id), options);
        } else {
            form.post(route('company-loans.store'), options);
        }
    };

    return (
        <FormModal open={open} onOpenChange={onOpenChange} title={editing ? 'Edit Loan' : 'Add Loan'} processing={form.processing} onSubmit={submit}>
            {!editing && (
                <FormSelect
                    id="loan_type"
                    label="Loan Type"
                    value={form.data.loan_type}
                    onChange={(value) => form.setData('loan_type', value === 'new' ? 'new' : 'existing')}
                    options={[
                        { value: 'existing', label: 'Existing loan — আগে থেকেই চলছে' },
                        { value: 'new', label: 'New loan — এখন টাকা পেলাম' },
                    ]}
                    required
                />
            )}

            <FormInput
                id="lender_name"
                label="Lender"
                value={form.data.lender_name}
                onChange={(e) => form.setData('lender_name', e.target.value)}
                error={form.errors.lender_name}
                placeholder="e.g. Bank Asia or John Doe"
                required
            />

            <MoneyInput
                id="loan_amount"
                label={!editing && form.data.loan_type === 'existing' ? 'Original Loan Amount' : 'Loan Amount'}
                value={form.data.loan_amount}
                onChange={(e) => form.setData('loan_amount', Number(e.target.value))}
                error={form.errors.loan_amount}
                required
            />

            {!editing && form.data.loan_type === 'existing' && (
                <MoneyInput
                    id="current_balance"
                    label="Current Outstanding Balance"
                    value={form.data.current_balance}
                    onChange={(e) => form.setData('current_balance', Number(e.target.value))}
                    error={form.errors.current_balance}
                    helperText="এখন যতটা বাকি আছে — এটাই opening balance হিসেবে যাবে। কোনো account-এ হিট করবে না।"
                    required
                />
            )}

            {!editing && form.data.loan_type === 'new' && (
                <FormSelect
                    id="account_id"
                    label="Received Into Account"
                    value={form.data.account_id}
                    onChange={(value) => form.setData('account_id', value ? Number(value) : null)}
                    options={accounts.map((account) => ({ value: String(account.id), label: account.name }))}
                    placeholder="Select account"
                    error={form.errors.account_id}
                    helperText="Loan-এর টাকা এই account-এ জমা হবে।"
                    required
                />
            )}

            <FormInput
                id="interest_rate"
                label="Interest Rate (%)"
                type="number"
                step="0.01"
                value={form.data.interest_rate ?? ''}
                onChange={(e) => form.setData('interest_rate', e.target.value === '' ? null : Number(e.target.value))}
                error={form.errors.interest_rate}
                placeholder="e.g. 10"
                helperText="শুধু তথ্যের জন্য — কোনো automatic হিসাব হবে না।"
            />

            <FormInput
                id="start_date"
                label="Start Date"
                type="date"
                value={form.data.start_date}
                onChange={(e) => form.setData('start_date', e.target.value)}
                error={form.errors.start_date}
                required
            />
        </FormModal>
    );
}
