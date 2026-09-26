import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import FormModal from '@/components/shared/form-modal';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getChartOfAccountActions } from '@/components/accounting/chart-of-account-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type ChartOfAccountListItem, type ChartOfAccountOption, type ChartOfAccountTypeValue, type NormalBalanceValue } from '@/types/models';
import { Head, router, useForm } from '@inertiajs/react';
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
    const parentSelectOptions = parentOptions.map((account) => ({ value: String(account.id), label: `${account.code} — ${account.name}` }));

    const typeOptions = [
        { value: 'asset', label: 'Asset' },
        { value: 'liability', label: 'Liability' },
        { value: 'equity', label: 'Equity' },
        { value: 'income', label: 'Income' },
        { value: 'expense', label: 'Expense' },
    ];

    const normalBalanceOptions = [
        { value: 'debit', label: 'Debit' },
        { value: 'credit', label: 'Credit' },
    ];

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
                                        <div className="flex justify-end">
                                            <DataTableRowActions
                                                actions={getChartOfAccountActions(account, { onEdit: openEdit, onDelete: setDeleting })}
                                            />
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
                contentClassName="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormInput
                            id="code"
                            label="Code"
                            value={form.data.code}
                            onChange={(e) => form.setData('code', e.target.value)}
                            error={form.errors.code}
                            required
                        />
                        <FormInput
                            id="name"
                            label="Name"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            error={form.errors.name}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <FormSelect
                            id="type"
                            label="Type"
                            value={form.data.type}
                            onChange={(val) => val && form.setData('type', val as ChartOfAccountTypeValue)}
                            options={typeOptions}
                            error={form.errors.type}
                        />

                        <FormSelect
                            id="normal_balance"
                            label="Normal Balance"
                            value={form.data.normal_balance}
                            onChange={(val) => val && form.setData('normal_balance', val as NormalBalanceValue)}
                            options={normalBalanceOptions}
                            error={form.errors.normal_balance}
                        />

                        <FormSelect
                            id="parent_id"
                            label="Parent Account"
                            value={form.data.parent_id}
                            onChange={(val) => form.setData('parent_id', val ? Number(val) : null)}
                            options={parentSelectOptions}
                            error={form.errors.parent_id}
                            allowNone
                            noneLabel="No parent"
                            placeholder="No parent"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                        <Label htmlFor="is_active">Active</Label>
                        <Switch id="is_active" checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', checked)} />
                    </div>
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
