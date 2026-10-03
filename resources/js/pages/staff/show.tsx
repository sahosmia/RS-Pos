import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import LedgerTable, { type LedgerRow } from '@/components/shared/ledger-table';
import AddStaffTransactionModal from '@/components/staff/add-staff-transaction-modal';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { openWhatsapp } from '@/lib/sale-whatsapp-message';
import { type BreadcrumbItem } from '@/types';
import { type Account, type StaffDetail, type StaffLedgerRow, type StaffTransactionTypeOption } from '@/types/models';
import { Head } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

/** Most recent entries first, capped so the message stays short enough to actually read on WhatsApp. */
const RECENT_LEDGER_ENTRIES = 5;

interface StaffShowProps {
    staffMember: StaffDetail;
    transactions: StaffLedgerRow[];
    transactionTypes: StaffTransactionTypeOption[];
    accounts: Account[];
}

export default function StaffShow({ staffMember, transactions, transactionTypes, accounts }: StaffShowProps) {
    const money = useMoneyFormat();
    const [addOpen, setAddOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Staff', href: '/staff' },
        { title: staffMember.name, href: `/staff/${staffMember.id}` },
    ];

    const rows: LedgerRow[] = transactions.map((transaction) => ({
        id: transaction.id,
        date: transaction.created_at,
        description: [transaction.type.name, transaction.account?.name, transaction.note].filter(Boolean).join(' — '),
        amount: transaction.amount,
        balance: transaction.balance,
        by: transaction.added_by,
    }));

    /** `transactions` is oldest-first (see StaffController::show) — reverse for a most-recent-first WhatsApp summary. */
    const sendLedgerViaWhatsapp = () => {
        if (!staffMember.phone) {
            toast.error('এই স্টাফের কোনো ফোন নাম্বার নেই — Staff লিস্ট থেকে এডিট করে আগে ফোন নাম্বার যোগ করুন।');
            return;
        }

        const recentEntries = [...transactions].reverse().slice(0, RECENT_LEDGER_ENTRIES);

        const lines = [
            `স্টাফ লেজার — ${staffMember.name}`,
            '',
            `বর্তমান ব্যালেন্স: ${money(staffMember.balance)} (${staffMember.balance_label})`,
            '',
            'সাম্প্রতিক লেনদেন:',
            ...recentEntries.map(
                (entry) => `${entry.created_at} — ${entry.type.name}: ${money(entry.amount)} (ব্যালেন্স: ${money(entry.balance)})`,
            ),
        ];

        openWhatsapp(staffMember.phone, lines.join('\n'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={staffMember.name} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <HeadingSmall title={staffMember.name} description={staffMember.designation ?? undefined} />
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={sendLedgerViaWhatsapp}
                            className="gap-1.5 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        >
                            <MessageCircle className="size-4" />
                            Send Ledger via WhatsApp
                        </Button>
                        <Button onClick={() => setAddOpen(true)}>Add Transaction</Button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Monthly Salary</p>
                        <p className="text-xl font-semibold tabular-nums">{money(staffMember.salary_amount)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Balance</p>
                        <p className="text-xl font-semibold tabular-nums">{money(staffMember.balance)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">Status</p>
                        <p className="text-xl font-semibold">{staffMember.balance_label}</p>
                    </div>
                </div>

                {rows.length === 0 ? (
                    <EmptyState title="No transactions yet" description="Add Transaction দিয়ে শুরু করুন" />
                ) : (
                    <LedgerTable rows={rows} />
                )}
            </div>

            <AddStaffTransactionModal
                open={addOpen}
                onOpenChange={setAddOpen}
                staffId={staffMember.id}
                transactionTypes={transactionTypes}
                accounts={accounts}
            />
        </AppLayout>
    );
}
