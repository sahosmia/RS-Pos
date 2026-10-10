import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { formatDate } from '@/lib/format-date';
import { buildInstallmentReminderMessage, openWhatsapp } from '@/lib/sale-whatsapp-message';
import { type DashboardFollowUps } from '@/types/models';
import { Link } from '@inertiajs/react';
import { BellRing, CalendarClock, MessageCircle, ShieldAlert } from 'lucide-react';

/** Today's chase list: overdue and soon-due installments, and warranties about to run out. */
export function FollowUpsWidget({ followUps }: { followUps: DashboardFollowUps }) {
    const money = useMoneyFormat();
    const { emi, warranties } = followUps;

    if ((!emi || emi.items.length === 0) && warranties.items.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-medium">
                        <BellRing className="size-4 text-emerald-500" />
                        Follow-ups
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground pb-4 text-sm">
                    Nothing to chase right now: no overdue installments and no warranty ending soon.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {emi && (
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-base font-medium">
                                <CalendarClock className="size-4 text-amber-500" />
                                Installments to collect
                            </CardTitle>
                            <p className="text-muted-foreground text-xs">
                                {emi.overdue_count > 0 && (
                                    <span className="text-brand-danger-text font-medium">
                                        {emi.overdue_count} overdue · {money(emi.overdue_amount)}
                                    </span>
                                )}
                                {emi.overdue_count > 0 && emi.due_soon_count > 0 && ' · '}
                                {emi.due_soon_count > 0 && `${emi.due_soon_count} due in 7 days · ${money(emi.due_soon_amount)}`}
                            </p>
                        </div>
                        <Link href={route('emi-installments.index')} className="text-muted-foreground hover:text-foreground text-xs">
                            View all
                        </Link>
                    </CardHeader>
                    <CardContent className="divide-border/40 divide-y p-0">
                        {emi.items.length === 0 ? (
                            <p className="text-muted-foreground p-4 text-sm">No installment is overdue or due this week.</p>
                        ) : (
                            emi.items.map((item) => (
                                <div key={item.id} className="hover:bg-muted/30 flex items-center gap-2 pr-3 transition-colors">
                                    <Link
                                        href={route('sales.show', item.sale_id)}
                                        className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-2.5 text-sm"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{item.customer}</p>
                                            <p className="text-muted-foreground truncate text-xs tabular-nums">
                                                {item.invoice_no} · #{item.number}
                                                {item.phone && ` · ${item.phone}`}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="font-semibold tabular-nums">{money(item.remaining)}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {item.overdue ? (
                                                    <Badge variant="destructive" size="xs">
                                                        Overdue
                                                    </Badge>
                                                ) : null}{' '}
                                                {formatDate(item.due_date)}
                                            </p>
                                        </div>
                                    </Link>
                                    {item.phone && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 shrink-0 text-emerald-600"
                                            title="Remind on WhatsApp"
                                            aria-label={`Remind ${item.customer} on WhatsApp`}
                                            onClick={() =>
                                                openWhatsapp(
                                                    item.phone as string,
                                                    buildInstallmentReminderMessage(
                                                        {
                                                            customerName: item.customer,
                                                            invoiceNo: item.invoice_no,
                                                            installmentNumber: item.number,
                                                            dueDate: item.due_date,
                                                            remaining: item.remaining,
                                                            overdue: item.overdue,
                                                        },
                                                        money,
                                                    ),
                                                )
                                            }
                                        >
                                            <MessageCircle className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="space-y-1 pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-medium">
                        <ShieldAlert className="size-4 text-sky-500" />
                        Warranties ending soon
                    </CardTitle>
                    <p className="text-muted-foreground text-xs">{warranties.count} ending within 30 days</p>
                </CardHeader>
                <CardContent className="divide-border/40 divide-y p-0">
                    {warranties.items.length === 0 ? (
                        <p className="text-muted-foreground p-4 text-sm">No warranty ends in the next 30 days.</p>
                    ) : (
                        warranties.items.map((item) => (
                            <Link
                                key={item.id}
                                href={route('sales.show', item.sale_id)}
                                className="hover:bg-muted/30 flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-medium">{item.product}</p>
                                    <p className="text-muted-foreground truncate text-xs">
                                        {item.customer}
                                        {item.phone && ` · ${item.phone}`}
                                    </p>
                                </div>
                                <p className="text-muted-foreground shrink-0 text-xs">ends {formatDate(item.expires_on)}</p>
                            </Link>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
