import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import { type Account, type ContactDetail, type ContactPurchaseSummary, type ContactSaleSummary } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

interface PayDueModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contact: ContactDetail;
    accounts: Account[];
    /**
     * The contact's own sales — used to let a 'received' payment settle one
     * specific invoice instead of the general balance. Optional: callers
     * that don't already have this loaded (e.g. the Contacts list page's
     * quick "Pay Due" action) just get the plain general-balance form.
     */
    sales?: ContactSaleSummary[];
    /** The contact's own purchases — same as `sales`, for a 'made' payment. */
    purchases?: ContactPurchaseSummary[];
}

/** 'received' — they pay us (receivable shrinks). 'made' — we pay them (payable shrinks). */
type Direction = 'received' | 'made';

const GENERAL_BALANCE = 'general';

export default function PayDueModal({ open, onOpenChange, contact, accounts, sales = [], purchases = [] }: PayDueModalProps) {
    const money = useMoneyFormat();
    const { t } = useTranslation();

    const availableDirections = useMemo<Direction[]>(() => {
        if (contact.type === 'customer') return ['received'];
        if (contact.type === 'supplier') return ['made'];
        return ['received', 'made'];
    }, [contact.type]);

    const openSales = useMemo(() => sales.filter((sale) => sale.due_amount > 0), [sales]);
    const openPurchases = useMemo(() => purchases.filter((purchase) => purchase.due_amount > 0), [purchases]);

    const form = useForm({
        account_id: accounts[0]?.id ?? 0,
        amount: 0,
        discount_amount: 0,
        direction: availableDirections[0] as Direction,
        note: '',
        sale_id: null as number | null,
        purchase_id: null as number | null,
    });

    useEffect(() => {
        if (open) {
            form.clearErrors();
            form.setData({
                account_id: accounts[0]?.id ?? 0,
                amount: 0,
                discount_amount: 0,
                direction: availableDirections[0],
                note: '',
                sale_id: null,
                purchase_id: null,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const directionOptions = [
        { value: 'received', label: `${t('payDueModal', 'receive_from')} ${contact.display_name}` },
        { value: 'made', label: `${t('payDueModal', 'pay_to')} ${contact.display_name}` },
    ];

    // The due amount of whichever specific sale/purchase is currently targeted — used
    // to default and cap the amount field once one is picked instead of "general balance".
    const targetedDue =
        form.data.direction === 'received'
            ? (openSales.find((sale) => sale.id === form.data.sale_id)?.due_amount ?? null)
            : (openPurchases.find((purchase) => purchase.id === form.data.purchase_id)?.due_amount ?? null);

    const invoiceOptions = [
        { value: GENERAL_BALANCE, label: 'Oldest due first (auto-applied to invoices)' },
        ...(form.data.direction === 'received'
            ? openSales.map((sale) => ({ value: String(sale.id), label: `${sale.invoice_no} — due ${money(sale.due_amount)}` }))
            : openPurchases.map((purchase) => ({ value: String(purchase.id), label: `${purchase.invoice_no} — due ${money(purchase.due_amount)}` }))),
    ];

    const invoiceSelectValue =
        form.data.direction === 'received'
            ? form.data.sale_id
                ? String(form.data.sale_id)
                : GENERAL_BALANCE
            : form.data.purchase_id
              ? String(form.data.purchase_id)
              : GENERAL_BALANCE;

    const onInvoiceChange = (value: string | null) => {
        if (!value || value === GENERAL_BALANCE) {
            form.setData({ ...form.data, sale_id: null, purchase_id: null });
            return;
        }

        const id = Number(value);

        if (form.data.direction === 'received') {
            const due = openSales.find((sale) => sale.id === id)?.due_amount ?? form.data.amount;
            form.setData({ ...form.data, sale_id: id, purchase_id: null, amount: due });
        } else {
            const due = openPurchases.find((purchase) => purchase.id === id)?.due_amount ?? form.data.amount;
            form.setData({ ...form.data, purchase_id: id, sale_id: null, amount: due });
        }
    };

    // What a discount may take off: the targeted invoice's due, or the whole balance owed in this direction.
    // A discount never invents a due, and payment + discount together never pass an invoice's due.
    const owedInDirection = Math.max(form.data.direction === 'received' ? contact.balance : -contact.balance, 0);
    const discountLimit = targetedDue ?? owedInDirection;
    const isCustomerSide = form.data.direction === 'received';

    const onAmountChange = (value: number) => {
        form.setData('amount', targetedDue !== null ? Math.min(value, Math.max(targetedDue - form.data.discount_amount, 0)) : value);
    };

    const onDiscountChange = (value: number) => {
        const cap = targetedDue !== null ? Math.max(targetedDue - form.data.amount, 0) : discountLimit;

        form.setData('discount_amount', Math.min(value, cap));
    };

    const settledTotal = form.data.amount + form.data.discount_amount;

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

    const hasOpenInvoices = form.data.direction === 'received' ? openSales.length > 0 : openPurchases.length > 0;

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
                    onChange={(val) => val && form.setData({ ...form.data, direction: val as Direction, sale_id: null, purchase_id: null })}
                    options={directionOptions}
                    error={form.errors.direction}
                    required
                />
            )}

            {hasOpenInvoices && (
                <FormSelect
                    id="invoice"
                    label={form.data.direction === 'received' ? 'Settle Invoice' : 'Settle Bill'}
                    value={invoiceSelectValue}
                    onChange={onInvoiceChange}
                    options={invoiceOptions}
                    error={form.data.direction === 'received' ? form.errors.sale_id : form.errors.purchase_id}
                />
            )}

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="account_id" required>
                    {t('common', 'account')}
                </Label>
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

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="amount" required>
                    {t('common', 'amount')}
                </Label>
                <MoneyInput
                    id="amount"
                    value={form.data.amount}
                    onChange={(e) => onAmountChange(Number(e.target.value))}
                    required={form.data.discount_amount <= 0}
                />
                {targetedDue !== null && (
                    <p className="text-muted-foreground text-xs">Capped at the invoice&apos;s remaining due, {money(targetedDue)}</p>
                )}
                <InputError message={form.errors.amount} />
            </div>

            {discountLimit > 0 && (
                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="discount_amount">Discount (optional)</Label>
                    <MoneyInput id="discount_amount" value={form.data.discount_amount} onChange={(e) => onDiscountChange(Number(e.target.value))} />
                    <p className="text-muted-foreground text-xs">
                        {isCustomerSide
                            ? 'You forgive this part of what they owe. No cash moves.'
                            : 'The supplier takes this much off what you owe. No cash moves.'}{' '}
                        {settledTotal > 0 && (
                            <>
                                This settles {money(settledTotal)} in total ({money(form.data.amount)} paid + {money(form.data.discount_amount)}{' '}
                                discount).
                            </>
                        )}
                    </p>
                    <InputError message={form.errors.discount_amount} />
                </div>
            )}

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="note">{t('common', 'note')}</Label>
                <Textarea
                    id="note"
                    placeholder="Add a note (optional)"
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
