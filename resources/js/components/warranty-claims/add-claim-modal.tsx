import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate, today } from '@/lib/format-date';
import { type WarrantyableSaleItem } from '@/types/models';
import { router, useForm } from '@inertiajs/react';
import { type FormEvent, type FormEventHandler, useEffect, useState } from 'react';

interface AddClaimModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The query the server last searched for, and its matches (reloaded as the user searches). */
    searchQuery: string;
    searchResults: WarrantyableSaleItem[];
}

/** New warranty claim: first search for the sold item it concerns, then enter the date and the issue. */
export function AddClaimModal({ open, onOpenChange, searchQuery, searchResults }: AddClaimModalProps) {
    const { t } = useTranslation();
    const form = useForm({ sale_item_id: 0, claim_date: today(), issue_description: '' });
    const [search, setSearch] = useState(searchQuery);
    const [selected, setSelected] = useState<WarrantyableSaleItem | null>(null);

    // every time the modal opens it starts from the search step with a blank form
    useEffect(() => {
        if (!open) return;

        setSelected(null);
        form.reset();
        setSearch('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const runSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            route('warranty-claims.index'),
            { q: search },
            { preserveState: true, preserveScroll: true, only: ['searchResults', 'searchQuery'] },
        );
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('warranty-claims.store'), { preserveScroll: true, onSuccess: () => onOpenChange(false) });
    };

    const warrantyTill = (item: WarrantyableSaleItem) =>
        item.warranty_expires_at ? `${t('warrantyClaims', 'warranty_till')} ${formatDate(item.warranty_expires_at)}` : null;

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={t('warrantyClaims', 'add_title')}
            submitLabel={t('warrantyClaims', 'add')}
            processing={form.processing}
            onSubmit={submit}
        >
            {!selected ? (
                <div className="space-y-3">
                    <form onSubmit={runSearch} className="flex gap-2">
                        <FormInput
                            id="search"
                            placeholder={t('serviceRequests', 'search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" variant="outline">
                            {t('serviceRequests', 'search')}
                        </Button>
                    </form>

                    <div className="max-h-64 space-y-1 overflow-y-auto">
                        {searchResults.length === 0 && (
                            <p className="text-muted-foreground py-4 text-center text-sm">
                                {search ? t('serviceRequests', 'no_results') : t('serviceRequests', 'start_searching')}
                            </p>
                        )}
                        {searchResults.map((item) => (
                            <button
                                type="button"
                                key={item.id}
                                onClick={() => {
                                    setSelected(item);
                                    form.setData('sale_item_id', item.id);
                                }}
                                className="hover:bg-accent flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
                            >
                                <span>
                                    {item.product.name} ({item.product.sku}) — {item.invoice_no}, {item.customer.name}
                                </span>
                                {warrantyTill(item) && <span className="text-muted-foreground text-xs">{warrantyTill(item)}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    <div className="rounded-md border p-2 text-sm">
                        <p className="font-medium">
                            {selected.product.name} ({selected.product.sku})
                        </p>
                        <p className="text-muted-foreground">
                            {selected.invoice_no} — {selected.customer.name}
                            {warrantyTill(selected) && ` — ${warrantyTill(selected)}`}
                        </p>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                            {t('serviceRequests', 'choose_different_item')}
                        </Button>
                    </div>

                    <FormInput
                        id="claim_date"
                        label={t('warrantyClaims', 'claim_date')}
                        type="date"
                        value={form.data.claim_date}
                        onChange={(e) => form.setData('claim_date', e.target.value)}
                        error={form.errors.claim_date}
                        required
                    />

                    <div className="grid min-w-0 content-start gap-2">
                        <Label htmlFor="issue_description" required>
                            {t('warrantyClaims', 'issue')}
                        </Label>
                        <Textarea
                            id="issue_description"
                            placeholder="Describe the issue"
                            value={form.data.issue_description}
                            onChange={(e) => form.setData('issue_description', e.target.value)}
                            rows={3}
                            required
                        />
                        <InputError message={form.errors.issue_description} />
                    </div>
                </>
            )}
        </FormModal>
    );
}
