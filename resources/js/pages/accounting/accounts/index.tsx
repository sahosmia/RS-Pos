import { AccountFormModal } from '@/components/accounting/account-form-modal';
import { AccountTypeFormModal } from '@/components/accounting/account-type-form-modal';
import { AccountsTab, AccountTypesTab } from '@/components/accounting/accounts-tabs';
import { FundTransferModal } from '@/components/accounting/fund-transfer-modal';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type AccountListItem, type AccountTypeListItem } from '@/types/models';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Accounts', href: '/accounts' }];

interface AccountsIndexProps {
    accounts: AccountListItem[];
    accountTypes: AccountTypeListItem[];
    totalBalance: number;
}

/** Which tab is open, kept in the URL (`?tab=types`) — a redirect back with it reuses this page instance, so it must resync. */
function useUrlTab() {
    const { url } = usePage();
    const [tab, setTab] = useState('accounts');

    useEffect(() => {
        const requested = new URLSearchParams(window.location.search).get('tab');
        setTab(requested === 'types' ? 'types' : 'accounts');
    }, [url]);

    const changeTab = (value: string) => {
        setTab(value);

        const next = new URL(window.location.href);
        next.searchParams.set('tab', value);
        window.history.replaceState({}, '', next.toString());
    };

    return [tab, changeTab] as const;
}

/** Payment accounts (cash, bank, mobile banking…) and the account types they're grouped under. */
export default function AccountsIndex({ accounts, accountTypes, totalBalance }: AccountsIndexProps) {
    const [tab, changeTab] = useUrlTab();

    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [editing, setEditing] = useState<AccountListItem | null>(null);
    const [deleting, setDeleting] = useState<AccountListItem | null>(null);
    const [transferOpen, setTransferOpen] = useState(false);

    const [typeModalOpen, setTypeModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<AccountTypeListItem | null>(null);
    const [deletingType, setDeletingType] = useState<AccountTypeListItem | null>(null);

    const openAccountForm = (account: AccountListItem | null) => {
        setEditing(account);
        setAccountModalOpen(true);
    };

    const openTypeForm = (type: AccountTypeListItem | null) => {
        setEditingType(type);
        setTypeModalOpen(true);
    };

    const confirmDelete = () => {
        if (!deleting) return;

        router.delete(route('accounts.destroy', deleting.id), { preserveScroll: true, onFinish: () => setDeleting(null) });
    };

    const confirmDeleteType = () => {
        if (!deletingType) return;

        router.delete(route('account-types.destroy', deletingType.id), { preserveScroll: true, onFinish: () => setDeletingType(null) });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Accounts" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="Payment Accounts" description="Cash, bank, mobile banking ও cheque — প্রতিটার নিজস্ব ব্যালেন্স" />

                <Tabs value={tab} onValueChange={changeTab} className="w-full">
                    <TabsList>
                        <TabsTrigger value="accounts">Accounts</TabsTrigger>
                        <TabsTrigger value="types">Account Types</TabsTrigger>
                    </TabsList>

                    <AccountsTab
                        accounts={accounts}
                        totalBalance={totalBalance}
                        onAdd={() => openAccountForm(null)}
                        onTransfer={() => setTransferOpen(true)}
                        onEdit={openAccountForm}
                        onDelete={setDeleting}
                    />
                    <AccountTypesTab accountTypes={accountTypes} onAdd={() => openTypeForm(null)} onEdit={openTypeForm} onDelete={setDeletingType} />
                </Tabs>
            </div>

            <AccountTypeFormModal open={typeModalOpen} onOpenChange={setTypeModalOpen} editing={editingType} />
            <AccountFormModal open={accountModalOpen} onOpenChange={setAccountModalOpen} editing={editing} accountTypes={accountTypes} />
            <FundTransferModal open={transferOpen} onOpenChange={setTransferOpen} accounts={accounts} />

            <ConfirmDialog
                open={deletingType !== null}
                onOpenChange={(open) => !open && setDeletingType(null)}
                title="Delete account type?"
                description={`"${deletingType?.name}" মুছে ফেলা হবে। কোনো account এই type ব্যবহার করলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDeleteType}
            />

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
