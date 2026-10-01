import { FormInput } from '@/components/form/form-input';
import FinancialPositionSectionRow from '@/components/reports/financial-position-section';
import HeadingSmall from '@/components/heading-small';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type FinancialPositionReportData } from '@/types/models';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Financial Position', href: '/reports/financial-position' }];

interface FinancialPositionProps {
    report: FinancialPositionReportData;
}

/**
 * Simpler sibling to Reports → Balance Sheet: built from each module's own balance+ledger
 * (see `FinancialPositionReport`), not the Chart of Accounts, so it works for any past date.
 */
export default function FinancialPosition({ report: initialReport }: FinancialPositionProps) {
    const money = useMoneyFormat();
    const [report, setReport] = useState(initialReport);
    const [endDate, setEndDate] = useState(initialReport.end_date);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEndDateChange = (newDate: string) => {
        setEndDate(newDate);
        if (!newDate) {
            return;
        }

        setLoading(true);
        setError(null);

        fetch(`${route('reports.financial-position')}?end_date=${newDate}`, { headers: { Accept: 'application/json' } })
            .then(async (response) => {
                if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    throw new Error(body?.message ?? 'Could not build the report for this date.');
                }

                return response.json();
            })
            .then((body: { report: FinancialPositionReportData }) => setReport(body.report))
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    };

    const balanced = Math.abs(report.assets.total - report.liabilities.total) < 0.01;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Financial Position" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall
                        title="Financial Position"
                        description="যেকোনো তারিখ পর্যন্ত হিসাব — প্রতিটা module-এর নিজস্ব ledger থেকে সরাসরি"
                    />
                    <FormInput
                        id="end_date"
                        label="As of"
                        type="date"
                        value={endDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        className="w-44"
                    />
                </div>

                {error && (
                    <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">{error}</div>
                )}

                <div className="grid items-start gap-4 lg:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-2 rounded-lg border p-4">
                        <h3 className="font-medium">Liabilities / DR</h3>
                        <FinancialPositionSectionRow label="Capital" section={report.liabilities.investor_capital} />
                        <FinancialPositionSectionRow label="Company Loan" section={report.liabilities.company_loans} />
                        <FinancialPositionSectionRow label="Sundry Creditors" section={report.liabilities.sundry_creditors} />
                        <FinancialPositionSectionRow label="Other Liabilities" section={report.liabilities.other_liabilities} />
                        <div
                            className={`flex justify-between rounded px-2 py-1.5 text-sm font-medium ${
                                report.liabilities.net_profit < 0
                                    ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                                    : 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                            }`}
                        >
                            <span>{report.liabilities.net_profit < 0 ? 'Loss' : 'Gross Profit'}</span>
                            <span className="tabular-nums">{money(report.liabilities.net_profit)}</span>
                        </div>
                        <div className="flex justify-between gap-2 border-t pt-2 font-medium">
                            <span>Total Liability</span>
                            <span className="tabular-nums">{money(report.liabilities.total)}</span>
                        </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-2 rounded-lg border p-4">
                        <h3 className="font-medium">Assets / CR</h3>
                        <FinancialPositionSectionRow label="Closing Stock" section={report.assets.closing_stock} showBreakdown={false} />
                        <FinancialPositionSectionRow label="Sundry Debtors" section={report.assets.sundry_debtors} />
                        <FinancialPositionSectionRow label="Company / Staff Advances" section={report.assets.staff_advances} />
                        <FinancialPositionSectionRow label="Cash at Bank" section={report.assets.cash_and_bank} />
                        <FinancialPositionSectionRow label="Other Assets" section={report.assets.other_assets} />
                        <div className="flex justify-between gap-2 border-t pt-2 font-medium">
                            <span>Total Assets</span>
                            <span className="tabular-nums">{money(report.assets.total)}</span>
                        </div>
                    </div>
                </div>

                {!balanced && (
                    <p className="text-destructive text-sm">
                        ⚠️ Assets ({money(report.assets.total)}) does not match Liabilities ({money(report.liabilities.total)})
                    </p>
                )}
            </div>
        </AppLayout>
    );
}
