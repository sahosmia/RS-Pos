import InputError from '@/components/input-error';
import MoneyInput from '@/components/shared/money-input';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMoneyFormat } from '@/hooks/use-money-format';
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

/**
 * Standalone entry point for the same ledger-level discount
 * `ContactDueWaiverController` posts from the Contact Detail page — picks
 * the contact first (via search) instead of already being on their page.
 * Ledger-only: unlike Bill Receive/Pay, this never touches an account.
 */
export default function BillDiscountForm() {
    const money = useMoneyFormat();
    const [contact, setContact] = useState<ContactOption | null>(null);

    const form = useForm({ amount: 0, note: '' });

    const dueLabel = (balance: number) =>
        balance > 0 ? `Receivable ${money(balance)}` : balance < 0 ? `Payable ${money(Math.abs(balance))}` : 'Settled';

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!contact) {
            return;
        }

        form.post(route('contacts.due-waivers.store', contact.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Due waived.');
                setContact(null);
                form.reset();
            },
            onError: () => toast.error('Could not waive due — check the form for errors.'),
        });
    };

    return (
        <form onSubmit={submit} className="max-w-lg space-y-4 rounded-lg border p-4">
            <div className="grid gap-2">
                <Label htmlFor="contact_id" required>
                    Contact
                </Label>
                <SearchableSelect
                    id="contact_id"
                    value={contact}
                    onChange={setContact}
                    getLabel={(option) => option.display_name}
                    getSublabel={(option) => option.phone ?? ''}
                    searchUrl={route('contacts.search')}
                    placeholder="Search a contact by name or phone"
                />
                {contact && (
                    <p className="text-muted-foreground text-xs">
                        Current status: {dueLabel(contact.balance)} — waiving posts no cash movement
                    </p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="amount" required>
                    Amount
                </Label>
                <MoneyInput id="amount" value={form.data.amount} onChange={(e) => form.setData('amount', Number(e.target.value))} required />
                <InputError message={form.errors.amount} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="note">Reason</Label>
                <Textarea
                    id="note"
                    placeholder="Why this due is being waived"
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                />
                <InputError message={form.errors.note} />
            </div>

            <Button type="submit" disabled={!contact || form.processing}>
                {form.processing ? 'Saving...' : 'Apply Discount'}
            </Button>
        </form>
    );
}
