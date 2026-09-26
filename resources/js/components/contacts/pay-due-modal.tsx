import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import { type Account, type ContactDetail } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

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
    const { t } = useTranslation();

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

    const directionOptions = [
        { value: 'received', label: `${t('payDueModal', 'receive_from')} ${contact.name}` },
        { value: 'made', label: `${t('payDueModal', 'pay_to')} ${contact.name}` },
    ];

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('contacts.payments.store', contact.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Payment recorded.');
                onOpenChange(false);
            },
            onError: () => toast.error('Could not record payment — check the form for errors.'),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={t('payDueModal', 'title')}
            description={`${t('payDueModal', 'current_status')} ${contact.balance_label}`}
            submitLabel={t('payDueModal', 'submit')}
            processing={form.processing}
            onSubmit={submit}
        >
            {availableDirections.length > 1 && (
                <FormSelect
                    id="direction"
                    label={t('payDueModal', 'direction')}
                    value={form.data.direction}
                    onChange={(val) => val && form.setData('direction', val as Direction)}
                    options={directionOptions}
                    error={form.errors.direction}
                />
            )}

            <div className="grid gap-2">
                <Label htmlFor="account_id">{t('common', 'account')}</Label>
                <Select
                    value={form.data.account_id ? String(form.data.account_id) : ''}
                    onValueChange={(value) => form.setData('account_id', Number(value))}
                >
                    <SelectTrigger id="account_id">
                        <SelectValue placeholder={t('common', 'select_account')} />
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
                <Label htmlFor="amount">{t('common', 'amount')}</Label>
                <MoneyInput id="amount" value={form.data.amount} onChange={(e) => form.setData('amount', Number(e.target.value))} required />
                <InputError message={form.errors.amount} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="note">{t('common', 'note')}</Label>
                <Textarea id="note" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
