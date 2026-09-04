import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type AccountListItem, type AccountType } from '@/types/models';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Accounts',
        href: '/accounts',
    },
];

interface AccountsIndexProps {
    accounts: AccountListItem[];
    accountTypes: AccountType[];
    totalBalance: number;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function AccountsIndex({ accounts, accountTypes, totalBalance }: AccountsIndexProps) {
    const money = useMoneyFormat();

    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [editing, setEditing] = useState<AccountListItem | null>(null);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [deleting, setDeleting] = useState<AccountListItem | null>(null);

    const accountForm = useForm({
        name: '',
        account_type_id: accountTypes[0]?.id ?? 0,
        account_sub_type: '',
        account_number: '',
        opening_balance: 0,
        is_active: true as boolean,
    });

    const transferForm = useForm({
        from_account_id: 0,
        to_account_id: 0,
        amount: 0,
        transfer_date: today(),
        note: '',
    });

    const openCreate = () => {
        accountForm.clearErrors();
        accountForm.setData({
            name: '',
            account_type_id: accountTypes[0]?.id ?? 0,
            account_sub_type: '',
            account_number: '',
            opening_balance: 0,
            is_active: true,
        });
        setEditing(null);
        setAccountModalOpen(true);
    };

    const openEdit = (account: AccountListItem) => {
        accountForm.clearErrors();
        accountForm.setData({
            name: account.name,
            account_type_id: account.account_type_id,
            account_sub_type: account.account_sub_type ?? '',
            account_number: account.account_number ?? '',
            opening_balance: account.opening_balance,
            is_active: account.is_active,
        });
        setEditing(account);
        setAccountModalOpen(true);
    };

    const submitAccount: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => setAccountModalOpen(false) };

