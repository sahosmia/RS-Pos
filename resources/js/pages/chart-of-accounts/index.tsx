import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import FormModal from '@/components/shared/form-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type ChartOfAccountListItem, type ChartOfAccountOption, type ChartOfAccountTypeValue, type NormalBalanceValue } from '@/types/models';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Chart of Accounts', href: '/chart-of-accounts' }];

interface ChartOfAccountsIndexProps {
    accounts: ChartOfAccountListItem[];
    allAccounts: ChartOfAccountOption[];
}

const typeVariant: Record<ChartOfAccountTypeValue, 'secondary' | 'outline' | 'default'> = {
    asset: 'default',
    liability: 'secondary',
    equity: 'secondary',
    income: 'outline',
    expense: 'outline',
};

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function ChartOfAccountsIndex({ accounts, allAccounts }: ChartOfAccountsIndexProps) {
    const money = useMoneyFormat();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ChartOfAccountListItem | null>(null);
    const [deleting, setDeleting] = useState<ChartOfAccountListItem | null>(null);

    const form = useForm({
        code: '',
        name: '',
        type: 'asset' as ChartOfAccountTypeValue,
        normal_balance: 'debit' as NormalBalanceValue,
        parent_id: null as number | null,
        is_active: true as boolean,
    });

    const openCreate = () => {
        form.clearErrors();
        form.setData({ code: '', name: '', type: 'asset', normal_balance: 'debit', parent_id: null, is_active: true });
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (account: ChartOfAccountListItem) => {
        form.clearErrors();
        form.setData({
            code: account.code,
            name: account.name,
            type: account.type,
            normal_balance: account.normal_balance,
            parent_id: account.parent_id,
            is_active: account.is_active,
        });
        setEditing(account);
        setModalOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => setModalOpen(false) };

        if (editing) {
            form.patch(route('chart-of-accounts.update', editing.id), options);
        } else {
            form.post(route('chart-of-accounts.store'), options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) return;

        router.delete(route('chart-of-accounts.destroy', deleting.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    const parentOptions = allAccounts.filter((account) => account.id !== editing?.id);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chart of Accounts" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Chart of Accounts" description="General Ledger-এর মূল কাঠামো — প্রতিটা module এখান থেকেই journal post করে" />
                    <Button onClick={openCreate}>Add Account</Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Code</th>
                                <th className="px-4 py-2 text-left font-medium">Name</th>
                                <th className="px-4 py-2 text-left font-medium">Type</th>
                                <th className="px-4 py-2 text-left font-medium">Normal</th>
                                <th className="px-4 py-2 text-right font-medium">Balance</th>
                                <th className="px-4 py-2 text-left font-medium">Status</th>
                                <th className="px-4 py-2 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map((account) => (
                                <tr key={account.id} className="border-t">
                                    <td className="px-4 py-2 font-mono">{account.code}</td>
                                    <td className="px-4 py-2">
                                        <span className={account.parent_id ? 'pl-6' : ''}>
                                            {account.parent_id && '↳ '}
                                            {account.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <Badge variant={typeVariant[account.type]}>{humanize(account.type)}</Badge>
                                    </td>
                                    <td className="text-muted-foreground px-4 py-2">{humanize(account.normal_balance)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(account.balance)}</td>
                                    <td className="px-4 py-2">
                                        <Badge variant={account.is_active ? 'secondary' : 'outline'}>
                                            {account.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={route('chart-of-accounts.ledger', account.id)}>Ledger</Link>
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
            </div>

            <FormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title={editing ? 'Edit Account' : 'Add Account'}
                processing={form.processing}
                onSubmit={submit}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="code">Code</Label>
                        <Input id="code" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} required />
                        <InputError message={form.errors.code} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                        <InputError message={form.errors.name} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="type">Type</Label>
                        <Select value={form.data.type} onValueChange={(value) => form.setData('type', value as ChartOfAccountTypeValue)}>
                            <SelectTrigger id="type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asset">Asset</SelectItem>
                                <SelectItem value="liability">Liability</SelectItem>
                                <SelectItem value="equity">Equity</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.type} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="normal_balance">Normal Balance</Label>
                        <Select
                            value={form.data.normal_balance}
                            onValueChange={(value) => form.setData('normal_balance', value as NormalBalanceValue)}
                        >
                            <SelectTrigger id="normal_balance">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="debit">Debit</SelectItem>
                                <SelectItem value="credit">Credit</SelectItem>
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.normal_balance} />
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="parent_id">Parent Account</Label>
                    <Select
                        value={form.data.parent_id ? String(form.data.parent_id) : 'none'}
                        onValueChange={(value) => form.setData('parent_id', value === 'none' ? null : Number(value))}
                    >
                        <SelectTrigger id="parent_id">
                            <SelectValue placeholder="No parent" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No parent</SelectItem>
                            {parentOptions.map((account) => (
                                <SelectItem key={account.id} value={String(account.id)}>
                                    {account.code} — {account.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.parent_id} />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <Label htmlFor="is_active">Active</Label>
                    <Switch id="is_active" checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', checked)} />
                </div>
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete account?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। journal entry বা sub-account থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
