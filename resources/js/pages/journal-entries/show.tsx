import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type JournalEntryDetail } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface JournalEntryShowProps {
    entry: JournalEntryDetail;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Journal Entries', href: '/journal-entries' }];

export default function JournalEntryShow({ entry }: JournalEntryShowProps) {
    const money = useMoneyFormat();
    const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);

    const [reversing, setReversing] = useState(false);
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const confirmReverse = () => {
        setProcessing(true);
        router.post(
            route('journal-entries.reverse', entry.id),
            { reason },
            {
                onFinish: () => {
                    setProcessing(false);
                    setReversing(false);
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Journal Entry #${entry.id}`} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <HeadingSmall
                        title={entry.description}
                        description={`${entry.entry_date}${entry.reference_type ? ` • ${entry.reference_type} #${entry.reference_id}` : ''}`}
                    />
                    <div className="flex items-center gap-3">
                        <Badge variant={entry.status === 'reversed' ? 'outline' : 'secondary'}>
                            {entry.status === 'reversed' ? 'Reversed' : 'Posted'}
                        </Badge>
                        {entry.status === 'posted' && !entry.reversal_of && (
                            <Button variant="outline" size="sm" onClick={() => setReversing(true)}>
                                Reverse
                            </Button>
                        )}
                    </div>
                </div>

                {entry.status === 'reversed' && (
                    <p className="text-muted-foreground text-sm">এই entry reversed হয়ে গেছে ({entry.reversed_at}) — আর কোনো পরিবর্তন করা যাবে না।</p>
                )}

                {entry.reversal_of && (
                    <p className="text-muted-foreground text-sm">
                        এটা{' '}
                        <Link href={route('journal-entries.show', entry.reversal_of.id)} className="underline-offset-2 hover:underline">
                            Journal Entry #{entry.reversal_of.id} ({entry.reversal_of.description})
                        </Link>{' '}
                        -এর reversal।
                    </p>
                )}

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Account</th>
                                <th className="px-4 py-2 text-left font-medium">Note</th>
                                <th className="px-4 py-2 text-right font-medium">Debit</th>
                                <th className="px-4 py-2 text-right font-medium">Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entry.lines.map((line) => (
                                <tr key={line.id} className="border-t">
                                    <td className="px-4 py-2">
                                        <Link
                                            href={route('chart-of-accounts.ledger', line.chart_of_account.id)}
                                            className="underline-offset-2 hover:underline"
                                        >
                                            {line.chart_of_account.code} — {line.chart_of_account.name}
                                        </Link>
                                    </td>
                                    <td className="text-muted-foreground px-4 py-2">{line.note ?? '—'}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{line.debit > 0 ? money(line.debit) : ''}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{line.credit > 0 ? money(line.credit) : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t font-medium">
                                <td colSpan={2} className="px-4 py-2 text-right">
                                    Total
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums">{money(totalDebit)}</td>
                                <td className="px-4 py-2 text-right tabular-nums">{money(totalCredit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <ConfirmDialog
                open={reversing}
                onOpenChange={setReversing}
                title="Reverse this journal entry?"
                description="একটা নতুন mirrored entry (debit/credit উল্টে) পোস্ট হবে, আর এই entry-টা reversed হিসেবে মার্ক হবে — original কখনো এডিট/ডিলিট হয় না।"
                confirmLabel="Reverse"
                processing={processing}
                confirmDisabled={reason.trim() === ''}
                onConfirm={confirmReverse}
            >
                <div className="grid gap-2 pt-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
                </div>
            </ConfirmDialog>
        </AppLayout>
    );
}
