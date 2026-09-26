import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type Account, type AssetTransactionTypeValue } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface AddAssetTransactionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetId: number;
    accounts: Account[];
}

const typeOptions: { value: AssetTransactionTypeValue; label: string }[] = [
    { value: 'purchase', label: 'Purchase (new asset)' },
    { value: 'addition', label: 'Addition/Upgrade' },
    { value: 'sold', label: 'Sold' },
    { value: 'disposal', label: 'Disposal (write-off)' },
];

export default function AddAssetTransactionModal({ open, onOpenChange, assetId, accounts }: AddAssetTransactionModalProps) {
    const form = useForm({
        type: 'purchase' as AssetTransactionTypeValue,
        amount: 0,
        sale_price: 0,
        account_id: null as number | null,
        note: '',
    });

    useEffect(() => {
        if (open) {
            form.setData({ type: 'purchase', amount: 0, sale_price: 0, account_id: null, note: '' });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const isDisposal = form.data.type === 'disposal';
    const isSold = form.data.type === 'sold';

    const accountOptions = accounts.map((account) => ({ value: String(account.id), label: account.name }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({
            type: data.type,
            amount: isSold || isDisposal ? undefined : data.amount,
            sale_price: isSold ? data.sale_price : undefined,
            account_id: isDisposal ? null : data.account_id,
            note: data.note || null,
        }));

        form.post(route('assets.transactions.store', assetId), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Transaction added.');
                onOpenChange(false);
            },
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Add Transaction"
            submitLabel="Add Transaction"
            processing={form.processing}
            onSubmit={submit}
        >
            <FormSelect
                id="type"
                label="Type"
                value={form.data.type}
                onChange={(val) => val && form.setData('type', val as AssetTransactionTypeValue)}
                options={typeOptions}
                placeholder="Select type"
                error={form.errors.type}
            />

            {!isSold && !isDisposal && (
                <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <MoneyInput id="amount" value={form.data.amount} onChange={(e) => form.setData('amount', Number(e.target.value))} required />
                    <InputError message={form.errors.amount} />
                </div>
            )}

            {isSold && (
                <div className="grid gap-2">
                    <Label htmlFor="sale_price">Sale Price</Label>
                    <MoneyInput
                        id="sale_price"
                        value={form.data.sale_price}
                        onChange={(e) => form.setData('sale_price', Number(e.target.value))}
                        required
                    />
                    <InputError message={form.errors.sale_price} />
                </div>
            )}

            {isDisposal && <p className="text-muted-foreground text-xs">পুরো বইমূল্যটাই loss হিসেবে বাদ যাবে — কোনো টাকা ফেরত আসছে না।</p>}

            {!isDisposal && (
                <FormSelect
                    id="account_id"
                    label="Account"
                    value={form.data.account_id}
                    onChange={(val) => val && form.setData('account_id', Number(val))}
                    options={accountOptions}
                    placeholder="Select an account"
                    error={form.errors.account_id}
                />
            )}

            <div className="grid gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} rows={2} />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
