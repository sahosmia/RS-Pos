import { getAccountActions } from '@/components/accounting/account-actions';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import EmptyState from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type AccountListItem, type AccountTypeListItem } from '@/types/models';
import { Pencil, Trash2 } from 'lucide-react';

interface AccountsTabProps {
    accounts: AccountListItem[];
    totalBalance: number;
    onAdd: () => void;
    onTransfer: () => void;
    onEdit: (account: AccountListItem) => void;
    onDelete: (account: AccountListItem) => void;
}

/** Every payment account with its balance, plus "Fund Transfer" and "Add Account". */
export function AccountsTab({ accounts, totalBalance, onAdd, onTransfer, onEdit, onDelete }: AccountsTabProps) {
    const money = useMoneyFormat();

    return (
        <TabsContent value="accounts" className="space-y-6">
            <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" onClick={onTransfer} disabled={accounts.length < 2}>
                    Fund Transfer
                </Button>
                <Button onClick={onAdd}>Add Account</Button>
            </div>

            <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Total balance (active accounts)</p>
                <p className="text-2xl font-semibold tabular-nums">{money(totalBalance)}</p>
            </div>

            {accounts.length === 0 ? (
                <EmptyState title="No accounts yet" description="প্রথমে একটা Cash বা Bank account যোগ করুন">
                    <Button className="mt-2" onClick={onAdd}>
                        Add Account
                    </Button>
                </EmptyState>
            ) : (
                <div className="overflow-x-auto rounded-brand-card bg-card shadow-[var(--brand-card-shadow-elevated)]">
                    <table className="w-full text-sm">
                        <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                                <th className="px-4 py-2.5 text-left font-medium">Type</th>
                                <th className="px-4 py-2.5 text-right font-medium">Balance</th>
                                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map((account) => (
                                <tr key={account.id} className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t">
                                    <td className="px-4 py-2">
                                        <div className="font-medium">{account.name}</div>
                                        {account.account_sub_type && <div className="text-muted-foreground text-xs">{account.account_sub_type}</div>}
                                    </td>
                                    <td className="px-4 py-2">{account.account_type?.name ?? '—'}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{money(account.current_balance)}</td>
                                    <td className="px-4 py-2">
                                        <StatusBadge
                                            status={account.is_active ? 'active' : 'closed'}
                                            label={account.is_active ? 'Active' : 'Closed'}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex justify-end">
                                            <DataTableRowActions actions={getAccountActions(account, { onEdit, onDelete })} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </TabsContent>
    );
}

interface AccountTypesTabProps {
    accountTypes: AccountTypeListItem[];
    onAdd: () => void;
    onEdit: (type: AccountTypeListItem) => void;
    onDelete: (type: AccountTypeListItem) => void;
}

/** The account types (Cash, Bank, Bkash…) with how many accounts use each; built-in types can't be changed. */
export function AccountTypesTab({ accountTypes, onAdd, onEdit, onDelete }: AccountTypesTabProps) {
    return (
        <TabsContent value="types" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm">Account form-এর "Account Type" dropdown-এ এই তালিকাটা দেখাবে</p>
                <Button onClick={onAdd}>Add Type</Button>
            </div>

            <div className="overflow-x-auto rounded-brand-card bg-card shadow-[var(--brand-card-shadow-elevated)]">
                <table className="w-full text-sm">
                    <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                        <tr>
                            <th className="px-4 py-2.5 text-left font-medium">Name</th>
                            <th className="px-4 py-2.5 text-right font-medium">Accounts</th>
                            <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accountTypes.map((type) => (
                            <tr key={type.id} className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t">
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
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(type)} disabled={type.is_protected}>
                                            <Pencil className="size-4" />
                                            <span className="sr-only">Edit {type.name}</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(type)}
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
    );
}
