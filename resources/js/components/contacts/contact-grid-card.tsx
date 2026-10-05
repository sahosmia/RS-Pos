import DataTableRowActions, { type RowAction } from '@/components/data-table/data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { activeColor, typeColor, useContactTypeLabel } from '@/pages/contacts/table/columns';
import { type ContactListItem, type ContactType } from '@/types/models';
import { Link } from '@inertiajs/react';

const ACCENT_BORDER: Record<ContactType, string> = {
    customer: 'border-l-sky-400',
    supplier: 'border-l-purple-400',
    both: 'border-l-teal-400',
};

const AVATAR_TONE: Record<ContactType, string> = {
    customer: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
    supplier: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
    both: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400',
};

interface ContactGridCardProps {
    contact: ContactListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    actions: RowAction[];
}

/** One contact as a card — the grid view and the mobile list. The left edge colour shows customer / supplier / both. */
export function ContactGridCard({ contact, selected, onToggleSelected, actions }: ContactGridCardProps) {
    const { t } = useTranslation();
    const typeLabel = useContactTypeLabel();
    const money = useMoneyFormat();

    const initials =
        contact.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('') || '—';

    // owed to us (positive) is red like a due; credit we hold (negative) is green
    const balanceTone =
        contact.balance > 0
            ? 'text-rose-600 dark:text-rose-400'
            : contact.balance < 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground';

    return (
        <div
            className={cn(
                'group bg-card hover:border-primary/30 rounded-xl border border-l-4 p-4 transition-all hover:shadow-md',
                ACCENT_BORDER[contact.type],
                selected && 'border-primary/40 bg-primary/5 ring-primary/20 ring-1',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                    <Checkbox className="mt-1" checked={selected} onCheckedChange={(checked) => onToggleSelected(checked === true)} />
                    <div
                        className={cn(
                            'ring-background flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-2',
                            AVATAR_TONE[contact.type],
                        )}
                    >
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <Link href={route('contacts.show', contact.id)} className="block truncate font-medium underline-offset-2 hover:underline">
                            {contact.name}
                        </Link>
                        {contact.business_name && <div className="text-muted-foreground truncate text-xs">{contact.business_name}</div>}
                        <div className="text-muted-foreground truncate text-xs tabular-nums">{contact.phone}</div>
                    </div>
                </div>
                <DataTableRowActions actions={actions} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className={typeColor[contact.type]}>
                        {typeLabel[contact.type]}
                    </Badge>
                    <Badge variant="outline" className={activeColor(contact.is_active)}>
                        {contact.is_active ? t('common', 'active') : t('common', 'inactive')}
                    </Badge>
                </div>
                <span className={cn('shrink-0 text-sm font-semibold tabular-nums', balanceTone)}>{money(contact.balance)}</span>
            </div>
        </div>
    );
}
