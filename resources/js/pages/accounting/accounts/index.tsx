import { getAccountActions } from '@/components/accounting/account-actions';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { today } from '@/lib/format-date';
import { type BreadcrumbItem } from '@/types';
import { type AccountListItem, type AccountTypeListItem } from '@/types/models';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Accounts',
        href: '/accounts',
    },
];

interface AccountsIndexProps {
    accounts: AccountListItem[];
    accountTypes: AccountTypeListItem[];
    totalBalance: number;
}

export default function AccountsIndex({ accounts, accountTypes, totalBalance }: AccountsIndexProps) {
    const money = useMoneyFormat();

    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [editing, setEditing] = useState<AccountListItem | null>(null);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [deleting, setDeleting] = useState<AccountListItem | null>(null);

    const [typeModalOpen, setTypeModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<AccountTypeListItem | null>(null);
    const [deletingType, setDeletingType] = useState<AccountTypeListItem | null>(null);
    const [activeTab, setActiveTab] = useState('accounts');

    const { url } = usePage();

    // Same `?tab=` sync as the Roles page: a redirect back with `?tab=types` reuses this page
    // instance instead of remounting it, so the tab must resync on every navigation.
    useEffect(() => {
        const tab = new URLSearchParams(window.location.search).get('tab');
        setActiveTab(tab === 'types' ? 'types' : 'accounts');
    }, [url]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        const next = new URL(window.location.href);
        next.searchParams.set('tab', value);
        window.history.replaceState({}, '', next.toString());
    };

    const typeForm = useForm({ name: '' });

    const openCreateType = () => {
        typeForm.clearErrors();
        typeForm.setData('name', '');
        setEditingType(null);
        setTypeModalOpen(true);
    };

    const openEditType = (type: AccountTypeListItem) => {
        typeForm.clearErrors();
        typeForm.setData('name', type.name);
        setEditingType(type);
        setTypeModalOpen(true);
    };

    const submitType: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => setTypeModalOpen(false) };

        if (editingType) {
            typeForm.patch(route('account-types.update', editingType.id), options);
        } else {
            typeForm.post(route('account-types.store'), options);
        }
    };

    const confirmDeleteType = () => {
        if (!deletingType) {
            return;
        }

        router.delete(route('account-types.destroy', deletingType.id), {
            preserveScroll: true,
            onFinish: () => setDeletingType(null),
        });
    };

    const accountForm = useForm({
        name: '',
        account_type_id: '' as string | number,
        account_sub_type: '',
        account_number: '',
        opening_balance: 0 as number | string,
        is_active: true as boolean,
        is_default: false as boolean,
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
            account_type_id: '',
            account_sub_type: '',
            account_number: '',
            opening_balance: 0,
            is_active: true,
            is_default: false,
        });
        setEditing(null);
        setAccountModalOpen(true);
    };

    const openEdit = (account: AccountListItem) => {
        accountForm.clearErrors();
        accountForm.setData({
            name: account.name,
            account_type_id: account.account_type_id ?? '',
            account_sub_type: account.account_sub_type ?? '',
            account_number: account.account_number ?? '',
            opening_balance: account.opening_balance,
            is_active: account.is_active,
            is_default: account.is_default,
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
                <HeadingSmall title="Payment Accounts" description="Cash, bank, mobile banking ও cheque — প্রতিটার নিজস্ব ব্যালেন্স" />

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList>
                        <TabsTrigger value="accounts">Accounts</TabsTrigger>
                        <TabsTrigger value="types">Account Types</TabsTrigger>
                    </TabsList>

                    <TabsContent value="accounts" className="space-y-6">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button variant="outline" onClick={() => setTransferModalOpen(true)} disabled={accounts.length < 2}>
                                Fund Transfer
                            </Button>
                            <Button onClick={openCreate}>Add Account</Button>
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
                                                <td className="px-4 py-2">{account.account_type?.name ?? '—'}</td>
                                                <td className="px-4 py-2 text-right tabular-nums">{money(account.current_balance)}</td>
                                                <td className="px-4 py-2">
                                                    <Badge variant={account.is_active ? 'secondary' : 'outline'}>
                                                        {account.is_active ? 'Active' : 'Closed'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex justify-end">
                                                        <DataTableRowActions
                                                            actions={getAccountActions(account, { onEdit: openEdit, onDelete: setDeleting })}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="types" className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-muted-foreground text-sm">Account form-এর "Account Type" dropdown-এ এই তালিকাটা দেখাবে</p>
                            <Button onClick={openCreateType}>Add Type</Button>
                        </div>

                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Name</th>
                                        <th className="px-4 py-2 text-right font-medium">Accounts</th>
                                        <th className="px-4 py-2 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accountTypes.map((type) => (
                                        <tr key={type.id} className="border-t">
                                            <td className="px-4 py-2 font-medium">
                                                {type.name}
                                                {type.is_protected && (
                                                    <Badge variant="outline" className="ml-2">
                                                        Built-in
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right tabular-nums">{type.accounts_count}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditType(type)}
                                                        disabled={type.is_protected}
                                                    >
                                                        <Pencil className="size-4" />
                                                        <span className="sr-only">Edit {type.name}</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeletingType(type)}
                                                        disabled={!type.can_delete}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="size-4" />
                                                        <span className="sr-only">Delete {type.name}</span>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <FormModal
                open={typeModalOpen}
                onOpenChange={setTypeModalOpen}
                title={editingType ? 'Edit Account Type' : 'Add Account Type'}
                processing={typeForm.processing}
                onSubmit={submitType}
            >
                <FormInput
                    id="type_name"
                    label="Type Name"
                    placeholder="Bkash, Nagad, Card..."
                    value={typeForm.data.name}
                    onChange={(e) => typeForm.setData('name', e.target.value)}
                    error={typeForm.errors.name}
                    required
                />
            </FormModal>

            <ConfirmDialog
                open={deletingType !== null}
                onOpenChange={(open) => !open && setDeletingType(null)}
                title="Delete account type?"
                description={`"${deletingType?.name}" মুছে ফেলা হবে। কোনো account এই type ব্যবহার করলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDeleteType}
            />

            <FormModal
                open={accountModalOpen}
                onOpenChange={setAccountModalOpen}
                title={editing ? 'Edit Account' : 'Add Account'}
                processing={accountForm.processing}
                onSubmit={submitAccount}
            >
                <FormInput
                    id="name"
                    label="Account Name"
                    placeholder="e.g. Main Cash, City Bank..."
                    value={accountForm.data.name}
                    onChange={(e) => accountForm.setData('name', e.target.value)}
                    error={accountForm.errors.name}
                    required
                />

                <FormSelect
                    id="account_type_id"
                    label="Account Type"
                    value={accountForm.data.account_type_id}
                    onChange={(val) => accountForm.setData('account_type_id', val ? Number(val) : '')}
                    options={accountTypes.map((type) => ({ value: String(type.id), label: type.name }))}
                    placeholder="Select account type"
                    allowNone
                    noneLabel="Select account type"
                    error={accountForm.errors.account_type_id}
                />

                <FormInput
                    id="account_sub_type"
                    label="Sub Type"
                    placeholder="Bkash Agent, Nagad..."
                    value={accountForm.data.account_sub_type}
                    onChange={(e) => accountForm.setData('account_sub_type', e.target.value)}
                    error={accountForm.errors.account_sub_type}
                />

                <FormInput
                    id="account_number"
                    label="Account Number"
                    placeholder="e.g. 1234567890"
                    value={accountForm.data.account_number}
                    onChange={(e) => accountForm.setData('account_number', e.target.value)}
                    error={accountForm.errors.account_number}
                />

                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="opening_balance">Opening Balance</Label>
                    <MoneyInput
                        id="opening_balance"
                        placeholder="0.00"
                        value={accountForm.data.opening_balance}
                        disabled={editing !== null && !editing.can_edit_opening_balance}
                        onChange={(e) => accountForm.setData('opening_balance', e.target.value === '' ? '' : Number(e.target.value))}
                    />
                    {editing !== null && !editing.can_edit_opening_balance && (
                        <p className="text-muted-foreground text-xs">
                            এই account-এ লেনদেন হয়ে গেছে — opening balance আর বদলানো যাবে না, adjustment দিতে হবে।
                        </p>
                    )}
                    <InputError message={accountForm.errors.opening_balance} />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-0.5">
                        <Label htmlFor="is_default">Is default</Label>
                        <p className="text-muted-foreground text-sm">পেমেন্ট ফর্মে এই account প্রথম row-এ অটো সিলেক্ট হবে</p>
                    </div>
                    <Switch
                        id="is_default"
                        checked={accountForm.data.is_default}
                        onCheckedChange={(checked) => accountForm.setData('is_default', checked)}
                    />
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
                <FormSelect
                    id="from_account_id"
                    label="From"
                    required
                    value={transferForm.data.from_account_id}
                    onChange={(val) => val && transferForm.setData('from_account_id', Number(val))}
                    options={accounts.map((account) => ({ value: String(account.id), label: `${account.name} — ${money(account.current_balance)}` }))}
                    placeholder="Select an account"
                    error={transferForm.errors.from_account_id}
                />

                <FormSelect
                    id="to_account_id"
                    label="To"
                    required
                    value={transferForm.data.to_account_id}
                    onChange={(val) => val && transferForm.setData('to_account_id', Number(val))}
                    options={accounts.map((account) => ({ value: String(account.id), label: `${account.name} — ${money(account.current_balance)}` }))}
                    placeholder="Select an account"
                    error={transferForm.errors.to_account_id}
                />

                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="amount" required>
                        Amount
                    </Label>
                    <MoneyInput
                        id="amount"
                        value={transferForm.data.amount}
                        onChange={(e) => transferForm.setData('amount', Number(e.target.value))}
                        required
                    />
                    <InputError message={transferForm.errors.amount} />
                </div>

                <FormInput
                    id="transfer_date"
                    label="Date"
                    type="date"
                    value={transferForm.data.transfer_date}
                    onChange={(e) => transferForm.setData('transfer_date', e.target.value)}
                    error={transferForm.errors.transfer_date}
                    required
                />

                <div className="grid min-w-0 content-start gap-2">
                    <Label htmlFor="note">Note</Label>
                    <Textarea id="note" placeholder="Add a note (optional)" value={transferForm.data.note} onChange={(e) => transferForm.setData('note', e.target.value)} />
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
