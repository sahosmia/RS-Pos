import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { type DashboardBooksCheck } from '@/types/models';
import { CircleAlert, ShieldCheck } from 'lucide-react';

/**
 * One line that says whether last night's books check found anything: the customer, supplier, stock and account
 * totals all agreeing with the General Ledger. Green when clean; red, naming the checks, when something is off.
 */
export function BooksCheckBanner({ check }: { check: DashboardBooksCheck | null }) {
    if (!check) {
        return null;
    }

    const failed = check.failed_checks.length > 0;
    const Icon = failed ? CircleAlert : ShieldCheck;

    return (
        <div
            role={failed ? 'alert' : 'status'}
            className={cn(
                'flex items-start gap-2 rounded-lg border px-4 py-2.5 text-sm',
                failed
                    ? 'border-brand-danger/30 bg-brand-danger/[0.06] text-brand-danger-text'
                    : 'border-brand-success/25 bg-brand-success/[0.05] text-brand-success-text',
            )}
        >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p>
                {failed ? (
                    <>
                        <span className="font-semibold">Books check found a mismatch</span> in {check.failed_checks.join(', ')}. Ask your developer to
                        look at the log.
                    </>
                ) : (
                    <>Books check: everything adds up.</>
                )}{' '}
                <span className="opacity-70">Checked {formatDate(check.checked_at)}.</span>
            </p>
        </div>
    );
}
