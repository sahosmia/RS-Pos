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
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface RefundCreditModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contact: ContactDetail;
    accounts: Account[];
}

/**
 * Hands a customer's credit (advance / overpayment, shown as a negative
 * balance) back as cash from one of the shop's accounts.
 */
export default function RefundCreditModal({ open, onOpenChange, contact, accounts }: RefundCreditModalProps) {
    const money = useMoneyFormat();
    const { t } = useTranslation();
    const credit = Math.max(0, -contact.balance);

    const form = useForm({ account_id: accounts[0]?.id ?? 0, amount: credit, note: '' });

    useEffect(() => {
        if (open) {
            form.clearErrors();
            form.setData({ account_id: accounts.find((account) => account.is_default)?.id ?? accounts[0]?.id ?? 0, amount: credit, note: '' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('contacts.refunds.store', contact.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('refundModal', 'toast'));
                onOpenChange(false);
            },
            onError: () => toast.error(t('refundModal', 'error')),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={t('refundModal', 'title')}
            description={`${t('refundModal', 'current_credit')} ${money(credit)} — ${t('refundModal', 'hint')}`}
            submitLabel={t('refundModal', 'submit')}
            processing={form.processing}
            onSubmit={submit}
        >
            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="refund_account_id">{t('common', 'account')}</Label>
                <Select
                    value={form.data.account_id ? String(form.data.account_id) : ''}
                    onValueChange={(value) => form.setData('account_id', Number(value))}
                >
                    <SelectTrigger id="refund_account_id">
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

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="refund_amount" required>
                    {t('common', 'amount')}
                </Label>
                <MoneyInput
                    id="refund_amount"
                    value={form.data.amount}
                    onChange={(e) => form.setData('amount', Math.min(Number(e.target.value), credit))}
                    required
                />
                <InputError message={form.errors.amount} />
            </div>

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="refund_note">{t('common', 'note')}</Label>
                <Textarea
                    id="refund_note"
                    placeholder={t('refundModal', 'note_placeholder')}
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