        if (editing) {
            accountForm.patch(route('accounts.update', editing.id), options);
        } else {
            accountForm.post(route('accounts.store'), options);
        }
    };

    const submitTransfer: FormEventHandler = (e) => {
        e.preventDefault();

        transferForm.post(route('fund-transfers.store'), {
            preserveScroll: true,
            onSuccess: () => {
                transferForm.reset();
                setTransferModalOpen(false);
            },
        });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(route('accounts.destroy', deleting.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Accounts" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Payment Accounts" description="Cash, bank, mobile banking ও cheque — প্রতিটার নিজস্ব ব্যালেন্স" />

                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('cash-book.index')}>Cash Book</Link>
                        </Button>
                        <Button variant="outline" onClick={() => setTransferModalOpen(true)} disabled={accounts.length < 2}>
                            Fund Transfer
                        </Button>
                        <Button onClick={openCreate}>Add Account</Button>
                    </div>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Total balance (active accounts)</p>
                    <p className="text-2xl font-semibold tabular-nums">{money(totalBalance)}</p>
                </div>

                {accounts.length === 0 ? (
                    <EmptyState title="No accounts yet" description="প্রথমে একটা Cash বা Bank account যোগ করুন">
                        <Button className="mt-2" onClick={openCreate}>
                            Add Account
                        </Button>
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Name</th>
                                    <th className="px-4 py-2 text-left font-medium">Type</th>
                                    <th className="px-4 py-2 text-right font-medium">Balance</th>
                                    <th className="px-4 py-2 text-left font-medium">Status</th>
                                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map((account) => (
                                    <tr key={account.id} className="border-t">
                                        <td className="px-4 py-2">
                                            <div className="font-medium">{account.name}</div>
                                            {account.account_sub_type && (
                                                <div className="text-muted-foreground text-xs">{account.account_sub_type}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">{account.account_type.name}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{money(account.current_balance)}</td>
                                        <td className="px-4 py-2">
                                            <Badge variant={account.is_active ? 'secondary' : 'outline'}>
                                                {account.is_active ? 'Active' : 'Closed'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={route('accounts.statement', account.id)}>Statement</Link>
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(account)}>
                                                    Edit
                                                </Button>
                                                {account.can_delete && (
                                                    <Button variant="ghost" size="sm" onClick={() => setDeleting(account)}>
                                                        Delete
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <FormModal
                open={accountModalOpen}
                onOpenChange={setAccountModalOpen}
                title={editing ? 'Edit Account' : 'Add Account'}
                processing={accountForm.processing}
                onSubmit={submitAccount}
            >
                <div className="grid gap-2">
                    <Label htmlFor="name">Account Name</Label>
                    <Input id="name" value={accountForm.data.name} onChange={(e) => accountForm.setData('name', e.target.value)} required />
                    <InputError message={accountForm.errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="account_type_id">Account Type</Label>
                    <Select
                        value={String(accountForm.data.account_type_id)}
                        onValueChange={(value) => accountForm.setData('account_type_id', Number(value))}
                    >
                        <SelectTrigger id="account_type_id">
                            <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                            {accountTypes.map((type) => (
                                <SelectItem key={type.id} value={String(type.id)}>
                                    {type.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={accountForm.errors.account_type_id} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="account_sub_type">Sub Type</Label>
                    <Input
                        id="account_sub_type"
                        placeholder="Bkash Agent, Nagad..."
                        value={accountForm.data.account_sub_type}
                        onChange={(e) => accountForm.setData('account_sub_type', e.target.value)}
                    />
                    <InputError message={accountForm.errors.account_sub_type} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input
                        id="account_number"
                        value={accountForm.data.account_number}
                        onChange={(e) => accountForm.setData('account_number', e.target.value)}
                    />
                    <InputError message={accountForm.errors.account_number} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="opening_balance">Opening Balance</Label>
                    <MoneyInput
                        id="opening_balance"
                        value={accountForm.data.opening_balance}
                        disabled={editing !== null && !editing.can_edit_opening_balance}
                        onChange={(e) => accountForm.setData('opening_balance', Number(e.target.value))}
                        required
                    />
                    {editing !== null && !editing.can_edit_opening_balance && (
                        <p className="text-muted-foreground text-xs">
                            এই account-এ লেনদেন হয়ে গেছে — opening balance আর বদলানো যাবে না, adjustment দিতে হবে।
                        </p>
                    )}
                    <InputError message={accountForm.errors.opening_balance} />
                </div>

                {editing && (
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <Label htmlFor="is_active">Active</Label>
                            <p className="text-muted-foreground text-sm">বন্ধ করলে নতুন লেনদেনে এই account দেখাবে না</p>
                        </div>
                        <Switch
                            id="is_active"
                            checked={accountForm.data.is_active}
                            onCheckedChange={(checked) => accountForm.setData('is_active', checked)}
                        />
                    </div>
                )}
            </FormModal>

            <FormModal
                open={transferModalOpen}
                onOpenChange={setTransferModalOpen}
                title="Fund Transfer"
                description="নিজের দুই account-এর মধ্যে টাকা সরানো"
                submitLabel="Transfer"
                processing={transferForm.processing}
                onSubmit={submitTransfer}
            >
                <div className="grid gap-2">
                    <Label htmlFor="from_account_id">From</Label>
                    <Select
                        value={transferForm.data.from_account_id ? String(transferForm.data.from_account_id) : ''}
                        onValueChange={(value) => transferForm.setData('from_account_id', Number(value))}
                    >
                        <SelectTrigger id="from_account_id">
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
                    <InputError message={transferForm.errors.from_account_id} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="to_account_id">To</Label>
                    <Select
                        value={transferForm.data.to_account_id ? String(transferForm.data.to_account_id) : ''}
                        onValueChange={(value) => transferForm.setData('to_account_id', Number(value))}
                    >
                        <SelectTrigger id="to_account_id">
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
                    <InputError message={transferForm.errors.to_account_id} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <MoneyInput
                        id="amount"
                        value={transferForm.data.amount}
                        onChange={(e) => transferForm.setData('amount', Number(e.target.value))}
                        required
                    />
                    <InputError message={transferForm.errors.amount} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="transfer_date">Date</Label>
                    <Input
                        id="transfer_date"
                        type="date"
                        value={transferForm.data.transfer_date}
                        onChange={(e) => transferForm.setData('transfer_date', e.target.value)}
                        required
                    />
                    <InputError message={transferForm.errors.transfer_date} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="note">Note</Label>
                    <Textarea id="note" value={transferForm.data.note} onChange={(e) => transferForm.setData('note', e.target.value)} />
                    <InputError message={transferForm.errors.note} />
                </div>
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete account?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। কোনো লেনদেন থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
