import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account, type ContactDetail } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo } from 'react';

interface PayDueModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contact: ContactDetail;
    accounts: Account[];
}

/** 'received' — they pay us (receivable shrinks). 'made' — we pay them (payable shrinks). */
type Direction = 'received' | 'made';

export default function PayDueModal({ open, onOpenChange, contact, accounts }: PayDueModalProps) {
    const money = useMoneyFormat();

    const availableDirections = useMemo<Direction[]>(() => {
        if (contact.type === 'customer') return ['received'];
        if (contact.type === 'supplier') return ['made'];
        return ['received', 'made'];
    }, [contact.type]);

    const form = useForm({
        account_id: accounts[0]?.id ?? 0,
        amount: 0,
        direction: availableDirections[0] as Direction,
        note: '',
    });

    useEffect(() => {
        if (open) {
            form.clearErrors();
            form.setData({ account_id: accounts[0]?.id ?? 0, amount: 0, direction: availableDirections[0], note: '' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('contacts.payments.store', contact.id), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Pay Due Amount"
            description={`বর্তমান অবস্থা: ${contact.balance_label}`}
            submitLabel="Record Payment"
            processing={form.processing}
            onSubmit={submit}
        >
            {availableDirections.length > 1 && (
                <div className="grid gap-2">
                    <Label htmlFor="direction">Direction</Label>
                    <Select value={form.data.direction} onValueChange={(value) => form.setData('direction', value as Direction)}>
                        <SelectTrigger id="direction">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="received">Receive from {contact.name}</SelectItem>
                            <SelectItem value="made">Pay to {contact.name}</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.direction} />
                </div>
            )}

            <div className="grid gap-2">
                <Label htmlFor="account_id">Account</Label>
                <Select
                    value={form.data.account_id ? String(form.data.account_id) : ''}
                    onValueChange={(value) => form.setData('account_id', Number(value))}
                >
                    <SelectTrigger id="account_id">
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
                <InputError message={form.errors.account_id} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <MoneyInput id="amount" value={form.data.amount} onChange={(e) => form.setData('amount', Number(e.target.value))} required />
                <InputError message={form.errors.amount} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
