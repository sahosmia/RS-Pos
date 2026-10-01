import InputError from '@/components/input-error';
import MoneyInput from '@/components/shared/money-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type Account } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface ContactOption {
    id: number;
    name: string;
    display_name: string;
    phone: string | null;
    business_name: string | null;
    balance: number;
}

interface BillPaymentFormProps {
    /** 'received' — they pay us (Bill Receive, customer due shrinks). 'made' — we pay them (Bill Pay, supplier due shrinks). */
    direction: 'received' | 'made';
    accounts: Account[];
}

/**
 * Standalone entry point for the same settlement `ContactPaymentController`
 * posts from the Contact Detail page — picks the contact first (via search)
 * instead of already being on their page, then posts to the same
 * `contacts.payments.store` route, which hits both the account and the
 * contact's ledger.
 */
export default function BillPaymentForm({ direction, accounts }: BillPaymentFormProps) {
    const money = useMoneyFormat();
    const [contact, setContact] = useState<ContactOption | null>(null);

    const form = useForm({
        account_id: accounts[0]?.id ?? 0,
        amount: 0,
        note: '',
        direction,
    });

    const dueLabel = (balance: number) =>
        balance > 0 ? `Receivable ${money(balance)}` : balance < 0 ? `Payable ${money(Math.abs(balance))}` : 'Settled';

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!contact) {
            return;
        }

        form.post(route('contacts.payments.store', contact.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(direction === 'received' ? 'Payment received.' : 'Payment made.');
                setContact(null);
                form.reset();
            },
            onError: () => toast.error('Could not record the payment — check the form for errors.'),
        });
    };

    return (
        <form onSubmit={submit} className="max-w-lg space-y-4 rounded-lg border p-4">
            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="contact_id" required>
                    {direction === 'received' ? 'Customer' : 'Supplier'}
                </Label>
                <SearchableSelect
                    id="contact_id"
                    value={contact}
                    onChange={setContact}
                    getLabel={(option) => option.display_name}
                    getSublabel={(option) => option.phone ?? ''}
                    searchUrl={route('contacts.search')}
                    searchParams={{ type: direction === 'received' ? 'customer' : 'supplier' }}
                    placeholder={direction === 'received' ? 'Search a customer by name or phone' : 'Search a supplier by name or phone'}
                />
                {contact && <p className="text-muted-foreground text-xs">Current status: {dueLabel(contact.balance)}</p>}
            </div>

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="account_id" required>
                    Account
                </Label>
                <Select
                    value={form.data.account_id ? String(form.data.account_id) : ''}
                    onValueChange={(value) => form.setData('account_id', Number(value))}
                >
                    <SelectTrigger id="account_id">
                        <SelectValue placeholder="Select account" />
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
                    Amount
                </Label>
                <MoneyInput id="amount" value={form.data.amount} onChange={(e) => form.setData('amount', Number(e.target.value))} required />
                <InputError message={form.errors.amount} />
            </div>

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} />
                <InputError message={form.errors.note} />
            </div>

            <Button type="submit" disabled={!contact || form.processing}>
                {form.processing ? 'Saving...' : direction === 'received' ? 'Record Receipt' : 'Record Payment'}
            </Button>
        </form>
    );
}
