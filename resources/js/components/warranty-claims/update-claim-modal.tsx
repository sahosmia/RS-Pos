import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useWarrantyStatusLabels } from '@/components/warranty-claims/warranty-claim-columns';
import { useTranslation } from '@/hooks/use-translation';
import { type WarrantyClaimListItem, type WarrantyClaimStatusValue } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { type FormEventHandler, useEffect } from 'react';

interface UpdateClaimModalProps {
    /** The claim being updated; null keeps the modal closed. */
    claim: WarrantyClaimListItem | null;
    onClose: () => void;
}

/** Move a warranty claim along: change its status and leave a resolution note. */
export function UpdateClaimModal({ claim, onClose }: UpdateClaimModalProps) {
    const { t } = useTranslation();
    const { options } = useWarrantyStatusLabels();
    const form = useForm({ status: 'pending' as WarrantyClaimStatusValue, resolution_note: '' });

    // every time a claim is picked the form shows its current status and note
    useEffect(() => {
        if (!claim) return;

        form.clearErrors();
        form.setData({ status: claim.status, resolution_note: claim.resolution_note ?? '' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [claim]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!claim) return;

        form.patch(route('warranty-claims.update', claim.id), { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <FormModal
            open={claim !== null}
            onOpenChange={(open) => !open && onClose()}
            title={t('warrantyClaims', 'update_title')}
            submitLabel={t('common', 'save')}
            processing={form.processing}
            onSubmit={submit}
        >
            <FormSelect
                id="status"
                label={t('warrantyClaims', 'status')}
                value={form.data.status}
                onChange={(val) => val && form.setData('status', val as WarrantyClaimStatusValue)}
                options={options}
                error={form.errors.status}
                required
            />

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="resolution_note">{t('warrantyClaims', 'resolution_note')}</Label>
                <Textarea
                    id="resolution_note"
                    placeholder="Add a note (optional)"
                    value={form.data.resolution_note}
                    onChange={(e) => form.setData('resolution_note', e.target.value)}
                    rows={3}
                />
                <InputError message={form.errors.resolution_note} />
            </div>
        </FormModal>
    );
}
