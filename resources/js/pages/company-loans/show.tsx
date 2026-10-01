import { MetricCard, MetricGrid } from '@/components/shared/metric-card';
import HeadingSmall from '@/components/heading-small';
import EmptyState from '@/components/shared/empty-state';
import LedgerTable, { type LedgerRow } from '@/components/shared/ledger-table';
import LedgerTransactionModal, { type LedgerTransactionTypeOption } from '@/components/shared/ledger-transaction-modal';
import { Button } from '@/components/ui/button';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Account, type CompanyLoanDetail, type LedgerTransactionRow } from '@/types/models';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface CompanyLoanShowProps {
    loan: CompanyLoanDetail;
    transactions: LedgerTransactionRow[];
    accounts: Account[];
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

const typeOptions: LedgerTransactionTypeOption[] = [
    { value: 'disbursement', label: 'Disbursement (loan received)', needsAccount: true },
    { value: 'repayment', label: 'Repayment', needsAccount: true },
    { value: 'interest_charge', label: 'Interest Charge', needsAccount: false, hint: 'নগদ কোনো লেনদেন নেই — শুধু দেনা বাড়ে' },
    { value: 'adjustment', label: 'Adjustment', needsAccount: false, allowNegative: true, hint: 'বাড়াতে + আর কমাতে − দিন' },
];

export default function CompanyLoanShow({ loan, transactions, accounts }: CompanyLoanShowProps) {
    const money = useMoneyFormat();
    const [addOpen, setAddOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Company Loans', href: '/company-loans' },
        { title: loan.lender_name, href: `/company-loans/${loan.id}` },
    ];

    const rows: LedgerRow[] = transactions.map((transaction) => ({
        id: transaction.id,
        date: transaction.created_at,
        description: [humanize(transaction.type), transaction.account?.name, transaction.note].filter(Boolean).join(' — '),
        amount: transaction.amount,
        balance: transaction.balance,
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={loan.lender_name} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <HeadingSmall title={loan.lender_name} description={loan.interest_rate ? `${loan.interest_rate}% interest` : undefined} />
                    <Button onClick={() => setAddOpen(true)}>Add Transaction</Button>
                </div>

                <MetricGrid columns={3}>
                    <MetricCard label="Loan Amount" value={money(loan.loan_amount)} accent="info" />
                    <MetricCard label="Outstanding Balance" value={money(loan.outstanding_balance)} accent="warning" />
                    <MetricCard label="Start Date" value={loan.start_date} />
                </MetricGrid>

                {rows.length === 0 ? (
                    <EmptyState title="No transactions yet" description="Add Transaction দিয়ে শুরু করুন" />
                ) : (
                    <LedgerTable rows={rows} />
                )}
            </div>

            <LedgerTransactionModal
                open={addOpen}
                onOpenChange={setAddOpen}
                title="Add Loan Transaction"
                routeName="company-loans.transactions.store"
                routeParam={loan.id}
                typeOptions={typeOptions}
                accounts={accounts}
            />
        </AppLayout>
    );
}
