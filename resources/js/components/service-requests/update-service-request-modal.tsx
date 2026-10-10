import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import { useServiceRequestLabels } from '@/components/service-requests/service-request-columns';
import FormModal from '@/components/shared/form-modal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { today } from '@/lib/format-date';
import { type ServiceRequestListItem, type ServiceRequestStatusValue, type ServiceStaffOption } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { Calendar, ClipboardCheck } from 'lucide-react';
import { type FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface UpdateServiceRequestModalProps {
    /** The request being updated; null keeps the dialog closed. */
    request: ServiceRequestListItem | null;
    /** The status the person chose from the menu (Schedule / Complete / Cancel), or null to just edit the details. */
    preset: ServiceRequestStatusValue | null;
    staff: ServiceStaffOption[];
    onClose: () => void;
}

/**
 * Moves a service request along: book it, mark it done, or call it off, and say who did it and when. Completed
 * and cancelled are final, so only the steps that are really possible from the current status are offered.
 */
export function UpdateServiceRequestModal({ request, preset, staff, onClose }: UpdateServiceRequestModalProps) {
    const money = useMoneyFormat();
    const labels = useServiceRequestLabels();
    const form = useForm<{ status: ServiceRequestStatusValue; staff_id: number | null; service_date: string; note: string }>({
        status: 'pending',
        staff_id: null,
        service_date: '',
        note: '',
    });

    useEffect(() => {
        if (!request) {
            return;
        }

        const status = preset ?? request.status;

        form.clearErrors();
        form.setData({
            status,
            staff_id: request.staff?.id ?? null,
            // Completing defaults to today (a job cannot be done in the future); otherwise keep the booked day.
            service_date:
                status === 'completed'
                    ? request.service_date && request.service_date <= today()
                        ? request.service_date
                        : today()
                    : (request.service_date ?? ''),
            note: request.note ?? '',
        });
        // Only when a different request / menu choice opens the dialog, not on every keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request, preset]);

    if (!request) {
        return null;
    }

    const stepOptions = [request.status, ...request.next_statuses].map((status) => ({
        value: status,
        label: status === request.status ? `${labels.status[status]} (keep as it is)` : labels.status[status],
    }));
    const staffOptions = staff.map((member) => ({
        value: String(member.id),
        label: member.designation ? `${member.name} — ${member.designation}` : member.name,
    }));
    const refunds = form.data.status === 'cancelled' && !request.is_free && request.charge_amount > 0;

    const submit: FormEventHandler = (event) => {
        event.preventDefault();

        form.patch(route('service-requests.update', request.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(
                    form.data.status === 'completed'
                        ? 'Marked as completed.'
                        : form.data.status === 'cancelled'
                          ? 'Request cancelled.'
                          : 'Request updated.',
                );
                onClose();
            },
            onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Could not update the request.'),
        });
    };

    return (
        <FormModal
            open
            onOpenChange={(open) => !open && onClose()}
            title={`Update service request`}
            description={`${request.product.name} · ${request.invoice_no} — ${request.customer.name}`}
            icon={<ClipboardCheck />}
            submitLabel={form.data.status === 'completed' ? 'Mark completed' : form.data.status === 'cancelled' ? 'Cancel request' : 'Save'}
            processing={form.processing}
            onSubmit={submit}
        >
            <FormSelect
                id="status"
                label="Status"
                value={form.data.status}
                onChange={(value) => value && form.setData('status', value as ServiceRequestStatusValue)}
                options={stepOptions}
                error={form.errors.status}
            />

            {form.data.status !== 'cancelled' && (
                <>
                    <FormInput
                        id="service_date"
                        label={form.data.status === 'completed' ? 'Date it was done' : 'Service date'}
                        type="date"
                        value={form.data.service_date}
                        onChange={(event) => form.setData('service_date', event.target.value)}
                        error={form.errors.service_date}
                        icon={Calendar}
                        required={form.data.status === 'scheduled'}
                        helperText={form.data.status === 'scheduled' ? 'The day the visit is booked for.' : undefined}
                    />

                    <FormSelect
                        id="staff_id"
                        label="Technician"
                        value={form.data.staff_id}
                        onChange={(value) => form.setData('staff_id', value ? Number(value) : null)}
                        options={staffOptions}
                        placeholder={staff.length === 0 ? 'No active staff yet' : 'Choose who is doing the job'}
                        allowNone
                        noneLabel="Not assigned"
                        error={form.errors.staff_id}
                        helperText={staff.length === 0 ? 'Add your technician under Staff first.' : undefined}
                    />
                </>
            )}

            {refunds && (
                <Alert variant="warning">
                    <AlertDescription>
                        The {money(request.charge_amount)} that was taken for this request goes back out of the account it was paid into.
                    </AlertDescription>
                </Alert>
            )}
            {form.data.status === 'cancelled' && request.is_free && request.type === 'service' && (
                <Alert variant="info">
                    <AlertDescription>This was a free visit. Cancelling it gives the free visit back.</AlertDescription>
                </Alert>
            )}

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                    id="note"
                    value={form.data.note}
                    onChange={(event) => form.setData('note', event.target.value)}
                    rows={2}
                    placeholder="What was done, or why it was cancelled (optional)"
                />
                <InputError message={form.errors.note} />
            </div>
        </FormModal>
    );
}
