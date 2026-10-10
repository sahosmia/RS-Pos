import { PayInstallmentModal } from '@/components/sales/pay-installment-modal';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDate } from '@/lib/format-date';
import { buildInstallmentReminderMessage, openWhatsapp } from '@/lib/sale-whatsapp-message';
import { cn } from '@/lib/utils';
import { type Account, type EmiInstallmentListItem, type SaleEmiDetail } from '@/types/models';
import { MessageCircle } from 'lucide-react';
import { useState } from 'react';

const METHOD_LABEL = { none: 'No interest', flat: 'Flat rate', reducing: 'Reducing balance' } as const;
const FREQUENCY_LABEL = { weekly: 'weekly', monthly: 'monthly', quarterly: 'every 3 months' } as const;

/** The installment plan of a confirmed EMI sale: what is next, how many are left, and every installment with its status. */
export function SaleEmiPlan({
    emi,
    accounts,
    invoiceNo,
    customerName,
    customerPhone,
}: {
    emi: SaleEmiDetail;
    accounts: Account[];
    invoiceNo: string;
    customerName: string;
    customerPhone?: string | null;
}) {
    const money = useMoneyFormat();
    const [paying, setPaying] = useState<EmiInstallmentListItem | null>(null);
    const canPay = accounts.length > 0;

    // The payment dialog is shared with the installments list, so hand it the same shape.
    const startPaying = (installment: SaleEmiDetail['installments'][number]) =>
        setPaying({
            id: installment.id,
            invoice_no: invoiceNo,
            customer: { id: 0, name: customerName },
            installment_number: installment.number,
            due_date: installment.due_date,
            amount: installment.amount,
            paid_amount: installment.paid_amount,
            status: installment.status,
        });
    const nextInstallment = emi.next ? emi.installments.find((installment) => installment.id === emi.next?.id) : undefined;
    const method = emi.interest_method ? METHOD_LABEL[emi.interest_method] : 'Equal installments';
    const settled = emi.installments_total - emi.installments_open;

    return (
        <Card className="print:hidden">
            <CardHeader divided>
                <CardTitle>Installment plan</CardTitle>
                <CardDescription>
                    {method}
                    {emi.annual_rate > 0 && ` · ${emi.annual_rate}% a year`}
                    {emi.frequency && ` · paid ${FREQUENCY_LABEL[emi.frequency]}`}
                    {emi.interest_total > 0 && ` · interest ${money(emi.interest_total)}`}
                </CardDescription>
                <CardAction>
                    <Badge variant={emi.installments_open === 0 ? 'success' : 'neutral'}>
                        {settled} of {emi.installments_total} paid
                    </Badge>
                </CardAction>
            </CardHeader>

            {emi.next ? (
                <div
                    className={cn(
                        'flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3 text-sm',
                        emi.next.overdue ? 'bg-brand-danger/[0.06]' : 'bg-brand-primary/[0.05]',
                    )}
                >
                    <p>
                        <span className="text-muted-foreground">Next installment</span> <span className="font-semibold">#{emi.next.number}</span>{' '}
                        <span className="text-muted-foreground">due</span> <span className="font-semibold">{formatDate(emi.next.due_date)}</span>
                        {emi.next.overdue && (
                            <Badge variant="destructive" size="sm" className="ml-2 align-middle">
                                Overdue
                            </Badge>
                        )}
                    </p>
                    <div className="flex items-center gap-3">
                        <p className="text-base font-semibold tabular-nums">{money(emi.next.remaining)}</p>
                        {customerPhone && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    openWhatsapp(
                                        customerPhone,
                                        buildInstallmentReminderMessage(
                                            {
                                                customerName,
                                                invoiceNo,
                                                installmentNumber: emi.next!.number,
                                                dueDate: emi.next!.due_date,
                                                remaining: emi.next!.remaining,
                                                overdue: emi.next!.overdue,
                                            },
                                            money,
                                        ),
                                    )
                                }
                            >
                                <MessageCircle className="size-3.5" />
                                Remind
                            </Button>
                        )}
                        {canPay && nextInstallment && (
                            <Button type="button" size="sm" onClick={() => startPaying(nextInstallment)}>
                                Pay
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <p className="bg-brand-success/[0.06] text-brand-success-text px-5 py-3 text-sm font-medium">All installments are paid.</p>
            )}

            <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-sm">
                    <thead>
                        <tr className="bg-brand-table-header text-muted-foreground text-xs font-semibold tracking-wide">
                            <th scope="col" className="border-brand-table-divider w-12 border-y px-4 py-2.5 text-left">
                                #
                            </th>
                            <th scope="col" className="border-brand-table-divider border-y px-4 py-2.5 text-left">
                                Due date
                            </th>
                            <th scope="col" className="border-brand-table-divider border-y px-4 py-2.5 text-right">
                                Installment
                            </th>
                            <th scope="col" className="border-brand-table-divider border-y px-4 py-2.5 text-right">
                                Paid
                            </th>
                            <th scope="col" className="border-brand-table-divider border-y px-4 py-2.5 text-right">
                                Left
                            </th>
                            <th scope="col" className="border-brand-table-divider border-y px-4 py-2.5 text-left">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="[&>tr:last-child>td]:border-b-0">
                        {emi.installments.map((installment) => {
                            const isNext = emi.next?.id === installment.id;
                            const left = Math.max(0, Math.round((installment.amount - installment.paid_amount) * 100) / 100);

                            return (
                                <tr
                                    key={installment.id}
                                    className={cn('motion-colors hover:bg-brand-table-row-hover', isNext && 'bg-brand-primary/[0.04]')}
                                >
                                    <td className="border-brand-table-divider text-muted-foreground border-b px-4 py-2.5 tabular-nums">
                                        {installment.number}
                                    </td>
                                    <td className="border-brand-table-divider border-b px-4 py-2.5 whitespace-nowrap">
                                        {formatDate(installment.due_date)}
                                        {isNext && (
                                            <Badge variant="primary" size="xs" className="ml-2 align-middle">
                                                Next
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="border-brand-table-divider border-b px-4 py-2.5 text-right font-medium tabular-nums">
                                        {money(installment.amount)}
                                    </td>
                                    <td className="border-brand-table-divider border-b px-4 py-2.5 text-right tabular-nums">
                                        {money(installment.paid_amount)}
                                    </td>
                                    <td
                                        className={cn(
                                            'border-brand-table-divider border-b px-4 py-2.5 text-right tabular-nums',
                                            left === 0 && 'text-muted-foreground',
                                        )}
                                    >
                                        {money(left)}
                                    </td>
                                    <td className="border-brand-table-divider border-b px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <StatusBadge
                                                status={
                                                    installment.paid_amount > 0 && installment.status === 'pending' ? 'partial' : installment.status
                                                }
                                                size="sm"
                                            />
                                            {isNext && canPay && (
                                                <Button type="button" variant="outline" size="sm" onClick={() => startPaying(installment)}>
                                                    Pay
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <PayInstallmentModal installment={paying} onClose={() => setPaying(null)} accounts={accounts} />
        </Card>
    );
}
