import HeadingSmall from '@/components/heading-small';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { pageContainer } from '@/lib/page-container';
import { type BreadcrumbItem } from '@/types';
import { type FullFinancialPosition, type QuickBalanceSheet } from '@/types/models';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Balance Sheet', href: '/reports/balance-sheet' }];

interface BalanceSheetProps {
    quick: QuickBalanceSheet;
    full: FullFinancialPosition;
}

export default function BalanceSheet({ quick, full }: BalanceSheetProps) {
    const money = useMoneyFormat();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Balance Sheet" />

            <div className={pageContainer.medium}>
                <HeadingSmall title="Balance Sheet" description="আজকের হিসাব — Chart of Accounts থেকে সোর্স করা" />

                <Tabs defaultValue="quick" className="w-full">
                    <TabsList variant="underline">
                        <TabsTrigger value="quick">Quick</TabsTrigger>
                        <TabsTrigger value="full">Full Balance Sheet</TabsTrigger>
                    </TabsList>

                    <TabsContent value="quick" className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-brand-card bg-card space-y-2 p-4 shadow-[var(--brand-card-shadow-elevated)]">
                                <h3 className="font-medium">Assets</h3>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Customer Due (Receivable)</span>
                                    <span className="tabular-nums">{money(quick.receivable)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Closing Stock</span>
                                    <span className="tabular-nums">{money(quick.inventory)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Cash + Bank</span>
                                    <span className="tabular-nums">{money(quick.cashAndBank)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 font-medium">
                                    <span>Total</span>
                                    <span className="tabular-nums">{money(quick.receivable + quick.inventory + quick.cashAndBank)}</span>
                                </div>
                            </div>

                            <div className="rounded-brand-card bg-card space-y-2 p-4 shadow-[var(--brand-card-shadow-elevated)]">
                                <h3 className="font-medium">Liabilities</h3>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Supplier Due (Payable)</span>
                                    <span className="tabular-nums">{money(quick.payable)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 font-medium">
                                    <span>Total</span>
                                    <span className="tabular-nums">{money(quick.payable)}</span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="full" className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-brand-card bg-card space-y-1 p-4 shadow-[var(--brand-card-shadow-elevated)]">
                                <h3 className="mb-2 font-medium">Assets / CR</h3>
                                {full.assets.map((row) => (
                                    <div key={row.id} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {row.code} — {row.name}
                                        </span>
                                        <span className="tabular-nums">{money(row.balance)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between border-t pt-2 font-medium">
                                    <span>Total Assets</span>
                                    <span className="tabular-nums">{money(full.assetsTotal)}</span>
                                </div>
                            </div>

                            <div className="rounded-brand-card bg-card space-y-1 p-4 shadow-[var(--brand-card-shadow-elevated)]">
                                <h3 className="mb-2 font-medium">Liabilities &amp; Equity / DR</h3>
                                {full.liabilities.map((row) => (
                                    <div key={row.id} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {row.code} — {row.name}
                                        </span>
                                        <span className="tabular-nums">{money(row.balance)}</span>
                                    </div>
                                ))}
                                {full.equity.map((row) => (
                                    <div key={row.id} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {row.code} — {row.name}
                                        </span>
                                        <span className="tabular-nums">{money(row.balance)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Net Profit (balancing figure)</span>
                                    <span className={`tabular-nums ${full.netProfit < 0 ? 'text-destructive' : ''}`}>{money(full.netProfit)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 font-medium">
                                    <span>Total</span>
                                    <span className="tabular-nums">{money(full.liabilitiesAndEquityTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {Math.abs(full.assetsTotal - full.liabilitiesAndEquityTotal) > 0.01 && (
                            <p className="text-destructive text-sm">
                                ⚠️ Assets ({money(full.assetsTotal)}) does not match Liabilities + Equity ({money(full.liabilitiesAndEquityTotal)})
                            </p>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
